import config from '../config/index.js';
import { AppError } from '../utils/response.js';

/**
 * Middleware de validación de archivos subidos
 * Valida MIME type, tamaño, y que el archivo exista
 */
export const validateFile = (req, res, next) => {
  // Validar que existe el archivo
  if (!req.file) {
    return next(new AppError('MISSING_FILE', 'No se proporcionó ningún archivo', 400));
  }

  // Validar MIME type
  if (!config.allowedMimeTypes.includes(req.file.mimetype)) {
    return next(
      new AppError(
        'INVALID_FILE_TYPE',
        `Tipo de archivo no permitido. Tipos aceptados: ${config.allowedMimeTypes.join(', ')}`,
        400,
        { mimetype: req.file.mimetype }
      )
    );
  }

  // Validar tamaño
  if (req.file.size > config.maxFileSize) {
    return next(
      new AppError(
        'FILE_TOO_LARGE',
        `Archivo excede el tamaño máximo de ${(config.maxFileSize / 1024 / 1024).toFixed(2)} MB`,
        400,
        { size: req.file.size, maxSize: config.maxFileSize }
      )
    );
  }

  next();
};

/**
 * Sanitiza el nombre de folder para prevenir directory traversal
 */
export const sanitizeFolder = (req, res, next) => {
  let folder = req.body.folder || 'general';

  // Sanitizar: solo letras, números, guiones y guiones bajos
  folder = folder.replace(/[^a-zA-Z0-9-_]/g, '');

  // Prevenir folders vacíos
  if (!folder || folder.length === 0) {
    folder = 'general';
  }

  // Limitar longitud
  folder = folder.substring(0, 50);

  // Guardar folder sanitizado
  req.sanitizedFolder = folder;

  next();
};

/**
 * Valida parámetros de query para optimización
 */
export const validateOptimizeParams = (req, res, next) => {
  const { w, h, q, fit } = req.query;

  // Validar width
  if (w && (isNaN(w) || parseInt(w) < 1 || parseInt(w) > 5000)) {
    return next(
      new AppError(
        'INVALID_PARAMETER',
        'Parámetro "w" (width) debe ser un número entre 1 y 5000',
        400
      )
    );
  }

  // Validar height
  if (h && (isNaN(h) || parseInt(h) < 1 || parseInt(h) > 5000)) {
    return next(
      new AppError(
        'INVALID_PARAMETER',
        'Parámetro "h" (height) debe ser un número entre 1 y 5000',
        400
      )
    );
  }

  // Validar quality
  if (q && (isNaN(q) || parseInt(q) < 1 || parseInt(q) > 100)) {
    return next(
      new AppError(
        'INVALID_PARAMETER',
        'Parámetro "q" (quality) debe ser un número entre 1 y 100',
        400
      )
    );
  }

  // Validar fit
  const validFits = ['cover', 'contain', 'fill', 'inside', 'outside'];
  if (fit && !validFits.includes(fit)) {
    return next(
      new AppError(
        'INVALID_PARAMETER',
        `Parámetro "fit" debe ser uno de: ${validFits.join(', ')}`,
        400
      )
    );
  }

  next();
};
