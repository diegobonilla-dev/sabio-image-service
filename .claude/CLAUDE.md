# SaBio Image Service

## Propósito
Microservicio especializado en procesamiento, optimización y almacenamiento de imágenes para SaBio CRM.

## Stack Tecnológico
- **Runtime**: Node.js 20+ (ES Modules)
- **Framework**: Express.js 4.18.2
- **Procesamiento**: Sharp 0.33.1 (libvips)
- **Upload**: Multer 1.4.5-lts.1
- **Seguridad**: Helmet 7.1.0, CORS 2.8.5, express-rate-limit 7.1.5
- **Logging**: Winston 3.11.0 + Morgan 1.10.0
- **IDs**: nanoid 5.0.4
- **Compression**: gzip/brotli

## Estructura del Proyecto

```
image-service/
├── src/
│   ├── config/
│   │   └── index.js             # Configuración centralizada
│   ├── middleware/
│   │   ├── auth.js              # Validación API Key
│   │   ├── validator.js         # Validaciones de archivos
│   │   ├── rateLimiter.js       # Rate limiting (3 tipos)
│   │   ├── errorHandler.js      # Manejo de errores
│   │   └── logger.js            # Winston logger
│   ├── routes/
│   │   ├── upload.js            # POST /upload
│   │   ├── optimize.js          # GET /optimize (on-the-fly)
│   │   ├── images.js            # GET/DELETE /api/images
│   │   ├── health.js            # GET /health
│   │   └── stats.js             # GET /api/stats
│   ├── utils/
│   │   ├── sharp.js             # Funciones Sharp
│   │   ├── storage.js           # Gestión filesystem
│   │   └── response.js          # Helpers respuestas HTTP
│   └── server.js                # Entry point
├── uploads/                     # Almacenamiento imágenes
│   └── {folder}/{YYYY}/{MM}/   # Estructura organizada
├── logs/                        # Winston logs
├── public/                      # UI futura (dashboard)
├── scripts/                     # Utilidades (test-upload.js)
├── .env                         # Variables de entorno
├── .env.example
├── Dockerfile                   # Multi-stage build
├── docker-compose.yml
├── QUICK_START.md
├── README.md
└── package.json
```

## Funcionalidades Principales

### 1. Upload de Imágenes

**Endpoint**: POST /upload

**Proceso**:
1. Validar API Key (X-API-KEY header)
2. Multer captura archivo en memoria
3. Validar MIME type y tamaño (max 10MB)
4. Obtener metadata original
5. Generar 3 versiones con Sharp:
   - **Original optimizado**: 1200x1200px (fit: inside, no agrandar)
   - **Thumbnail**: 300x300px (fit: cover, centrado)
   - **Small**: 600x600px (fit: inside)
6. Convertir a WebP (calidad 80/75/78)
7. Guardar en: `uploads/{folder}/{YYYY}/{MM}/timestamp-randomId.webp`
8. Retornar URLs de las 3 versiones

**Response**:
```json
{
  "url": "https://.../folder/2025/01/timestamp-id.webp",
  "thumbnail": "https://.../folder/2025/01/timestamp-id-thumb.webp",
  "small": "https://.../folder/2025/01/timestamp-id-small.webp",
  "size": 245678,
  "width": 1200,
  "height": 900,
  "folder": "diagnostics",
  "filename": "timestamp-id.webp",
  "path": "diagnostics/2025/01/timestamp-id.webp"
}
```

### 2. Optimización On-the-Fly

**Endpoint**: GET /optimize/{folder}/{year}/{month}/{filename}?w=800&h=600&q=75&fit=cover

**Query Params**:
- `w`: width (default: original)
- `h`: height (default: original)
- `q`: quality 1-100 (default: 80)
- `fit`: cover|contain|fill|inside|outside (default: inside)

**Características**:
- Cache headers: max-age=86400 (1 día)
- No guarda versión optimizada
- Genera bajo demanda

### 3. Gestión de Imágenes

