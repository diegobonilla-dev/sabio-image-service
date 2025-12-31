#!/bin/sh
set -e

echo "🔧 Fixing permissions for uploaded files..."

# Asegurar que los directorios existen
mkdir -p /app/uploads /app/logs

# Arreglar permisos recursivamente (esto se ejecuta como root)
chown -R node:node /app/uploads /app/logs 2>/dev/null || true
chmod -R 755 /app/uploads 2>/dev/null || true

echo "✅ Permissions fixed. Starting application as 'node' user..."

# Cambiar al usuario node y ejecutar el comando
exec su-exec node "$@"
