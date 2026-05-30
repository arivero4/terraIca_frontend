/**
 * Territorial Module
 * Gestiona todas las operaciones territoriales
 */

class TerritorialModule {
    constructor() {
        this.departamentos = [];
        this.municipios = [];
        this.predios = [];
        this.lugares = [];
        this.cultivos = [];
        this.lotes = [];
        this.plagas = [];
    }

    // ─── HELPERS ────────────────────────────────────────────────────────────

    _arr(res) { return Array.isArray(res) ? res : (res?.data ?? res?.content ?? []); }

    // ─── DEPARTAMENTOS ───────────────────────────────────────────────────────

    async getDepartamentos() {
        try {
            const res = await apiTerritorial.get(Endpoints.TERRITORIAL.DEPARTAMENTOS.LIST);
            this.departamentos = this._arr(res);
            return this.departamentos;
        } catch (e) { Notify.error('Error al obtener departamentos'); throw e; }
    }

    async getDepartamento(id) {
        try { return await apiTerritorial.get(Endpoints.TERRITORIAL.DEPARTAMENTOS.GET(id)); }
        catch (e) { Notify.error('Error al obtener departamento'); throw e; }
    }

    async createDepartamento(data) {
        try {
            const r = await apiTerritorial.post(Endpoints.TERRITORIAL.DEPARTAMENTOS.CREATE, data);
            Notify.success('Departamento creado exitosamente'); return r;
        } catch (e) { Notify.error('Error al crear departamento'); throw e; }
    }

    async updateDepartamento(id, data) {
        try {
            const r = await apiTerritorial.put(Endpoints.TERRITORIAL.DEPARTAMENTOS.UPDATE(id), data);
            Notify.success('Departamento actualizado'); return r;
        } catch (e) { Notify.error('Error al actualizar departamento'); throw e; }
    }

    async deleteDepartamento(id) {
        try {
            await apiTerritorial.delete(Endpoints.TERRITORIAL.DEPARTAMENTOS.DELETE(id));
            Notify.success('Departamento eliminado'); return true;
        } catch (e) { Notify.error('Error al eliminar departamento'); throw e; }
    }

    // ─── MUNICIPIOS ──────────────────────────────────────────────────────────

    async getMunicipios(departamentoId = null) {
        try {
            const res = await apiTerritorial.get(Endpoints.TERRITORIAL.MUNICIPIOS.LIST);
            const todos = this._arr(res);
            // El backend no soporta filtro por query param — filtramos en cliente
            this.municipios = departamentoId
                ? todos.filter(m => m.departamentoId === parseInt(departamentoId))
                : todos;
            return this.municipios;
        } catch (e) { Notify.error('Error al obtener municipios'); throw e; }
    }

    async getMunicipio(id) {
        try { return await apiTerritorial.get(Endpoints.TERRITORIAL.MUNICIPIOS.GET(id)); }
        catch (e) { Notify.error('Error al obtener municipio'); throw e; }
    }

    async createMunicipio(data) {
        try {
            const r = await apiTerritorial.post(Endpoints.TERRITORIAL.MUNICIPIOS.CREATE, data);
            Notify.success('Municipio creado exitosamente'); return r;
        } catch (e) { Notify.error('Error al crear municipio'); throw e; }
    }

    async updateMunicipio(id, data) {
        try {
            const r = await apiTerritorial.put(Endpoints.TERRITORIAL.MUNICIPIOS.UPDATE(id), data);
            Notify.success('Municipio actualizado'); return r;
        } catch (e) { Notify.error('Error al actualizar municipio'); throw e; }
    }

    async deleteMunicipio(id) {
        try {
            await apiTerritorial.delete(Endpoints.TERRITORIAL.MUNICIPIOS.DELETE(id));
            Notify.success('Municipio eliminado'); return true;
        } catch (e) { Notify.error('Error al eliminar municipio'); throw e; }
    }

    // ─── LUGARES DE PRODUCCIÓN ───────────────────────────────────────────────

    async getLugares(municipioId = null) {
        try {
            const ep = municipioId
                ? Endpoints.TERRITORIAL.LUGARES.LIST_BY_MUNICIPIO(municipioId)
                : Endpoints.TERRITORIAL.LUGARES.LIST;
            const res = await apiTerritorial.get(ep);
            this.lugares = this._arr(res);
            return this.lugares;
        } catch (e) { Notify.error('Error al obtener lugares de producción'); throw e; }
    }

    async getLugar(id) {
        try { return await apiTerritorial.get(Endpoints.TERRITORIAL.LUGARES.GET(id)); }
        catch (e) { Notify.error('Error al obtener lugar de producción'); throw e; }
    }

