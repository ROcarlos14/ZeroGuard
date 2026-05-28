import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { logger } from '../utils/logger';

export const auditLogger = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const userId = req.user?.id || 'anonymous';
    const username = req.user?.username || 'anonymous';
    logger.info(
      `[AUDIT] ${req.method} ${req.originalUrl} by ${username} (${userId}) from ${req.ip}`
    );
  }
  next();
};
