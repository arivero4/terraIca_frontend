# ARQUITECTURA PROFESIONAL - Sistema de Inspecciones Fitosanitarias

---

## 📐 Diagrama de Arquitectura Completa

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE NAVEGADOR                        │
│                     (Frontend SPA)                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTP/HTTPS
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    SERVIDOR WEB                             │
│              (Nginx/Apache/Node.js)                         │
│         - Static File Serving                              │
│         - Compression (Gzip)                               │
│         - CORS Headers                                     │
│         - Security Headers                                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ REST API Calls
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   API GATEWAY                               │
│                  (Puerto 8080)                              │
│         - Request Routing                                  │
│         - Authentication                                   │
│         - Rate Limiting                                    │
│         - Load Balancing                                   │
└──────┬─────────────┬──────────────────┬───────────────────┘
       │             │                  │
   Port:8081     Port:8082          Port:8083
       │             │                  │
   ┌───▼──┐      ┌───▼──┐          ┌───▼──┐
   │  MS  │      │  MS  │          │  MS  │
   │Users │      │Terri-│          │Inspec│
   │      │      │torial│          │cion  │
   └──┬───┘      └──┬───┘          └──┬───┘
      │             │                  │
      │        ┌────▼────┐             │
      │        │ Database │            │
      │        │ Server   │            │
      │        └────┬────┘             │
      │             │                  │
      └─────────────┼──────────────────┘
                    │
              ┌─────▼──────┐
              │  Storage   │
              │  (Files)   │
              └────────────┘
```

---

## 🏗️ Estructura del Proyecto Escalable

```
terraIca_frontend/
│
├── frontend/                              # Aplicación Frontend
│   ├── index.html                        # Landing Page
│   ├── login.html                        # Login
│   ├── dashboard.html                    # Dashboard Principal
│   │
│   ├── css/
│   │   ├── styles.css                   # Variables y Reset
│   │   ├── components.css               # Componentes reutilizables
│   │   ├── dashboard.css                # Layout dashboard
│   │   └── login.css                    # Login styles
│   │
│   ├── js/
│   │   ├── api.js                       # Cliente HTTP centralizado
│   │   ├── auth.js                      # Autenticación JWT
│   │   ├── utils.js                     # Utilidades generales
│   │   ├── usuarios.js                  # Módulo usuarios
│   │   ├── territorial.js               # Módulo territorial
│   │   ├── inspecciones.js              # Módulo inspecciones
│   │   └── dashboard.js                 # Lógica dashboard
│   │
│   ├── pages/
│   │   ├── usuarios.html                # Gestión usuarios
│   │   ├── territorial.html             # Territorial general
│   │   ├── departamentos.html           # Departamentos
│   │   ├── municipios.html              # Municipios
│   │   ├── predios.html                 # Predios
│   │   ├── centrales.html               # Centrales de abastos
│   │   ├── inspecciones.html            # Inspecciones
│   │   └── reportes.html                # Reportes
│   │
│   ├── assets/
│   │   ├── images/                      # Imágenes
│   │   ├── icons/                       # Iconografía
│   │   └── docs/                        # Documentación
│   │
│   ├── README.md                        # Documentación principal
│   ├── GUIA_PRACTICA.md                # Guía de consumo de APIs
│   ├── DESPLIEGUE.md                   # Instrucciones de despliegue
│   └── ARQUITECTURA.md                 # Este archivo
│
├── config/
│   ├── development.env                  # Configuración desarrollo
│   ├── staging.env                      # Configuración staging
│   └── production.env                   # Configuración producción
│
├── tests/                               # Tests (futura)
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── api-endpoints.md                # Documentación de endpoints
│   ├── deployment-guide.md             # Guía de despliegue
│   └── security.md                     # Guía de seguridad
│
└── .github/
    └── workflows/
        └── deploy.yml                   # CI/CD Pipeline
