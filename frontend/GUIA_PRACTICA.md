# Guía Práctica: Consumo de APIs y Arquitectura

---

## 1. Arquitectura del Frontend

### Estructura de Capas

```
┌─────────────────────────────────────┐
│   PRESENTACIÓN (HTML + CSS)         │
│   - index.html                      │
│   - login.html                      │
│   - dashboard.html                  │
│   - pages/*.html                    │
└─────────────────────────────────────┘
            ▲
            │
            ▼
┌─────────────────────────────────────┐
│   LÓGICA DE NEGOCIO (JS Modules)    │
│   - usuarios.js                     │
│   - territorial.js                  │
│   - inspecciones.js                 │
└─────────────────────────────────────┘
            ▲
            │
            ▼
┌─────────────────────────────────────┐
│   SERVICIOS (api.js, auth.js)       │
│   - APIClient                       │
│   - AuthManager                     │
└─────────────────────────────────────┘
            ▲
            │
            ▼
┌─────────────────────────────────────┐
│   API GATEWAY (:8080)               │
└─────────────────────────────────────┘
            ▲
            │
            ▼
┌─────────────────────────────────────┐
│   MICROSERVICIOS                    │
│   - Usuarios (8081)                 │
│   - Territorial (8082)              │
│   - Inspecciones (8083)             │
└─────────────────────────────────────┘
```

### Flujo de Datos

**Ejemplo: Crear un Usuario**

```
1. HTML Form
   └─> Valida campos
   
2. JavaScript Handler (usuarios.html)
   └─> Captura datos del formulario
   └─> Llama usuariosModule.createUsuario()
   
3. Módulo de Negocio (usuarios.js)
   └─> Valida datos con validateData()
   └─> Llama api.post()
   
4. Cliente HTTP (api.js)
   └─> Inyecta Bearer Token en headers
   └─> Hace fetch a http://localhost:8080/api/usuarios
   └─> Maneja respuesta y errores
   
5. API Gateway (8080)
   └─> Valida request
   └─> Enruta a Microservicio Usuarios (8081)
   
6. Microservicio Usuarios (8081)
   └─> Procesa request
   └─> Crea usuario en BD
   └─> Retorna respuesta
   
7. API Gateway
   └─> Retorna respuesta al Frontend
   
8. Cliente HTTP (api.js)
   └─> Parsea JSON
   └─> Devuelve data
   
9. Módulo de Negocio (usuarios.js)
   └─> Muestra notificación de éxito
   └─> Devuelve resultado
   
10. Handler (usuarios.html)
    └─> Recarga la tabla de usuarios
    └─> Cierra modal
```

---

## 2. Consumo de APIs Paso a Paso

### Caso 1: Obtener Lista de Usuarios

**HTML:**
```html
<button id="loadUsersBtn" class="btn btn--primary">Cargar Usuarios</button>
<table id="usersTable">
    <tbody></tbody>
</table>
```

**JavaScript:**
```javascript
// Paso 1: Agregar event listener
document.getElementById('loadUsersBtn').addEventListener('click', loadUsers);

// Paso 2: Función para cargar
async function loadUsers() {
    // Mostrar loader
    const loader = Loader.show(document.getElementById('usersTable'));
    
    try {
        // Paso 3: Llamar al API mediante el módulo
        const response = await usuariosModule.getUsuarios();
        
        // Paso 4: Extraer datos
        const usuarios = response.data || [];
        
        // Paso 5: Renderizar tabla
        renderTable(usuarios);
        
        // Paso 6: Mostrar notificación
        Notify.success('Usuarios cargados exitosamente');
    } catch (error) {
        // Paso 7: Manejar error
        console.error('Error:', error);
        Notify.error('Error al cargar usuarios: ' + error.message);
    } finally {
        // Paso 8: Limpiar
        Loader.hide(loader);
    }
}

// Paso 9: Función para renderizar
function renderTable(usuarios) {
    const tbody = document.querySelector('#usersTable tbody');
    
    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No hay usuarios</td></tr>';
        return;
    }
    
    tbody.innerHTML = usuarios.map(user => `
        <tr>
            <td>${user.nombre}</td>
            <td>${user.email}</td>
            <td><span class="badge">${user.rol}</span></td>
            <td>${Format.date(user.fechaCreacion)}</td>
            <td>
                <button onclick="editUser('${user.id}')">✏️</button>
                <button onclick="deleteUser('${user.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}
```

### Caso 2: Crear Usuario con Validación

**HTML:**
```html
<form id="userForm">
    <div class="form-group">
        <label class="form-label required">Nombre</label>
        <input type="text" id="nombreInput" class="form-control" required>
        <span class="form-text text-danger" id="nombreError"></span>
    </div>
    
    <div class="form-group">
        <label class="form-label required">Email</label>
        <input type="email" id="emailInput" class="form-control" required>
        <span class="form-text text-danger" id="emailError"></span>
    </div>
    
    <button type="submit" class="btn btn--primary">Crear Usuario</button>
