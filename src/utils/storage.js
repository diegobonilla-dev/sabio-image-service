import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import config from '../config/index.js';

/**
 * Configuración de Sharp para evitar bloqueo de archivos
 * Deshabilitar caché de archivos para permitir eliminación inmediata
 */
sharp.cache({ files: 0 });

/**
 * Utilidades para gestión de filesystem
 */

/**
 * Asegura que un directorio existe, si no lo crea
 * @param {string} dirPath - Path del directorio
 */
export const ensureDir = async (dirPath) => {
  try {
    if (!existsSync(dirPath)) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  } catch (err) {
    throw new Error(`Error al crear directorio ${dirPath}: ${err.message}`);
  }
};

/**
 * Guarda archivo en disco
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} filePath - Path completo donde guardar
 * @returns {Promise<number>} Tamaño del archivo guardado
 */
export const saveFile = async (buffer, filePath) => {
  try {
    const dir = path.dirname(filePath);
    await ensureDir(dir);
    await fs.writeFile(filePath, buffer);
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (err) {
    throw new Error(`Error al guardar archivo ${filePath}: ${err.message}`);
  }
};

/**
 * Elimina archivo del disco con reintentos para manejar EBUSY/EPERM
 * Este error ocurre cuando Sharp u otro proceso está leyendo el archivo
 * @param {string} filePath - Path del archivo a eliminar
 * @param {number} maxRetries - Número máximo de reintentos
 * @returns {Promise<boolean>} true si se eliminó, false si no existía
 */
export const deleteFile = async (filePath, maxRetries = 5) => {
  if (!existsSync(filePath)) {
    return false;
  }

  // Forzar limpieza de Sharp antes de eliminar para liberar cualquier archivo abierto
  sharp.cache(false);
  if (global.gc) {
    global.gc(); // Forzar garbage collection si está disponible
  }

  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await fs.unlink(filePath);
      // Restaurar caché de Sharp después de eliminación exitosa
      sharp.cache({ files: 0 });
      return true;
    } catch (err) {
      lastError = err;
      // Si es EBUSY/EPERM (archivo en uso), esperar y reintentar
      if ((err.code === 'EBUSY' || err.code === 'EPERM') && attempt < maxRetries - 1) {
        // Delay exponencial: 200ms, 400ms, 600ms, 800ms, 1000ms
        await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
        // Forzar limpieza nuevamente antes del siguiente intento
        sharp.cache(false);
        if (global.gc) {
          global.gc();
        }
        continue;
      }
      // Si no es EBUSY/EPERM o ya agotamos los reintentos, lanzar el error
      break;
    }
  }

  // Restaurar caché incluso si falló
  sharp.cache({ files: 0 });
  throw new Error(`Error al eliminar archivo ${filePath}: ${lastError.message}`);
};

/**
 * Lista imágenes con paginación
 * @param {string} folder - Carpeta a listar (opcional)
 * @param {object} options - Opciones de listado (page, limit, sort)
 * @returns {Promise<object>} { images, pagination }
 */
