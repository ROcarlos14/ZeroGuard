# ZeroGuard — Zero Trust Network Architecture Platform

> **"Never Trust. Always Verify. Continuously Monitor."**

A production-grade simulation of a Zero Trust Network Architecture (ZTNA) system that enforces identity-based access control, device posture checking, micro-segmentation, and continuous session verification across protected internal resources.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       ZeroGuard Platform                        │
├─────────────────────┬───────────────────────────────────────────┤
│   React Frontend    │          Express Backend                  │
│   (Port 5173)       │          (Port 4000)                      │
│                     │                                           │
│  ┌──────────────┐   │   ┌────────────┐  ┌──────────────────┐   │
│  │ Dashboard    │   │   │ Auth API   │  │ Policy Engine    │   │
│  │ Users/Devices│◄──┼──►│ REST APIs  │  │ (7 ZT Checks)   │   │
│  │ Resources    │   │   │ Socket.IO  │  │                  │   │
│  │ Analytics    │   │   └──────┬─────┘  └────────┬─────────┘   │
│  └──────────────┘   │          │                  │             │
│                     │          ▼                  ▼             │
│  Zustand + Query    │   ┌──────────────────────────────┐       │
│  Socket.IO Client   │   │    Prisma ORM + SQLite       │       │
│  Recharts           │   │    (Zero-config database)    │       │
│  Framer Motion      │   └──────────────────────────────┘       │
└─────────────────────┴───────────────────────────────────────────┘
```

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| State    | Zustand, TanStack Query |
| Charts   | Recharts |
| Icons    | Lucide React |
| Animation| Framer Motion |
| Backend  | Node.js, Express.js, TypeScript |
| Auth     | JWT (jsonwebtoken), bcryptjs |
| MFA      | Speakeasy (TOTP), QRCode |
| Database | Prisma ORM + SQLite |
| Realtime | Socket.IO |
| Security | Helmet.js, express-rate-limit, CORS |
| Logging  | Winston, Morgan |
| Tooling  | npm workspaces, Concurrently |

## Features

### Authentication & Authorization
- JWT-based authentication with 15-min access tokens + 7-day refresh tokens
- Token rotation on refresh (old token invalidated)
- TOTP-based Multi-Factor Authentication with QR code setup
- Role-based access control (ADMIN, ANALYST, USER, GUEST)
- Password hashing with bcrypt (12 salt rounds)

### Zero Trust Policy Engine
The core of the platform — 7 sequential security checks on every resource access:
1. **Identity Check** — user active status, role & department authorization
2. **Device Trust Check** — registered, trusted, meets minimum trust score
3. **Device Posture Check** — encryption, antivirus, OS updates, firewall, screen lock
4. **Session Validity Check** — active, not expired, 30-min idle timeout
5. **MFA Check** — verified for resources requiring MFA
6. **Risk Score Calculation** — failed attempts, new IP, after-hours, posture, sensitivity
7. **Policy Rule Evaluation** — ordered rules with ALLOW/DENY/REQUIRE_MFA/ALERT actions

### Real-Time Monitoring
- Socket.IO events: access_event, threat_alert, session_start/end, device_update, user_update
- Live access feed on the dashboard
- Real-time notification bell with unresolved alerts

### 13 Full Pages
- Login, Register, MFA Verification
- Security Dashboard (6 KPIs, 4 charts, live feed, compliance bar)
- Users Management (table + detail panel)
- Devices Management (trust toggle, posture check modal)
- Resources (card grid, Test Access with full policy check display)
- Policy Management (visual condition builder)
- Access Logs (filterable, paginated, CSV export)
- Threat Alerts (severity cards, resolve actions)
- My Profile (MFA setup, devices, sessions, activity)
- Analytics (6 visualizations + risk heatmap)
- Settings (session timeout, MFA enforcement, risk thresholds)

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+

### Installation

```bash
# Clone and enter the project
cd zeroguard

# Install all dependencies (root + client + server)
npm install

# Generate Prisma client and run migrations
cd server
npx prisma generate --schema=src/prisma/schema.prisma
npx prisma migrate dev --name init --schema=src/prisma/schema.prisma

