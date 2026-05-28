import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { auditLogger } from '../middleware/auditLogger';

const router = Router();
router.use(authenticate);
router.use(auditLogger);

router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (req.query.severity) where.severity = req.query.severity;
    if (req.query.type) where.type = req.query.type;
    if (req.query.resolved === 'true') where.isResolved = true;
    if (req.query.resolved === 'false') where.isResolved = false;

    const [alerts, total] = await Promise.all([
      prisma.threatAlert.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.threatAlert.count({ where }),
    ]);
    res.json({ success: true, data: alerts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

router.get('/stats', async (_req, res, next) => {
  try {
    const [bySeverity, byType, total, unresolved] = await Promise.all([
      prisma.threatAlert.groupBy({ by: ['severity'], _count: { id: true } }),
      prisma.threatAlert.groupBy({ by: ['type'], _count: { id: true } }),
      prisma.threatAlert.count(),
      prisma.threatAlert.count({ where: { isResolved: false } }),
    ]);
    res.json({
      success: true,
      data: {
        total, unresolved,
        bySeverity: Object.fromEntries(bySeverity.map(s => [s.severity, s._count.id])),
        byType: Object.fromEntries(byType.map(t => [t.type, t._count.id])),
      },
    });
  } catch (error) { next(error); }
});

router.get('/active', async (_req, res, next) => {
  try {
    const alerts = await prisma.threatAlert.findMany({ where: { isResolved: false }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: alerts });
  } catch (error) { next(error); }
});

router.post('/', authorize('ADMIN', 'ANALYST'), async (req: AuthRequest, res, next) => {
  try {
    const alert = await prisma.threatAlert.create({ data: req.body });
    const io = req.app.get('io');
    if (io) io.emit('threat_alert', alert);
    res.status(201).json({ success: true, data: alert });
  } catch (error) { next(error); }
});

router.put('/:id/resolve', async (req: AuthRequest, res, next) => {
  try {
    const alert = await prisma.threatAlert.update({
      where: { id: req.params.id },
      data: { isResolved: true, resolvedAt: new Date() },
    });
    res.json({ success: true, data: alert });
  } catch (error) { next(error); }
});

export default router;