export const listImages = async (folder = null, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = 'date', // date, size, name
  } = options;

  try {
    const uploadDir = config.uploadDir;
    const searchDir = folder ? path.join(uploadDir, folder) : uploadDir;

    if (!existsSync(searchDir)) {
      return { images: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    // Recopilar todos los archivos recursivamente
    const images = [];
    await collectImages(searchDir, uploadDir, images);

    // Ordenar
    if (sort === 'date') {
      images.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (sort === 'size') {
      images.sort((a, b) => b.size - a.size);
    } else if (sort === 'name') {
      images.sort((a, b) => a.filename.localeCompare(b.filename));
    }

    // Filtrar solo originales (no thumbnails ni small)
    const originals = images.filter(
      (img) => !img.filename.includes('-thumb.') && !img.filename.includes('-small.')
    );

    // Paginación
    const total = originals.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedImages = originals.slice(start, end);

    // Construir URLs completas
    const imagesWithUrls = paginatedImages.map((img) => ({
      path: img.relativePath,
      url: `${config.publicUrl}/uploads/${img.relativePath}`,
      thumbnail: `${config.publicUrl}/uploads/${img.relativePath.replace(/(\.\w+)$/, '-thumb$1')}`,
      small: `${config.publicUrl}/uploads/${img.relativePath.replace(/(\.\w+)$/, '-small$1')}`,
      size: img.size,
      createdAt: img.createdAt.toISOString(),
      folder: img.folder,
      filename: img.filename,
      dimensions: img.dimensions,
    }));

    return {
      images: imagesWithUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  } catch (err) {
    throw new Error(`Error al listar imágenes: ${err.message}`);
  }
};

/**
 * Recopila imágenes recursivamente
 * @param {string} dir - Directorio a escanear
 * @param {string} baseDir - Directorio base para paths relativos
 * @param {Array} images - Array donde acumular resultados
 */
const collectImages = async (dir, baseDir, images) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await collectImages(fullPath, baseDir, images);
    } else if (entry.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)) {
      const stats = await fs.stat(fullPath);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const parts = relativePath.split('/');

      // Obtener dimensiones reales con Sharp
      let dimensions = { width: 0, height: 0 };
      try {
        // Crear instancia de Sharp con opciones que evitan bloquear el archivo
        const sharpInstance = sharp(fullPath, {
          sequentialRead: true, // Lectura secuencial para liberar recursos más rápido
          failOnError: false,
        });

        const metadata = await sharpInstance.metadata();
        dimensions = {
          width: metadata.width || 0,
          height: metadata.height || 0,
        };

        // Destruir la instancia explícitamente para liberar el archivo
        sharpInstance.destroy();
      } catch (err) {
        // Si falla, mantener dimensiones en 0
        console.error(`Error obteniendo dimensiones de ${relativePath}:`, err.message);
      }

      images.push({
        filename: entry.name,
        relativePath,
        folder: parts[0] || 'general',
        size: stats.size,
        createdAt: stats.birthtime,
        dimensions,
      });
    }
  }
};

/**
 * Obtiene estadísticas de uso del servicio
 * @returns {Promise<object>} Estadísticas generales
 */
export const getStats = async () => {
  try {
    const uploadDir = config.uploadDir;

    if (!existsSync(uploadDir)) {
      return {
        totalImages: 0,
        totalSize: 0,
        folders: {},
        thisMonth: 0,
      };
    }

    const images = [];
    await collectImages(uploadDir, uploadDir, images);

    // Filtrar solo originales
    const originals = images.filter(
      (img) => !img.filename.includes('-thumb.') && !img.filename.includes('-small.')
    );

    // Total de imágenes
    const totalImages = originals.length;

    // Total de tamaño (incluye todas las variantes)
    const totalSizeBytes = images.reduce((sum, img) => sum + img.size, 0);

    // Por carpeta con tamaños
    const folders = {};
    originals.forEach((img) => {
      if (!folders[img.folder]) {
        folders[img.folder] = { count: 0, size: 0 };
      }
      folders[img.folder].count += 1;
    });

    // Calcular tamaño por carpeta (incluye todas las variantes)
    images.forEach((img) => {
      if (folders[img.folder]) {
        folders[img.folder].size += img.size;
      }
    });

    // Este mes
    const now = new Date();
    const thisMonth = originals.filter((img) => {
      return (
        img.createdAt.getMonth() === now.getMonth() &&
        img.createdAt.getFullYear() === now.getFullYear()
      );
    }).length;

    return {
      totalImages,
      totalSize: totalSizeBytes, // Devolver como número, no string
      folders,
      thisMonth,
    };
  } catch (err) {
    throw new Error(`Error al obtener estadísticas: ${err.message}`);
  }
};
