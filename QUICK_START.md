# 🚀 Quick Start - SaBio Image Service

Guía rápida para poner en marcha el microservicio de imágenes.

## ⚡ Inicio Rápido (5 minutos)

### 1. Instalar dependencias

```bash
cd image-service
npm install
```

### 2. Configurar variables de entorno

El archivo `.env` ya está creado con valores por defecto para desarrollo. Si lo necesitas, puedes editarlo:

```bash
nano .env
```

### 3. Iniciar el servidor

```bash
npm run dev
```

Verás algo como:

```
🚀 SaBio Image Service iniciado en puerto 3000
📦 Entorno: development
🌐 URL pública: http://localhost:3000
📁 Directorio de uploads: ./uploads
🔒 API Key configurada: Sí
```

### 4. Probar que funciona

Abre otra terminal y ejecuta:

```bash
npm test
```

Deberías ver:

```
✅ Health check exitoso
✅ Upload exitoso
✅ Estadísticas obtenidas
✅ Listado exitoso
✅ API Key inválida rechazada correctamente
```

## 📝 Probar manualmente con cURL

### Health Check

```bash
curl http://localhost:3000/health
```

### Upload de imagen

```bash
# Primero, descarga una imagen de prueba
curl -o test.jpg https://picsum.photos/800/600

# Luego súbela
curl -X POST http://localhost:3000/upload \
  -H "X-API-KEY: local-dev-key-change-in-production" \
  -F "image=@test.jpg" \
  -F "folder=test"
```

Deberías recibir:

```json
{
  "success": true,
  "data": {
    "url": "http://localhost:3000/uploads/test/2025/12/...",
    "thumbnail": "...",
    "small": "..."
  }
}
```

### Ver la imagen en el navegador

Copia la URL del response y ábrela en tu navegador:

```
http://localhost:3000/uploads/test/2025/12/1735689600-a3f2c1.webp
```

## 🐳 Iniciar con Docker (Alternativa)

Si prefieres usar Docker:

```bash
# Build y start
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

## 🔗 Integrar con tu Backend

### 1. Agregar variables en `/backend/.env`:

```env
IMAGE_SERVICE_URL=http://localhost:3000
IMAGE_SERVICE_API_KEY=local-dev-key-change-in-production
```

### 2. Usar en tus controladores:

```javascript
import { uploadImage, base64ToBuffer } from '../utils/imageService.js';

// En tu controlador de diagnósticos
const buffer = base64ToBuffer(req.body.foto_evidencia);
const result = await uploadImage(buffer, 'diagnostics');

// Guardar solo la URL en DB (no más Base64!)
diagnostico.foto_evidencia = result.url;
diagnostico.foto_evidencia_thumbnail = result.thumbnail;
```

## 📚 Próximos Pasos

1. ✅ **Servicio funcionando localmente**
2. 📖 Leer el [README.md](./README.md) completo para entender la API
3. 🧪 Integrar con tu backend (ver ejemplos arriba)
4. 🚀 Cuando esté listo, deployar a Coolify (ver README.md sección "Deploy en Coolify")

## 🆘 Problemas Comunes

### Error: "Cannot find module 'sharp'"

```bash
npm install
# Si persiste:
npm rebuild sharp
```

### Error: "EADDRINUSE: address already in use"

El puerto 3000 está ocupado. Cambia el puerto en `.env`:

```env
PORT=3001
```

### Error: "API Key inválida"

Verifica que estás enviando el header correcto:

```bash
-H "X-API-KEY: local-dev-key-change-in-production"
```

## 📞 Ayuda

Si tienes problemas:

1. Revisa los logs: `logs/app-<fecha>.log`
2. Verifica que el puerto 3000 esté libre
3. Asegúrate de que Node.js >= 20.x esté instalado
4. Lee el README completo para más detalles

---

**¡Listo para producción!** 🎉
