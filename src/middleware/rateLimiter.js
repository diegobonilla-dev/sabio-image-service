import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

/**
 * Rate limiter para endpoint de upload
 * Previene abuso y ataques DDoS
 */
export const uploadLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs, // 15 minutos por defecto
  max: config.rateLimitMaxRequests, // 100 requests por ventana
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Identificador personalizado (IP real detrás de proxy)
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  },
});

/**
 * Rate limiter más permisivo para endpoints de lectura
 */
export const readLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests * 2, // Doble de límite para lecturas
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  },
});

/**
 * Rate limiter estricto para endpoints de administración
 */
export const adminLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: 50, // Más restrictivo
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas solicitudes administrativas, intenta de nuevo más tarde',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
  },
});
