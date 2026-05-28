import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import prisma from '../utils/prisma';

export const sessionRefresh = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (req.session?.id) {
      await prisma.session.update({
        where: { id: req.session.id },
        data: { lastActivityAt: new Date() },
      });
    }
  } catch (_error) {
    // Non-critical — don't block the request
  }
  next();
};
