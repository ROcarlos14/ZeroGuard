import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { auditLogger } from '../middleware/auditLogger';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(auditLogger);

import bcrypt from 'bcryptjs';

// ── GET / ─ List all users (Admin/Analyst) ─────────────
router.post('/', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { email, username, password, department, role } = req.body;
    
    if (!email || !username || !password || !department || !role) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, passwordHash, department, role },
      select: {
        id: true, email: true, username: true, role: true,
        department: true, isActive: true, mfaEnabled: true,
        riskScore: true, createdAt: true, updatedAt: true,
      }
    });

    const io = req.app.get('io');
    if (io) io.emit('user_update', user);

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

router.get('/', authorize('ADMIN', 'ANALYST'), async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const role = req.query.role as string;
    const department = req.query.department as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (department) where.department = department;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, username: true, role: true,
          department: true, isActive: true, mfaEnabled: true,
          riskScore: true, createdAt: true, updatedAt: true,
          _count: { select: { devices: true, sessions: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// ── GET /:id ─ Get user detail ─────────────────────────
router.get('/:id', authorize('ADMIN', 'ANALYST'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, username: true, role: true,
        department: true, isActive: true, mfaEnabled: true,
        riskScore: true, createdAt: true, updatedAt: true,
        devices: { include: { posture: true } },
        sessions: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found', code: 'NOT_FOUND' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ── PUT /:id ─ Update user ─────────────────────────────
router.put('/:id', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { role, department, isActive, username } = req.body;
    const data: any = {};
    if (role !== undefined) data.role = role;
    if (department !== undefined) data.department = department;
    if (isActive !== undefined) data.isActive = isActive;
    if (username !== undefined) data.username = username;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true, email: true, username: true, role: true,
        department: true, isActive: true, mfaEnabled: true,
        riskScore: true, createdAt: true, updatedAt: true,
      },
    });

    const io = req.app.get('io');
    if (io) io.emit('user_update', user);

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ── DELETE /:id ─ Deactivate user ──────────────────────
router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
      select: {
        id: true, email: true, username: true, role: true,
        department: true, isActive: true, mfaEnabled: true,
        riskScore: true, createdAt: true, updatedAt: true,
      },
    });

    // Terminate all active sessions
    await prisma.session.updateMany({
      where: { userId: req.params.id, isActive: true },
      data: { isActive: false, terminatedAt: new Date(), terminationReason: 'User deactivated' },
    });

    const io = req.app.get('io');
    if (io) io.emit('user_update', user);

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// ── GET /:id/devices ───────────────────────────────────
router.get('/:id/devices', authorize('ADMIN', 'ANALYST'), async (req, res, next) => {
  try {
    const devices = await prisma.device.findMany({
      where: { userId: req.params.id },
      include: { posture: true },
      orderBy: { lastSeen: 'desc' },
    });
    res.json({ success: true, data: devices });
  } catch (error) {
    next(error);
  }
});

// ── GET /:id/sessions ──────────────────────────────────
router.get('/:id/sessions', authorize('ADMIN', 'ANALYST'), async (req, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

// ── GET /:id/logs ──────────────────────────────────────
router.get('/:id/logs', authorize('ADMIN', 'ANALYST'), async (req, res, next) => {
  try {
    const logs = await prisma.accessLog.findMany({
      where: { userId: req.params.id },
      include: { resource: true },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

// ── PUT /:id/risk-score ────────────────────────────────
router.put('/:id/risk-score', authorize('ADMIN'), async (req: AuthRequest, res, next) => {
  try {
    const { riskScore } = req.body;
    if (riskScore === undefined || riskScore < 0 || riskScore > 100) {
      return res.status(400).json({
        success: false, error: 'Risk score must be 0-100', code: 'VALIDATION_ERROR',
      });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { riskScore },
      select: {
        id: true, email: true, username: true, role: true,
        department: true, isActive: true, mfaEnabled: true,
        riskScore: true, createdAt: true, updatedAt: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

export default router;
