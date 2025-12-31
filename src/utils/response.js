/**
 * Helpers para respuestas HTTP estandarizadas
 */

/**
 * Respuesta exitosa
 * @param {object} res - Response object de Express
 * @param {any} data - Datos a retornar
 * @param {number} statusCode - Código HTTP (default: 200)
 */
export const success = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
  });
};

/**
 * Respuesta de error
 * @param {object} res - Response object de Express
 * @param {string} code - Código de error personalizado
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código HTTP (default: 400)
 * @param {object} details - Detalles adicionales (opcional)
 */
export const error = (res, code, message, statusCode = 400, details = {}) => {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(Object.keys(details).length > 0 && { details }),
    },
  });
};

/**
 * Custom Error Class para manejo de errores de aplicación
 */
export class AppError extends Error {
  constructor(code, message, statusCode = 400, details = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // Indica que es un error esperado

    Error.captureStackTrace(this, this.constructor);
  }
}
