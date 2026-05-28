import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const PASSWORD = 'ZeroGuard@2024';

async function main() {
  console.log('🌱 Seeding ZeroGuard database...');

  // Clean existing data
  await prisma.accessLog.deleteMany();
  await prisma.threatAlert.deleteMany();
  await prisma.policyRule.deleteMany();
  await prisma.session.deleteMany();
  await prisma.devicePosture.deleteMany();
  await prisma.device.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, 12);

  // ── USERS ────────────────────────────────────────────
  // NOTE: All users start with MFA disabled. Enable MFA via Profile > Enable MFA
  // where you'll see the QR code to scan with Google Authenticator / Authy.
  const usersData = [
    { email: 'admin@zeroguard.local', username: 'admin', role: 'ADMIN', department: 'IT', mfaEnabled: false, riskScore: 5 },
    { email: 'analyst@zeroguard.local', username: 'analyst', role: 'ANALYST', department: 'IT', mfaEnabled: false, riskScore: 0 },
    { email: 'alice@zeroguard.local', username: 'alice', role: 'USER', department: 'Engineering', mfaEnabled: false, riskScore: 15 },
    { email: 'bob@zeroguard.local', username: 'bob', role: 'USER', department: 'Finance', mfaEnabled: false, riskScore: 0 },
    { email: 'carol@zeroguard.local', username: 'carol', role: 'USER', department: 'HR', mfaEnabled: false, riskScore: 25 },
    { email: 'dan@zeroguard.local', username: 'dan', role: 'USER', department: 'Operations', mfaEnabled: false, riskScore: 0 },
    { email: 'eve@zeroguard.local', username: 'eve', role: 'USER', department: 'Legal', mfaEnabled: false, riskScore: 10 },
    { email: 'frank@zeroguard.local', username: 'frank', role: 'USER', department: 'Marketing', mfaEnabled: false, riskScore: 0 },
    { email: 'grace@zeroguard.local', username: 'grace', role: 'USER', department: 'Engineering', mfaEnabled: false, riskScore: 0 },
    { email: 'guest@zeroguard.local', username: 'guest', role: 'GUEST', department: 'N/A', mfaEnabled: false, riskScore: 0 },
  ];

  const users = [];
  for (const u of usersData) {
    const mfaSecret = u.mfaEnabled ? speakeasy.generateSecret({ name: `ZeroGuard:${u.email}` }).base32 : null;
    const user = await prisma.user.create({
      data: { ...u, passwordHash: hash, mfaSecret },
    });
    users.push(user);
  }
  console.log(`  ✅ Created ${users.length} users`);

  // ── DEVICES ──────────────────────────────────────────
  const deviceTemplates = [
    { name: 'Windows Workstation', type: 'DESKTOP', os: 'Windows 11', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64)', trusted: true, score: 85 },
    { name: 'MacBook Pro', type: 'LAPTOP', os: 'macOS 14', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', trusted: true, score: 90 },
    { name: 'iPhone 15', type: 'MOBILE', os: 'iOS 17', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', trusted: true, score: 75 },
    { name: 'Linux Server', type: 'SERVER', os: 'Ubuntu 22.04', ua: 'curl/7.81.0', trusted: true, score: 95 },
    { name: 'Android Phone', type: 'MOBILE', os: 'Android 14', ua: 'Mozilla/5.0 (Linux; Android 14)', trusted: false, score: 45 },
    { name: 'iPad Air', type: 'TABLET', os: 'iPadOS 17', ua: 'Mozilla/5.0 (iPad; CPU OS 17_0)', trusted: true, score: 70 },
    { name: 'Chromebook', type: 'LAPTOP', os: 'ChromeOS 120', ua: 'Mozilla/5.0 (X11; CrOS)', trusted: false, score: 55 },
  ];

  const ips = ['192.168.1.10', '192.168.1.20', '10.0.0.5', '172.16.0.1', '10.0.1.15', '192.168.2.30', '10.10.10.1'];
  const allDevices = [];

  for (let i = 0; i < users.length; i++) {
    const count = i < 3 ? 3 : 2;
    for (let j = 0; j < count; j++) {
      const tpl = deviceTemplates[(i * 2 + j) % deviceTemplates.length];
      const ip = ips[(i + j) % ips.length];
      const postureFlags = {
        isEncrypted: tpl.score > 60, hasAntivirus: tpl.score > 50,
        isOsUpToDate: tpl.score > 70, hasFirewall: tpl.score > 40,
        screenLockEnabled: tpl.score > 55,
      };
      const postureScore = (postureFlags.isEncrypted ? 25 : 0) + (postureFlags.hasAntivirus ? 20 : 0) +
        (postureFlags.isOsUpToDate ? 25 : 0) + (postureFlags.hasFirewall ? 20 : 0) + (postureFlags.screenLockEnabled ? 10 : 0);

      const device = await prisma.device.create({
        data: {
          userId: users[i].id, name: tpl.name, type: tpl.type, operatingSystem: tpl.os,
          browserUserAgent: tpl.ua, ipAddress: ip, isTrusted: tpl.trusted, trustScore: tpl.score,
          posture: { create: { ...postureFlags, postureScore } },
        },
      });
      allDevices.push(device);
    }
  }
  console.log(`  ✅ Created ${allDevices.length} devices with posture`);

  // ── RESOURCES ────────────────────────────────────────
  const resourcesData = [
    { name: 'Employee HR Database', description: 'HR records and employee data', type: 'DATABASE', sensitivityLevel: 'SECRET', endpoint: '/api/hr/database', allowedRoles: 'ADMIN,USER', allowedDepartments: 'HR,IT', minTrustScore: 80, requiresMFA: true },
    { name: 'Financial Reports Server', description: 'Financial statements and reports', type: 'FILE_SERVER', sensitivityLevel: 'CONFIDENTIAL', endpoint: '/api/finance/reports', allowedRoles: 'ADMIN,USER', allowedDepartments: 'Finance,Executive,IT', minTrustScore: 70, requiresMFA: true },
    { name: 'Engineering Git Repository', description: 'Source code repositories', type: 'APPLICATION', sensitivityLevel: 'INTERNAL', endpoint: '/api/eng/git', allowedRoles: 'ADMIN,ANALYST,USER', allowedDepartments: 'Engineering,IT', minTrustScore: 50, requiresMFA: false },
    { name: 'Internal Wiki', description: 'Company-wide knowledge base', type: 'APPLICATION', sensitivityLevel: 'INTERNAL', endpoint: '/api/wiki', allowedRoles: 'ADMIN,ANALYST,USER,GUEST', allowedDepartments: 'All', minTrustScore: 30, requiresMFA: false },
    { name: 'Customer Data API', description: 'Customer information API', type: 'API', sensitivityLevel: 'CONFIDENTIAL', endpoint: '/api/customers', allowedRoles: 'ADMIN,USER', allowedDepartments: 'Engineering,IT', minTrustScore: 60, requiresMFA: false },
    { name: 'Payroll System', description: 'Employee payroll processing', type: 'INTERNAL_TOOL', sensitivityLevel: 'SECRET', endpoint: '/api/payroll', allowedRoles: 'ADMIN,USER', allowedDepartments: 'HR,Finance,Executive', minTrustScore: 80, requiresMFA: true },
    { name: 'Marketing CMS', description: 'Content management system', type: 'APPLICATION', sensitivityLevel: 'INTERNAL', endpoint: '/api/cms', allowedRoles: 'ADMIN,USER', allowedDepartments: 'Marketing,IT', minTrustScore: 40, requiresMFA: false },
    { name: 'Admin Control Panel', description: 'System administration panel', type: 'INTERNAL_TOOL', sensitivityLevel: 'SECRET', endpoint: '/api/admin/panel', allowedRoles: 'ADMIN', allowedDepartments: 'IT', minTrustScore: 90, requiresMFA: true },
  ];

  const resources = [];
  for (const r of resourcesData) {
    const resource = await prisma.resource.create({ data: r });
    resources.push(resource);
  }
  console.log(`  ✅ Created ${resources.length} resources`);

  // ── POLICY RULES ─────────────────────────────────────
  const policies = [
    { name: 'Admin Unrestricted Access', description: 'Allow admin role full access', condition: JSON.stringify([{ field: 'role', operator: 'is', value: 'ADMIN' }]), action: 'ALLOW', priority: 1 },
    { name: 'Block Guest from Confidential+', description: 'Deny guest access to confidential or secret resources', condition: JSON.stringify([{ field: 'role', operator: 'is', value: 'GUEST' }, { field: 'resourceSensitivity', operator: 'is_not', value: 'INTERNAL' }]), action: 'DENY', priority: 10 },
    { name: 'Require MFA for Secret Resources', description: 'MFA required for secret resources', condition: JSON.stringify([{ field: 'resourceSensitivity', operator: 'is', value: 'SECRET' }]), action: 'REQUIRE_MFA', priority: 20 },
    { name: 'High Risk Score Denial', description: 'Deny access when risk score exceeds 70', condition: JSON.stringify([{ field: 'riskScore', operator: 'greater_than', value: 70 }]), action: 'DENY', priority: 30 },
    { name: 'After Hours Alert', description: 'Alert on access outside business hours', condition: JSON.stringify([{ field: 'timeOfDay', operator: 'greater_than', value: 22 }]), action: 'ALERT', priority: 40 },
    { name: 'Untrusted Device Secret Denial', description: 'Deny untrusted devices from secret resources', condition: JSON.stringify([{ field: 'deviceTrusted', operator: 'is', value: 'false' }, { field: 'resourceSensitivity', operator: 'is', value: 'SECRET' }]), action: 'DENY', priority: 50 },
  ];

  for (const p of policies) { await prisma.policyRule.create({ data: p }); }
  console.log(`  ✅ Created ${policies.length} policy rules`);

  // ── ACCESS LOGS (200 entries) ────────────────────────
  const actions = ['VIEW', 'EDIT', 'DELETE', 'DOWNLOAD', 'UPLOAD', 'EXECUTE'];
  const outcomes = ['ALLOWED', 'ALLOWED', 'ALLOWED', 'DENIED', 'CHALLENGED'];

  for (let i = 0; i < 200; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const resource = resources[Math.floor(Math.random() * resources.length)];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    const daysAgo = Math.floor(Math.random() * 7);
    const hoursAgo = Math.floor(Math.random() * 24);
    const ts = new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000);

    await prisma.accessLog.create({
      data: {
        userId: user.id, resourceId: resource.id,
        action: actions[Math.floor(Math.random() * actions.length)],
        outcome, reason: outcome === 'DENIED' ? 'Policy violation' : outcome === 'CHALLENGED' ? 'MFA required' : null,
        ipAddress: ips[Math.floor(Math.random() * ips.length)],
        riskScore: Math.floor(Math.random() * 80), timestamp: ts,
      },
    });
  }
  console.log('  ✅ Created 200 access log entries');

  // ── THREAT ALERTS ────────────────────────────────────
  const alertTypes = ['BRUTE_FORCE', 'ANOMALOUS_LOCATION', 'PRIVILEGE_ESCALATION', 'SESSION_HIJACK', 'SUSPICIOUS_DEVICE', 'POLICY_VIOLATION'];
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const alertData = [
    { type: 'BRUTE_FORCE', severity: 'HIGH', title: 'Multiple failed login attempts', description: 'User carol had 12 failed logins in 5 minutes', userId: users[4].id, resolved: false },
    { type: 'ANOMALOUS_LOCATION', severity: 'MEDIUM', title: 'Access from unusual location', description: 'User bob accessed from unrecognized IP 45.33.32.156', userId: users[3].id, resolved: false },
    { type: 'PRIVILEGE_ESCALATION', severity: 'CRITICAL', title: 'Unauthorized admin access attempt', description: 'User guest attempted to access Admin Control Panel', userId: users[9].id, resolved: false },
    { type: 'SESSION_HIJACK', severity: 'HIGH', title: 'Potential session hijacking', description: 'Session token used from different IP than original', userId: users[2].id, resolved: true },
    { type: 'SUSPICIOUS_DEVICE', severity: 'MEDIUM', title: 'Untrusted device access', description: 'Dan accessed payroll from untrusted device', userId: users[5].id, resolved: false },
    { type: 'POLICY_VIOLATION', severity: 'LOW', title: 'After-hours access detected', description: 'Alice accessed git repository at 11:30 PM', userId: users[2].id, resolved: true },
    { type: 'BRUTE_FORCE', severity: 'CRITICAL', title: 'Distributed brute force attack', description: 'Multiple IPs targeting admin account', userId: users[0].id, resolved: false },
    { type: 'ANOMALOUS_LOCATION', severity: 'MEDIUM', title: 'Concurrent sessions from different locations', description: 'Grace has active sessions from 2 different IPs', userId: users[8].id, resolved: true },
  ];

  for (const a of alertData) {
    await prisma.threatAlert.create({
      data: {
        type: a.type, severity: a.severity, title: a.title, description: a.description,
        affectedUserId: a.userId, isResolved: a.resolved,
        resolvedAt: a.resolved ? new Date(Date.now() - Math.floor(Math.random() * 86400000)) : null,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 3 * 86400000)),
      },
    });
  }
  console.log('  ✅ Created 8 threat alerts');

  // ── SETTINGS ─────────────────────────────────────────
  const settings = [
    { key: 'session_timeout', value: '30' },
    { key: 'mfa_enforcement', value: 'false' },
    { key: 'risk_challenge_threshold', value: '50' },
    { key: 'risk_deny_threshold', value: '70' },
    { key: 'audit_retention_days', value: '90' },
  ];
  for (const s of settings) { await prisma.setting.create({ data: s }); }
  console.log('  ✅ Created settings');

  console.log('\n🎉 Database seeded successfully!');
  console.log('   Default password for all users: ZeroGuard@2024');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
