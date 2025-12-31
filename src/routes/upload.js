import express from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import config from '../config/index.js';
import { validateApiKey } from '../middleware/auth.js';
import { validateFile, sanitizeFolder } from '../middleware/validator.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { success, AppError } from '../utils/response.js';
import { optimizeImage, createThumbnail, createSmall, getMetadata } from '../utils/sharp.js';
import { saveFile } from '../utils/storage.js';
import logger from '../middleware/logger.js';

const router = express.Router();

// Configurar multer para guardar en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSize,
  },
});

/**
 * POST /upload
 * Recibe imagen, optimiza, guarda y retorna URLs
 */
router.post(
  '/',
  uploadLimiter,
  validateApiKey,
  upload.single('image'),
  sanitizeFolder,
  validateFile,
  asyncHandler(async (req, res) => {
    const file = req.file;
    const folder = req.sanitizedFolder;

    logger.info(`Iniciando upload de imagen a folder: ${folder}`, {
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    });

    try {
      // Generar nombre único
      const timestamp = Date.now();
      const randomId = nanoid(6);
      const filename = `${timestamp}-${randomId}.webp`;

      // Estructura de carpetas: uploads/{folder}/{YYYY}/{MM}/
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const relativePath = path.join(folder, String(year), month, filename);
      const fullPath = path.join(config.uploadDir, relativePath);

      // Obtener metadata de la imagen original
      const metadata = await getMetadata(file.buffer);

      // Optimizar imagen (versión original)
      logger.debug('Optimizando imagen original...');
      const optimizedBuffer = await optimizeImage(file.buffer);
      const optimizedPath = fullPath;
      const optimizedSize = await saveFile(optimizedBuffer, optimizedPath);

      // Crear thumbnail
      logger.debug('Creando thumbnail...');
      const thumbBuffer = await createThumbnail(file.buffer);
      const thumbFilename = filename.replace('.webp', '-thumb.webp');
      const thumbPath = path.join(config.uploadDir, folder, String(year), month, thumbFilename);
      await saveFile(thumbBuffer, thumbPath);

      // Crear versión small
      logger.debug('Creando versión small...');
      const smallBuffer = await createSmall(file.buffer);
      const smallFilename = filename.replace('.webp', '-small.webp');
      const smallPath = path.join(config.uploadDir, folder, String(year), month, smallFilename);
      await saveFile(smallBuffer, smallPath);

      // Construir URLs
      const baseUrl = `${config.publicUrl}/uploads/${folder}/${year}/${month}`;
      const responseData = {
        url: `${baseUrl}/${filename}`,
        thumbnail: `${baseUrl}/${thumbFilename}`,
        small: `${baseUrl}/${smallFilename}`,
        size: optimizedSize,
        width: metadata.width > 1200 ? 1200 : metadata.width,
        height: metadata.height,
        folder,
        filename,
        path: relativePath.replace(/\\/g, '/'),
      };

      logger.info('Upload completado exitosamente', {
        filename,
        size: optimizedSize,
        folder,
      });

      success(res, responseData, 201);
    } catch (err) {
      logger.error('Error en proceso de upload', { error: err.message });
      throw new AppError('UPLOAD_FAILED', `Error al procesar imagen: ${err.message}`, 500);
    }
  })
);

export default router;