```

---

## 🔄 Flujo de Datos Completo

### 1. Inicio de Sesión

```
┌─────────────┐
│ Usuario     │ Ingresa credenciales
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│ login.html                          │ Captura email/password
├─────────────────────────────────────┤
│ <form> event listener               │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ LoginPageHandler.handleSubmit()      │ Valida formulario
├─────────────────────────────────────┤
│ Validation.isEmail()                │
│ Validation.isRequired()             │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ auth.login(email, password)         │ Autentica usuario
├─────────────────────────────────────┤
│ api.post('/api/auth/login', {...})  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ APIClient.request()                 │ Realiza HTTP POST
├─────────────────────────────────────┤
│ fetch() to localhost:8080/api/auth/ │
│ login                               │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ API Gateway (8080)                  │ Valida y enruta
├─────────────────────────────────────┤
│ Extrae credenciales                 │
│ Enruta a Microservicio Usuarios     │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Microservicio Usuarios (8081)       │ Procesa login
├─────────────────────────────────────┤
│ Valida usuario en BD                │
│ Genera JWT Token                    │
│ Retorna token + user data           │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ API Gateway                         │ Retorna respuesta
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ APIClient                           │ Parsea respuesta JSON
├─────────────────────────────────────┤
│ response.json()                     │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ auth.setSession()                   │ Almacena token
├─────────────────────────────────────┤
│ localStorage.setItem('authToken')   │
│ localStorage.setItem('user')        │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ LoginPageHandler                    │ Redirige a dashboard
├─────────────────────────────────────┤
│ window.location.href =              │
│ 'dashboard.html'                    │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────┐
│ Dashboard   │ Sesión iniciada
└─────────────┘
```

### 2. Obtener Lista de Usuarios

```
┌─────────────────────────────────────┐
│ usuarios.html (Página)              │
│ DOMContentLoaded event              │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ UsuariosPageHandler.init()          │
├─────────────────────────────────────┤
│ setupNavbar()                       │
│ setupModal()                        │
│ setupButtons()                      │
│ loadUsuarios() ◄─── AQUÍ            │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ usuariosModule.getUsuarios()        │ GET /api/usuarios
├─────────────────────────────────────┤
│ api.get(Endpoints.USUARIOS.LIST)    │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ APIClient.get()                     │
├─────────────────────────────────────┤
│ this.request(endpoint, { method:    │
│ 'GET' })                            │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ APIClient.request()                 │
├─────────────────────────────────────┤
│ getHeaders() - Agrega Authorization │
│ Bearer <token>                      │
│ fetch() to localhost:8080/api/...   │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ API Gateway                         │
├─────────────────────────────────────┤
│ Valida Authorization header         │
│ Decodifica JWT                      │
│ Extrae user info del token          │
│ Valida permisos                     │
│ Enruta a Microservicio Usuarios     │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ Microservicio Usuarios (8081)       │
├─────────────────────────────────────┤
│ Query BD: SELECT * FROM usuarios    │
│ Retorna JSON con array              │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ API Gateway                         │
│ (Retorna respuesta)                 │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ APIClient                           │
├─────────────────────────────────────┤
│ response.ok? → sí                   │
│ response.json() → Promise           │
│ return data                         │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ usuariosModule.getUsuarios()        │
├─────────────────────────────────────┤
│ this.usuarios = response.data       │
│ return response                     │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ UsuariosPageHandler.loadUsuarios()  │
├─────────────────────────────────────┤
│ this.usuarios = response.data       │
│ this.renderTable()                  │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│ renderTable()                       │
├─────────────────────────────────────┤
│ usuarios.map(u => `<tr>...</tr>`)   │
│ tbody.innerHTML = rows              │
└──────┬──────────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Tabla renderizada en HTML│
└──────────────────────────┘
```

---

## 🔐 Modelo de Seguridad

### Capas de Seguridad

```
┌─────────────────────────────────────────────────┐
│ Capa 1: TRANSPORTE                             │
│ - HTTPS/TLS                                     │
│ - Certificados SSL válidos                      │
│ - Perfect Forward Secrecy                       │
└─────────────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────┐
│ Capa 2: AUTENTICACIÓN                          │
│ - JWT Tokens                                    │
│ - Validación de firma                           │
│ - Expiración de tokens                          │
│ - Refresh tokens                                │
└─────────────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────┐
│ Capa 3: AUTORIZACIÓN                           │
│ - Roles (Admin, Inspector, etc)                │
│ - Permisos granulares                          │
│ - Control de acceso por recurso                │
└─────────────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────┐
│ Capa 4: VALIDACIÓN                             │
│ - Validación de entrada                        │
│ - Sanitización                                 │
│ - XSS Prevention                               │
│ - CSRF Protection                              │
└─────────────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────────────┐
│ Capa 5: DATOS                                  │
│ - Encriptación en tránsito                      │
│ - Encriptación en reposo                        │
│ - Hashing de contraseñas                        │
└─────────────────────────────────────────────────┘
```

---

## 📈 Escalabilidad

### Path de Evolución

```
┌──────────────────────┐
│  Fase 1: Vanilla JS  │
│  (Current)           │
│ - HTML5/CSS3/JS      │
│ - Modular            │
│ - No dependencies    │
└──────────────┬───────┘
               │
               ▼
┌──────────────────────┐
│  Fase 2: React       │
│ - Componentes        │
│ - Virtual DOM        │
│ - State Management   │
└──────────────┬───────┘
               │
               ▼
