/**
 * API Client
 * Centraliza todas las comunicaciones con los microservicios
 * Maneja autenticación, errores y reintentos
 */

const API_SERVICES = {
    USUARIOS:     { BASE_URL: 'http://localhost:8081', TIMEOUT: 5000, RETRY_ATTEMPTS: 3 },
    TERRITORIAL:  { BASE_URL: 'http://localhost:8082/api/territorial', TIMEOUT: 5000, RETRY_ATTEMPTS: 3 },
    INSPECCIONES: { BASE_URL: 'http://localhost:8083/api/v1', TIMEOUT: 5000, RETRY_ATTEMPTS: 3 }
};

class APIClient {
    constructor(config) {
        this.baseURL = config.BASE_URL;
        this.timeout = config.TIMEOUT;
        this.retryAttempts = config.RETRY_ATTEMPTS;
    }

    getAuthToken() {
        return localStorage.getItem('authToken');
    }

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async request(endpoint, options = {}, attempt = 1) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: { ...this.getHeaders(), ...(options.headers || {}) }
        };

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, { ...config, signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.status === 401) {
                // Si ya estamos en login.html, NO redirigir — solo lanzar el error
                // para que el formulario de login lo muestre correctamente
                const isLoginPage = window.location.pathname.includes('login.html') ||
                                    window.location.href.includes('login.html');
                if (!isLoginPage) {
                    this.handleUnauthorized();
                }
                const errBody = await response.json().catch(() => ({}));
                throw new APIError(
                    errBody.message || 'Correo o contraseña incorrectos',
                    401,
                    errBody
                );
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new APIError(
                    errorData.message || errorData.mensaje || `Error ${response.status}`,
                    response.status,
                    errorData
                );
            }

            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            if (error instanceof APIError) throw error;

            if (error.name === 'AbortError') {
                if (attempt < this.retryAttempts) {
                    await new Promise(r => setTimeout(r, 500 * attempt));
                    return this.request(endpoint, options, attempt + 1);
                }
                throw new Error('Request timeout. Intente nuevamente.');
            }

            // Solo reintentar errores de red/timeout, no errores HTTP 4xx/5xx
            if (!(error instanceof APIError) && attempt < this.retryAttempts) {
                await new Promise(r => setTimeout(r, 500 * attempt));
                return this.request(endpoint, options, attempt + 1);
            }

            throw error;
        }
    }

    async get(endpoint)          { return this.request(endpoint, { method: 'GET' }); }
    async post(endpoint, body)   { return this.request(endpoint, { method: 'POST', body }); }
    async put(endpoint, body)    { return this.request(endpoint, { method: 'PUT', body }); }
    async delete(endpoint)       { return this.request(endpoint, { method: 'DELETE' }); }
    async patch(endpoint, body)  { return this.request(endpoint, { method: 'PATCH', body }); }

    handleUnauthorized() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
}

