# ================================
# Stage 1: Build dependencies
# ================================
# Build: 2025-12-31 - Migrated to Debian Slim for reliability
FROM node:20-slim AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias de producción (Sharp usará binarios precompilados)
RUN npm install --only=production

# ================================
# Stage 2: Production image
# ================================
FROM node:20-slim

WORKDIR /app

# Instalar dumb-init y libvips runtime (sin compilar)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    dumb-init \
    libvips42 && \
    rm -rf /var/lib/apt/lists/*

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
