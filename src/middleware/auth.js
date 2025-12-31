import config from '../config/index.js';
import { error } from '../utils/response.js';

/**
 * Middleware de autenticación con API Key
 * Valida que el header X-API-KEY coincida con la configurada
 */
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  // Validar que existe API Key configurada
  if (!config.apiKey) {
    return error(
      res,
      'API_KEY_NOT_CONFIGURED',
      'API Key no configurada en el servidor',
      500
    );
  }

  // Validar que el cliente envió una API Key
  if (!apiKey) {
    return error(res, 'MISSING_API_KEY', 'API Key no proporcionada en el header X-API-KEY', 401);
  }

  // Validar que la API Key coincide
  if (apiKey !== config.apiKey) {
    return error(res, 'INVALID_API_KEY', 'API Key inválida', 401);
  }

  next();
};

/**
 * Middleware para validar JWT (preparado para dashboard futuro)
 * Por ahora solo valida que existe el header, sin verificar el token
 */
export const validateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(
      res,
      'MISSING_AUTHORIZATION',
      'Token de autenticación no proporcionado',
      401
    );
  }

  // TODO: Implementar verificación de JWT cuando se implemente el dashboard
  // const token = authHeader.split(' ')[1];
  // try {
  //   const decoded = jwt.verify(token, config.jwtSecret);
  //   req.user = decoded;
  //   next();
  // } catch (err) {
  //   return error(res, 'INVALID_TOKEN', 'Token inválido o expirado', 401);
  // }

  // Por ahora solo pasamos
  next();
};
