import sharp from 'sharp';
import config from '../config/index.js';

/**
 * Utilidades para optimización de imágenes con Sharp
 */

/**
 * Optimiza imagen y la redimensiona
 * @param {Buffer} buffer - Buffer de la imagen original
 * @param {object} options - Opciones de optimización
 * @returns {Promise<Buffer>} Buffer de la imagen optimizada
 */
export const optimizeImage = async (buffer, options = {}) => {
  const {
    width = 1200,
    height = 1200,
    quality = config.defaultQuality,
    format = 'webp',
    fit = 'inside',
  } = options;

  try {
    return await sharp(buffer)
      .resize(width, height, {
        fit, // inside, cover, contain, fill, outside
        withoutEnlargement: true, // No agranda imágenes pequeñas
      })
      .rotate() // Auto-rotate según EXIF
      .webp({
        quality,
        effort: 4, // 0-6, mayor = mejor compresión pero más lento
      })
      .withMetadata({
        // Strip metadata sensible por privacidad
        orientation: undefined,
        exif: undefined,
      })
      .toBuffer();
  } catch (err) {
    throw new Error(`Error al optimizar imagen: ${err.message}`);
  }
};

/**
 * Crea thumbnail (miniatura) de la imagen
 * @param {Buffer} buffer - Buffer de la imagen original
 * @returns {Promise<Buffer>} Buffer del thumbnail
 */
export const createThumbnail = async (buffer) => {
  try {
    return await sharp(buffer)
      .resize(300, 300, {
        fit: 'cover', // Crop centrado
        position: 'center',
      })
      .rotate()
      .webp({ quality: 75 })
      .toBuffer();
  } catch (err) {
    throw new Error(`Error al crear thumbnail: ${err.message}`);
  }
};

/**
 * Crea versión "small" de la imagen
 * @param {Buffer} buffer - Buffer de la imagen original
 * @returns {Promise<Buffer>} Buffer de la imagen small
 */
export const createSmall = async (buffer) => {
  try {
    return await sharp(buffer)
      .resize(600, 600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .rotate()
      .webp({ quality: 78 })
      .toBuffer();
  } catch (err) {
    throw new Error(`Error al crear versión small: ${err.message}`);
  }
};

/**
 * Obtiene metadata de la imagen
 * @param {Buffer} buffer - Buffer de la imagen
 * @returns {Promise<object>} Metadata (width, height, format, size)
 */
export const getMetadata = async (buffer) => {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size,
      hasAlpha: metadata.hasAlpha,
    };
  } catch (err) {
    throw new Error(`Error al obtener metadata: ${err.message}`);
  }
};

/**
 * Optimización on-the-fly con parámetros personalizados
 * @param {string} filePath - Path del archivo original
 * @param {object} params - Query params (w, h, q, fit)
 * @returns {Promise<Buffer>} Buffer de la imagen optimizada
 */
export const optimizeOnTheFly = async (filePath, params = {}) => {
  const {
    w: width,
    h: height,
    q: quality = config.defaultQuality,
    fit = 'inside',
  } = params;

  try {
    let pipeline = sharp(filePath).rotate();

    // Aplicar resize solo si se especificaron dimensiones
    if (width || height) {
      pipeline = pipeline.resize(
        width ? parseInt(width, 10) : null,
        height ? parseInt(height, 10) : null,
        {
          fit,
          withoutEnlargement: true,
        }
      );
    }

    return await pipeline
      .webp({ quality: parseInt(quality, 10) })
      .toBuffer();
  } catch (err) {
    throw new Error(`Error en optimización on-the-fly: ${err.message}`);
  }
};