┌──────────────────────┐
│  Fase 3: Next.js     │
│ - Server-side        │
│ - SSR                │
│ - API Routes         │
└──────────────┬───────┘
               │
               ▼
┌──────────────────────┐
│  Fase 4: TypeScript  │
│ - Type Safety        │
│ - Better Tooling     │
│ - Maintainability    │
└──────────────────────┘
```

### Migrando Módulos a React

```javascript
// Antes (Vanilla JS)
class UsuariosPageHandler {
    renderTable() {
        tbody.innerHTML = this.usuarios
            .map(u => `<tr>...</tr>`)
            .join('');
    }
}

// Después (React)
function UsuariosTable({ usuarios }) {
    return (
        <table>
            <tbody>
                {usuarios.map(u => (
                    <tr key={u.id}>
                        <td>{u.nombre}</td>
                        <td>{u.email}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// Los módulos se mantienen igual
import { usuariosModule } from '../js/usuarios.js';
```

---

## 🔄 Integración Microservicios

### Cómo el API Gateway Enruta

**Configuración típica de API Gateway:**

```javascript
// API Gateway routing rules
const routes = {
    '/api/usuarios': 'http://localhost:8081',
    '/api/usuarios/:id': 'http://localhost:8081',
    '/api/territorial/departamentos': 'http://localhost:8082',
    '/api/territorial/municipios': 'http://localhost:8082',
    '/api/territorial/predios': 'http://localhost:8082',
    '/api/territorial/centrales': 'http://localhost:8082',
    '/api/inspeccion': 'http://localhost:8083',
    '/api/inspeccion/:id': 'http://localhost:8083'
};

// Middleware de autenticación
app.use('/api/*', (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    // Validar token
    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        
        req.user = decoded;
        next();
    });
});

// Routing
app.all('/api/*', (req, res) => {
    const path = req.path;
    let targetService;
    
    for (const [route, service] of Object.entries(routes)) {
        if (path.startsWith(route)) {
            targetService = service;
            break;
        }
    }
    
    if (!targetService) {
        return res.status(404).json({ error: 'Not found' });
    }
    
    // Proxy request
    const options = {
        method: req.method,
        headers: { ...req.headers, 'X-User-ID': req.user.id }
    };
    
    const proxyReq = http.request(targetService + path, options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });
    
    req.pipe(proxyReq);
});
```

---

## 📊 Monitoreo y Observabilidad

### Logging Strategy

```javascript
class StructuredLogger {
    static log(level, message, context = {}) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Log local
        console.log(JSON.stringify(entry));
        
        // Send to logging service
        if (window.logService) {
            window.logService.send(entry);
        }
    }
}

// Uso
StructuredLogger.log('INFO', 'Usuario creado', {
    userId: 123,
    email: 'user@example.com',
    action: 'CREATE'
});
```

### Métricas

```javascript
class Metrics {
    static apiCalls = {};
    
    static recordApiCall(endpoint, duration, status) {
        if (!this.apiCalls[endpoint]) {
            this.apiCalls[endpoint] = {
                count: 0,
                totalTime: 0,
                errors: 0
            };
        }
        
        this.apiCalls[endpoint].count++;
        this.apiCalls[endpoint].totalTime += duration;
        
        if (status >= 400) {
            this.apiCalls[endpoint].errors++;
        }
    }
    
    static getMetrics() {
        return Object.entries(this.apiCalls).map(([endpoint, data]) => ({
            endpoint,
            avgTime: data.totalTime / data.count,
            errorRate: data.errors / data.count,
            ...data
        }));
    }
}
```

---

## 🎓 Aprendizaje Continuo

### Próximos Pasos Recomendados

1. **Frontend Framework**
   - React/Vue/Angular
   - State Management (Redux/Vuex)
   - Component Libraries

2. **Backend**
   - Node.js/Express
   - API Design (GraphQL)
   - Database (SQL/NoSQL)

3. **DevOps**
   - Docker/Kubernetes
   - CI/CD Pipelines
   - Infrastructure as Code

4. **Testing**
   - Unit Testing
   - Integration Testing
   - E2E Testing

---

## 📚 Referencias

- [REST API Best Practices](https://restfulapi.net/)
- [JWT Authentication](https://jwt.io/)
- [Web Security Academy](https://portswigger.net/web-security)
- [MDN Web Docs](https://developer.mozilla.org/)
- [OWASP Security Guidelines](https://owasp.org/)

---

**Fin de Documento de Arquitectura**

Versión: 1.0.0
Fecha: 2026-05-28
