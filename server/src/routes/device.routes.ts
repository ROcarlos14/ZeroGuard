import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { auditLogger } from '../middleware/auditLogger';

const router = Router();
router.use(authenticate);
router.use(auditLogger);

// ── GET / ─ List devices ───────────────────────────────
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const where = req.user!.role === 'ADMIN' || req.user!.role === 'ANALYST'
      ? {}
      : { userId: req.user!.id };

    const devices = await prisma.device.findMany({
      where,
      include: { posture: true, user: { select: { username: true, email: true } } },
      orderBy: { lastSeen: 'desc' },
    });
    res.json({ success: true, data: devices });
  } catch (error) {
    next(error);
  }
});

// ── GET /:id ─ Device detail ───────────────────────────
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: {
        posture: true,
        user: { select: { username: true, email: true } },
        sessions: { where: { isActive: true }, take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found', code: 'NOT_FOUND' });
    }
    res.json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
});

// ── POST /register ─ Register a new device ─────────────
router.post('/register', async (req: AuthRequest, res, next) => {
  try {
    const { name, type, operatingSystem, browserUserAgent, ipAddress } = req.body;
    const device = await prisma.device.create({
      data: {
        userId: req.user!.id,
        name: name || 'Unknown Device',
        type: type || 'DESKTOP',
        operatingSystem: operatingSystem || 'Unknown',
        browserUserAgent: browserUserAgent || 'Unknown',
        ipAddress: ipAddress || '127.0.0.1',
        isTrusted: false,
        trustScore: 50,
        posture: {
          create: {
            isEncrypted: false,
            hasAntivirus: false,
            isOsUpToDate: false,
            hasFirewall: false,
            screenLockEnabled: false,
            postureScore: 0,
          },
        },
      },
      include: { posture: true },
    });
    res.status(201).json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
});

// ── PUT /:id/trust ─ Set device trust (Admin) ──────────
router.put('/:id/trust', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { isTrusted, trustScore } = req.body;
    const data: any = {};
    if (isTrusted !== undefined) data.isTrusted = isTrusted;
    if (trustScore !== undefined) data.trustScore = Math.min(100, Math.max(0, trustScore));

    const device = await prisma.device.update({
      where: { id: req.params.id },
      data,
      include: { posture: true },
    });

    const io = req.app.get('io');
    if (io) io.emit('device_update', device);

    res.json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
});

// ── POST /:id/posture ─ Submit posture check ───────────
router.post('/:id/posture', async (req: AuthRequest, res, next) => {
  try {
    const { isEncrypted, hasAntivirus, isOsUpToDate, hasFirewall, screenLockEnabled } = req.body;

    const postureScore =
      (isEncrypted ? 25 : 0) +
      (hasAntivirus ? 20 : 0) +
      (isOsUpToDate ? 25 : 0) +
      (hasFirewall ? 20 : 0) +
      (screenLockEnabled ? 10 : 0);

    const posture = await prisma.devicePosture.upsert({
      where: { deviceId: req.params.id },
      update: {
        isEncrypted: !!isEncrypted,
        hasAntivirus: !!hasAntivirus,
        isOsUpToDate: !!isOsUpToDate,
        hasFirewall: !!hasFirewall,
        screenLockEnabled: !!screenLockEnabled,
        postureScore,
        checkedAt: new Date(),
      },
      create: {
        deviceId: req.params.id,
        isEncrypted: !!isEncrypted,
        hasAntivirus: !!hasAntivirus,
        isOsUpToDate: !!isOsUpToDate,
        hasFirewall: !!hasFirewall,
        screenLockEnabled: !!screenLockEnabled,
        postureScore,
      },
    });

    // Update device trust score based on posture
    await prisma.device.update({
      where: { id: req.params.id },
      data: { trustScore: Math.min(100, postureScore + 10), lastSeen: new Date() },
    });

    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: { posture: true },
    });

    const io = req.app.get('io');
    if (io) io.emit('device_update', device);

    res.json({ success: true, data: posture });
  } catch (error) {
    next(error);
  }
});

// ── DELETE /:id ─ Remove device ────────────────────────
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    // First, find all sessions for this device
    const sessions = await prisma.session.findMany({ where: { deviceId: req.params.id } });
    const sessionIds = sessions.map(s => s.id);

    // Unlink these sessions from AccessLogs to prevent foreign key errors
    if (sessionIds.length > 0) {
      await prisma.accessLog.updateMany({
        where: { sessionId: { in: sessionIds } },
        data: { sessionId: null },
      });
      // Now delete the sessions
      await prisma.session.deleteMany({
        where: { deviceId: req.params.id },
      });
    }

    // Delete posture first
    await prisma.devicePosture.deleteMany({ where: { deviceId: req.params.id } });
    // Finally, delete the device
    await prisma.device.delete({ where: { id: req.params.id } });

    res.json({ success: true, data: { message: 'Device removed' } });
  } catch (error) {
    next(error);
  }
});

// ── GET /:id/sessions ──────────────────────────────────
router.get('/:id/sessions', async (req: AuthRequest, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { deviceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

export default router;
