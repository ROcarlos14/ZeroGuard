import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

interface AccessRequest {
  userId: string;
  deviceId: string;
  sessionId: string;
  resourceId: string;
  action: string;
  ipAddress: string;
  timestamp: Date;
}

interface CheckResult {
  checkName: string;
  passed: boolean;
  detail: string;
  weight: number;
}

interface AccessResult {
  outcome: 'ALLOWED' | 'DENIED' | 'CHALLENGED';
  reasons: string[];
  riskScore: number;
  requiresMFA: boolean;
  checksPerformed: CheckResult[];
}

export class PolicyEngine {
  async evaluate(request: AccessRequest): Promise<AccessResult> {
    const checks: CheckResult[] = [];
    const reasons: string[] = [];
    let riskScore = 0;
    let outcome: 'ALLOWED' | 'DENIED' | 'CHALLENGED' = 'ALLOWED';
    let requiresMFA = false;

    // Fetch all needed data
    const [user, device, session, resource] = await Promise.all([
      prisma.user.findUnique({ where: { id: request.userId } }),
      prisma.device.findUnique({
        where: { id: request.deviceId },
        include: { posture: true },
      }),
      prisma.session.findUnique({ where: { id: request.sessionId } }),
      prisma.resource.findUnique({ where: { id: request.resourceId } }),
    ]);

    if (!user || !resource) {
      return {
        outcome: 'DENIED',
        reasons: ['User or resource not found'],
        riskScore: 100,
        requiresMFA: false,
        checksPerformed: [],
      };
    }

    // ── CHECK 1: Identity Check ────────────────────────────
    const identityCheck = this.checkIdentity(user, resource);
    checks.push(...identityCheck.checks);
    if (!identityCheck.passed) {
      reasons.push(...identityCheck.reasons);
      outcome = 'DENIED';
    }

    // ── CHECK 2: Device Trust Check ────────────────────────
    if (device) {
      const deviceTrustCheck = this.checkDeviceTrust(device, resource);
      checks.push(...deviceTrustCheck.checks);
      if (!deviceTrustCheck.passed && outcome !== 'DENIED') {
        reasons.push(...deviceTrustCheck.reasons);
        outcome = 'DENIED';
      }
    } else {
      checks.push({
        checkName: 'Device Trust',
        passed: false,
        detail: 'No device found for this request',
        weight: 30,
      });
      if (outcome !== 'DENIED') {
        reasons.push('No registered device');
        outcome = 'DENIED';
      }
    }

    // ── CHECK 3: Device Posture Check ──────────────────────
    if (device?.posture) {
      const postureCheck = this.checkDevicePosture(device.posture);
      checks.push(...postureCheck.checks);
      riskScore += postureCheck.riskContribution;
      if (postureCheck.outcome === 'DENIED' && outcome !== 'DENIED') {
        reasons.push(...postureCheck.reasons);
        outcome = 'DENIED';
      } else if (postureCheck.outcome === 'CHALLENGED' && outcome === 'ALLOWED') {
        reasons.push(...postureCheck.reasons);
        outcome = 'CHALLENGED';
      }
    }

    // ── CHECK 4: Session Validity Check ────────────────────
    if (session) {
      const sessionCheck = this.checkSession(session);
      checks.push(...sessionCheck.checks);
      if (!sessionCheck.passed && outcome !== 'DENIED') {
        reasons.push(...sessionCheck.reasons);
        outcome = 'DENIED';
      }
    }

    // ── CHECK 5: MFA Check ─────────────────────────────────
    if (resource.requiresMFA) {
      const mfaPassed = session?.mfaVerified || false;
      checks.push({
        checkName: 'MFA Verification',
        passed: mfaPassed,
        detail: mfaPassed ? 'MFA verified for this session' : 'MFA required but not completed',
        weight: 20,
      });
      if (!mfaPassed && outcome === 'ALLOWED') {
        requiresMFA = true;
        outcome = 'CHALLENGED';
        reasons.push('MFA verification required');
      }
    }

    // ── CHECK 6: Risk Score Check ──────────────────────────
    const riskCheck = await this.calculateRiskScore(request, user, device, resource);
    checks.push(...riskCheck.checks);
    riskScore += riskCheck.totalRisk;

    if (riskScore > 70 && outcome !== 'DENIED') {
      outcome = 'DENIED';
      reasons.push(`High risk score: ${riskScore}`);
    } else if (riskScore > 50 && outcome === 'ALLOWED') {
      outcome = 'CHALLENGED';
      reasons.push(`Elevated risk score: ${riskScore}`);
    }

    // ── CHECK 7: Policy Rule Evaluation ────────────────────
    const policyCheck = await this.evaluatePolicyRules(request, user, device, resource);
    checks.push(...policyCheck.checks);
    if (policyCheck.action) {
      switch (policyCheck.action) {
        case 'DENY':
          if (outcome !== 'DENIED') {
            outcome = 'DENIED';
            reasons.push(...policyCheck.reasons);
          }
          break;
        case 'REQUIRE_MFA':
          if (outcome === 'ALLOWED') {
            outcome = 'CHALLENGED';
            requiresMFA = true;
            reasons.push(...policyCheck.reasons);
          }
          break;
        case 'ALERT':
          reasons.push(...policyCheck.reasons);
          break;
        case 'ALLOW':
          // Admin override — if policy says ALLOW and nothing else denied, allow it
          if (outcome !== 'DENIED') {
            outcome = 'ALLOWED';
            reasons.length = 0;
            reasons.push('Access granted by policy rule');
          }
          break;
      }
    }

    if (outcome === 'ALLOWED' && reasons.length === 0) {
      reasons.push('All security checks passed');
    }

    // ── Save Access Log ────────────────────────────────────
    await prisma.accessLog.create({
      data: {
        userId: request.userId,
        sessionId: request.sessionId || null,
        resourceId: request.resourceId,
        action: request.action,
        outcome,
        reason: reasons.join('; '),
        ipAddress: request.ipAddress,
        riskScore,
        timestamp: request.timestamp,
      },
    });

    // ── Post-evaluation: Threat Detection ──────────────────
    await this.detectThreats(request, outcome, device);

    return {
      outcome,
      reasons,
      riskScore,
      requiresMFA,
      checksPerformed: checks,
    };
  }

