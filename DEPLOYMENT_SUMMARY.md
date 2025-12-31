# 📦 RESUMEN DE DEPLOYMENT - SaBio Image Service

**Fecha**: 2025-12-31
**Estado**: Build exitoso, Healthcheck FAILING
**Próximo paso**: Fix variable de entorno `DEFAULT_QUALITY`

---

## 🎯 ESTADO ACTUAL

### ✅ Completado
- [x] Código subido a GitHub: https://github.com/diegobonilla-dev/sabio-image-service
- [x] Servicio creado en Coolify (dentro del proyecto SaBio CRM)
- [x] Variables de entorno configuradas
- [x] Volúmenes persistentes configurados
- [x] Dockerfile modificado (`npm install` en lugar de `npm ci`)
- [x] Build de Docker completado exitosamente
- [x] Contenedor arrancado

### ❌ Problema Actual
**HEALTHCHECK FAILING** - Contenedor "unhealthy"

**Causa identificada**: Variable de entorno malformada:
```
DEFAULT_QUALITY==80  ← ¡DOBLE IGUAL!
```

Debería ser:
```
DEFAULT_QUALITY=80   ← UN SOLO IGUAL
```

### 📋 Pendiente
- [ ] Fix variable `DEFAULT_QUALITY` en Coolify UI
- [ ] Redeploy y verificar healthcheck pase
- [ ] Probar upload de imagen en producción
- [ ] Integrar con backend en producción

---

## 🔧 CONFIGURACIÓN

### Información del Servicio
- **Dominio**: http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io
- **Puerto interno**: 3000
- **GitHub**: https://github.com/diegobonilla-dev/sabio-image-service
- **Branch**: main

### API Keys Generadas (PRODUCCIÓN)
```bash
API_KEY=+Vy1Oj52EZVfPAvFqs0ZzeUqTMBhGg5+U9MiZtd8tTk=
JWT_SECRET=ONUdprO9mUUU1Btb0XKD1QMoYUC0OeSIKLEobILvJDo=
```

### Variables de Entorno en Coolify
```env
NODE_ENV=production
PORT=3000
PUBLIC_URL=http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io
API_KEY=+Vy1Oj52EZVfPAvFqs0ZzeUqTMBhGg5+U9MiZtd8tTk=
JWT_SECRET=ONUdprO9mUUU1Btb0XKD1QMoYUC0OeSIKLEobILvJDo=
MAX_FILE_SIZE=10485760
ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,image/gif
DEFAULT_QUALITY=80              ← CAMBIAR: actualmente tiene ==80
UPLOAD_DIR=/app/uploads
ALLOWED_ORIGINS=http://nwkw84ck0cgkcowwo4scw88w.31.97.215.37.sslip.io
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### Volúmenes Persistentes
| Nombre | Host Path | Container Path |
|--------|-----------|----------------|
| uploads | `/data/sabio-image-service/uploads` | `/app/uploads` |
| logs | `/data/sabio-image-service/logs` | `/app/logs` |

---

## 🛠️ CAMBIOS REALIZADOS

### 1. `.gitignore` - Permitir archivos necesarios
**Eliminado**:
```gitignore
package-lock.json
.dockerignore
```

### 2. `Dockerfile` - Cambio de npm ci a npm install
**Antes**:
```dockerfile
RUN npm ci --only=production --omit=dev
```

**Después**:
```dockerfile
# Build: 2025-12-31
RUN npm install --only=production
```

**Razón**: `npm ci` requiere package-lock.json, pero por problemas de caché de Docker en Coolify, se cambió a `npm install`

---

## 🐛 ERRORES ENCONTRADOS Y SOLUCIONES

### Error 1: npm ci failing
**Mensaje**:
```
npm error The npm ci command can only install with an existing package-lock.json
```

**Intentos fallidos**:
1. Agregar package-lock.json → Docker usó caché antigua
2. Forzar rebuild con timestamp → Coolify siguió usando caché

**Solución final**: Cambiar a `npm install --only=production`

### Error 2: Healthcheck unhealthy (ACTUAL)
**Logs**:
```
✅ Building docker image completed.
✅ Container fowokk8sockwkso4swcso0w4-160208948011 Started
❌ Healthcheck status: "unhealthy"
```

**Causa**: Variable `DEFAULT_QUALITY==80` con doble `=`

**Solución**: Ver sección siguiente

---

## 🚀 PRÓXIMOS PASOS (PASO A PASO)

### PASO 1: Fix variable de entorno
1. Ir a Coolify → Tu proyecto SaBio CRM
2. Seleccionar el servicio "image-service"
3. Ir a la pestaña **Environment Variables**
4. Buscar la variable `DEFAULT_QUALITY`
5. Cambiar el valor de `=80` a `80` (eliminar el `=` extra)
6. Guardar cambios
7. Click en botón **Redeploy** o **Deploy**

### PASO 2: Verificar healthcheck
Esperar a que termine el deploy y verificar en logs:
```
✅ Healthcheck status: "healthy"
```

### PASO 3: Probar endpoint de health
```bash
curl http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...
}
```

### PASO 4: Probar upload de imagen
```bash
curl -X POST http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io/api/upload \
  -H "x-api-key: +Vy1Oj52EZVfPAvFqs0ZzeUqTMBhGg5+U9MiZtd8tTk=" \
  -F "image=@test-image.jpg"
