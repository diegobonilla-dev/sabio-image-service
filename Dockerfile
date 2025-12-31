# ================================
# Stage 1: Build dependencies
# ================================
# Build: 2025-12-31
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias de compilación para Sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev \
    vips-dev

# Copiar package files
COPY package*.json ./

# Instalar SOLO dependencias de producción
RUN npm ci --only=production --omit=dev

# ================================
# Stage 2: Production image
# ================================
FROM node:20-alpine

WORKDIR /app

# Instalar dumb-init (para manejo correcto de señales) y vips runtime
RUN apk add --no-cache \
    dumb-init \
    vips

# Copiar node_modules desde builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar código fuente
COPY src ./src
COPY public ./public
COPY package*.json ./

# Crear directorios con permisos correctos
RUN mkdir -p uploads logs && \
    chown -R node:node /app

# Usar usuario no-root por seguridad
USER node

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { res.on('data', () => {}); process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

# Usar dumb-init para manejo de señales
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio
CMD ["node", "src/server.js"]
