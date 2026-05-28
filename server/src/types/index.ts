import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
    department: string;
    isActive: boolean;
    mfaEnabled: boolean;
    riskScore: number;
  };
  session?: {
    id: string;
    userId: string;
    deviceId: string;
    token: string;
    refreshToken: string;
    isActive: boolean;
    mfaVerified: boolean;
    expiresAt: Date;
    lastActivityAt: Date;
  };
  deviceInfo?: {
    name: string;
    type: string;
    operatingSystem: string;
    browserUserAgent: string;
    ipAddress: string;
  };
}
