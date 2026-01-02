# 🖼️ SaBio Image Service

Microservicio independiente de gestión y optimización de imágenes para el proyecto SaBio CRM.

## 📋 Características

- ✅ **Upload y optimización automática** con Sharp (WebP, calidad 80)
- ✅ **3 versiones por imagen**: original optimizada (1200px), thumbnail (300px), small (600px)
- ✅ **Estructura organizada**: `/uploads/{folder}/{YYYY}/{MM}/filename.webp`
- ✅ **Optimización on-the-fly**: Query params para resize dinámico
- ✅ **API REST completa**: Upload, Delete, List, Stats
- ✅ **Seguridad robusta**: API Key, Rate Limiting, validaciones
- ✅ **Logging profesional**: Winston + Morgan con rotación diaria
- ✅ **Docker optimizado**: Multi-stage build, ~50MB RAM
- ✅ **Health checks**: Listo para Coolify/Kubernetes
- ✅ **Dashboard preparado**: Estructura lista para futura UI web

## 🏗️ Arquitectura

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Backend   │ ───────>│  Image Service   │ ───────>│ Filesystem  │
│   (Node.js) │  HTTP   │  (Express + Sharp)│         │  /uploads   │
└─────────────┘         └──────────────────┘         └─────────────┘
                               │
                               │ API Key Auth
                               ▼
                        ┌──────────────┐
                        │   Traefik    │
                        │   (Coolify)  │
                        └──────────────┘
```

## 🚀 Instalación Local

### Prerequisitos

- Node.js >= 20.x
- npm >= 10.x
- Docker (opcional)

### 1. Clonar e instalar dependencias

```bash
cd image-service
npm install
```

### 2. Configurar variables de entorno

Copiar `.env.example` a `.env` y configurar:

```bash
cp .env.example .env
nano .env
```

Configuración mínima requerida:

```env
NODE_ENV=development
PORT=3000
PUBLIC_URL=http://localhost:3000
API_KEY=local-dev-key-change-in-production
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

El servidor iniciará en `http://localhost:3000`

### 4. Probar el servicio

```bash
npm test
```

Esto ejecutará el script de testing que valida todos los endpoints.

## 🐳 Deploy con Docker

### Desarrollo local

```bash
# Iniciar servicio
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

### Producción (manual)

```bash
# Build
docker build -t sabio-image-service:latest .

# Run
docker run -d \
  --name image-service \
  -p 3000:3000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/logs:/app/logs \
  -e NODE_ENV=production \
  -e API_KEY=your-secret-key \
  -e PUBLIC_URL=https://images.tudominio.com \
  sabio-image-service:latest
```

## ☁️ Deploy en Coolify

### Paso 1: Configurar DNS

1. Acceder a tu proveedor de DNS (ej: Cloudflare, Namecheap)
2. Agregar registro A:
   - **Host**: `images` (o `cdn`)
   - **Type**: A
   - **Value**: IP de tu VPS (ej: `123.45.67.89`)
   - **TTL**: 3600
3. Esperar propagación DNS (5-60 minutos)
4. Verificar: `ping images.tudominio.com`

### Paso 2: Crear Proyecto en Coolify

1. Login en Coolify: `https://coolify.tudominio.com`
2. **Projects** → **New Project**
3. Nombre: `sabio-image-service`
4. **New Resource** → **Docker Compose** (o **Dockerfile**)

### Paso 3: Conectar Repository

- **Type**: Git Repository
- **URL**: `https://github.com/tuusuario/sabio-crm-fs`
- **Branch**: `main`
- **Base Directory**: `/image-service`
- **Build Method**: Dockerfile

### Paso 4: Variables de Entorno

En Coolify, agregar las siguientes variables (sin comillas):

