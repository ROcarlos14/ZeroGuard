// ══════════════════════════════════════════════════════════
// ZeroGuard — Shared Types (Client & Server)
// ══════════════════════════════════════════════════════════

export enum Role {
  ADMIN = 'ADMIN',
  ANALYST = 'ANALYST',
  USER = 'USER',
  GUEST = 'GUEST',
}

export enum DeviceType {
  DESKTOP = 'DESKTOP',
  LAPTOP = 'LAPTOP',
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  SERVER = 'SERVER',
}

export enum ResourceType {
  DATABASE = 'DATABASE',
  FILE_SERVER = 'FILE_SERVER',
  APPLICATION = 'APPLICATION',
  API = 'API',
  INTERNAL_TOOL = 'INTERNAL_TOOL',
}

export enum SensitivityLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
}

export enum AccessAction {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  DOWNLOAD = 'DOWNLOAD',
  UPLOAD = 'UPLOAD',
  EXECUTE = 'EXECUTE',
}

export enum AccessOutcome {
  ALLOWED = 'ALLOWED',
  DENIED = 'DENIED',
  CHALLENGED = 'CHALLENGED',
}

export enum PolicyAction {
  ALLOW = 'ALLOW',
  DENY = 'DENY',
  REQUIRE_MFA = 'REQUIRE_MFA',
  ALERT = 'ALERT',
}

export enum AlertType {
  BRUTE_FORCE = 'BRUTE_FORCE',
  ANOMALOUS_LOCATION = 'ANOMALOUS_LOCATION',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  SESSION_HIJACK = 'SESSION_HIJACK',
  SUSPICIOUS_DEVICE = 'SUSPICIOUS_DEVICE',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ── User ──────────────────────────────────────────────────
export interface IUser {
  id: string;
  email: string;
  username: string;
  role: Role;
  department: string;
  isActive: boolean;
  mfaEnabled: boolean;
  riskScore: number;
  createdAt: string;
  updatedAt: string;
}

// ── Device ────────────────────────────────────────────────
export interface IDevice {
  id: string;
  userId: string;
  name: string;
  type: DeviceType;
  operatingSystem: string;
  browserUserAgent: string;
  ipAddress: string;
  isTrusted: boolean;
  trustScore: number;
  lastSeen: string;
  registeredAt: string;
  posture?: IDevicePosture;
}

export interface IDevicePosture {
  id: string;
  deviceId: string;
  isEncrypted: boolean;
  hasAntivirus: boolean;
  isOsUpToDate: boolean;
  hasFirewall: boolean;
  screenLockEnabled: boolean;
  postureScore: number;
  checkedAt: string;
}

// ── Session ───────────────────────────────────────────────
export interface ISession {
  id: string;
  userId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  terminatedAt?: string;
  terminationReason?: string;
}

// ── Resource ──────────────────────────────────────────────
export interface IResource {
  id: string;
  name: string;
  description: string;
  type: ResourceType;
  sensitivityLevel: SensitivityLevel;
  endpoint: string;
  allowedRoles: string;
  allowedDepartments: string;
  minTrustScore: number;
  requiresMFA: boolean;
  isActive: boolean;
  createdAt: string;
}

// ── Access Log ────────────────────────────────────────────
export interface IAccessLog {
  id: string;
  userId: string;
  sessionId?: string;
  resourceId: string;
  action: AccessAction;
  outcome: AccessOutcome;
  reason?: string;
  ipAddress: string;
  timestamp: string;
  riskScore: number;
  user?: IUser;
  resource?: IResource;
}

// ── Policy Rule ───────────────────────────────────────────
export interface IPolicyRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: PolicyAction;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IPolicyCondition {
  field: string;
  operator: 'is' | 'is_not' | 'greater_than' | 'less_than' | 'contains';
  value: string | number | boolean;
}

// ── Threat Alert ──────────────────────────────────────────
export interface IThreatAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  affectedUserId?: string;
  affectedDeviceId?: string;
  ipAddress?: string;
  isResolved: boolean;
  resolvedAt?: string;
  createdAt: string;
}

// ── Policy Engine ─────────────────────────────────────────
export interface IAccessRequest {
  userId: string;
  deviceId: string;
  sessionId: string;
  resourceId: string;
  action: AccessAction;
  ipAddress: string;
  timestamp: string;
}

export interface ICheckResult {
  checkName: string;
  passed: boolean;
  detail: string;
  weight: number;
}

export interface IAccessResult {
  outcome: AccessOutcome;
  reasons: string[];
  riskScore: number;
  requiresMFA: boolean;
  checksPerformed: ICheckResult[];
}

// ── API Response ──────────────────────────────────────────
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Auth ──────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  department: string;
  deviceInfo?: {
    name: string;
    type: DeviceType;
    operatingSystem: string;
    browserUserAgent: string;
  };
}

export interface AuthResponse {
  user: IUser;
  accessToken: string;
  refreshToken: string;
  requiresMFA: boolean;
}

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

// ── Dashboard ─────────────────────────────────────────────
export interface DashboardKPIs {
  totalUsers: number;
  activeSessions: number;
  registeredDevices: number;
  protectedResources: number;
  accessAttemptsToday: {
    allowed: number;
    denied: number;
    challenged: number;
  };
  activeThreats: number;
  postureCompliance: {
    compliant: number;
    nonCompliant: number;
    percentage: number;
  };
  riskDistribution: Record<string, number>;
  topThreats: IThreatAlert[];
}

// ── Socket Events ─────────────────────────────────────────
export interface SocketEvents {
  access_event: IAccessLog;
  threat_alert: IThreatAlert;
  session_start: ISession;
  session_end: { sessionId: string; reason: string };
  device_update: IDevice;
  user_update: IUser;
}
