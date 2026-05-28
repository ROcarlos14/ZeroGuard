import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

import { errorHandler } from './middleware/errorHandler';
import { rateLimiter, authRateLimiter } from './middleware/rateLimiter';
import { sessionRefresh } from './middleware/sessionRefresh';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import deviceRoutes from './routes/device.routes';
import sessionRoutes from './routes/session.routes';
import resourceRoutes from './routes/resource.routes';
import policyRoutes from './routes/policy.routes';
import logRoutes from './routes/log.routes';
import threatRoutes from './routes/threat.routes';
import analyticsRoutes from './routes/analytics.routes';

dotenv.config({ path: '../.env' });

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// ── Middleware ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);
app.use(sessionRefresh);

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/threats', threatRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ── Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ── Socket.IO ──────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

export { app, httpServer, io };
