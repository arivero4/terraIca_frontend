/**
 * Inspecciones Module
 * Gestiona todas las operaciones de inspecciones fitosanitarias
 */

class InspeccionesModule {
    constructor() {
        this.inspecciones = [];
        this.historial = [];
        this.reportes = [];
    }

    /**
     * Obtiene lista de inspecciones
     */
    async getInspecciones(filters = {}) {
        try {
            const query = new URLSearchParams(filters).toString();
            const endpoint = query 
                ? `${Endpoints.INSPECCIONES.LIST}?${query}`
                : Endpoints.INSPECCIONES.LIST;
            const response = await apiInspecciones.get(endpoint);
            this.inspecciones = response.data || [];
            return response;
        } catch (error) {
            Notify.error('Error al obtener inspecciones');
            throw error;
        }
    }

    /**
     * Obtiene inspección por ID
     */
    async getInspeccion(id) {
        try {
            return await apiInspecciones.get(Endpoints.INSPECCIONES.GET(id));
        } catch (error) {
            Notify.error('Error al obtener inspección');
            throw error;
        }
    }

    /**
     * Crea nueva inspección
     */
    async createInspeccion(data) {
        try {
            if (!this.validateInspeccion(data)) {
                throw new Error('Datos de inspección incompletos');
            }

            const response = await apiInspecciones.post(Endpoints.INSPECCIONES.CREATE, data);
            Notify.success('Inspección registrada exitosamente');
            return response;
        } catch (error) {
            Notify.error(error.message || 'Error al crear inspección');
            throw error;
        }
    }

    /**
     * Actualiza inspección
     */
    async updateInspeccion(id, data) {
        try {
            const response = await apiInspecciones.put(Endpoints.INSPECCIONES.UPDATE(id), data);
            Notify.success('Inspección actualizada exitosamente');
            return response;
        } catch (error) {
            Notify.error('Error al actualizar inspección');
            throw error;
        }
    }

    /**
     * Elimina inspección
     */
    async deleteInspeccion(id) {
        try {
            if (!confirm('¿Está seguro de eliminar esta inspección?')) {
                return;
            }
            await apiInspecciones.delete(Endpoints.INSPECCIONES.DELETE(id));
            Notify.success('Inspección eliminada exitosamente');
            return true;
        } catch (error) {
            Notify.error('Error al eliminar inspección');
            throw error;
        }
    }

    /**
     * Obtiene historial de inspecciones de un predio
     */
    async getHistorial(predioId) {
        try {
            const response = await apiInspecciones.get(Endpoints.INSPECCIONES.HISTORIAL(predioId));
            this.historial = response.data || [];
            return response;
        } catch (error) {
            Notify.error('Error al obtener historial');
            throw error;
        }
    }

    /**
     * Obtiene reportes de inspecciones
     */
    async getReportes(filters = {}) {
        try {
            const query = new URLSearchParams(filters).toString();
            const endpoint = query 
                ? `${Endpoints.INSPECCIONES.REPORTES}?${query}`
                : Endpoints.INSPECCIONES.REPORTES;
            const response = await apiInspecciones.get(endpoint);
            this.reportes = response.data || [];
            return response;
        } catch (error) {
            Notify.error('Error al obtener reportes');
            throw error;
        }
    }

    /**
     * Genera reporte PDF
     */
    async generatePDFReport(filtros) {
        try {
            const response = await fetch(
                `${apiInspecciones.baseURL}${Endpoints.INSPECCIONES.REPORTES}/pdf`,
                {
                    method: 'POST',
                    headers: apiInspecciones.getHeaders(),
                    body: JSON.stringify(filtros)
                }
            );

            if (!response.ok) {
                throw new Error('Error al generar reporte');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reporte-inspecciones-${Date.now()}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);

            Notify.success('Reporte descargado exitosamente');
        } catch (error) {
            Notify.error('Error al descargar reporte');
            throw error;
        }
    }

    /**
     * Cambia estado de inspección
     */
    async cambiarEstado(id, nuevoEstado) {
        try {
            const response = await apiInspecciones.patch(Endpoints.INSPECCIONES.UPDATE(id), {
                estado: nuevoEstado
            });
            Notify.success('Estado actualizado exitosamente');
            return response;
        } catch (error) {
            Notify.error('Error al cambiar estado');
            throw error;
        }
    }

    /**
     * Valida datos de inspección
     */
    validateInspeccion(data) {
        if (!data.predioId) return false;
        if (!data.fechaInspeccion) return false;
        if (!data.inspector) return false;
        if (!data.estado) return false;
        return true;
    }

    /**
     * Obtiene estados disponibles
     */
    getEstadosDisponibles() {
        return [
            { id: 'programada', nombre: 'Programada' },
            { id: 'en_proceso', nombre: 'En Proceso' },
            { id: 'completada', nombre: 'Completada' },
            { id: 'cancelada', nombre: 'Cancelada' }
        ];
    }

    /**
     * Mapea estado a badgeColor
     */
    getStatusColor(estado) {
        const colors = {
            'programada': 'badge--warning',
            'en_proceso': 'badge--info',
            'completada': 'badge--success',
            'cancelada': 'badge--danger'
        };
        return colors[estado] || 'badge--secondary';
    }
}

const inspeccionesModule = new InspeccionesModule();

// Exponer globalmente para acceso desde HTML
window.InspeccionesModule = InspeccionesModule;
window.inspeccionesModule = inspeccionesModule;
