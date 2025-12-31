import express from 'express';
import { validateApiKey } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { success, AppError } from '../utils/response.js';
import { getStats } from '../utils/storage.js';
import logger from '../middleware/logger.js';

const router = express.Router();

/**
 * GET /api/stats
 * Estadísticas generales del servicio (para dashboard futuro)
 */
router.get(
  '/',
  adminLimiter,
  validateApiKey,
  asyncHandler(async (req, res) => {
    logger.debug('Obteniendo estadísticas del servicio');

    try {
      const stats = await getStats();
      success(res, stats);
    } catch (err) {
      logger.error('Error al obtener estadísticas', { error: err.message });
      throw new AppError('STATS_FAILED', `Error al obtener estadísticas: ${err.message}`, 500);
    }
  })
);

export default router;