  private checkIdentity(user: any, resource: any) {
    const checks: CheckResult[] = [];
    const reasons: string[] = [];
    let passed = true;

    // Active user check
    const isActive = user.isActive;
    checks.push({
      checkName: 'User Active Status',
      passed: isActive,
      detail: isActive ? 'User account is active' : 'User account is deactivated',
      weight: 0,
    });
    if (!isActive) {
      passed = false;
      reasons.push('User account is inactive');
    }

    // Role check
    const allowedRoles = resource.allowedRoles.split(',').map((r: string) => r.trim());
    const hasRole = allowedRoles.includes('All') || allowedRoles.includes(user.role);
    checks.push({
      checkName: 'Role Authorization',
      passed: hasRole,
      detail: hasRole
        ? `User role ${user.role} is authorized`
        : `User role ${user.role} not in allowed roles: ${resource.allowedRoles}`,
      weight: hasRole ? 0 : 25,
    });
    if (!hasRole) {
      passed = false;
      reasons.push(`Role ${user.role} not authorized for this resource`);
    }

    // Department check
    const allowedDepts = resource.allowedDepartments.split(',').map((d: string) => d.trim());
    const hasDept = allowedDepts.includes('All') || allowedDepts.includes(user.department);
    checks.push({
      checkName: 'Department Authorization',
      passed: hasDept,
      detail: hasDept
        ? `Department ${user.department} is authorized`
        : `Department ${user.department} not in allowed: ${resource.allowedDepartments}`,
      weight: hasDept ? 0 : 20,
    });
    if (!hasDept) {
      passed = false;
      reasons.push(`Department ${user.department} not authorized`);
    }

    return { passed, checks, reasons };
  }

