import dotenv from 'dotenv';
dotenv.config(); // loads server/.env when cwd is server/
dotenv.config({ path: '../.env' }); // fallback to root .env

import { httpServer } from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  logger.info(`🚀 ZeroGuard Server running on port ${PORT}`);
  logger.info(`📡 Socket.IO ready for connections`);
  logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
