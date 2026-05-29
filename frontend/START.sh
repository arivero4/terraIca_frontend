#!/bin/bash

# START.sh - Script para iniciar el Frontend
# Uso: bash START.sh

set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Sistema de Inspecciones Fitosanitarias - Frontend      ║"
echo "║  Starting Development Environment                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Verificar que estamos en la carpeta correcta
if [ ! -f "index.html" ]; then
    echo "❌ Error: Este script debe ejecutarse desde la carpeta 'frontend'"
    exit 1
fi

echo "✅ Ubicación correcta detectada"
echo ""

# Opción 1: HTTP Server (Node.js)
if command -v http-server &> /dev/null; then
    echo "🚀 Iniciando con http-server..."
    echo ""
    echo "Frontend disponible en:"
    echo "  → http://localhost:8000"
    echo ""
    echo "Configuración esperada:"
    echo "  → API Gateway: http://localhost:8080"
    echo "  → Usuarios: http://localhost:8081"
    echo "  → Territorial: http://localhost:8082"
    echo "  → Inspecciones: http://localhost:8083"
    echo ""
    echo "Presione Ctrl+C para detener el servidor"
    echo ""
    http-server . --port 8000 --cors
    exit 0
fi

# Opción 2: Python
if command -v python3 &> /dev/null; then
    echo "🚀 Iniciando con Python..."
    echo ""
    echo "Frontend disponible en:"
    echo "  → http://localhost:8000"
    echo ""
    echo "Presione Ctrl+C para detener el servidor"
    echo ""
    cd "$(dirname "$0")"
    python3 -m http.server 8000
    exit 0
fi

# Opción 3: PHP
if command -v php &> /dev/null; then
    echo "🚀 Iniciando con PHP..."
    echo ""
    echo "Frontend disponible en:"
    echo "  → http://localhost:8000"
    echo ""
    echo "Presione Ctrl+C para detener el servidor"
    echo ""
    cd "$(dirname "$0")"
    php -S localhost:8000
    exit 0
fi

# Si nada está disponible
echo "❌ Error: No se encontró ningún servidor web"
echo ""
echo "Instale uno de los siguientes:"
echo "  → Node.js: npm install -g http-server"
echo "  → Python: ya viene instalado en la mayoría de sistemas"
echo "  → PHP: disponible en php.net"
echo ""

exit 1
