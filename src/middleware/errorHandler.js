import logger from './logger.js';
import config from '../config/index.js';

/**
 * Middleware de manejo centralizado de errores
 * Debe ser el último middleware registrado en Express
 */
export const errorHandler = (err, req, res, next) => {
  // Log del error
  logger.error(err.message, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Determinar status code
  const statusCode = err.statusCode || err.status || 500;

  // Determinar código de error
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  // Mensaje de error
  const message =
    err.isOperational || config.nodeEnv === 'development'
      ? err.message
      : 'Error interno del servidor';

  // Detalles adicionales (solo en desarrollo)
  const details =
    config.nodeEnv === 'development'
      ? {
          stack: err.stack,
          details: err.details || {},
        }
      : {};

  // Respuesta de error
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...details,
    },
  });
};

/**
 * Middleware para capturar rutas no encontradas (404)
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Ruta ${req.method} ${req.url} no encontrada`,
    },
  });
};

/**
 * Wrapper para async handlers
 * Evita tener que usar try-catch en cada controlador
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