**Listar**: GET /api/images?folder=X&page=1&limit=24&sort=date-desc

**Eliminar**: DELETE /api/images/{encodedPath}
- Elimina 3 versiones (original, thumb, small)
- Reintentos automáticos (5 max) para archivos en uso

**Estadísticas**: GET /api/stats
```json
{
  "totalImages": 342,
  "totalSize": 1288490188,
  "folders": {
    "diagnostics": { "count": 150, "size": 500000000 }
  },
  "thisMonth": 45
}
```

## Procesamiento con Sharp

### Configuración
```javascript
sharp.cache({ files: 0 });  // Desabilitar cache para eliminar archivos inmediatamente
```

### Pipeline de Optimización
```javascript
sharp(buffer)
  .resize(width, height, {
    fit: 'inside',
    withoutEnlargement: true  // No agrandar imágenes pequeñas
  })
  .rotate()  // Auto-rotate según EXIF
  .webp({ quality: 80, effort: 4 })
  .withMetadata({
    orientation: undefined,  // Eliminar metadata sensible
    exif: undefined
  })
  .toBuffer()
```

### Funciones Principales (utils/sharp.js)

1. **optimizeImage(buffer, options)**
   - Redimensionar a 1200x1200 (default)
   - Convertir a WebP
   - Eliminar metadata

2. **createThumbnail(buffer)**
   - 300x300px, crop centrado
   - WebP quality 75

3. **createSmall(buffer)**
   - 600x600px, fit inside
   - WebP quality 78

4. **getMetadata(buffer)**
   - Retorna: width, height, format, size, hasAlpha

5. **optimizeOnTheFly(filePath, params)**
   - Genera versión optimizada con query params

## Sistema de Almacenamiento

### Estructura de Directorios

```
uploads/
├── diagnostics/
│   └── 2025/
│       └── 01/
│           ├── 1735689600-a3f2c1.webp
│           ├── 1735689600-a3f2c1-thumb.webp
│           └── 1735689600-a3f2c1-small.webp
├── products/
├── users/
└── general/
```

### Storage Utilities (utils/storage.js)

```javascript
ensureDir(dirPath)              // Crear directorios recursivamente
saveFile(buffer, filePath)      // Guardar archivo
deleteFile(filePath, retries=5) // Eliminar con reintentos
listImages(folder, options)     // Listar con paginación
getStats()                      // Estadísticas totales
```

**Eliminación Robusta**:
- Maneja archivos en uso (EBUSY/EPERM)
- Reintentos con delay exponencial (200ms, 400ms, ...)
- Garbage collection forzado antes de eliminar
- Destruye instancias Sharp explícitamente

## Seguridad

### 1. Autenticación API Key
```javascript
// Header requerido: X-API-KEY
// Compara con config.apiKey
```

### 2. Rate Limiting
```javascript
uploadLimiter:  100 requests / 15 min
readLimiter:    200 requests / 15 min
adminLimiter:   50 requests / 15 min
```

### 3. Validación de Archivos
```javascript
ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]
MAX_FILE_SIZE = 10MB (configurable)
```

### 4. Prevención Directory Traversal
```javascript
// Sanitiza folder names
// Bloquea: ../, ./, absolute paths
```

### 5. Headers Seguros (Helmet)
```javascript
- Content-Security-Policy deshabilitado
- Cross-Origin-Resource-Policy: cross-origin
- X-Content-Type-Options: nosniff
```

### 6. CORS
```javascript
// Desarrollo: Permite cualquier origen
// Producción: Valida contra ALLOWED_ORIGINS
```

## Variables de Entorno

```env
# Server
NODE_ENV=development|production
PORT=3002
PUBLIC_URL=http://localhost:3002

# Upload
MAX_FILE_SIZE=10485760           # 10MB
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/gif
DEFAULT_QUALITY=80

# Storage
UPLOAD_DIR=./uploads

# Security
API_KEY=local-dev-key-change-in-production
JWT_SECRET=local-jwt-secret      # Futuro dashboard

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000      # 15 min
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug|info
```

