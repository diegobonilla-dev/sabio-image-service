import express from 'express';
import path from 'path';
import config from '../config/index.js';
import { validateApiKey } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { success, AppError } from '../utils/response.js';
import { listImages, deleteFile } from '../utils/storage.js';
import logger from '../middleware/logger.js';

const router = express.Router();

/**
 * GET /api/images
 * Lista imágenes con paginación (para dashboard futuro)
 * Query params: ?folder={folder}&page={n}&limit={n}&sort={date|size|name}
 */
router.get(
  '/',
  adminLimiter,
  validateApiKey,
  asyncHandler(async (req, res) => {
    const { folder, page = 1, limit = 20, sort = 'date' } = req.query;

    logger.debug('Listando imágenes', { folder, page, limit, sort });

    try {
      const result = await listImages(folder, {
        page: parseInt(page),
        limit: parseInt(limit),
        sort,
      });

      success(res, result);
    } catch (err) {
      logger.error('Error al listar imágenes', { error: err.message });
      throw new AppError('LIST_FAILED', `Error al listar imágenes: ${err.message}`, 500);
    }
  })
);

/**
 * DELETE /api/images/:encodedPath
 * Elimina imagen y sus variantes (thumbnail, small)
 * Path debe estar URL-encoded
 */
router.delete(
  '/:encodedPath',
  adminLimiter,
  validateApiKey,
  asyncHandler(async (req, res) => {
    const encodedPath = req.params.encodedPath;
    const relativePath = decodeURIComponent(encodedPath);

    logger.info(`Eliminando imagen: ${relativePath}`);

    try {
      // Construir paths completos
      const fullPath = path.join(config.uploadDir, relativePath);
      const baseName = path.basename(relativePath, path.extname(relativePath));
      const dirName = path.dirname(fullPath);
      const ext = path.extname(relativePath);

      // Paths de las variantes
      const thumbPath = path.join(dirName, `${baseName}-thumb${ext}`);
      const smallPath = path.join(dirName, `${baseName}-small${ext}`);

      // Eliminar archivos
      const deleted = [];

      if (await deleteFile(fullPath)) {
        deleted.push(relativePath);
      }

      if (await deleteFile(thumbPath)) {
        deleted.push(relativePath.replace(ext, `-thumb${ext}`));
      }

      if (await deleteFile(smallPath)) {
        deleted.push(relativePath.replace(ext, `-small${ext}`));
      }

      if (deleted.length === 0) {
        throw new AppError('FILE_NOT_FOUND', 'Archivo no encontrado', 404);
      }

      logger.info('Archivos eliminados exitosamente', { deleted });

      success(res, { deleted });
    } catch (err) {
      if (err.code === 'FILE_NOT_FOUND') {
        throw err;
      }
      logger.error('Error al eliminar imagen', { error: err.message });
      throw new AppError('DELETE_FAILED', `Error al eliminar imagen: ${err.message}`, 500);
    }
  })
);

export default router;
