import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { auditLogger } from '../middleware/auditLogger';
import { policyEngine } from '../services/PolicyEngine';

const router = Router();
router.use(authenticate);
router.use(auditLogger);

// ── GET / ─ List resources ─────────────────────────────
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const resources = await prisma.resource.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    // Enrich with eligibility for current user
    const enriched = resources.map((r) => {
      const allowedRoles = r.allowedRoles.split(',').map(s => s.trim());
      const allowedDepts = r.allowedDepartments.split(',').map(s => s.trim());
      const roleOk = allowedRoles.includes('All') || allowedRoles.includes(req.user!.role);
      const deptOk = allowedDepts.includes('All') || allowedDepts.includes(req.user!.department);
      return { ...r, eligible: roleOk && deptOk };
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// ── GET /:id ─ Resource detail ─────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
    if (!resource) {
      return res.status(404).json({ success: false, error: 'Resource not found', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
});

// ── POST / ─ Create resource (Admin) ───────────────────
router.post('/', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const {
      name, description, type, sensitivityLevel, endpoint,
      allowedRoles, allowedDepartments, minTrustScore, requiresMFA,
    } = req.body;

    const resource = await prisma.resource.create({
      data: {
        name, description, type, sensitivityLevel, endpoint,
        allowedRoles, allowedDepartments,
        minTrustScore: minTrustScore || 50,
        requiresMFA: requiresMFA || false,
      },
    });

    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
});

// ── PUT /:id ─ Update resource (Admin) ─────────────────
router.put('/:id', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
});

// ── DELETE /:id ─ Delete resource (Admin) ──────────────
router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    await prisma.resource.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, data: { message: 'Resource deactivated' } });
  } catch (error) {
    next(error);
  }
});

// ── POST /:id/access ─ Simulate access request ────────
router.post('/:id/access', async (req: AuthRequest, res, next) => {
  try {
    const resourceId = req.params.id;
    const { action } = req.body;

    // Get user's first device if no specific one
    let deviceId = req.body.deviceId;
    if (!deviceId) {
      const device = await prisma.device.findFirst({
        where: { userId: req.user!.id },
        orderBy: { lastSeen: 'desc' },
      });
      deviceId = device?.id;
    }

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'No device associated with this user',
        code: 'NO_DEVICE',
      });
    }

    const accessRequest = {
      userId: req.user!.id,
      deviceId,
      sessionId: req.session?.id || '',
      resourceId,
      action: action || 'VIEW',
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket.remoteAddress || '127.0.0.1',
      timestamp: new Date(),
    };

    const result = await policyEngine.evaluate(accessRequest);

    // Emit real-time access event
    const io = req.app.get('io');
    if (io) {
      const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
      io.emit('access_event', {
        userId: req.user!.id,
        username: req.user!.username,
        resourceId,
        resourceName: resource?.name || 'Unknown',
        action: action || 'VIEW',
        outcome: result.outcome,
        riskScore: result.riskScore,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