  private checkDeviceTrust(device: any, resource: any) {
    const checks: CheckResult[] = [];
    const reasons: string[] = [];
    let passed = true;

    checks.push({
      checkName: 'Device Registration',
      passed: true,
      detail: `Device ${device.name} is registered`,
      weight: 0,
    });

    const isTrusted = device.isTrusted;
    checks.push({
      checkName: 'Device Trust Status',
      passed: isTrusted,
      detail: isTrusted ? 'Device is trusted' : 'Device is not trusted',
      weight: isTrusted ? 0 : 25,
    });

    if (!isTrusted) {
      passed = false;
      reasons.push('Device is not trusted');
    }

    const meetsMinScore = device.trustScore >= resource.minTrustScore;
    checks.push({
      checkName: 'Device Trust Score',
      passed: meetsMinScore,
      detail: `Trust score ${device.trustScore}/${resource.minTrustScore} (required)`,
      weight: meetsMinScore ? 0 : 15,
    });

    if (!meetsMinScore) {
      passed = false;
      reasons.push(`Device trust score ${device.trustScore} below required ${resource.minTrustScore}`);
    }

    return { passed, checks, reasons };
  }

  private checkDevicePosture(posture: any) {
    const checks: CheckResult[] = [];
    const reasons: string[] = [];
    let riskContribution = 0;
    let outcome: 'ALLOWED' | 'DENIED' | 'CHALLENGED' = 'ALLOWED';

    const score = posture.postureScore;

    checks.push({
      checkName: 'Disk Encryption',
      passed: posture.isEncrypted,
      detail: posture.isEncrypted ? 'Disk encryption enabled' : 'Disk not encrypted',
      weight: 25,
    });
    checks.push({
      checkName: 'Antivirus',
      passed: posture.hasAntivirus,
      detail: posture.hasAntivirus ? 'Antivirus active' : 'No antivirus detected',
      weight: 20,
    });
    checks.push({
      checkName: 'OS Updates',
      passed: posture.isOsUpToDate,
      detail: posture.isOsUpToDate ? 'OS is up to date' : 'OS needs updates',
      weight: 25,
    });
    checks.push({
      checkName: 'Firewall',
      passed: posture.hasFirewall,
      detail: posture.hasFirewall ? 'Firewall enabled' : 'Firewall disabled',
      weight: 20,
    });
    checks.push({
      checkName: 'Screen Lock',
      passed: posture.screenLockEnabled,
      detail: posture.screenLockEnabled ? 'Screen lock enabled' : 'Screen lock disabled',
      weight: 10,
    });

    checks.push({
      checkName: 'Overall Posture Score',
      passed: score >= 60,
      detail: `Posture score: ${score}/100`,
      weight: score < 60 ? 20 : 0,
    });

    if (score < 40) {
      outcome = 'DENIED';
      reasons.push(`Device posture score critically low: ${score}/100`);
      riskContribution = 20;
    } else if (score < 60) {
      outcome = 'CHALLENGED';
      reasons.push(`Device posture score below threshold: ${score}/100`);
      riskContribution = 20;
    }

    return { checks, reasons, outcome, riskContribution };
  }

