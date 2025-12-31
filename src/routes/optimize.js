import express from 'express';
import path from 'path';
import { existsSync } from 'fs';
import config from '../config/index.js';
import { validateOptimizeParams } from '../middleware/validator.js';
import { readLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../utils/response.js';
import { optimizeOnTheFly } from '../utils/sharp.js';
import logger from '../middleware/logger.js';

const router = express.Router();

/**
 * GET /optimize/:folder/:year/:month/:filename
 * Optimización on-the-fly con parámetros personalizados
 * Query params: ?w={width}&h={height}&q={quality}&fit={cover|contain|fill}
 */
router.get(
  '/:folder/:year/:month/:filename',
  readLimiter,
  validateOptimizeParams,
  asyncHandler(async (req, res) => {
    const { folder, year, month, filename } = req.params;
    const { w, h, q, fit } = req.query;

    // Construir path del archivo
    const filePath = path.join(config.uploadDir, folder, year, month, filename);

    // Validar que el archivo existe
    if (!existsSync(filePath)) {
      throw new AppError('FILE_NOT_FOUND', 'Archivo no encontrado', 404);
    }

    logger.debug(`Optimizando on-the-fly: ${filePath}`, { w, h, q, fit });

    try {
      // Optimizar con parámetros personalizados
      const optimizedBuffer = await optimizeOnTheFly(filePath, { w, h, q, fit });

      // Headers de caché
      res.set({
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400', // 1 día
        'X-Optimized': 'true',
      });

      res.send(optimizedBuffer);
    } catch (err) {
      logger.error('Error en optimización on-the-fly', { error: err.message, filePath });
      throw new AppError('OPTIMIZATION_FAILED', `Error al optimizar imagen: ${err.message}`, 500);
    }
  })
);

export default router;
