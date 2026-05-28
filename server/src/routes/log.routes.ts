import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

// ── GET / ─ All logs with pagination and filters ───────
router.get('/', authorize('ADMIN', 'ANALYST'), async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (req.query.userId) where.userId = req.query.userId;
    if (req.query.resourceId) where.resourceId = req.query.resourceId;
    if (req.query.outcome) where.outcome = req.query.outcome;
    if (req.query.minRisk) where.riskScore = { gte: parseInt(req.query.minRisk as string) };
    if (req.query.startDate || req.query.endDate) {
      where.timestamp = {};
      if (req.query.startDate) where.timestamp.gte = new Date(req.query.startDate as string);
      if (req.query.endDate) where.timestamp.lte = new Date(req.query.endDate as string);
    }

    const [logs, total] = await Promise.all([
      prisma.accessLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { username: true, email: true } },
          resource: { select: { name: true, type: true } },
        },
      }),
      prisma.accessLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /stats ─ Summary statistics ────────────────────
router.get('/stats', async (_req, res, next) => {
  try {
    const [total, allowed, denied, challenged] = await Promise.all([
      prisma.accessLog.count(),
      prisma.accessLog.count({ where: { outcome: 'ALLOWED' } }),
      prisma.accessLog.count({ where: { outcome: 'DENIED' } }),
      prisma.accessLog.count({ where: { outcome: 'CHALLENGED' } }),
    ]);
    res.json({ success: true, data: { total, allowed, denied, challenged } });
  } catch (error) {
    next(error);
  }
});

// ── GET /timeline ─ Hourly counts for last 24h ────────
router.get('/timeline', async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = await prisma.accessLog.findMany({
      where: { timestamp: { gte: since } },
      select: { timestamp: true, outcome: true },
      orderBy: { timestamp: 'asc' },
    });

    // Group by hour
    const hourly: Record<string, { allowed: number; denied: number; challenged: number }> = {};
    for (let h = 0; h < 24; h++) {
      const hourDate = new Date(Date.now() - (23 - h) * 60 * 60 * 1000);
      const key = `${hourDate.getHours().toString().padStart(2, '0')}:00`;
      hourly[key] = { allowed: 0, denied: 0, challenged: 0 };
    }

    for (const log of logs) {
      const key = `${log.timestamp.getHours().toString().padStart(2, '0')}:00`;
      if (hourly[key]) {
        const outcome = log.outcome.toLowerCase() as 'allowed' | 'denied' | 'challenged';
        hourly[key][outcome]++;
      }
    }

    const timeline = Object.entries(hourly).map(([hour, counts]) => ({
      hour,
      ...counts,
    }));

    res.json({ success: true, data: timeline });
  } catch (error) {
    next(error);
  }
});

// ── GET /top-denied-users ──────────────────────────────
router.get('/top-denied-users', async (_req, res, next) => {
  try {
    const logs = await prisma.accessLog.groupBy({
      by: ['userId'],
      where: { outcome: 'DENIED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const enriched = await Promise.all(
      logs.map(async (l) => {
        const user = await prisma.user.findUnique({
          where: { id: l.userId },
          select: { username: true, email: true },
        });
        return { userId: l.userId, username: user?.username, email: user?.email, deniedCount: l._count.id };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// ── GET /top-resources ─────────────────────────────────
router.get('/top-resources', async (_req, res, next) => {
  try {
    const logs = await prisma.accessLog.groupBy({
      by: ['resourceId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const enriched = await Promise.all(
      logs.map(async (l) => {
        const resource = await prisma.resource.findUnique({
          where: { id: l.resourceId },
          select: { name: true, type: true },
        });
        return { resourceId: l.resourceId, name: resource?.name, type: resource?.type, accessCount: l._count.id };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

export default router;