class APIError extends Error {
    constructor(message, status, data = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

// Instancias por microservicio
const apiUsuarios    = new APIClient(API_SERVICES.USUARIOS);
const apiTerritorial = new APIClient(API_SERVICES.TERRITORIAL);
const apiInspecciones = new APIClient(API_SERVICES.INSPECCIONES);

// Alias principal (backward compat)
const api = apiUsuarios;

/**
 * ENDPOINTS - Paths reales de cada microservicio
 */
const Endpoints = {
    // ms_usuarios - puerto 8081
    AUTH: {
        LOGIN:   '/api/v1/auth/login',
        REFRESH: '/api/v1/auth/renovar',
        VERIFY:  '/api/v1/auth/validar'
    },

    USUARIOS: {
        LIST:   '/api/v1/usuarios',
        GET:    (id) => `/api/v1/usuarios/${id}`,
        CREATE: '/api/v1/usuarios',
        UPDATE: (id) => `/api/v1/usuarios/${id}`,
        DELETE: (id) => `/api/v1/usuarios/${id}`,
        ESTADO: (id) => `/api/v1/usuarios/${id}/estado`
    },

    GRUPOS: {
        LIST:   '/api/v1/grupos',
        GET:    (id) => `/api/v1/grupos/${id}`,
        CREATE: '/api/v1/grupos',
        UPDATE: (id) => `/api/v1/grupos/${id}`,
        DELETE: (id) => `/api/v1/grupos/${id}`
    },

    // ms_territorial - puerto 8080, context-path: /api/territorial
    TERRITORIAL: {
        DEPARTAMENTOS: {
            LIST:   '/departamentos',
            GET:    (id) => `/departamentos/${id}`,
            CREATE: '/departamentos',
            UPDATE: (id) => `/departamentos/${id}`,
            DELETE: (id) => `/departamentos/${id}`
        },
        MUNICIPIOS: {
            LIST:   '/municipios',
            GET:    (id) => `/municipios/${id}`,
            CREATE: '/municipios',
            UPDATE: (id) => `/municipios/${id}`,
            DELETE: (id) => `/municipios/${id}`
        },
        PREDIOS: {
            LIST:   '/predios',
            GET:    (id) => `/predios/${id}`,
            SEARCH: (num) => `/predios/buscar?numeroPredial=${num}`,
            LIST_BY_LUGAR: (lugarId) => `/predios?lugarProduccionId=${lugarId}`,
            CREATE: '/predios',
            UPDATE: (id) => `/predios/${id}`,
            DELETE: (id) => `/predios/${id}`,
            ACTIVAR:   (id) => `/predios/${id}/activar`,
            DESACTIVAR:(id) => `/predios/${id}/desactivar`
        },
        LUGARES: {
            LIST:   '/lugares',
            GET:    (id) => `/lugares/${id}`,
            LIST_BY_MUNICIPIO: (mId) => `/lugares?municipioId=${mId}`,
            CREATE: '/lugares',
            UPDATE: (id) => `/lugares/${id}`,
            DELETE: (id) => `/lugares/${id}`,
            ACTIVAR:   (id) => `/lugares/${id}/activar`,
            DESACTIVAR:(id) => `/lugares/${id}/desactivar`
        },
        CULTIVOS: {
            LIST:   '/cultivos',
            GET:    (id) => `/cultivos/${id}`,
            LIST_BY_PREDIO: (pId) => `/cultivos?predioId=${pId}`,
            CREATE: '/cultivos',
            UPDATE: (id) => `/cultivos/${id}`,
            DELETE: (id) => `/cultivos/${id}`,
            ACTIVAR:   (id) => `/cultivos/${id}/activar`,
            DESACTIVAR:(id) => `/cultivos/${id}/desactivar`,
            ASOCIAR_PLAGA:    (cId, pId) => `/cultivos/${cId}/plagas/${pId}`,
            DESASOCIAR_PLAGA: (cId, pId) => `/cultivos/${cId}/plagas/${pId}`
        },
        LOTES: {
            LIST:   '/lotes',
            GET:    (id) => `/lotes/${id}`,
            LIST_BY_CULTIVO: (cId) => `/lotes?cultivoId=${cId}`,
            CREATE: '/lotes',
            UPDATE: (id) => `/lotes/${id}`,
            DELETE: (id) => `/lotes/${id}`,
            INICIAR:  (id) => `/lotes/${id}/iniciar-produccion`,
            COSECHAR: (id) => `/lotes/${id}/cosechar`,
            ESTADO:   (id) => `/lotes/${id}/estado`
        },
        PLAGAS: {
            LIST:   '/plagas',
            GET:    (id) => `/plagas/${id}`,
            LIST_BY_TIPO:   (tipo) => `/plagas?tipo=${tipo}`,
            LIST_BY_RIESGO: (r)    => `/plagas?nivelRiesgo=${r}`,
            BUSCAR: (nombre) => `/plagas?nombre=${encodeURIComponent(nombre)}`,
            CREATE: '/plagas',
            UPDATE: (id) => `/plagas/${id}`,
            DELETE: (id) => `/plagas/${id}`
        }
    },

    // ms_inspeccion - puerto 8083, context-path: /api/v1
    INSPECCIONES: {
        LIST:     '/inspecciones',
        GET:      (id) => `/inspecciones/${id}`,
        BY_ESTADO: (estado) => `/inspecciones/estado/${estado}`,
        BY_LOTE:   (loteId) => `/inspecciones/lote/${loteId}`,
        CREATE:   '/inspecciones',
        UPDATE:   (id) => `/inspecciones/${id}`,
        DELETE:   (id) => `/inspecciones/${id}`,
        INICIAR:   (id) => `/inspecciones/${id}/iniciar`,
        COMPLETAR: (id) => `/inspecciones/${id}/completar`,
        CANCELAR:  (id) => `/inspecciones/${id}/cancelar`,
        REVISION:  (id) => `/inspecciones/${id}/revision`,
        DETALLES: {
            LIST:   (inspeccionId) => `/inspecciones/${inspeccionId}/detalles`,
            GET:    (detalleId) => `/detalles/${detalleId}`,
            CREATE: (inspeccionId) => `/inspecciones/${inspeccionId}/detalles`,
            UPDATE: (detalleId) => `/detalles/${detalleId}`,
            DELETE: (detalleId) => `/detalles/${detalleId}`,
            PLAGAS: {
                LIST:   (detalleId) => `/detalles/${detalleId}/plagas`,
                CREATE: (detalleId) => `/detalles/${detalleId}/plagas`,
                UPDATE: (plagaId)   => `/plagas/${plagaId}`,
                DELETE: (plagaId)   => `/plagas/${plagaId}`
            }
        },
        REPORTES: '/reportes'
    }
};

window.APIClient      = APIClient;
window.APIError       = APIError;
window.api            = api;
window.apiUsuarios    = apiUsuarios;
window.apiTerritorial = apiTerritorial;
window.apiInspecciones = apiInspecciones;
window.Endpoints      = Endpoints;
