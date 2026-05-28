import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { auditLogger } from '../middleware/auditLogger';

const router = Router();
router.use(authenticate);
router.use(auditLogger);

// ── GET / ─ List sessions ──────────────────────────────
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const where = req.user!.role === 'ADMIN' || req.user!.role === 'ANALYST'
      ? {}
      : { userId: req.user!.id };

    const sessions = await prisma.session.findMany({
      where,
      include: {
        user: { select: { username: true, email: true } },
        device: { select: { name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

// ── GET /active ─ Active session count ─────────────────
router.get('/active', async (_req, res, next) => {
  try {
    const count = await prisma.session.count({ where: { isActive: true } });
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

// ── DELETE /:id ─ Terminate session ────────────────────
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const session = await prisma.session.update({
      where: { id: req.params.id },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: 'Terminated by user',
      },
    });

    const io = req.app.get('io');
    if (io) io.emit('session_end', { sessionId: session.id, reason: 'Terminated by user' });

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

// ── DELETE /user/:userId ─ Terminate all user sessions ─
router.delete('/user/:userId', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const result = await prisma.session.updateMany({
      where: { userId: req.params.userId, isActive: true },
      data: {
        isActive: false,
        terminatedAt: new Date(),
        terminationReason: 'Terminated by admin',
      },
    });

    const io = req.app.get('io');
    if (io) io.emit('session_end', { sessionId: req.params.userId, reason: 'All sessions terminated by admin' });

    res.json({ success: true, data: { terminated: result.count } });
  } catch (error) {
    next(error);
  }
});

// ── PUT /:id/activity ─ Heartbeat ──────────────────────
router.put('/:id/activity', async (req, res, next) => {
  try {
    const session = await prisma.session.update({
      where: { id: req.params.id },
      data: { lastActivityAt: new Date() },
    });
    res.json({ success: true, data: { lastActivityAt: session.lastActivityAt } });
  } catch (error) {
    next(error);
  }
});

export default router;