</form>
```

**JavaScript:**
```javascript
// Paso 1: Setup del formulario
document.getElementById('userForm').addEventListener('submit', handleSubmit);

// Paso 2: Handler del submit
async function handleSubmit(e) {
    e.preventDefault();
    
    // Paso 3: Limpiar errores previos
    clearErrors();
    
    // Paso 4: Capturar datos
    const userData = {
        nombre: document.getElementById('nombreInput').value,
        email: document.getElementById('emailInput').value,
        // ... otros campos
    };
    
    // Paso 5: Validar localmente
    const errors = validateUserData(userData);
    if (errors.length > 0) {
        showErrors(errors);
        return;
    }
    
    // Paso 6: Deshabilitar botón
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    
    try {
        // Paso 7: Llamar API
        const response = await usuariosModule.createUsuario(userData);
        
        // Paso 8: Éxito
        Notify.success('Usuario creado exitosamente');
        
        // Paso 9: Limpiar formulario
        document.getElementById('userForm').reset();
        
        // Paso 10: Recargar datos
        loadUsers();
    } catch (error) {
        // Paso 11: Error
        if (error.data && error.data.fields) {
            // Errores de validación del servidor
            showErrors(error.data.fields);
        } else {
            Notify.error(error.message || 'Error al crear usuario');
        }
    } finally {
        // Paso 12: Habilitar botón
        submitBtn.disabled = false;
    }
}

// Paso 13: Función de validación
function validateUserData(data) {
    const errors = [];
    
    if (!data.nombre || data.nombre.trim().length < 3) {
        errors.push('Nombre inválido');
    }
    
    if (!Validation.isEmail(data.email)) {
        errors.push('Email inválido');
    }
    
    return errors;
}

// Paso 14: Mostrar errores
function showErrors(errors) {
    Object.keys(errors).forEach(field => {
        const errorEl = document.getElementById(field + 'Error');
        if (errorEl) {
            errorEl.textContent = errors[field];
        }
    });
}

// Paso 15: Limpiar errores
function clearErrors() {
    document.querySelectorAll('.form-text.text-danger').forEach(el => {
        el.textContent = '';
    });
}
```

### Caso 3: Actualizar Recurso

**JavaScript:**
```javascript
async function editUser(userId) {
    try {
        // Paso 1: Cargar datos del usuario
        const user = await usuariosModule.getUsuario(userId);
        
        // Paso 2: Llenar formulario
        document.getElementById('nombreInput').value = user.nombre;
        document.getElementById('emailInput').value = user.email;
        
        // Paso 3: Marcar para actualización
        window.editingUserId = userId;
        
        // Paso 4: Cambiar texto del botón
        document.querySelector('button[type="submit"]').textContent = 'Actualizar';
        
        // Paso 5: Mostrar modal
        showModal();
    } catch (error) {
        Notify.error('Error al cargar usuario');
    }
}

async function updateUser() {
    const userId = window.editingUserId;
    
    if (!userId) {
        createUser(); // Si no hay ID, crear nuevo
        return;
    }
    
    try {
        // Paso 1: Capturar datos
        const userData = {
            nombre: document.getElementById('nombreInput').value,
            email: document.getElementById('emailInput').value
        };
        
        // Paso 2: Validar
        const errors = validateUserData(userData);
        if (errors.length > 0) {
            showErrors(errors);
            return;
        }
        
        // Paso 3: Enviar actualización
        await usuariosModule.updateUsuario(userId, userData);
        
        // Paso 4: Éxito
        Notify.success('Usuario actualizado exitosamente');
        
        // Paso 5: Actualizar UI
        closeModal();
        loadUsers();
        window.editingUserId = null;
    } catch (error) {
        Notify.error('Error al actualizar usuario');
    }
}
```

### Caso 4: Eliminar Recurso

**JavaScript:**
```javascript
async function deleteUser(userId) {
    // Paso 1: Confirmar acción
    if (!confirm('¿Está seguro de eliminar este usuario?')) {
        return;
    }
    
    try {
        // Paso 2: Llamar API
        await usuariosModule.deleteUsuario(userId);
        
        // Paso 3: Éxito
        Notify.success('Usuario eliminado exitosamente');
        
        // Paso 4: Recargar lista
        loadUsers();
    } catch (error) {
        // Paso 5: Manejar errores específicos
        if (error.status === 403) {
            Notify.error('No tiene permiso para eliminar este usuario');
        } else if (error.status === 409) {
            Notify.error('No se puede eliminar: el usuario tiene registros asociados');
        } else {
            Notify.error('Error al eliminar usuario');
        }
    }
}
```

### Caso 5: Filtrado y Búsqueda

**HTML:**
```html
<div class="filter-bar">
    <input type="text" id="searchInput" placeholder="Buscar...">
    <select id="roleFilter">
        <option value="">Todos</option>
        <option value="admin">Admin</option>
        <option value="inspector">Inspector</option>
    </select>
    <button id="searchBtn" class="btn btn--secondary">Buscar</button>
    <button id="clearBtn" class="btn btn--outline">Limpiar</button>
