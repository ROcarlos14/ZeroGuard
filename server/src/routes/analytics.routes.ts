import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
router.use(authenticate);

// ── GET /dashboard ─────────────────────────────────────
router.get('/dashboard', async (_req, res, next) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalUsers, activeSessions, registeredDevices, protectedResources,
      allowedToday, deniedToday, challengedToday, activeThreats,
      allPostures, topThreats, users] = await prisma.$transaction([
      prisma.user.count(),
      prisma.session.count({ where: { isActive: true } }),
      prisma.device.count(),
      prisma.resource.count({ where: { isActive: true } }),
      prisma.accessLog.count({ where: { outcome: 'ALLOWED', timestamp: { gte: today } } }),
      prisma.accessLog.count({ where: { outcome: 'DENIED', timestamp: { gte: today } } }),
      prisma.accessLog.count({ where: { outcome: 'CHALLENGED', timestamp: { gte: today } } }),
      prisma.threatAlert.count({ where: { isResolved: false } }),
      prisma.devicePosture.findMany({ select: { postureScore: true } }),
      prisma.threatAlert.findMany({ where: { isResolved: false }, take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.user.findMany({ select: { riskScore: true } }),
    ]);

    const compliant = allPostures.filter(p => p.postureScore >= 60).length;
    const nonCompliant = allPostures.length - compliant;
    const riskBuckets: Record<string, number> = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    users.forEach(u => {
      if (u.riskScore <= 20) riskBuckets['0-20']++;
      else if (u.riskScore <= 40) riskBuckets['21-40']++;
      else if (u.riskScore <= 60) riskBuckets['41-60']++;
      else if (u.riskScore <= 80) riskBuckets['61-80']++;
      else riskBuckets['81-100']++;
    });

    res.json({
      success: true,
      data: {
        totalUsers, activeSessions, registeredDevices, protectedResources,
        accessAttemptsToday: { allowed: allowedToday, denied: deniedToday, challenged: challengedToday },
        activeThreats,
        postureCompliance: { compliant, nonCompliant, percentage: allPostures.length ? Math.round((compliant / allPostures.length) * 100) : 0 },
        riskDistribution: riskBuckets,
        topThreats,
      },
    });
  } catch (error) { next(error); }
});

// ── GET /risk-matrix ───────────────────────────────────
router.get('/risk-matrix', authorize('ADMIN', 'ANALYST'), async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, department: true, role: true, riskScore: true },
      orderBy: { riskScore: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
});

// ── GET /geo-anomaly ───────────────────────────────────
router.get('/geo-anomaly', authorize('ADMIN', 'ANALYST'), async (_req, res, next) => {
  try {
    const alerts = await prisma.threatAlert.findMany({
      where: { type: 'ANOMALOUS_LOCATION' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: alerts });
  } catch (error) { next(error); }
});

export default router;