```
NODE_ENV=production
PORT=3000
PUBLIC_URL=https://images.tudominio.com
API_KEY=<generar-con-openssl-rand-base64-32>
MAX_FILE_SIZE=10485760
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/gif
DEFAULT_QUALITY=80
UPLOAD_DIR=/app/uploads
JWT_SECRET=<generar-otro-secret>
ALLOWED_ORIGINS=https://tudominio.com,https://api.tudominio.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Generar API Key segura:**

```bash
openssl rand -base64 32
```

### Paso 5: Volúmenes Persistentes

En Coolify, configurar **Persistent Volumes**:

| Host Path | Container Path |
|-----------|----------------|
| `/data/sabio-image-service/uploads` | `/app/uploads` |
| `/data/sabio-image-service/logs` | `/app/logs` |

### Paso 6: Configurar Dominio

1. En Coolify, ir a **Domains**
2. Agregar: `images.tudominio.com`
3. Coolify generará automáticamente:
   - Certificado SSL con Let's Encrypt
   - Traefik labels
   - Health checks

### Paso 7: Deploy

1. Click **Deploy**
2. Monitorear logs en Coolify
3. Esperar a que el servicio esté "Running"
4. Verificar:

```bash
curl https://images.tudominio.com/health
```

Respuesta esperada:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 123,
    "memory": { "used": "52 MB" }
  }
}
```

## 📚 API Documentation

### Autenticación

Todas las rutas protegidas requieren el header `X-API-KEY`:

```bash
X-API-KEY: tu-api-key-aqui
```

### Endpoints

#### 1. Health Check

```http
GET /health
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 3600,
    "memory": {
      "used": "52 MB",
      "usedBytes": 54525952
    },
    "timestamp": "2025-12-31T10:00:00Z"
  }
}
```

#### 2. Upload de Imagen

```http
POST /upload
Content-Type: multipart/form-data
X-API-KEY: your-api-key
```

**Body:**

- `image` (file): Archivo de imagen (JPEG, PNG, WebP, GIF)
- `folder` (string, opcional): Carpeta destino (default: `general`)

**Ejemplo con cURL:**

```bash
curl -X POST https://images.tudominio.com/upload \
  -H "X-API-KEY: your-api-key" \
  -F "image=@foto.jpg" \
  -F "folder=diagnostics"
```

**Respuesta (201 Created):**

```json
{
  "success": true,
  "data": {
    "url": "https://images.tudominio.com/uploads/diagnostics/2025/12/1735689600-a3f2c1.webp",
    "thumbnail": "https://images.tudominio.com/uploads/diagnostics/2025/12/1735689600-a3f2c1-thumb.webp",
    "small": "https://images.tudominio.com/uploads/diagnostics/2025/12/1735689600-a3f2c1-small.webp",
    "size": 245678,
    "width": 1200,
    "height": 900,
    "folder": "diagnostics",
    "filename": "1735689600-a3f2c1.webp",
    "path": "diagnostics/2025/12/1735689600-a3f2c1.webp"
  }
}
```

#### 3. Servir Archivo Estático

```http
GET /uploads/{folder}/{year}/{month}/{filename}
```

**Ejemplo:**

```bash
curl https://images.tudominio.com/uploads/diagnostics/2025/12/1735689600-a3f2c1.webp
```

**Headers de respuesta:**

```
Content-Type: image/webp
Cache-Control: public, max-age=31536000, immutable
```

#### 4. Optimización On-the-Fly

```http
GET /optimize/{folder}/{year}/{month}/{filename}?w={width}&h={height}&q={quality}&fit={fit}
```

**Query Params:**

- `w`: Width en px (1-5000)
- `h`: Height en px (1-5000)
- `q`: Quality (1-100, default: 80)
- `fit`: `cover` | `contain` | `fill` | `inside` | `outside` (default: `inside`)

**Ejemplos:**

```bash
# Resize a 500px de ancho
curl "https://images.tudominio.com/optimize/diagnostics/2025/12/file.webp?w=500"

# Crop centrado 800x600
curl "https://images.tudominio.com/optimize/diagnostics/2025/12/file.webp?w=800&h=600&fit=cover"

# Calidad reducida
curl "https://images.tudominio.com/optimize/diagnostics/2025/12/file.webp?q=60"
```

#### 5. Listar Imágenes

```http
GET /api/images?folder={folder}&page={page}&limit={limit}&sort={sort}
X-API-KEY: your-api-key
```

**Query Params:**

