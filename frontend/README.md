# Sistema de Gestión de Inspecciones Fitosanitarias

**Frontend Profesional | HTML5 + CSS3 + JavaScript Vanilla**

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Guía de Instalación](#guía-de-instalación)
5. [Configuración](#configuración)
6. [Módulos Funcionales](#módulos-funcionales)
7. [Consumo de APIs](#consumo-de-apis)
8. [Autenticación JWT](#autenticación-jwt)
9. [Sistema de Notificaciones](#sistema-de-notificaciones)
10. [Buenas Prácticas](#buenas-prácticas)
11. [Escalabilidad](#escalabilidad)

---

## 🎯 Introducción

Sistema frontend profesional para la gestión integral de inspecciones fitosanitarias. Implementado con arquitectura modular, escalable y preparada para evolucionar a frameworks modernos.

**Características Principales:**
- Autenticación JWT
- Consumo de APIs REST mediante API Gateway
- Gestión de usuarios y roles
- Territorial y predios
- Inspecciones fitosanitarias
- Reportes y estadísticas
- Diseño responsive moderno
- Arquitectura escalable

---

## 🏗️ Arquitectura

```
┌─────────────┐
│   Usuario   │
└─────────────┘
       │
       ▼
┌─────────────────────┐
│  Frontend (SPA)     │
│  HTML5/CSS3/JS      │
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  API Gateway        │
│  :8080              │
└─────────────────────┘
    │      │       │
    ▼      ▼       ▼
┌──────┐┌──────┐┌──────┐
│ MS   ││ MS   ││ MS   │
│Users ││Terri-││Inspec│
│8081  ││torial││cion  │
│      ││8082  ││8083  │
└──────┘└──────┘└──────┘
```

**Flujo de Comunicación:**
1. Usuario interactúa con Frontend
2. Frontend consume API Gateway en `http://localhost:8080`
3. API Gateway enruta a microservicios específicos
4. Microservicios devuelven datos al Gateway
5. Frontend recibe y renderiza datos

---

## 📁 Estructura del Proyecto

```
frontend/
│
├── index.html                 # Landing page
├── login.html                 # Login
├── dashboard.html             # Dashboard principal
│
├── css/
│   ├── styles.css            # Variables y reset CSS
│   ├── components.css        # Componentes reutilizables
│   ├── dashboard.css         # Layout dashboard
│   └── login.css             # Login styles
│
├── js/
│   ├── api.js                # Cliente HTTP centralizado
│   ├── auth.js               # Gestión de autenticación
│   ├── utils.js              # Utilidades generales
│   ├── usuarios.js           # Módulo usuarios
│   ├── territorial.js        # Módulo territorial
│   ├── inspecciones.js       # Módulo inspecciones
│   └── dashboard.js          # Lógica dashboard
│
├── pages/
│   ├── usuarios.html         # Página gestión usuarios
│   ├── territorial.html      # Página territorial
│   ├── departamentos.html    # Página departamentos
│   ├── municipios.html       # Página municipios
│   ├── predios.html          # Página predios
│   ├── centrales.html        # Página centrales abastos
│   ├── inspecciones.html     # Página inspecciones
│   └── reportes.html         # Página reportes
│
└── assets/
    ├── images/               # Imágenes
    ├── icons/                # Iconografía
    └── docs/                 # Documentación
```

---

## 🚀 Guía de Instalación

### Requisitos Previos

- Navegador moderno (Chrome, Firefox, Edge)
- API Gateway corriendo en `http://localhost:8080`
- Microservicios disponibles en puertos 8081, 8082, 8083

### Pasos de Instalación

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd frontend

# 2. Iniciar servidor local (si se dispone de Node.js)
npm install -g http-server
http-server . --port 8000

# 3. Abrir en navegador
http://localhost:8000/index.html

# Alternativa: Usar PHP built-in server
php -S localhost:8000

# O abrir directamente
file:///path/to/frontend/index.html
```

---

## ⚙️ Configuración

### Configuración del Cliente API

**Archivo:** `js/api.js`

```javascript
const API_CONFIG = {
    BASE_URL: 'http://localhost:8080',  // URL del API Gateway
    TIMEOUT: 5000,                       // Timeout en ms
    RETRY_ATTEMPTS: 3                    // Intentos de reintento
};
```

**Para ambiente de producción:**

```javascript
const API_CONFIG = {
    BASE_URL: 'https://api.production.com',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3
};
```

### Variables CSS Globales

**Archivo:** `css/styles.css`

```css
:root {
    /* Colors */
    --color-primary: #2E7D32;
    --color-secondary: #1976D2;
    
    /* Spacing */
    --spacing-base: 1rem;
    
    /* Typography */
    --font-family: 'Segoe UI', sans-serif;
}
```

---

## 📦 Módulos Funcionales

### 1. Sistema de Autenticación (auth.js)

**Gestiona:** Login, logout, JWT tokens, sesiones

```javascript
// Login
const response = await auth.login('email@example.com', 'password');

// Verificar autenticación
if (auth.isAuthenticated()) {
    // Usuario autenticado
}

// Obtener usuario actual
const user = auth.getCurrentUser();

// Verificar roles
if (auth.hasRole('admin')) {
    // Es administrador
}

// Logout
await auth.logout();
```

**Características:**
- Almacenamiento seguro de JWT en localStorage
- Decodificación de tokens (sin verificación)
- Verificación de expiración
- Refresh automático de tokens
- Manejo de sesiones

### 2. Cliente HTTP (api.js)

**Gestiona:** Requests HTTP, headers, autenticación

```javascript
// GET Request
const data = await api.get('/api/usuarios');

// POST Request
const result = await api.post('/api/usuarios', {
    nombre: 'Juan',
    email: 'juan@example.com'
});

// PUT Request
const updated = await api.put('/api/usuarios/123', {
    nombre: 'Juan Actualizado'
});

// DELETE Request
await api.delete('/api/usuarios/123');
```

**Características:**
- Inyección automática de Bearer Token
- Manejo centralizado de errores
- Timeout automático
- Manejo de respuestas 401
- Endpoints predefinidos

### 3. Módulo de Usuarios (usuarios.js)

```javascript
// Obtener lista de usuarios
const usuarios = await usuariosModule.getUsuarios(page = 1);

// Obtener usuario específico
const usuario = await usuariosModule.getUsuario(id);

// Crear usuario
const newUser = await usuariosModule.createUsuario({
    nombre: 'Pedro',
    apellido: 'González',
    email: 'pedro@example.com',
    password: 'SecurePass123!',
    roles: ['inspector']
});

// Actualizar usuario
const updated = await usuariosModule.updateUsuario(id, {
    nombre: 'Pedro Updated'
});

// Eliminar usuario
await usuariosModule.deleteUsuario(id);

// Cambiar contraseña
await usuariosModule.changePassword(currentPwd, newPwd);
```

### 4. Módulo Territorial (territorial.js)

```javascript
// DEPARTAMENTOS
const depts = await territorialModule.getDepartamentos();
const dept = await territorialModule.getDepartamento(id);
await territorialModule.createDepartamento(data);
await territorialModule.updateDepartamento(id, data);
await territorialModule.deleteDepartamento(id);

// MUNICIPIOS
const municipios = await territorialModule.getMunicipios(departamentoId);
const municipio = await territorialModule.getMunicipio(id);
await territorialModule.createMunicipio(data);

// PREDIOS
const predios = await territorialModule.getPredios(filters);
const predio = await territorialModule.getPredio(id);
await territorialModule.createPredio(data);

// CENTRALES DE ABASTOS
const centrales = await territorialModule.getCentrales();
const central = await territorialModule.getCentral(id);
```

### 5. Módulo de Inspecciones (inspecciones.js)

```javascript
// Obtener inspecciones
const inspecciones = await inspeccionesModule.getInspecciones(filters);

// Crear inspección
const inspeccion = await inspeccionesModule.createInspeccion({
    predioId: 'predio-001',
    fechaInspeccion: '2024-01-15',
    inspector: 'Juan Pérez',
    estado: 'programada'
});

// Obtener historial de predio
const historial = await inspeccionesModule.getHistorial(predioId);

// Generar reporte PDF
await inspeccionesModule.generatePDFReport({
    desde: '2024-01-01',
    hasta: '2024-12-31'
});

// Cambiar estado
await inspeccionesModule.cambiarEstado(id, 'completada');
```

### 6. Utilidades (utils.js)

**DOM Utilities:**
```javascript
DOM.select('.selector')           // querySelector
DOM.selectAll('.selector')        // querySelectorAll
DOM.createElement('div', 'class') // Crear elemento
DOM.on(element, 'click', handler) // Agregar evento
DOM.addClass(element, 'class')    // Agregar clase
DOM.show(element)                 // Mostrar
DOM.hide(element)                 // Ocultar
```

**Validation Utilities:**
```javascript
Validation.isEmail('test@mail.com')        // Validar email
Validation.isPhone('3215678901')           // Validar teléfono
Validation.isStrongPassword('Pass123!@')   // Validar contraseña
Validation.isRequired('texto')             // Requerido
```

**Format Utilities:**
```javascript
Format.date(new Date(), 'DD/MM/YYYY')      // Formato fecha
Format.currency(1000, 'COP')               // Formato moneda
Format.capitalize('texto')                 // Primera mayúscula
Format.truncate('texto largo', 50)        // Truncar texto
```

**Storage Utilities:**
```javascript
Storage.set('key', value)         // Guardar en localStorage
Storage.get('key')                // Obtener de localStorage
Storage.remove('key')             // Remover
Storage.clear()                   // Limpiar todo
```

**Notification Utilities:**
```javascript
Notify.success('Operación exitosa')  // Notificación éxito
Notify.error('Error occurred')       // Notificación error
Notify.warning('Advertencia')        // Notificación alerta
Notify.info('Información')           // Notificación info
```

---

## 🔐 Autenticación JWT

### Flujo de Autenticación

```
1. Usuario ingresa email y contraseña
   └─> Frontend envía al API Gateway
       └─> Microservicio Usuarios valida
           └─> Retorna JWT Token + User Data

2. Frontend almacena:
   - Token en localStorage
   - User Info en localStorage

3. Para cada request:
   - Header: Authorization: Bearer <token>
   - API Gateway valida token
   - Si válido, enruta a microservicio
   - Si inválido (401), redirige a login

4. Token expira:
   - Frontend intenta refresh
   - Si refresh válido, obtiene nuevo token
   - Si refresh inválido, logout automático
```

### Implementación

**Login:**
```javascript
async login(email, password) {
    const response = await api.post(Endpoints.AUTH.LOGIN, {
        email,
        password
    });
    
    this.setSession(response.token, response.user);
    return response;
}

setSession(token, user) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
}
```

**Obtener Token:**
```javascript
getAuthToken() {
    return localStorage.getItem('authToken');
}
```

**Inyectar en Headers:**
```javascript
getHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };

    const token = this.getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}
```

**Proteger Rutas:**
```javascript
checkAuthentication() {
    if (!auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}
```

---

## 🔔 Sistema de Notificaciones

### Uso

```javascript
// Notificación éxito
Notify.success('Usuario creado exitosamente');

// Notificación error
Notify.error('Error al crear usuario');

// Notificación alerta
Notify.warning('Este cambio es irreversible');

// Notificación información
Notify.info('Operación completada');

// Personalizado
Notify.show('Mensaje custom', 'success', 5000);
```

### Estilos CSS

```css
.notification {
    position: fixed;
    bottom: var(--spacing-lg);
    right: var(--spacing-lg);
    max-width: 400px;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    border-left: 4px solid;
    animation: slideUp var(--transition-base);
    z-index: var(--z-tooltip);
}

.notification--success { border-color: var(--color-success); }
.notification--error { border-color: var(--color-danger); }
.notification--warning { border-color: var(--color-warning); }
```

---

## 🎨 Componentes Reutilizables

### Botones

```html
<!-- Primary -->
<button class="btn btn--primary">Guardar</button>

<!-- Secondary -->
<button class="btn btn--secondary">Secundario</button>

<!-- Outline -->
<button class="btn btn--outline">Outline</button>

<!-- Danger -->
<button class="btn btn--danger">Eliminar</button>

<!-- Tamaños -->
<button class="btn btn--small">Pequeño</button>
<button class="btn btn--large">Grande</button>

<!-- Block -->
<button class="btn btn--block">Full Width</button>

<!-- Disabled -->
<button class="btn btn--primary" disabled>Deshabilitado</button>
```

### Cards

```html
<div class="card">
    <div class="card__header">
        <h2 class="card__title">Título</h2>
    </div>
    <div class="card__body">
        Contenido
    </div>
    <div class="card__footer">
        <button class="btn btn--primary">Acción</button>
    </div>
</div>
```

### Formularios

```html
<form>
    <div class="form-group">
        <label class="form-label required">Email</label>
        <input type="email" class="form-control" required>
        <span class="form-text text-danger">Error message</span>
    </div>

    <div class="form-check">
        <input type="checkbox" id="agree" class="form-check__input">
        <label for="agree" class="form-check__label">Acepto términos</label>
    </div>

    <button type="submit" class="btn btn--primary">Enviar</button>
</form>
```

### Tablas

```html
<table class="table table--hoverable">
    <thead class="table__header">
        <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
        </tr>
    </thead>
    <tbody class="table__body">
        <tr>
            <td>Juan</td>
            <td>juan@mail.com</td>
            <td><span class="badge badge--primary">Admin</span></td>
        </tr>
    </tbody>
</table>
```

### Badges

```html
<span class="badge badge--primary">Primary</span>
<span class="badge badge--success">Success</span>
<span class="badge badge--danger">Danger</span>
<span class="badge badge--warning">Warning</span>
```

### Modales

```html
<div class="modal" id="myModal">
    <div class="modal__content">
        <div class="modal__header">
            <h2 class="modal__title">Título</h2>
            <button class="modal__close">&times;</button>
        </div>
        <div class="modal__body">
            Contenido del modal
        </div>
        <div class="modal__footer">
            <button class="btn btn--outline">Cancelar</button>
            <button class="btn btn--primary">Guardar</button>
        </div>
    </div>
</div>
```

---

## 📡 Consumo de APIs

### Ejemplo: CRUD Usuarios

**Obtener Usuarios:**
```javascript
async function loadUsers() {
    try {
        const response = await api.get('/api/usuarios');
        console.log('Usuarios:', response.data);
        
        renderUsersTable(response.data);
    } catch (error) {
        Notify.error('Error al cargar usuarios: ' + error.message);
    }
}
```

**Crear Usuario:**
```javascript
async function createUser(userData) {
    try {
        // Validar datos
        const errors = usuariosModule.validateData(userData);
        if (errors.length > 0) {
            Notify.error(errors.join(', '));
            return;
        }

        // Enviar request
        const response = await usuariosModule.createUsuario(userData);
        
        Notify.success('Usuario creado exitosamente');
        loadUsers(); // Recargar lista
    } catch (error) {
        Notify.error('Error: ' + error.message);
    }
}
```

**Actualizar Usuario:**
```javascript
async function updateUser(id, userData) {
    try {
        const response = await usuariosModule.updateUsuario(id, userData);
        Notify.success('Usuario actualizado');
        loadUsers();
    } catch (error) {
        Notify.error('Error al actualizar: ' + error.message);
    }
}
```

**Eliminar Usuario:**
```javascript
async function deleteUser(id) {
    if (!confirm('¿Está seguro?')) return;
    
    try {
        await usuariosModule.deleteUsuario(id);
        Notify.success('Usuario eliminado');
        loadUsers();
    } catch (error) {
        Notify.error('Error al eliminar: ' + error.message);
    }
}
```

### Manejo de Errores HTTP

```javascript
try {
    const response = await api.get('/api/usuarios');
} catch (error) {
    if (error.status === 401) {
        // No autorizado - redirigir a login
        window.location.href = 'login.html';
    } else if (error.status === 403) {
        Notify.error('No tiene permiso para esta acción');
    } else if (error.status === 404) {
        Notify.error('Recurso no encontrado');
    } else if (error.status === 500) {
        Notify.error('Error del servidor');
    } else {
        Notify.error(error.message);
    }
}
```

---

## ✅ Buenas Prácticas

### 1. Separación de Responsabilidades

```javascript
// ✅ BIEN - Cada módulo tiene responsabilidad clara
class UsuariosModule {
    async getUsuarios() { /* ... */ }
    async createUsuario(data) { /* ... */ }
    validateData(data) { /* ... */ }
}

// ❌ MAL - Todo mezclado
function handleEverything() { /* ... */ }
```

### 2. Validación de Datos

```javascript
// ✅ BIEN - Validar antes de enviar
const errors = usuariosModule.validateData(data);
if (errors.length > 0) {
    Notify.error(errors.join(', '));
    return;
}

// ❌ MAL - Enviar sin validar
await api.post('/api/usuarios', data);
```

### 3. Manejo de Errores

```javascript
// ✅ BIEN - Manejar todos los errores
try {
    const response = await api.get('/api/usuarios');
    return response.data;
} catch (error) {
    Notify.error(error.message);
    throw error;
}

// ❌ MAL - Sin manejo de errores
const response = await api.get('/api/usuarios');
return response.data;
```

### 4. Async/Await

```javascript
// ✅ BIEN - Usar async/await
async function loadData() {
    try {
        const users = await api.get('/api/usuarios');
        const predios = await api.get('/api/territorial/predios');
        return { users, predios };
    } catch (error) {
        console.error(error);
    }
}

// ❌ MAL - Callback hell
api.get('/api/usuarios', (users) => {
    api.get('/api/territorial/predios', (predios) => {
        // ...
    });
});
```

### 5. Almacenamiento Seguro

```javascript
// ✅ BIEN - localStorage solo para datos no sensibles
Storage.set('userPreferences', { theme: 'dark' });
localStorage.setItem('authToken', token); // Solo aquí

// ❌ MAL - Guardar datos sensibles
Storage.set('password', 'micontraseña');
Storage.set('creditCard', '4111111111111111');
```

### 6. Seguridad CORS

El API Gateway debe configurar headers CORS:
```javascript
// En el API Gateway
res.header('Access-Control-Allow-Origin', 'http://localhost:8000');
res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
```

---

## 🚀 Escalabilidad

### Migrar a React

El código actual está diseñado para facilitar migración:

```javascript
// 1. Los módulos (api.js, auth.js, utils.js) se mantienen igual
// 2. Solo cambiar la capa de presentación

// De:
class UsuariosPageHandler {
    renderTable() {
        tbody.innerHTML = this.usuarios.map(u => `<tr>...</tr>`).join('');
    }
}

// A:
function UsuariosTable({ usuarios }) {
    return (
        <table>
            <tbody>
                {usuarios.map(u => <tr key={u.id}>...</tr>)}
            </tbody>
        </table>
    );
}
```

### Migrar a Next.js

```typescript
// pages/api/proxy/[...path].ts
export default async function handler(req, res) {
    const { path } = req.query;
    const response = await api.get(`/api/${path.join('/')}`);
    res.status(200).json(response);
}
```

### Agregar TypeScript

```typescript
// types/user.ts
interface User {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
    rol: 'admin' | 'inspector' | 'supervisor' | 'operario';
    activo: boolean;
    fechaCreacion: string;
}

// modules/usuarios.ts
class UsuariosModule {
    async getUsuarios(): Promise<User[]> {
        // ...
    }
}
```

### Implementar Testing

```javascript
// tests/auth.test.js
describe('AuthManager', () => {
    test('debe hacer login correctamente', async () => {
        const result = await auth.login('test@mail.com', 'password');
        expect(result.token).toBeDefined();
        expect(auth.isAuthenticated()).toBe(true);
    });

    test('debe fallar con email inválido', async () => {
        await expect(auth.login('invalid', 'password')).rejects.toThrow();
    });
});
```

---

## 📊 Endpoints API

### Autenticación
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET /api/auth/verify
```

### Usuarios
```
GET /api/usuarios
GET /api/usuarios/:id
POST /api/usuarios
PUT /api/usuarios/:id
DELETE /api/usuarios/:id
GET /api/usuarios/me
POST /api/usuarios/change-password
```

### Territorial
```
GET /api/territorial/departamentos
POST /api/territorial/departamentos
PUT /api/territorial/departamentos/:id
DELETE /api/territorial/departamentos/:id

GET /api/territorial/municipios
POST /api/territorial/municipios
PUT /api/territorial/municipios/:id
DELETE /api/territorial/municipios/:id

GET /api/territorial/predios
POST /api/territorial/predios
PUT /api/territorial/predios/:id
DELETE /api/territorial/predios/:id

GET /api/territorial/centrales
POST /api/territorial/centrales
PUT /api/territorial/centrales/:id
DELETE /api/territorial/centrales/:id
```

### Inspecciones
```
GET /api/inspeccion
GET /api/inspeccion/:id
POST /api/inspeccion
PUT /api/inspeccion/:id
DELETE /api/inspeccion/:id
GET /api/inspeccion/:id/historial
GET /api/inspeccion/reportes
POST /api/inspeccion/reportes/pdf
```

---

## 🔧 Troubleshooting

### Error: "CORS policy"
**Solución:** Configurar headers CORS en API Gateway

### Error: "401 Unauthorized"
**Solución:** Token expirado. El usuario debe hacer login nuevamente.

### Error: "Network timeout"
**Solución:** Aumentar timeout en `API_CONFIG` o revisar conexión API Gateway.

### Error: "localStorage is undefined"
**Solución:** Verificar que no está en contexto de worker. Usar condición: `if (typeof localStorage !== 'undefined')`

---

## 📚 Recursos Adicionales

- [MDN Web Docs - Fetch API](https://developer.mozilla.org/es/docs/Web/API/Fetch_API)
- [JWT.io - JSON Web Tokens](https://jwt.io/)
- [CORS Documentation](https://developer.mozilla.org/es/docs/Web/HTTP/CORS)
- [REST API Best Practices](https://restfulapi.net/)

---

## 👥 Contacto y Soporte

Para soporte técnico, contacte al equipo de desarrollo.

---

**Versión:** 1.0.0  
**Última actualización:** 2026-05-28  
**Licencia:** Propietaria
