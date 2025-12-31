import express from 'express';
import { success } from '../utils/response.js';

const router = express.Router();

// Timestamp de inicio del servidor
const startTime = Date.now();

/**
 * GET /health
 * Health check para Coolify y monitoreo
 */
router.get('/', (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000); // segundos
  const memoryUsage = process.memoryUsage();

  success(res, {
    status: 'ok',
    uptime,
    memory: {
      used: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      usedBytes: memoryUsage.heapUsed,
      rss: memoryUsage.rss,
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