</div>
```

**JavaScript:**
```javascript
// Setup
document.getElementById('searchBtn').addEventListener('click', performSearch);
document.getElementById('clearBtn').addEventListener('click', clearFilters);

// Búsqueda
async function performSearch() {
    const searchTerm = document.getElementById('searchInput').value;
    const roleFilter = document.getElementById('roleFilter').value;
    
    try {
        // Paso 1: Construir parámetros
        const filters = {};
        
        if (searchTerm) {
            filters.search = searchTerm;
        }
        
        if (roleFilter) {
            filters.rol = roleFilter;
        }
        
        // Paso 2: Enviar request con filtros
        const response = await api.get(
            Endpoints.USUARIOS.LIST + 
            '?' + new URLSearchParams(filters).toString()
        );
        
        // Paso 3: Renderizar resultados
        renderTable(response.data);
        
        Notify.info(`Se encontraron ${response.data.length} usuarios`);
    } catch (error) {
        Notify.error('Error en búsqueda');
    }
}

// Limpiar
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('roleFilter').value = '';
    loadUsers(); // Recargar todos
}
```

---

## 3. Manejo de Errores Profesional

### Errores HTTP Comunes

```javascript
async function apiCall() {
    try {
        return await api.get('/api/usuarios');
    } catch (error) {
        // Paso 1: Identificar tipo de error
        if (error instanceof APIError) {
            // Error de API
            switch (error.status) {
                case 400:
                    // Bad Request - Datos inválidos
                    Notify.error('Datos inválidos: ' + error.message);
                    break;
                    
                case 401:
                    // Unauthorized - No autenticado
                    Notify.error('Sesión expirada');
                    window.location.href = 'login.html';
                    break;
                    
                case 403:
                    // Forbidden - Sin permisos
                    Notify.error('No tiene permisos para esta acción');
                    break;
                    
                case 404:
                    // Not Found - Recurso no existe
                    Notify.error('Recurso no encontrado');
                    break;
                    
                case 409:
                    // Conflict - Conflicto (duplicado, etc)
                    Notify.error('Conflicto: ' + error.message);
                    break;
                    
                case 500:
                    // Server Error
                    Notify.error('Error del servidor. Intente más tarde');
                    break;
                    
                default:
                    Notify.error('Error: ' + error.message);
            }
        } else if (error.name === 'AbortError') {
            // Timeout
            Notify.error('Timeout: La solicitud tardó demasiado');
        } else {
            // Error desconocido
            Notify.error('Error desconocido: ' + error.message);
        }
        
        throw error;
    }
}
```

### Validación de Errores de Formulario

```javascript
async function submitForm() {
    try {
        clearErrors();
        
        const data = captureFormData();
        const errors = validateData(data);
        
        // Paso 1: Mostrar errores de validación local
        if (Object.keys(errors).length > 0) {
            showFormErrors(errors);
            return;
        }
        
        // Paso 2: Enviar
        const response = await api.post('/api/usuarios', data);
        
        Notify.success('Operación exitosa');
    } catch (error) {
        // Paso 3: Mostrar errores del servidor
        if (error.data && error.data.errors) {
            // Errores de validación del servidor
            showFormErrors(error.data.errors);
        } else if (error.status === 400) {
            // Error general 400
            Notify.error('Datos inválidos');
        } else {
            Notify.error(error.message);
        }
    }
}

function showFormErrors(errors) {
    Object.keys(errors).forEach(field => {
        const errorElement = document.getElementById(field + 'Error');
        const inputElement = document.getElementById(field + 'Input');
        
        if (errorElement) {
            errorElement.textContent = errors[field];
        }
        
        if (inputElement) {
            inputElement.classList.add('form-control--error');
        }
    });
}

function clearErrors() {
    document.querySelectorAll('.form-text.text-danger').forEach(el => {
        el.textContent = '';
    });
    
    document.querySelectorAll('.form-control--error').forEach(el => {
        el.classList.remove('form-control--error');
    });
}
```

---

## 4. Ejemplos Reales de Integración

### Módulo de Inspecciones Completo

```javascript
class InspeccionesUI {
    constructor() {
        this.inspecciones = [];
        this.filters = {};
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadInspecciones();
    }
    
