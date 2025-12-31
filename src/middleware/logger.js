import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import morgan from 'morgan';
import config from '../config/index.js';

/**
 * Configuración de Winston para logging de aplicación
 */

// Formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...metadata }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Agregar metadata si existe
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }

    // Agregar stack trace si es un error
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// Transports
const transports = [];

// Console transport (siempre activo)
transports.push(
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), customFormat),
  })
);

// File transport con rotación diaria (solo en producción)
if (config.nodeEnv === 'production') {
  transports.push(
    new DailyRotateFile({
      filename: 'logs/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m', // Rotar cuando el archivo llegue a 20MB
      maxFiles: '14d', // Mantener logs de 14 días
      format: customFormat,
    })
  );

  // Archivo separado para errores
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d', // Mantener errores por 30 días
      level: 'error',
      format: customFormat,
    })
  );
}

// Crear logger
export const logger = winston.createLogger({
  level: config.logLevel,
  transports,
});

/**
 * Morgan middleware para HTTP logging
 */

// Custom token para log de usuario/IP
morgan.token('real-ip', (req) => {
  return req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
});

// Formato de log HTTP
const morganFormat =
  config.nodeEnv === 'production'
    ? ':real-ip :method :url :status :res[content-length] - :response-time ms'
    : ':method :url :status :res[content-length] - :response-time ms';

// Stream personalizado que envía logs a Winston
const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Middleware de Morgan
export const httpLogger = morgan(morganFormat, {
  stream: morganStream,
  skip: (req) => {
    // Skip health checks para no llenar logs
    return req.url === '/health';
  },
});

export default logger;
