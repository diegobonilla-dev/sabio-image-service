# 🚀 PRÓXIMO PASO - SaBio Image Service

**Estado actual**: ✅ Servicio FUNCIONANDO - Healthcheck OK, Upload OK
**Problema**: Las imágenes subidas retornan 404 (no se sirven correctamente)

---

## 🎯 PRÓXIMA TAREA CRÍTICA

**Arreglar el servido de archivos estáticos**

Las imágenes se suben correctamente pero cuando intentas acceder a la URL retorna 404.

### Causa del problema:
En `src/server.js` línea 73, cuando `UPLOAD_DIR=/app/uploads` (ruta absoluta),
el código hace `path.join(__dirname, '..', config.uploadDir)` lo que resulta
en un path incorrecto.

### Solución:

**Editar archivo**: `src/server.js` línea ~73

**Código ACTUAL (incorrecto)**:
```javascript
app.use('/uploads', express.static(path.join(__dirname, '..', config.uploadDir), {
  maxAge: '1y',
  // ...
}));
```

**Código CORREGIDO**:
```javascript
// Si uploadDir es absoluto, usarlo directamente; si es relativo, hacer join
const uploadsPath = path.isAbsolute(config.uploadDir)
  ? config.uploadDir
  : path.join(__dirname, '..', config.uploadDir);

app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1y',
  // ...
}));
```

---

## 📝 PASOS PARA APLICAR EL FIX

1. **Hacer el cambio** en `src/server.js`
2. **Commit y push** a GitHub
3. **Redeploy** en Coolify
4. **⚠️ SI FALLA el build** con errores tipo:
   ```
   ERROR: gcc-15.2.0-r2: failed to extract ... I/O error
   ERROR: py3-imath-3.1.12-r0: failed to extract ... I/O error
   ```
   **Esto NO es culpa del código**. Son los repositorios de Alpine que están
   temporalmente corruptos. Opciones:
   - Esperar 30-60 minutos y volver a deployar
   - Esperar al día siguiente
   - Seguir reintentando hasta que Alpine se recupere

5. **Cuando el build pase**, verificar que funciona:
   ```bash
   # Debe retornar HTTP 200 OK
   curl -I http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io/uploads/general/2025/12/1767198551626-Tg_-dO.webp
   ```

---

## ✅ DESPUÉS DEL FIX: Integrar con Backend

1. Ir a Coolify → Backend service
2. Agregar variables de entorno:
   ```
   IMAGE_SERVICE_URL=http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io
   IMAGE_SERVICE_API_KEY=+Vy1Oj52EZVfPAvFqs0ZzeUqTMBhGg5+U9MiZtd8tTk=
   ```
3. Redeploy backend
4. Probar upload desde la aplicación web

---

## 📊 CONTEXTO ADICIONAL

### URLs del servicio:
- **Health**: http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io/health
- **Upload**: http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io/upload
- **GitHub**: https://github.com/diegobonilla-dev/sabio-image-service

### API Key para testing:
```
+Vy1Oj52EZVfPAvFqs0ZzeUqTMBhGg5+U9MiZtd8tTk=
```

### Ejemplo de upload que funciona:
```bash
curl -X POST http://fowokk8sockwkso4swcso0w4.31.97.215.37.sslip.io/upload \
  -H "x-api-key: +Vy1Oj52EZVfPAvFqs0ZzeUqTMBhGg5+U9MiZtd8tTk=" \
  -F "image=@test-image.jpeg"
```

Retorna (exitosamente):
```json
{
  "success": true,
  "data": {
    "url": "http://.../.../1767198551626-Tg_-dO.webp",
    "thumbnail": "http://.../.../1767198551626-Tg_-dO-thumb.webp",
    "small": "http://.../.../1767198551626-Tg_-dO-small.webp",
    "size": 47284,
    "width": 720,
    "height": 856
  }
}
```

PERO: Las URLs retornadas dan 404 (este es el bug a arreglar).