    setupEventListeners() {
        document.getElementById('createBtn').addEventListener('click', 
            () => this.openModal());
        
        document.getElementById('filterBtn').addEventListener('click', 
            () => this.applyFilters());
        
        document.getElementById('exportBtn').addEventListener('click', 
            () => this.exportPDF());
    }
    
    async loadInspecciones() {
        const loader = Loader.show(document.getElementById('inspectionsList'));
        
        try {
            const response = await inspeccionesModule.getInspecciones(this.filters);
            this.inspecciones = response.data;
            this.renderTable();
        } catch (error) {
            Notify.error('Error al cargar inspecciones');
        } finally {
            Loader.hide(loader);
        }
    }
    
    async applyFilters() {
        // Capturar filtros
        this.filters = {
            estado: document.getElementById('estadoFilter').value,
            predioId: document.getElementById('predioFilter').value,
            desde: document.getElementById('desdeFilter').value,
            hasta: document.getElementById('hastaFilter').value
        };
        
        // Remover filtros vacíos
        Object.keys(this.filters).forEach(key => {
            if (!this.filters[key]) delete this.filters[key];
        });
        
        this.loadInspecciones();
    }
    
    renderTable() {
        const tbody = document.querySelector('#inspectionsList tbody');
        
        tbody.innerHTML = this.inspecciones.map(insp => `
            <tr>
                <td>${insp.id}</td>
                <td>${insp.predioId}</td>
                <td>${insp.inspector}</td>
                <td>${Format.date(insp.fechaInspeccion)}</td>
                <td>
                    <span class="badge ${inspeccionesModule.getStatusColor(insp.estado)}">
                        ${insp.estado}
                    </span>
                </td>
                <td>
                    <button onclick="ui.viewInspeccion('${insp.id}')">👁️</button>
                    <button onclick="ui.editInspeccion('${insp.id}')">✏️</button>
                </td>
            </tr>
        `).join('');
    }
    
    async exportPDF() {
        try {
            Notify.info('Generando reporte...');
            await inspeccionesModule.generatePDFReport(this.filters);
        } catch (error) {
            Notify.error('Error al generar reporte');
        }
    }
    
    openModal() {
        document.getElementById('inspectionModal').classList.add('active');
    }
}

// Inicializar
const inspectionUI = new InspeccionesUI();
```

---

## 5. Seguridad y Mejores Prácticas

### Protección de Rutas

```javascript
// middleware/auth.js
function requireAuth(pageHandler) {
    return function() {
        if (!auth.isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        if (auth.isTokenExpired()) {
            auth.logout();
            window.location.href = 'login.html';
            return;
        }
        
        return new pageHandler();
    };
}

// Uso
document.addEventListener('DOMContentLoaded', requireAuth(UsuariosPageHandler));
```

### Sanitización de Datos

```javascript
// Evitar XSS
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Uso en render
tbody.innerHTML = this.usuarios.map(u => `
    <tr>
        <td>${sanitizeHTML(u.nombre)}</td>
        <td>${sanitizeHTML(u.email)}</td>
    </tr>
`).join('');
```

### CORS Seguro

```javascript
// En el API Gateway
const corsOptions = {
    origin: ['http://localhost:8000', 'https://miapp.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

---

## 6. Performance y Optimización

### Lazy Loading

```javascript
// Cargar datos bajo demanda
async function loadUsersPaginated(page = 1) {
    try {
        const response = await api.get(
            `/api/usuarios?page=${page}&limit=10`
        );
        
        this.usuarios = response.data;
        this.currentPage = page;
        this.totalPages = response.totalPages;
        
        this.renderTable();
        this.renderPagination();
    } catch (error) {
        Notify.error('Error');
    }
}
```

### Debounce de Búsqueda

```javascript
const searchInput = document.getElementById('searchInput');

// Esperar 500ms después de que el usuario deje de escribir
const debouncedSearch = debounce(async (query) => {
    if (query.length < 2) return;
    
    const response = await api.get(
        `/api/usuarios?search=${encodeURIComponent(query)}`
    );
    renderTable(response.data);
}, 500);

searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
});
```

### Caché de Datos

```javascript
class DataCache {
    constructor(ttl = 5 * 60 * 1000) { // 5 minutos
        this.cache = new Map();
        this.ttl = ttl;
    }
    
    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }
}

// Uso
const cache = new DataCache();

async function getUsuarios() {
    const cached = cache.get('usuarios');
    if (cached) return cached;
    
    const usuarios = await api.get('/api/usuarios');
    cache.set('usuarios', usuarios);
    return usuarios;
}
```

---

**Fin de la Guía Práctica**

Para consultas adicionales, revisar la documentación principal en README.md