# Seed the database
npm run seed

# Return to root and start both servers
cd ..
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000

## Default Login Credentials

All users share the same password: `ZeroGuard@2024`

| Email | Role | Department | MFA |
|-------|------|-----------|-----|
| admin@zeroguard.local | ADMIN | IT | ✅ |
| analyst@zeroguard.local | ANALYST | IT | ✅ |
| alice@zeroguard.local | USER | Engineering | ✅ |
| bob@zeroguard.local | USER | Finance | ❌ |
| carol@zeroguard.local | USER | HR | ❌ |
| dan@zeroguard.local | USER | Operations | ❌ |
| eve@zeroguard.local | USER | Legal | ❌ |
| frank@zeroguard.local | USER | Marketing | ❌ |
| grace@zeroguard.local | USER | Engineering | ❌ |
| guest@zeroguard.local | GUEST | N/A | ❌ |

> **Tip**: For quick access, use `bob@zeroguard.local` (no MFA required).

## API Documentation

| Group | Base Path | Endpoints |
|-------|-----------|-----------|
| Auth | /api/auth | register, login, logout, refresh, mfa/setup, mfa/verify, mfa/disable, me |
| Users | /api/users | CRUD, /:id/devices, /:id/sessions, /:id/logs, /:id/risk-score |
| Devices | /api/devices | list, /:id, register, /:id/trust, /:id/posture, /:id/sessions |
| Sessions | /api/sessions | list, /active, terminate, /user/:userId, /:id/activity |
| Resources | /api/resources | CRUD, /:id/access (Policy Engine) |
| Policies | /api/policies | CRUD, /:id/toggle, /evaluate |
| Logs | /api/logs | list, /stats, /timeline, /top-denied-users, /top-resources |
| Threats | /api/threats | list, /active, create, /:id/resolve, /stats |
| Analytics | /api/analytics | /dashboard, /risk-matrix, /geo-anomaly |

## Zero Trust Principles Demonstrated

### 1. Verify Explicitly
Every access request is verified through multiple dimensions: user identity, device trust, device posture, session validity, MFA status, and risk score. No implicit trust is granted based on network location or previous access.

### 2. Least Privilege Access
Resources are protected with granular access controls: role-based permissions, department restrictions, minimum trust scores, and MFA requirements. Each resource defines exactly who can access it and under what conditions.

### 3. Assume Breach
The platform continuously monitors for threats: brute force detection, anomalous location alerts, session hijacking detection, and policy violations. All access attempts are logged and analyzed. Sessions have idle timeouts and can be terminated instantly.

## Project Structure

```
zeroguard/
├── package.json              # Root workspace config
├── client/                   # React frontend
│   ├── src/
│   │   ├── pages/            # 13 page components
│   │   ├── components/layout/ # Sidebar, Navbar, DashboardLayout
│   │   ├── store/            # Zustand auth store
│   │   ├── services/         # API layer (axios)
│   │   ├── hooks/            # useSocket hook
│   │   └── utils/            # Helpers, formatters
├── server/                   # Express backend
│   ├── src/
│   │   ├── routes/           # 9 route files
│   │   ├── middleware/       # 7 middleware files
│   │   ├── services/         # PolicyEngine.ts
│   │   ├── prisma/           # Schema + seed
│   │   └── utils/            # Logger, Prisma client
└── shared/                   # Shared TypeScript types
```

## Future Enhancements

- **Geographic IP lookup** — resolve IPs to locations for real anomaly detection
- **WebAuthn/FIDO2** — hardware key support for MFA
- **RBAC policy editor** — visual drag-and-drop policy builder
- **SSO integration** — SAML/OIDC for enterprise identity providers
- **Compliance reporting** — SOC 2, ISO 27001 compliance dashboards
- **Network micro-segmentation** — visual network topology with segment policies
- **AI-powered anomaly detection** — ML-based behavioral analysis
- **Mobile app** — React Native companion for MFA and alerts
- **Automated incident response** — SOAR-style playbooks for threat resolution
- **API rate limiting per user** — granular rate limits based on role and trust

---

Built as a final-year IT undergraduate project demonstrating Zero Trust Network Architecture principles.
