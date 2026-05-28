import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { auditLogger } from '../middleware/auditLogger';

const router = Router();
router.use(authenticate);
router.use(auditLogger);

// ── GET / ─ List policy rules ──────────────────────────
router.get('/', async (_req, res, next) => {
  try {
    const policies = await prisma.policyRule.findMany({
      orderBy: { priority: 'asc' },
    });
    res.json({ success: true, data: policies });
  } catch (error) {
    next(error);
  }
});

// ── POST / ─ Create policy rule (Admin) ────────────────
router.post('/', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { name, description, condition, action, priority } = req.body;
    const policy = await prisma.policyRule.create({
      data: {
        name,
        description,
        condition: typeof condition === 'string' ? condition : JSON.stringify(condition),
        action,
        priority: priority || 100,
      },
    });
    res.status(201).json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
});

// ── PUT /:id ─ Update policy rule ──────────────────────
router.put('/:id', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const data = { ...req.body };
    if (data.condition && typeof data.condition !== 'string') {
      data.condition = JSON.stringify(data.condition);
    }
    const policy = await prisma.policyRule.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ success: true, data: policy });
  } catch (error) {
    next(error);
  }
});

// ── DELETE /:id ─ Delete policy rule ───────────────────
router.delete('/:id', authorize('ADMIN'), async (_req, res, next) => {
  try {
    await prisma.policyRule.delete({ where: { id: _req.params.id } });
    res.json({ success: true, data: { message: 'Policy rule deleted' } });
  } catch (error) {
    next(error);
  }
});

// ── PUT /:id/toggle ─ Toggle policy rule ───────────────
router.put('/:id/toggle', authorize('ADMIN'), async (req, res, next) => {
  try {
    const policy = await prisma.policyRule.findUnique({ where: { id: req.params.id } });
    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found', code: 'NOT_FOUND' });
    }
    const updated = await prisma.policyRule.update({
      where: { id: req.params.id },
      data: { isActive: !policy.isActive },
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// ── POST /evaluate ─ Evaluate hypothetical request ─────
router.post('/evaluate', authorize('ADMIN', 'ANALYST'), async (req: AuthRequest, res, next) => {
  try {
    const policies = await prisma.policyRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    const { role, department, resourceSensitivity, deviceTrusted, riskScore, timeOfDay, ipAddress } = req.body;
    const context = { role, department, resourceSensitivity, deviceTrusted, riskScore, timeOfDay, ipAddress };

    const results = policies.map(policy => {
      let conditions: any[];
      try {
        const parsed = JSON.parse(policy.condition);
        conditions = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        return { policy: policy.name, matched: false, action: policy.action };
      }

      const matched = conditions.every((cond: any) => {
        const actual = (context as any)[cond.field];
        if (actual === undefined) return false;
        switch (cond.operator) {
          case 'is': return String(actual) === String(cond.value);
          case 'is_not': return String(actual) !== String(cond.value);
          case 'greater_than': return Number(actual) > Number(cond.value);
          case 'less_than': return Number(actual) < Number(cond.value);
          case 'contains': return String(actual).includes(String(cond.value));
          default: return false;
        }
      });

      return { policy: policy.name, matched, action: policy.action, priority: policy.priority };
    });

    const firstMatch = results.find(r => r.matched);

    res.json({
      success: true,
      data: {
        results,
        finalAction: firstMatch?.action || 'No matching policy',
        matchedPolicy: firstMatch?.policy || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