  private checkSession(session: any) {
    const checks: CheckResult[] = [];
    const reasons: string[] = [];
    let passed = true;

    const isActive = session.isActive;
    checks.push({
      checkName: 'Session Active',
      passed: isActive,
      detail: isActive ? 'Session is active' : 'Session is terminated',
      weight: isActive ? 0 : 30,
    });
    if (!isActive) {
      passed = false;
      reasons.push('Session is terminated');
    }

    const isExpired = new Date(session.expiresAt) < new Date();
    checks.push({
      checkName: 'Session Expiry',
      passed: !isExpired,
      detail: isExpired ? 'Session has expired' : 'Session is valid',
      weight: isExpired ? 30 : 0,
    });
    if (isExpired) {
      passed = false;
      reasons.push('Session expired');
    }

    const lastActivity = new Date(session.lastActivityAt);
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const isIdle = lastActivity < thirtyMinutesAgo;
    checks.push({
      checkName: 'Session Idle Timeout',
      passed: !isIdle,
      detail: isIdle ? 'Session idle for over 30 minutes' : 'Session recently active',
      weight: isIdle ? 20 : 0,
    });
    if (isIdle) {
      passed = false;
      reasons.push('Session idle timeout exceeded');
    }

    return { passed, checks, reasons };
  }

