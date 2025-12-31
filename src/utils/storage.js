import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import config from '../config/index.js';

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
 * Elimina archivo del disco
 * @param {string} filePath - Path del archivo a eliminar
 * @returns {Promise<boolean>} true si se eliminó, false si no existía
 */
export const deleteFile = async (filePath) => {
  try {
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
      return true;
    }
    return false;
  } catch (err) {
    throw new Error(`Error al eliminar archivo ${filePath}: ${err.message}`);
  }
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

      images.push({
        filename: entry.name,
        relativePath,
        folder: parts[0] || 'general',
        size: stats.size,
        createdAt: stats.birthtime,
        dimensions: { width: 0, height: 0 }, // Se puede obtener con Sharp si es necesario
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
        totalSize: '0 B',
        totalSizeBytes: 0,
        byFolder: {},
        thisMonth: 0,
        diskUsage: { used: '0 B', available: 'N/A', percentage: 0 },
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
    const totalSize = formatBytes(totalSizeBytes);

    // Por carpeta
    const byFolder = {};
    originals.forEach((img) => {
      byFolder[img.folder] = (byFolder[img.folder] || 0) + 1;
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
      totalSize,
      totalSizeBytes,
      byFolder,
      thisMonth,
      diskUsage: {
        used: totalSize,
        available: 'N/A', // Requiere librería adicional para obtener espacio en disco
        percentage: 0,
      },
    };
  } catch (err) {
    throw new Error(`Error al obtener estadísticas: ${err.message}`);
  }
};

/**
 * Formatea bytes a formato legible
 * @param {number} bytes - Bytes
 * @param {number} decimals - Decimales
 * @returns {string} Formato legible (ej: "1.5 MB")
 */
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
