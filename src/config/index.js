import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuración centralizada del servicio
 * Lee variables de entorno y proporciona valores por defecto
 */
const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  publicUrl: process.env.PUBLIC_URL || 'http://localhost:3000',

  // Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB
  allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/webp,image/gif').split(','),
  defaultQuality: parseInt(process.env.DEFAULT_QUALITY, 10) || 80,

  // Storage
  uploadDir: process.env.UPLOAD_DIR || './uploads',

  // Security
  apiKey: process.env.API_KEY,
  jwtSecret: process.env.JWT_SECRET, // Para dashboard futuro

  // CORS
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 min
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,

  // Logging
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
};

// Validaciones críticas
if (!config.apiKey && config.nodeEnv === 'production') {
  console.warn('⚠️  WARNING: API_KEY no configurada en producción. Por favor, configura una API key segura.');
}

// Info de arranque
if (config.nodeEnv === 'development') {
  console.log('📋 Configuración cargada:', {
    nodeEnv: config.nodeEnv,
    port: config.port,
    publicUrl: config.publicUrl,
    maxFileSize: `${(config.maxFileSize / 1024 / 1024).toFixed(2)} MB`,
    allowedMimeTypes: config.allowedMimeTypes,
    uploadDir: config.uploadDir,
  });
}

export default config;