    async createLugar(data) {
        try {
            const r = await apiTerritorial.post(Endpoints.TERRITORIAL.LUGARES.CREATE, data);
            Notify.success('Lugar de producción creado exitosamente'); return r;
        } catch (e) { Notify.error('Error al crear lugar de producción'); throw e; }
    }

    async updateLugar(id, data) {
        try {
            const r = await apiTerritorial.put(Endpoints.TERRITORIAL.LUGARES.UPDATE(id), data);
            Notify.success('Lugar de producción actualizado'); return r;
        } catch (e) { Notify.error('Error al actualizar lugar'); throw e; }
    }

    async deleteLugar(id) {
        try {
            await apiTerritorial.delete(Endpoints.TERRITORIAL.LUGARES.DELETE(id));
            Notify.success('Lugar de producción eliminado'); return true;
        } catch (e) { Notify.error('Error al eliminar lugar'); throw e; }
    }

    // ─── PREDIOS ─────────────────────────────────────────────────────────────

    async getPredios(lugarId = null) {
        try {
            const ep = lugarId
                ? Endpoints.TERRITORIAL.PREDIOS.LIST_BY_LUGAR(lugarId)
                : Endpoints.TERRITORIAL.PREDIOS.LIST;
            const res = await apiTerritorial.get(ep);
            this.predios = this._arr(res);
            return this.predios;
        } catch (e) { Notify.error('Error al obtener predios'); throw e; }
    }

    async getPredio(id) {
        try { return await apiTerritorial.get(Endpoints.TERRITORIAL.PREDIOS.GET(id)); }
        catch (e) { Notify.error('Error al obtener predio'); throw e; }
    }

    async createPredio(data) {
        try {
            const r = await apiTerritorial.post(Endpoints.TERRITORIAL.PREDIOS.CREATE, data);
            Notify.success('Predio creado exitosamente'); return r;
        } catch (e) { Notify.error('Error al crear predio'); throw e; }
    }

    async updatePredio(id, data) {
        try {
            const r = await apiTerritorial.put(Endpoints.TERRITORIAL.PREDIOS.UPDATE(id), data);
            Notify.success('Predio actualizado'); return r;
        } catch (e) { Notify.error('Error al actualizar predio'); throw e; }
    }

    async deletePredio(id) {
        try {
            await apiTerritorial.delete(Endpoints.TERRITORIAL.PREDIOS.DELETE(id));
            Notify.success('Predio eliminado'); return true;
        } catch (e) { Notify.error('Error al eliminar predio'); throw e; }
    }

    // ─── CULTIVOS ────────────────────────────────────────────────────────────

    async getCultivos(predioId = null) {
        try {
            const ep = predioId
                ? Endpoints.TERRITORIAL.CULTIVOS.LIST_BY_PREDIO(predioId)
                : Endpoints.TERRITORIAL.CULTIVOS.LIST;
            const res = await apiTerritorial.get(ep);
            this.cultivos = this._arr(res);
            return this.cultivos;
        } catch (e) { Notify.error('Error al obtener cultivos'); throw e; }
    }

    async getCultivo(id) {
        try { return await apiTerritorial.get(Endpoints.TERRITORIAL.CULTIVOS.GET(id)); }
        catch (e) { Notify.error('Error al obtener cultivo'); throw e; }
    }

    async createCultivo(data) {
        try {
            const r = await apiTerritorial.post(Endpoints.TERRITORIAL.CULTIVOS.CREATE, data);
            Notify.success('Cultivo registrado exitosamente'); return r;
        } catch (e) { Notify.error('Error al crear cultivo'); throw e; }
    }

    async updateCultivo(id, data) {
        try {
            const r = await apiTerritorial.put(Endpoints.TERRITORIAL.CULTIVOS.UPDATE(id), data);
            Notify.success('Cultivo actualizado'); return r;
        } catch (e) { Notify.error('Error al actualizar cultivo'); throw e; }
    }

    async deleteCultivo(id) {
        try {
            await apiTerritorial.delete(Endpoints.TERRITORIAL.CULTIVOS.DELETE(id));
            Notify.success('Cultivo eliminado'); return true;
        } catch (e) { Notify.error('Error al eliminar cultivo'); throw e; }
    }

    async asociarPlagaCultivo(cultivoId, plagaId) {
        try {
            const r = await apiTerritorial.post(Endpoints.TERRITORIAL.CULTIVOS.ASOCIAR_PLAGA(cultivoId, plagaId), {});
            Notify.success('Plaga asociada al cultivo'); return r;
        } catch (e) { Notify.error('Error al asociar plaga'); throw e; }
    }

