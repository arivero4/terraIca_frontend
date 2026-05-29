/**
 * Usuarios Module
 * Gestiona todas las operaciones relacionadas con usuarios
 */

class UsuariosModule {
    constructor() {
        this.usuarios = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
    }

    /**
     * Obtiene lista de usuarios
     */
    async getUsuarios(page = 1) {
        try {
            const response = await apiUsuarios.get(`${Endpoints.USUARIOS.LIST}?page=${page}`);
            this.usuarios = response.data || [];
            return response;
        } catch (error) {
            Notify.error('Error al obtener usuarios');
            throw error;
        }
    }

    /**
     * Obtiene usuario por ID
     */
    async getUsuario(id) {
        try {
            return await apiUsuarios.get(Endpoints.USUARIOS.GET(id));
        } catch (error) {
            Notify.error('Error al obtener usuario');
            throw error;
        }
    }

    /**
     * Crea nuevo usuario
     */
    async createUsuario(data) {
        try {
            if (!Validation.isEmail(data.email)) {
                throw new Error('Email inválido');
            }
            if (data.password && !Validation.isStrongPassword(data.password)) {
                throw new Error('Contraseña débil. Mínimo 8 caracteres con mayúsculas, minúsculas, números y caracteres especiales');
            }

            const response = await apiUsuarios.post(Endpoints.USUARIOS.CREATE, data);
            Notify.success('Usuario creado exitosamente');
            return response;
        } catch (error) {
            Notify.error(error.message || 'Error al crear usuario');
            throw error;
        }
    }

    /**
     * Actualiza usuario
     */
    async updateUsuario(id, data) {
        try {
            if (data.email && !Validation.isEmail(data.email)) {
                throw new Error('Email inválido');
            }

            const response = await apiUsuarios.put(Endpoints.USUARIOS.UPDATE(id), data);
            Notify.success('Usuario actualizado exitosamente');
            return response;
        } catch (error) {
            Notify.error(error.message || 'Error al actualizar usuario');
            throw error;
        }
    }

    /**
     * Elimina usuario
     */
    async deleteUsuario(id) {
        try {
            if (!confirm('¿Está seguro de eliminar este usuario?')) {
                return;
            }
            await apiUsuarios.delete(Endpoints.USUARIOS.DELETE(id));
            Notify.success('Usuario eliminado exitosamente');
            return true;
        } catch (error) {
            Notify.error('Error al eliminar usuario');
            throw error;
        }
    }

    /**
     * Obtiene perfil del usuario actual
     */
    async getProfile() {
        try {
            return await apiUsuarios.get(Endpoints.USUARIOS.PROFILE);
        } catch (error) {
            Notify.error('Error al obtener perfil');
            throw error;
        }
    }

    /**
     * Cambia contraseña
     */
    async changePassword(currentPassword, newPassword) {
        try {
            if (!Validation.isStrongPassword(newPassword)) {
                throw new Error('Contraseña débil');
            }

            await apiUsuarios.post(Endpoints.USUARIOS.CHANGE_PASSWORD, {
                currentPassword,
                newPassword
            });
            Notify.success('Contraseña actualizada exitosamente');
            return true;
        } catch (error) {
            Notify.error(error.message || 'Error al cambiar contraseña');
            throw error;
        }
    }

    /**
     * Valida datos de usuario antes de guardar
     */
    validateData(data) {
        const errors = [];

        if (!data.nombre || data.nombre.trim().length < 3) {
            errors.push('Nombre debe tener mínimo 3 caracteres');
        }

        if (!data.apellido || data.apellido.trim().length < 3) {
            errors.push('Apellido debe tener mínimo 3 caracteres');
        }

        if (!Validation.isEmail(data.email)) {
            errors.push('Email inválido');
        }

        if (!data.roles || data.roles.length === 0) {
            errors.push('Debe seleccionar al menos un rol');
        }

        return errors;
    }
}

const usuariosModule = new UsuariosModule();

// Exponer globalmente para acceso desde HTML
window.UsuariosModule = UsuariosModule;
window.usuariosModule = usuariosModule;
