import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import UAParser from 'ua-parser-js';

export const deviceContext = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const parser = new (UAParser as any)(userAgent);
  const result = parser.getResult();

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
    || req.socket.remoteAddress 
    || '127.0.0.1';

  req.deviceInfo = {
    name: `${result.browser.name || 'Unknown'} on ${result.os.name || 'Unknown'}`,
    type: getDeviceType(result.device.type),
    operatingSystem: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
    browserUserAgent: userAgent,
    ipAddress: ip === '::1' ? '127.0.0.1' : ip,
  };

  next();
};

function getDeviceType(type?: string): string {
  switch (type) {
    case 'mobile': return 'MOBILE';
    case 'tablet': return 'TABLET';
    default: return 'DESKTOP';
  }
}
