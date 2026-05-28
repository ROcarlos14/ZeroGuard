import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { deviceContext } from '../middleware/deviceContext';
import { auditLogger } from '../middleware/auditLogger';
import { logger } from '../utils/logger';

const router = Router();

// ── POST /register ─────────────────────────────────────
router.post('/register', deviceContext, async (req: AuthRequest, res, next) => {
  try {
    const { email, username, password, department } = req.body;

    if (!email || !username || !password || !department) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
        code: 'VALIDATION_ERROR',
      });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'User with this email or username already exists',
        code: 'USER_EXISTS',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, passwordHash, department, role: 'USER' },
    });

    // Auto-register device
    if (req.deviceInfo) {
      await prisma.device.create({
        data: {
          userId: user.id,
          name: req.deviceInfo.name,
          type: req.deviceInfo.type,
          operatingSystem: req.deviceInfo.operatingSystem,
          browserUserAgent: req.deviceInfo.browserUserAgent,
          ipAddress: req.deviceInfo.ipAddress,
          isTrusted: true,
          trustScore: 70,
          posture: {
            create: {
              isEncrypted: true,
              hasAntivirus: true,
              isOsUpToDate: true,
              hasFirewall: true,
              screenLockEnabled: true,
              postureScore: 100,
            },
          },
        },
      });
    }

    logger.info(`[AUTH] User registered: ${username} (${email})`);

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /login ────────────────────────────────────────
router.post('/login', deviceContext, async (req: AuthRequest, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR',
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'default-refresh-secret';

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    const refreshToken = jwt.sign(
      { userId: user.id, tokenId: uuidv4() },
      refreshSecret,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
    );

    // Find or create device
    let device = await prisma.device.findFirst({
      where: {
        userId: user.id,
        ipAddress: req.deviceInfo?.ipAddress || '127.0.0.1',
      },
    });

    if (!device && req.deviceInfo) {
      device = await prisma.device.create({
        data: {
          userId: user.id,
          name: req.deviceInfo.name,
          type: req.deviceInfo.type,
          operatingSystem: req.deviceInfo.operatingSystem,
          browserUserAgent: req.deviceInfo.browserUserAgent,
          ipAddress: req.deviceInfo.ipAddress,
          isTrusted: true,
          trustScore: 70,
          posture: {
            create: {
              isEncrypted: true,
              hasAntivirus: true,
              isOsUpToDate: true,
              hasFirewall: true,
              screenLockEnabled: true,
              postureScore: 100,
            },
          },
        },
      });
    }

    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        deviceId: device!.id,
        token: accessToken,
        refreshToken,
        ipAddress: req.deviceInfo?.ipAddress || '127.0.0.1',
        userAgent: req.deviceInfo?.browserUserAgent || 'Unknown',
        expiresAt,
        mfaVerified: !user.mfaEnabled,
      },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('session_start', {
        id: session.id,
        userId: user.id,
        deviceId: device!.id,
        createdAt: session.createdAt,
      });
    }

    logger.info(`[AUTH] User logged in: ${user.username} (${user.email})`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          department: user.department,
          isActive: user.isActive,
          mfaEnabled: user.mfaEnabled,
          riskScore: user.riskScore,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        accessToken,
        refreshToken,
        sessionId: session.id,
        deviceId: device!.id,
        requiresMFA: user.mfaEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /logout ───────────────────────────────────────
router.post('/logout', authenticate, auditLogger, async (req: AuthRequest, res, next) => {
  try {
    if (req.session?.id) {
      await prisma.session.update({
        where: { id: req.session.id },
        data: {
          isActive: false,
          terminatedAt: new Date(),
          terminationReason: 'User logout',
        },
      });

      const io = req.app.get('io');
      if (io) {
        io.emit('session_end', { sessionId: req.session.id, reason: 'User logout' });
      }
    }

    logger.info(`[AUTH] User logged out: ${req.user?.username}`);
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    next(error);
  }
});

// ── POST /refresh ──────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
        code: 'VALIDATION_ERROR',
      });
    }

    const refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'default-refresh-secret';
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, refreshSecret);
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'INVALID_TOKEN',
      });
    }

    const session = await prisma.session.findFirst({
      where: { refreshToken, isActive: true },
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Session not found or expired',
        code: 'SESSION_INVALID',
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'default-secret';
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, role: session.userId },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId, tokenId: uuidv4() },
      refreshSecret,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
    );

    // Rotate tokens
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        lastActivityAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /mfa/setup ────────────────────────────────────
router.post('/mfa/setup', authenticate, auditLogger, async (req: AuthRequest, res, next) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `ZeroGuard:${req.user!.email}`,
      issuer: 'ZeroGuard',
    });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { mfaSecret: secret.base32 },
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode,
        otpauthUrl: secret.otpauth_url,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /mfa/verify ───────────────────────────────────
router.post('/mfa/verify', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'OTP code is required',
        code: 'VALIDATION_ERROR',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user?.mfaSecret) {
      return res.status(400).json({
        success: false,
        error: 'MFA is not set up',
        code: 'MFA_NOT_SETUP',
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      return res.status(401).json({
        success: false,
        error: 'Invalid OTP code',
        code: 'INVALID_OTP',
      });
    }

    // Enable MFA if first time, mark session as MFA verified
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });

    if (req.session?.id) {
      await prisma.session.update({
        where: { id: req.session.id },
        data: { mfaVerified: true },
      });
    }

    res.json({ success: true, data: { message: 'MFA verified successfully' } });
  } catch (error) {
    next(error);
  }
});

// ── POST /mfa/disable ──────────────────────────────────
router.post('/mfa/disable', authenticate, auditLogger, async (req: AuthRequest, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password confirmation required',
        code: 'VALIDATION_ERROR',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const valid = await bcrypt.compare(password, user!.passwordHash);
    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
        code: 'INVALID_PASSWORD',
      });
    }

    await prisma.user.update({
      where: { id: user!.id },
      data: { mfaEnabled: false, mfaSecret: null },
    });

    res.json({ success: true, data: { message: 'MFA disabled successfully' } });
  } catch (error) {
    next(error);
  }
});

// ── GET /me ────────────────────────────────────────────
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        department: true,
        isActive: true,
        mfaEnabled: true,
        riskScore: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

export default router;