- `folder` (opcional): Filtrar por carpeta
- `page` (default: 1): Número de página
- `limit` (default: 20, max: 100): Items por página
- `sort` (default: `date`): `date` | `size` | `name`

**Ejemplo:**

```bash
curl "https://images.tudominio.com/api/images?folder=diagnostics&page=1&limit=20" \
  -H "X-API-KEY: your-api-key"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "images": [
      {
        "path": "diagnostics/2025/12/1735689600-a3f2c1.webp",
        "url": "https://images.tudominio.com/uploads/diagnostics/2025/12/1735689600-a3f2c1.webp",
        "thumbnail": "https://images.tudominio.com/uploads/diagnostics/2025/12/1735689600-a3f2c1-thumb.webp",
        "small": "https://images.tudominio.com/uploads/diagnostics/2025/12/1735689600-a3f2c1-small.webp",
        "size": 245678,
        "createdAt": "2025-12-31T10:00:00Z",
        "folder": "diagnostics",
        "filename": "1735689600-a3f2c1.webp",
        "dimensions": { "width": 1200, "height": 900 }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### 6. Eliminar Imagen

```http
DELETE /api/images/{encodedPath}
X-API-KEY: your-api-key
```

**Nota:** El path debe estar URL-encoded.

**Ejemplo:**

```bash
# Path original: diagnostics/2025/12/1735689600-a3f2c1.webp
# Path encoded: diagnostics%2F2025%2F12%2F1735689600-a3f2c1.webp

curl -X DELETE "https://images.tudominio.com/api/images/diagnostics%2F2025%2F12%2F1735689600-a3f2c1.webp" \
  -H "X-API-KEY: your-api-key"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "deleted": [
      "diagnostics/2025/12/1735689600-a3f2c1.webp",
      "diagnostics/2025/12/1735689600-a3f2c1-thumb.webp",
      "diagnostics/2025/12/1735689600-a3f2c1-small.webp"
    ]
  }
}
```

#### 7. Estadísticas

```http
GET /api/stats
X-API-KEY: your-api-key
```

**Ejemplo:**

```bash
curl https://images.tudominio.com/api/stats \
  -H "X-API-KEY: your-api-key"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "totalImages": 342,
    "totalSize": "1.2 GB",
    "totalSizeBytes": 1288490188,
    "byFolder": {
      "diagnostics": 150,
      "avatars": 89,
      "products": 103
    },
    "thisMonth": 45,
    "diskUsage": {
      "used": "1.2 GB",
      "available": "N/A",
      "percentage": 0
    }
  }
}
```

## 🔗 Integración con Backend

### 1. Agregar variables de entorno en `/backend/.env`:

```env
IMAGE_SERVICE_URL=https://images.tudominio.com
IMAGE_SERVICE_API_KEY=tu-api-key-aqui
```

### 2. Importar helper en controladores:

```javascript
import { uploadImage, deleteImage, base64ToBuffer } from '../utils/imageService.js';