  private async calculateRiskScore(
    request: AccessRequest,
    user: any,
    device: any,
    resource: any
  ) {
    const checks: CheckResult[] = [];
    let totalRisk = 0;

    // a. Multiple failed access attempts in last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentDenials = await prisma.accessLog.count({
      where: {
        userId: request.userId,
        outcome: 'DENIED',
        timestamp: { gte: tenMinutesAgo },
      },
    });
    const failedAttemptRisk = recentDenials >= 3 ? 30 : 0;
    totalRisk += failedAttemptRisk;
    checks.push({
      checkName: 'Recent Failed Attempts',
      passed: failedAttemptRisk === 0,
      detail: `${recentDenials} denied attempts in last 10 minutes`,
      weight: failedAttemptRisk,
    });

    // b. Access from a new IP
    const knownIPs = await prisma.session.findMany({
      where: { userId: request.userId },
      select: { ipAddress: true },
      distinct: ['ipAddress'],
    });
    const isNewIP = !knownIPs.some(s => s.ipAddress === request.ipAddress);
    const newIPRisk = isNewIP ? 15 : 0;
    totalRisk += newIPRisk;
    checks.push({
      checkName: 'IP Address Familiarity',
      passed: !isNewIP,
      detail: isNewIP ? `New IP address: ${request.ipAddress}` : 'Known IP address',
      weight: newIPRisk,
    });

    // c. Access outside normal hours
    const hour = request.timestamp.getHours();
    const outsideHours = hour < 6 || hour >= 22;
    const timeRisk = outsideHours ? 10 : 0;
    totalRisk += timeRisk;
    checks.push({
      checkName: 'Access Time',
      passed: !outsideHours,
      detail: outsideHours
        ? `Access at ${hour}:00 (outside 6AM-10PM)`
        : `Access at ${hour}:00 (normal hours)`,
      weight: timeRisk,
    });

    // d. Device posture score < 60
    const postureScore = device?.posture?.postureScore ?? 0;
    const postureRisk = postureScore < 60 ? 20 : 0;
    totalRisk += postureRisk;
    checks.push({
      checkName: 'Device Posture Risk',
      passed: postureRisk === 0,
      detail: `Device posture: ${postureScore}/100`,
      weight: postureRisk,
    });

    // e. Resource sensitivity
    let sensitivityRisk = 0;
    if (resource.sensitivityLevel === 'SECRET') sensitivityRisk = 20;
    else if (resource.sensitivityLevel === 'CONFIDENTIAL') sensitivityRisk = 10;
    totalRisk += sensitivityRisk;
    checks.push({
      checkName: 'Resource Sensitivity',
      passed: sensitivityRisk === 0,
      detail: `Sensitivity: ${resource.sensitivityLevel}`,
      weight: sensitivityRisk,
    });

    return { checks, totalRisk };
  }

  private async evaluatePolicyRules(
    request: AccessRequest,
    user: any,
    device: any,
    resource: any
  ) {
    const checks: CheckResult[] = [];
    const reasons: string[] = [];
    let action: string | null = null;

    const policies = await prisma.policyRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    for (const policy of policies) {
      let conditions: any[];
      try {
        const parsed = JSON.parse(policy.condition);
        conditions = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        continue;
      }

      const matches = conditions.every((cond: any) => {
        return this.evaluateCondition(cond, user, device, resource, request);
      });

      checks.push({
        checkName: `Policy: ${policy.name}`,
        passed: !matches || policy.action === 'ALLOW',
        detail: matches
          ? `Matched — action: ${policy.action}`
          : 'Did not match',
        weight: matches ? 10 : 0,
      });

      if (matches && !action) {
        action = policy.action;
        reasons.push(`Policy "${policy.name}": ${policy.action}`);
        // First matching rule takes effect
        break;
      }
    }

    return { checks, reasons, action };
  }

  private evaluateCondition(
    condition: any,
    user: any,
    device: any,
    resource: any,
    request: AccessRequest
  ): boolean {
    const { field, operator, value } = condition;

    let actual: any;
    switch (field) {
      case 'role': actual = user.role; break;
      case 'department': actual = user.department; break;
      case 'resourceSensitivity': actual = resource.sensitivityLevel; break;
      case 'deviceTrusted': actual = device?.isTrusted ?? false; break;
      case 'riskScore': actual = user.riskScore; break;
      case 'timeOfDay':
        actual = request.timestamp.getHours();
        break;
      case 'ipAddress': actual = request.ipAddress; break;
      default: return false;
    }

    switch (operator) {
      case 'is': return String(actual) === String(value);
      case 'is_not': return String(actual) !== String(value);
      case 'greater_than': return Number(actual) > Number(value);
      case 'less_than': return Number(actual) < Number(value);
      case 'contains': return String(actual).includes(String(value));
      default: return false;
    }
  }

  private async detectThreats(
    request: AccessRequest,
    outcome: string,
    device: any
  ) {
    try {
      // Brute force detection: 5+ denials in 10 minutes
      if (outcome === 'DENIED') {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recentDenials = await prisma.accessLog.count({
          where: {
            userId: request.userId,
            outcome: 'DENIED',
            timestamp: { gte: tenMinutesAgo },
          },
        });

        if (recentDenials >= 5) {
          const existingAlert = await prisma.threatAlert.findFirst({
            where: {
              type: 'BRUTE_FORCE',
              affectedUserId: request.userId,
              isResolved: false,
              createdAt: { gte: tenMinutesAgo },
            },
          });

          if (!existingAlert) {
            await prisma.threatAlert.create({
              data: {
                type: 'BRUTE_FORCE',
                severity: 'HIGH',
                title: 'Brute Force Attempt Detected',
                description: `User ${request.userId} has ${recentDenials} denied access attempts in the last 10 minutes`,
                affectedUserId: request.userId,
                ipAddress: request.ipAddress,
              },
            });
            logger.warn(`[THREAT] Brute force detected for user ${request.userId}`);
          }
        }
      }

      // Anomalous location: IP changed from last session
      if (device) {
        const lastSession = await prisma.session.findFirst({
          where: {
            userId: request.userId,
            id: { not: request.sessionId },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (lastSession && lastSession.ipAddress !== request.ipAddress) {
          const existingAlert = await prisma.threatAlert.findFirst({
            where: {
              type: 'ANOMALOUS_LOCATION',
              affectedUserId: request.userId,
              isResolved: false,
              createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
            },
          });

          if (!existingAlert) {
            await prisma.threatAlert.create({
              data: {
                type: 'ANOMALOUS_LOCATION',
                severity: 'MEDIUM',
                title: 'Access From New Location',
                description: `User accessed from ${request.ipAddress}, previous IP was ${lastSession.ipAddress}`,
                affectedUserId: request.userId,
                affectedDeviceId: device.id,
                ipAddress: request.ipAddress,
              },
            });
          }
        }
      }
    } catch (error) {
      logger.error('Threat detection error:', error);
    }
  }
}

export const policyEngine = new PolicyEngine();
