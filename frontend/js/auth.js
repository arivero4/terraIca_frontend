/**
 * Authentication Manager
 * Gestiona sesiones, JWT, y autenticación
 */

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = this.getStoredUser();
    }

    /**
     * Obtiene usuario del storage
     */
    getStoredUser() {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch {
            localStorage.removeItem('user');
            return null;
        }
    }

    /**
     * Login - Autentica usuario y almacena token
     */
    async login(correo, password) {
        try {
            const response = await apiUsuarios.post(Endpoints.AUTH.LOGIN, {
                correo,
                password
            });

            // El backend solo devuelve token + expiracion, sin objeto user.
            // Construimos el user decodificando el JWT.
            const decoded = this.decodeToken(response.token);
            const user = {
                id:      decoded?.id ?? null,
                nombre:  decoded?.nombre ?? correo,
                correo:  decoded?.sub ?? correo,
                estado:  decoded?.estado ?? null,
                grupos:  decoded?.grupos ?? []
            };

            this.setSession(response.token, user);
            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Almacena token y datos de usuario
     */
    setSession(token, user) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        this.token = token;
        this.user = user;
    }

    /**
     * Logout - Limpia sesión
     */
    async logout() {
        // El backend no expone endpoint de logout; la sesion se invalida localmente.
        this.clearSession();
    }

    /**
     * Limpia sesión del usuario
     */
    clearSession() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
    }

    /**
     * Verifica si usuario está autenticado
     */
    isAuthenticated() {
        if (!this.token || !this.user) return false;
        if (this.isTokenExpired()) {
            this.clearSession();
            return false;
        }
        return true;
    }

    /**
     * Obtiene usuario actual
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Verifica si usuario tiene rol específico
     */
    hasRole(role) {
        return this.user && this.user.grupos && this.user.grupos.includes(role);
    }

    hasPermission(permission) {
        return this.user && this.user.grupos && this.user.grupos.includes(permission);
    }

    /**
     * Obtiene token actual
     */
    getToken() {
        return this.token;
    }

    /**
     * Decodifica JWT sin verificación (solo para lectura de claims)
     * Uso: Leer claims del token, no para verificar
     */
    decodeToken(token = this.token) {
        if (!token) return null;

        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }

    /**
     * Verifica si token está expirado
     */
    isTokenExpired(token = this.token) {
        const decoded = this.decodeToken(token);
        if (!decoded || !decoded.exp) return true;

        const expirationTime = decoded.exp * 1000;
        return Date.now() >= expirationTime;
    }

    /**
     * Intenta refrescar token
     */
    async refreshToken() {
        try {
            const response = await apiUsuarios.post(Endpoints.AUTH.REFRESH, {});
            const decoded = this.decodeToken(response.token);
            const user = {
                id:     decoded?.id ?? null,
                nombre: decoded?.nombre ?? this.user?.nombre,
                correo: decoded?.sub ?? this.user?.correo,
                estado: decoded?.estado ?? null,
                grupos: decoded?.grupos ?? []
            };
            this.setSession(response.token, user);
            return response.token;
        } catch (error) {
            this.clearSession();
            throw error;
        }
    }

    /**
     * Obtiene tiempo restante del token en segundos
     */
    getTokenExpiration(token = this.token) {
        const decoded = this.decodeToken(token);
        if (!decoded || !decoded.exp) return 0;

        return Math.floor((decoded.exp * 1000 - Date.now()) / 1000);
    }
}

/**
 * Instancia global del gestor de autenticación
 */
const auth = new AuthManager();

// Exponer globalmente para acceso desde HTML
window.AuthManager = AuthManager;
window.auth = auth;