## Logging

### Winston Configuration
```javascript
// Formato: timestamp + nivel + mensaje
// Transports: Console (colored)
// Rotación diaria (comentada para Docker)
// Skip /health en logs
```

### Morgan HTTP Logging
```javascript
// Stream a Winston
// Formato: combined en producción, dev en desarrollo
```

## Docker Setup

### Dockerfile
- Base: node:20-slim
- Multi-stage: builder + production
- libvips runtime (Sharp no se compila)
- dumb-init para señales
- Health check cada 30s
- USER node (no-root)

### docker-compose.yml
```yaml
ports: ["3002:3002"]
volumes:
  - ./uploads:/app/uploads
  - ./logs:/app/logs
  - ./src:/app/src  # Hot-reload desarrollo
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3002/health"]
  interval: 30s
```

## Comandos

```bash
# Desarrollo con hot-reload
npm run dev

# Producción
npm start

# Test upload
npm test

# Docker
npm run docker:build
npm run docker:run
npm run docker:stop
npm run docker:logs

# Lint & format
npm run lint
npm run format
```

## Endpoints Completos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | /health | No | Health check |
| POST | /upload | API Key | Subir imagen |
| GET | /uploads/{folder}/{year}/{month}/{filename} | No | Servir estático |
| GET | /optimize/{path}?w&h&q&fit | No | Optimización on-the-fly |
| GET | /api/images?folder&page&limit&sort | API Key | Listar con paginación |
| DELETE | /api/images/{encodedPath} | API Key | Eliminar imagen |
| GET | /api/stats | API Key | Estadísticas |

## Integración con Otros Servicios

### Backend API (consumidor principal)
```javascript
// src/services/imageService.js
// Usa Axios con API Key en headers
// Sube imágenes desde multer
```

### Frontend (consumidor secundario)
```javascript
// Upload directo desde navegador
// Headers: X-API-KEY + Authorization Bearer (opcional)
```

### Image Dashboard
```javascript
// Dashboard administrativo
// Autenticación JWT (futuro)
// UI para gestionar imágenes
```

## Manejo de Errores

### Clase AppError
```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}
```

### Middleware Global
```javascript
// Captura todos los errores
// Diferencia entre dev y production
// Stack traces solo en desarrollo
// Respuesta JSON estandarizada
```

### Async Handler
```javascript
// Wrapper para evitar try-catch
asyncHandler(fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
```

## Próximas Fases

### Fase 2: Dashboard Web
- React app en `/public`
- Autenticación JWT
- Galería visual
- Upload drag & drop
- Filtros y búsqueda

### Fase 3: CDN Integration
- S3 o Cloudflare R2
- AVIF format support
- Lazy loading
- Progressive images

### Fase 4: Analytics
- Bandwidth tracking
- Popular images
- Duplicate detection
- Storage cleanup tools

## Consideraciones Importantes

1. **Cache de Sharp**: Desabilitado para permitir eliminación inmediata
2. **Reintentos de eliminación**: 5 intentos con delay exponencial
3. **Garbage collection**: Forzado antes de eliminar archivos
4. **Instancias Sharp**: Destruidas explícitamente después de uso
5. **No escala horizontalmente**: Almacenamiento local (considerar CDN futuro)
6. **Single-threaded**: Sharp es multi-core pero Node.js es single-threaded (considerar PM2 cluster)

## Dependencias con Otros Servicios

### Requiere:
- Ninguno (standalone)

### Consumido por:
- Backend API (principal)
- Frontend (secundario)
- Image Dashboard (futuro)

## Notas de Desarrollo

- Los archivos están en memoria antes de procesarse (multer.memoryStorage())
- WebP es el formato de salida por defecto (mejor compresión)
- Las 3 versiones permiten responsive images en frontend
- El sistema de carpetas organiza por fecha para fácil búsqueda
- Los logs van a stdout para Docker (no archivos en producción)
