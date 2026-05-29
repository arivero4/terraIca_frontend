# Configuración y Despliegue del Frontend

---

## 🚀 Ejecución Local

### Opción 1: HTTP Server (Node.js)

```bash
# Instalar http-server globalmente
npm install -g http-server

# Ejecutar desde la carpeta frontend
cd frontend
http-server . --port 8000 --cors

# Acceder
http://localhost:8000
```

### Opción 2: Python Built-in Server

```bash
# Python 3
cd frontend
python -m http.server 8000

# Acceder
http://localhost:8000
```

### Opción 3: PHP Built-in Server

```bash
# PHP 5.4+
cd frontend
php -S localhost:8000

# Acceder
http://localhost:8000
```

### Opción 4: Docker

```dockerfile
# Dockerfile
FROM nginx:alpine

COPY . /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Construir imagen
docker build -t terraica-frontend .

# Ejecutar contenedor
docker run -p 8000:80 terraica-frontend

# Acceder
http://localhost:8000
```

---

## 🔧 Configuración del Ambiente

### Archivo: `config.js` (Crear si es necesario)

```javascript
/**
 * Configuration by Environment
 */

const config = {
    development: {
        API_BASE_URL: 'http://localhost:8080',
        TIMEOUT: 5000,
        LOG_LEVEL: 'debug'
    },
    
    production: {
        API_BASE_URL: 'https://api.production.com',
        TIMEOUT: 10000,
        LOG_LEVEL: 'error'
    },
    
    staging: {
        API_BASE_URL: 'https://api.staging.com',
        TIMEOUT: 8000,
        LOG_LEVEL: 'info'
    }
};

// Detectar ambiente
const environment = process.env.NODE_ENV || 'development';
const activeConfig = config[environment];

export { activeConfig as config, environment };
```

### Archivo: `.env` (Crear en raíz del proyecto)

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8080
VITE_API_TIMEOUT=5000

# App Configuration
VITE_APP_NAME=Sistema de Inspecciones Fitosanitarias
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_LOGGING=true
```

---

## 📦 Estructura de Despliegue

### Carpeta de Distribución

```
dist/
├── index.html
├── login.html
├── dashboard.html
├── pages/
│   ├── usuarios.html
│   ├── territorial.html
│   ├── inspecciones.html
│   └── ...
├── css/
│   ├── styles.css
│   ├── components.css
│   ├── dashboard.css
│   └── login.css
├── js/
│   ├── api.js
│   ├── auth.js
│   ├── utils.js
│   ├── usuarios.js
│   ├── territorial.js
│   └── inspecciones.js
└── assets/
    ├── images/
    ├── icons/
    └── fonts/
```

---

## 🌐 Configuración del Servidor Web

### Nginx

```nginx
server {
    listen 80;
    server_name terraica-frontend.com;

    # Redireccionar HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name terraica-frontend.com;

    # SSL Certificates
    ssl_certificate /etc/ssl/certs/certificate.crt;
    ssl_certificate_key /etc/ssl/private/private.key;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # CORS Headers para API Gateway
    add_header Access-Control-Allow-Origin "http://api.terraica.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

    root /var/www/terraica-frontend;
    index index.html;

    # SPA Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache Static Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # No cache HTML
    location ~* \.(html)$ {
        expires -1;
        add_header Cache-Control "public, must-revalidate, proxy-revalidate";
    }

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;
    gzip_min_length 1024;
}
```

### Apache

```apache
<VirtualHost *:443>
    ServerName terraica-frontend.com
    DocumentRoot /var/www/terraica-frontend

    # SSL
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/certificate.crt
    SSLCertificateKeyFile /etc/ssl/private/private.key

    # Modules
    <IfModule mod_rewrite.c>
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </IfModule>

    # Security Headers
    <IfModule mod_headers.c>
        Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
        Header always set X-Frame-Options "SAMEORIGIN"
        Header always set X-Content-Type-Options "nosniff"
        Header always set X-XSS-Protection "1; mode=block"
    </IfModule>

    # Compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml 
                              text/css text/javascript application/javascript
    </IfModule>

    # Caching
    <FilesMatch "\.(jpg|jpeg|png|gif|ico|css|js)$">
        Header set Cache-Control "max-age=31536000, public"
    </FilesMatch>
