import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import { httpLogger, logger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes
import uploadRoutes from './routes/upload.js';
import healthRoutes from './routes/health.js';
import optimizeRoutes from './routes/optimize.js';
import imagesRoutes from './routes/images.js';
import statsRoutes from './routes/stats.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear app Express
const app = express();

// Trust proxy (importante para obtener IP real detrás de Traefik)
app.set('trust proxy', 1);

// Security headers con Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Deshabilitado para servir imágenes
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permitir cross-origin para imágenes
  })
);

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (ej: Postman, curl)
    if (!origin) return callback(null, true);

    // En desarrollo, permitir cualquier origen
    if (config.nodeEnv === 'development') {
      return callback(null, true);
    }

    // En producción, validar contra lista de orígenes permitidos
    if (config.allowedOrigins.length === 0 || config.allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Compression (gzip/brotli)
app.use(compression());

// Body parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// HTTP logger (Morgan → Winston)
app.use(httpLogger);

// Static files - Dashboard futuro
app.use(express.static(path.join(__dirname, '../public')));

// Static files - Uploads (servir archivos optimizados)
// Si uploadDir es absoluto, usarlo directamente; si es relativo, hacer join
const uploadsPath = path.isAbsolute(config.uploadDir)
  ? config.uploadDir
  : path.join(__dirname, '..', config.uploadDir);

app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1y', // Cache por 1 año
  immutable: true,
  setHeaders: (res, filepath) => {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('X-Content-Type-Options', 'nosniff');
  },
}));

// API Routes
app.use('/health', healthRoutes);
app.use('/upload', uploadRoutes);
app.use('/optimize', optimizeRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/stats', statsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SaBio Image Service',
    version: '1.0.0',
    status: 'running',
    docs: 'https://github.com/tuusuario/sabio-crm-fs/tree/main/image-service',
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (debe ser el último middleware)
app.use(errorHandler);

// Iniciar servidor
const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`🚀 SaBio Image Service iniciado en puerto ${PORT}`);
  logger.info(`📦 Entorno: ${config.nodeEnv}`);
  logger.info(`🌐 URL pública: ${config.publicUrl}`);
  logger.info(`📁 Directorio de uploads: ${config.uploadDir}`);
  logger.info(`🔒 API Key configurada: ${config.apiKey ? 'Sí' : 'No'}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`\n${signal} recibido. Cerrando servidor gracefully...`);

  server.close(() => {
    logger.info('Servidor cerrado. Saliendo del proceso.');
    process.exit(0);
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    logger.error('Forzando cierre del servidor...');
    process.exit(1);
  }, 10000);
};

// Manejar señales de cierre
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejar errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  // Cerrar servidor después de error crítico
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

export default app;