    async desasociarPlagaCultivo(cultivoId, plagaId) {
        try {
            await apiTerritorial.delete(Endpoints.TERRITORIAL.CULTIVOS.DESASOCIAR_PLAGA(cultivoId, plagaId));
            Notify.success('Plaga desasociada'); return true;
        } catch (e) { Notify.error('Error al desasociar plaga'); throw e; }
    }

    // ─── LOTES ───────────────────────────────────────────────────────────────

    async getLotes(cultivoId = null) {
        try {
            const ep = cultivoId
                ? Endpoints.TERRITORIAL.LOTES.LIST_BY_CULTIVO(cultivoId)
                : Endpoints.TERRITORIAL.LOTES.LIST;
            const res = await apiTerritorial.get(ep);
            this.lotes = this._arr(res);
            return this.lotes;
        } catch (e) { Notify.error('Error al obtener lotes'); throw e; }
    }

    async getLote(id) {
        try { return await apiTerritorial.get(Endpoints.TERRITORIAL.LOTES.GET(id)); }
        catch (e) { Notify.error('Error al obtener lote'); throw e; }
    }

    async createLote(data) {
        try {
            const r = await apiTerritorial.post(Endpoints.TERRITORIAL.LOTES.CREATE, data);
            Notify.success('Lote creado exitosamente'); return r;
        } catch (e) { Notify.error('Error al crear lote'); throw e; }
    }

    async updateLote(id, data) {
        try {
            const r = await apiTerritorial.put(Endpoints.TERRITORIAL.LOTES.UPDATE(id), data);
            Notify.success('Lote actualizado'); return r;
        } catch (e) { Notify.error('Error al actualizar lote'); throw e; }
    }

    async deleteLote(id) {
        try {
            await apiTerritorial.delete(Endpoints.TERRITORIAL.LOTES.DELETE(id));
            Notify.success('Lote eliminado'); return true;
        } catch (e) { Notify.error('Error al eliminar lote'); throw e; }
    }

    async iniciarProduccionLote(id) {
        try {
            const r = await apiTerritorial.patch(Endpoints.TERRITORIAL.LOTES.INICIAR(id));
            Notify.success('Producción iniciada'); return r;
        } catch (e) { Notify.error('Error al iniciar producción'); throw e; }
    }

    async cosecharLote(id) {
        try {
            const r = await apiTerritorial.patch(Endpoints.TERRITORIAL.LOTES.COSECHAR(id));
            Notify.success('Cosecha registrada'); return r;
        } catch (e) { Notify.error('Error al registrar cosecha'); throw e; }
    }

    // ─── PLAGAS ──────────────────────────────────────────────────────────────

    async getPlagas(filtros = {}) {
        try {
            let ep = Endpoints.TERRITORIAL.PLAGAS.LIST;
            if (filtros.tipo)       ep = Endpoints.TERRITORIAL.PLAGAS.LIST_BY_TIPO(filtros.tipo);
            else if (filtros.riesgo) ep = Endpoints.TERRITORIAL.PLAGAS.LIST_BY_RIESGO(filtros.riesgo);
            else if (filtros.nombre) ep = Endpoints.TERRITORIAL.PLAGAS.BUSCAR(filtros.nombre);
            const res = await apiTerritorial.get(ep);
            this.plagas = this._arr(res);
            return this.plagas;
        } catch (e) { Notify.error('Error al obtener plagas'); throw e; }
    }

    async getPlaga(id) {
        try { return await apiTerritorial.get(Endpoints.TERRITORIAL.PLAGAS.GET(id)); }
        catch (e) { Notify.error('Error al obtener plaga'); throw e; }
    }

    async createPlaga(data) {
        try {
            const r = await apiTerritorial.post(Endpoints.TERRITORIAL.PLAGAS.CREATE, data);
            Notify.success('Plaga registrada en el catálogo'); return r;
        } catch (e) { Notify.error('Error al crear plaga'); throw e; }
    }

    async updatePlaga(id, data) {
        try {
            const r = await apiTerritorial.put(Endpoints.TERRITORIAL.PLAGAS.UPDATE(id), data);
            Notify.success('Plaga actualizada'); return r;
        } catch (e) { Notify.error('Error al actualizar plaga'); throw e; }
    }

    async deletePlaga(id) {
        try {
            await apiTerritorial.delete(Endpoints.TERRITORIAL.PLAGAS.DELETE(id));
            Notify.success('Plaga eliminada del catálogo'); return true;
        } catch (e) { Notify.error('Error al eliminar plaga'); throw e; }
    }
}

const territorialModule = new TerritorialModule();
window.TerritorialModule = TerritorialModule;
window.territorialModule = territorialModule;