```

### PASO 5: Integrar con backend
1. Ir a configuración del backend en Coolify
2. Agregar variables de entorno:
   ```env
   IMAGE_SERVICE_URL=http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io
   IMAGE_SERVICE_API_KEY=+Vy1Oj52EZVfPAvFqs0ZzeUqTMBhGg5+U9MiZtd8tTk=
   ```
3. Redeploy backend
4. Probar upload desde la aplicación

---

## 📚 CONTEXTO DEL PROYECTO

### Dominios de otros servicios
- **Frontend**: http://nwkw84ck0cgkcowwo4scw88w.31.97.215.37.sslip.io
- **Backend**: (necesitas verificar en Coolify)
- **Image Service**: http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io

### Arquitectura
```
┌─────────────┐
│  Frontend   │ ← http://nwkw84ck0cgkcowwo4scw88w.31.97.215.37.sslip.io
└──────┬──────┘
       │
       v
┌─────────────┐
│   Backend   │ ← (obtener URL de Coolify)
└──────┬──────┘
       │
       v
┌─────────────┐
│Image Service│ ← http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io
└─────────────┘
```

### Tecnologías
- **Runtime**: Node.js 20 Alpine
- **Framework**: Express.js
- **Image Processing**: Sharp + libvips
- **Reverse Proxy**: Traefik (gestionado por Coolify)
- **Container**: Docker multi-stage build

---

## 🔐 SEGURIDAD

### API Key
Todos los endpoints (excepto `/health`) requieren header:
```
x-api-key: +Vy1Oj52EZVfPAvFqs0ZzeUqTMBhGg5+U9MiZtd8tTk=
```

### CORS
Configurado para aceptar requests de:
```
http://nwkw84ck0cgkcowwo4scw88w.31.97.215.37.sslip.io
```

### Rate Limiting
- **Window**: 15 minutos (900000ms)
- **Max requests**: 100

---

## 📞 PROMPT PARA NUEVO CHAT

Si necesitas continuar en otro chat, usa:

```
Hola Claude, estoy continuando el deployment de mi microservicio SaBio Image Service a Coolify.

CONTEXTO RÁPIDO:
- Proyecto: Microservicio de gestión de imágenes en Node.js + Sharp
- Estado: Build exitoso, contenedor arrancado, pero healthcheck FAILING
- Problema actual: Variable de entorno `DEFAULT_QUALITY==80` tiene doble `=`
- GitHub: https://github.com/diegobonilla-dev/sabio-image-service
- Dominio Coolify: http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io
- API Key: +Vy1Oj52EZVfPAvFqs0ZzeUqTMBhGg5+U9MiZtd8tTk=

NECESITO:
1. Guíame para fix el error del healthcheck (ya identifiqué que es DEFAULT_QUALITY==80)
2. Después del fix, verificar que el servicio esté funcionando
3. Testear upload de imagen
4. Integrar con backend en producción

Por favor, vamos PASO A PASO y TESTEANDO cada cosa antes de continuar. No me des todas las instrucciones juntas.

¿Qué hago primero para arreglar el healthcheck?
```

---

## 📝 NOTAS IMPORTANTES

1. **NO crear proyecto separado**: El image-service está como servicio dentro del proyecto "SaBio CRM" existente en Coolify

2. **Puerto 3000 NO colisiona**: Aunque frontend también usa puerto 3000 internamente, Traefik enruta por dominio, no por puerto

3. **package-lock.json**: No se está usando `npm ci` debido a problemas de caché en Coolify

4. **Método de trabajo**: Usuario prefiere avanzar PASO A PASO con testing en cada etapa

5. **Healthcheck interno**: El Dockerfile ya tiene un HEALTHCHECK configurado que verifica `http://localhost:3000/health`

---

**Último estado de logs**:
```
✅ Building docker image completed.
✅ Container fowokk8sockwkso4swcso0w4-160208948011 Started
❌ Healthcheck status: "unhealthy"
```

**Acción inmediata**: Fix `DEFAULT_QUALITY` y redeploy
