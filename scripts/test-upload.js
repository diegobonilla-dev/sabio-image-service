import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const API_KEY = process.env.API_KEY || 'local-dev-key-change-in-production';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

/**
 * Test 1: Health Check
 */
async function testHealthCheck() {
  log.info('Test 1: Health Check');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.data.success && response.data.data.status === 'ok') {
      log.success('Health check exitoso');
      console.log('   Uptime:', response.data.data.uptime, 'segundos');
      console.log('   Memory:', response.data.data.memory.used);
    } else {
      log.error('Health check falló');
    }
  } catch (error) {
    log.error(`Health check error: ${error.message}`);
  }
  console.log('');
}

/**
 * Test 2: Upload de imagen
 */
async function testUpload() {
  log.info('Test 2: Upload de imagen');

  // Crear imagen de prueba si no existe
  const testImagePath = path.join(__dirname, 'test-image.jpg');

  if (!fs.existsSync(testImagePath)) {
    log.warn('Archivo test-image.jpg no encontrado, descargando imagen de prueba...');
    try {
      // Descargar imagen de prueba real
      const response = await axios.get('https://picsum.photos/800/600', {
        responseType: 'arraybuffer'
      });
      fs.writeFileSync(testImagePath, response.data);
      log.success('Imagen de prueba descargada exitosamente');
    } catch (error) {
      log.error('No se pudo descargar imagen de prueba. Por favor, agrega manualmente test-image.jpg');
      return;
    }
  }

  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(testImagePath));
    formData.append('folder', 'test');

    const response = await axios.post(`${BASE_URL}/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'X-API-KEY': API_KEY,
      },
    });

    if (response.data.success) {
      log.success('Upload exitoso');
      console.log('   URL:', response.data.data.url);
      console.log('   Thumbnail:', response.data.data.thumbnail);
      console.log('   Small:', response.data.data.small);
      console.log('   Tamaño:', response.data.data.size, 'bytes');
      console.log('   Folder:', response.data.data.folder);
      return response.data.data;
    } else {
      log.error('Upload falló');
    }
  } catch (error) {
    if (error.response) {
      log.error(`Upload error: ${error.response.data.error?.message || error.message}`);
    } else {
      log.error(`Upload error: ${error.message}`);
    }
  }
  console.log('');
}

/**
 * Test 3: Obtener estadísticas
 */
async function testStats() {
  log.info('Test 3: Estadísticas del servicio');
  try {
    const response = await axios.get(`${BASE_URL}/api/stats`, {
      headers: {
        'X-API-KEY': API_KEY,
      },
    });

    if (response.data.success) {
      log.success('Estadísticas obtenidas');
      console.log('   Total imágenes:', response.data.data.totalImages);
      console.log('   Tamaño total:', response.data.data.totalSize);
      console.log('   Este mes:', response.data.data.thisMonth);
      console.log('   Por folder:', JSON.stringify(response.data.data.byFolder, null, 2));
    } else {
      log.error('Stats falló');
    }
  } catch (error) {
    if (error.response) {
      log.error(`Stats error: ${error.response.data.error?.message || error.message}`);
    } else {
      log.error(`Stats error: ${error.message}`);
    }
  }
  console.log('');
}

/**
 * Test 4: Listar imágenes
 */
async function testListImages() {
  log.info('Test 4: Listar imágenes');
  try {
    const response = await axios.get(`${BASE_URL}/api/images?page=1&limit=5`, {
      headers: {
        'X-API-KEY': API_KEY,
      },
    });

    if (response.data.success) {
      log.success('Listado exitoso');
      console.log('   Total:', response.data.data.pagination.total);
      console.log('   Página:', response.data.data.pagination.page);
      console.log('   Imágenes en esta página:', response.data.data.images.length);
    } else {
      log.error('Listado falló');
    }
  } catch (error) {
    if (error.response) {
      log.error(`List error: ${error.response.data.error?.message || error.message}`);
    } else {
      log.error(`List error: ${error.message}`);
    }
  }
  console.log('');
}

/**
 * Test 5: API Key inválida
 */
async function testInvalidApiKey() {
  log.info('Test 5: Validación de API Key inválida');
  try {
    await axios.get(`${BASE_URL}/api/stats`, {
      headers: {
        'X-API-KEY': 'invalid-key',
      },
    });
    log.error('No se validó la API Key (esto es malo)');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log.success('API Key inválida rechazada correctamente');
    } else {
      log.error(`Error inesperado: ${error.message}`);
    }
  }
  console.log('');
}

/**
 * Ejecutar todos los tests
 */
async function runAllTests() {
  console.log('\n========================================');
  console.log('  SABIO IMAGE SERVICE - TEST SUITE');
  console.log('========================================\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...`);
  console.log('');

  await testHealthCheck();
  await testUpload();
  await testStats();
  await testListImages();
  await testInvalidApiKey();

  console.log('========================================');
  console.log('  TESTS COMPLETADOS');
  console.log('========================================\n');
}

// Ejecutar
runAllTests().catch((err) => {
  console.error('Error ejecutando tests:', err);
  process.exit(1);
});