</VirtualHost>

<VirtualHost *:80>
    ServerName terraica-frontend.com
    Redirect permanent / https://terraica-frontend.com/
</VirtualHost>
```

---

## 🔐 Verificación de Seguridad

### Checklist Pre-Despliegue

- [ ] ¿Configuración correcta de API Gateway URL?
- [ ] ¿CORS configurado en servidor?
- [ ] ¿HTTPS habilitado?
- [ ] ¿Headers de seguridad en lugar?
- [ ] ¿JWT tokens guardados de forma segura?
- [ ] ¿Contraseñas no hardeadas?
- [ ] ¿Logs sin datos sensibles?
- [ ] ¿Minificación de assets?
- [ ] ¿Cachés configurados correctamente?
- [ ] ¿CDN configurado (opcional)?

### Headers de Seguridad

```http
# CORS
Access-Control-Allow-Origin: https://api.terraica.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization

# Protección
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block

# CSP (Content Security Policy)
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
```

---

## 📊 Monitoreo y Logs

### Configurar Logging

```javascript
// logger.js
class Logger {
    static log(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };

        if (environment === 'production') {
            // Enviar a servicio de logging
            this.sendToLoggingService(logEntry);
        } else {
            console.log(JSON.stringify(logEntry, null, 2));
        }
    }

    static error(message, error = {}) {
        this.log('ERROR', message, {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack
        });
    }

    static async sendToLoggingService(logEntry) {
        try {
            await fetch('https://logs.terraica.com/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logEntry)
            });
        } catch (e) {
            console.error('Logging service error:', e);
        }
    }
}

export { Logger };
```

---

## 🚢 CI/CD (GitHub Actions)

### Archivo: `.github/workflows/deploy.yml`

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Install dependencies
        run: npm ci

      - name: Lint code
        run: npm run lint

      - name: Build
        run: npm run build

      - name: Test
        run: npm run test

      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist

      - name: Deploy to staging
        if: github.ref == 'refs/heads/develop'
        run: |
          echo "Deploying to staging..."
          # Agregar comandos de deploy a staging
```

---

## ✅ Testing

### Script de Testing

```bash
#!/bin/bash

echo "🧪 Ejecutando tests..."

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage

if [ $? -eq 0 ]; then
    echo "✅ Todos los tests pasaron"
    exit 0
else
    echo "❌ Algunos tests fallaron"
    exit 1
fi
```

---

## 📈 Performance

### Análisis de Performance

```bash
# Instalar lighthouse CLI
npm install -g @lhci/cli@latest

# Ejecutar auditoría
lighthouse http://localhost:8000/index.html --view

# Generar reporte
lighthouse http://localhost:8000/index.html --output html --output-path ./report.html
```

### Optimizaciones

- Minificar CSS y JavaScript
- Comprimir imágenes
- Implementar lazy loading
- Usar CDN para assets estáticos
- Implementar service workers
- Caché agresivo de assets

---

## 🔄 Rollback Plan

```bash
#!/bin/bash

# Rollback a versión anterior
git checkout v1.0.0 -- .

# Reconstruir y redeploy
npm install
npm run build
npm run deploy

echo "✅ Rollback completado"
```

---

## 📞 Checklist de Despliegue

### Antes de Deployer

- [ ] Código revisado por pares
- [ ] Tests pasando 100%
- [ ] Documentación actualizada
- [ ] Configuración de ambiente correcta
- [ ] Backups realizados
- [ ] Plan de rollback documentado

### Durante Despliegue

- [ ] Monitorear logs
- [ ] Verificar funcionalidad crítica
- [ ] Monitorear performance
- [ ] Verificar CORS y autenticación

### Después de Despliegue

- [ ] Smoke tests en producción
- [ ] Verificar metrics
- [ ] Comunicar a stakeholders
- [ ] Documentar cualquier issue

---

**Fin de Configuración y Despliegue**