// Ejemplo: Upload de imagen desde Base64
export const createDiagnostico = async (req, res) => {
  try {
    const { foto_evidencia, ...diagnosticoData } = req.body;

    // Si viene Base64, convertir y subir
    if (foto_evidencia && foto_evidencia.startsWith('data:image')) {
      const buffer = base64ToBuffer(foto_evidencia);
      const imageResult = await uploadImage(buffer, 'diagnostics');

      // Guardar solo la URL en DB
      diagnosticoData.foto_evidencia = imageResult.url;
      diagnosticoData.foto_evidencia_thumbnail = imageResult.thumbnail;
    }

    const diagnostico = await Diagnostico.create(diagnosticoData);
    res.json({ success: true, data: diagnostico });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Ejemplo: Eliminar imagen al borrar diagnóstico
export const deleteDiagnostico = async (req, res) => {
  try {
    const diagnostico = await Diagnostico.findById(req.params.id);

    // Extraer path de la URL y eliminar
    if (diagnostico.foto_evidencia) {
      const path = extractPathFromUrl(diagnostico.foto_evidencia);
      await deleteImage(path);
    }

    await diagnostico.deleteOne();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### 3. Funciones disponibles:

```javascript
// Upload
const result = await uploadImage(buffer, 'diagnostics');
// result.url, result.thumbnail, result.small

// Delete
const deleted = await deleteImage('diagnostics/2025/12/file.webp');

// List
const images = await listImages({ folder: 'diagnostics', page: 1 });

// Stats
const stats = await getImageStats();

// Conversión Base64
const buffer = base64ToBuffer('data:image/jpeg;base64,...');

// Extraer path de URL
const path = extractPathFromUrl('https://images.tudominio.com/uploads/.../file.webp');

// Health check
const isHealthy = await checkImageServiceHealth();
```

## 🔒 Seguridad

### Validaciones Implementadas

- ✅ **API Key Protection**: Rutas críticas protegidas con X-API-KEY
- ✅ **Rate Limiting**: 100 requests/15min por IP
- ✅ **File Type Validation**: Solo JPEG, PNG, WebP, GIF
- ✅ **File Size Limit**: Max 10MB (configurable)
- ✅ **Filename Sanitization**: Previene directory traversal
- ✅ **Metadata Stripping**: Elimina EXIF para privacidad
- ✅ **Helmet.js**: Headers de seguridad HTTP
- ✅ **CORS**: Solo dominios autorizados

### Recomendaciones de Producción

1. **API Key fuerte**: Generar con `openssl rand -base64 32`
2. **HTTPS obligatorio**: Configurar Traefik/Coolify correctamente
3. **Firewall**: Restringir acceso a puertos innecesarios
4. **Backups**: Respaldar `/uploads` regularmente
5. **Monitoreo**: Configurar alertas de disco lleno
6. **Rate limiting personalizado**: Ajustar según tráfico real

## 📊 Monitoreo

### Logs

```bash
# Development
npm run dev

# Production
tail -f logs/app-2025-12-31.log
tail -f logs/error-2025-12-31.log

# Docker
docker logs -f sabio-image-service
```

### Métricas

```bash
# Health check
curl https://images.tudominio.com/health

# Estadísticas
curl https://images.tudominio.com/api/stats \
  -H "X-API-KEY: your-key"
```

## 🛠️ Troubleshooting

### Problema: "Error: spawn sharp ENOENT"

**Solución:**

```bash
npm rebuild sharp
```

### Problema: "413 Payload Too Large"

**Solución:**

1. Aumentar `MAX_FILE_SIZE` en `.env`
2. Si usas nginx/Traefik, aumentar `client_max_body_size`

### Problema: Imágenes no se sirven

**Solución:**

```bash
# Verificar permisos
chown -R node:node /app/uploads

# En Docker
docker exec sabio-image-service ls -la /app/uploads
```

### Problema: Memory leaks en producción

**Solución:**

```javascript
// En utils/sharp.js, agregar:
sharp.cache(false); // Desabilita caché de Sharp si hay problemas de memoria
```

## 🗺️ Roadmap

### Fase 1 (Actual - MVP) ✅

- Upload y optimización automática
- Servir archivos estáticos
- API REST completa
- Endpoints protegidos con API Key

### Fase 2 (Dashboard Web)

- Panel de administración en `/public`
- Login con JWT
- Galería visual de imágenes
- Búsqueda y filtros avanzados
- Edición inline de imágenes
- Bulk operations

### Fase 3 (Optimizaciones)

- CDN integration (Cloudflare R2, AWS S3)
- Redis cache para optimizaciones
- Image compression algorithms (mozjpeg, pngquant)
- WebP → AVIF support
- Lazy loading automático
- Responsive images (srcset generation)

### Fase 4 (Analytics)

- Tracking de descargas
- Bandwidth monitoring
- Storage optimization recommendations
- Duplicate detection

## 📄 Licencia

MIT © SaBio Team

## 🤝 Contribuir

1. Fork el repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'Agrega nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## 📞 Soporte

- Documentación: Este README
- Issues: https://github.com/diegobonilla-dev/sabio-image-service/issues
- Email: diego.bonilla@sabio.com.co

---

**Hecho con ❤️ por el equipo SaBio**
