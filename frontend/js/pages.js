/**
 * Pages Module
 * Gestión de páginas del dashboard con control de roles
 * NOTA: Notify ya está definido en utils.js — no se redeclara aquí.
 */

// ─── ROL HELPERS ──────────────────────────────────────────────────────────────

const R = {
    _user() { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } },
    role()    {
        const u = this._user();
        // auth.js almacena grupos como array: { grupos: ["ADMINISTRADOR"] }
        const raw = (Array.isArray(u.grupos) ? u.grupos[0] : null)
                 || u.grupo || u.rol || u.role || '';
        return raw.toUpperCase().replace(/ /g, '_');
    },
    isAdmin() { return this.role() === 'ADMINISTRADOR'; },
    isProp()  { return this.role() === 'PROPIETARIO'; },
    isProd()  { return this.role() === 'PRODUCTOR'; },
    isAT()    { return this.role() === 'ASISTENTE_TECNICO'; },
    canWrite(section) {
        const r = this.role();
        switch(section) {
            case 'usuarios':      return r === 'ADMINISTRADOR';
            case 'departamentos': return r === 'ADMINISTRADOR';
            case 'municipios':    return r === 'ADMINISTRADOR';
            case 'cultivos':      return r === 'ADMINISTRADOR';
            case 'plagas':        return r === 'ADMINISTRADOR';
            case 'predios':       return r === 'ADMINISTRADOR' || r === 'PROPIETARIO';
            case 'lugares':       return r === 'ADMINISTRADOR' || r === 'PRODUCTOR';
            case 'lotes':         return r === 'ADMINISTRADOR' || r === 'PRODUCTOR';
            case 'inspecciones':  return r === 'ADMINISTRADOR' || r === 'ASISTENTE_TECNICO';
            default: return r === 'ADMINISTRADOR';
        }
    },
    canRead(section) { return !!localStorage.getItem('authToken'); }
};
window.R = R;

// ─── MODAL ────────────────────────────────────────────────────────────────────

class PageModal {
    constructor(id) {
        this.id = id;
        this.el = document.getElementById(id);
    }
    open(title, bodyHTML, onSave) {
        if (!this.el) return;
        const t = this.el.querySelector('.modal-title');
        const b = this.el.querySelector('.modal-body');
        if (t) t.textContent = title;
        if (b) b.innerHTML = bodyHTML;
        this.el.classList.add('active');
        const btn = this.el.querySelector('.btn-save');
        if (btn) {
            btn.onclick = null;
            btn.onclick = onSave;
        }
        const closeBtn = this.el.querySelector('.modal-close, .btn-cancel');
        if (closeBtn) closeBtn.onclick = () => this.close();
    }
    close() { if (this.el) this.el.classList.remove('active'); }
    setError(msg) {
        let err = this.el?.querySelector('.modal-error');
        if (!err && this.el) {
            err = document.createElement('div');
            err.className = 'modal-error';
            this.el.querySelector('.modal-body')?.appendChild(err);
        }
        if (err) err.textContent = msg;
    }
}

// ─── BASE PAGE ────────────────────────────────────────────────────────────────

class BasePage {
    constructor(section) {
        this.section = section;
        this.modal = new PageModal('main-modal');
        this._searchTimer = null;
    }

    pageShell(title, icon, subtitle, actionBtn = '') {
        return `
        <div class="page-header">
            <div class="page-header__left">
                <div class="page-header__icon">${icon}</div>
                <div>
                    <h1 class="page-header__title">${title}</h1>
                    <p class="page-header__subtitle">${subtitle}</p>
                </div>
            </div>
            <div class="page-header__actions">${actionBtn}</div>
        </div>`;
    }

    searchBarHTML(placeholder = 'Buscar...') {
        return `<div class="search-bar">
            <span class="search-bar__icon">🔍</span>
            <input type="text" class="search-bar__input" placeholder="${placeholder}" id="search-input">
        </div>`;
    }

    tableWrap(headers, bodyId) {
        const ths = headers.map(h => `<th>${h}</th>`).join('');
        return `<div class="table-wrapper">
            <table class="data-table">
                <thead><tr>${ths}</tr></thead>
                <tbody id="${bodyId}"></tbody>
            </table>
        </div>`;
    }

    emptyRow(cols, msg = 'No hay datos disponibles') {
        return `<tr><td colspan="${cols}" class="empty-state"><div class="empty-state__icon">📭</div><p>${msg}</p></td></tr>`;
    }

    skeletonRows(cols, rows = 4) {
        const cells = Array(cols).fill(`<td><div class="skeleton skeleton--text"></div></td>`).join('');
        return Array(rows).fill(`<tr>${cells}</tr>`).join('');
    }

    // ── Helper de error: muestra toast + error en modal si está abierto ──
    _err(e, fallback = 'Error inesperado') {
        const msg = e?.message || e?.data?.message || e?.data?.mensaje || fallback;
        Notify.error(msg);
        console.error('[' + this.section + ']', fallback, e);
        return msg;
    }

    errorRow(cols, msg) {
        return `<tr><td colspan="${cols}" class="empty-state">
            <div class="empty-state__icon">⚠️</div>
            <p style="color:#e53935;font-weight:600">${msg}</p>
        </td></tr>`;
    }

    bindSearch(dataFn, renderFn) {
        const input = document.getElementById('search-input');
        if (!input) return;
        input.addEventListener('input', () => {
            clearTimeout(this._searchTimer);
            this._searchTimer = setTimeout(async () => {
                const q = input.value.trim().toLowerCase();
                const data = await dataFn();
                const filtered = q ? data.filter(d => JSON.stringify(d).toLowerCase().includes(q)) : data;
                renderFn(filtered);
            }, 300);
        });
    }

    badgeEstado(estado) {
        const map = {
            ACTIVO:           ['badge--success', '✅ Activo'],
            INACTIVO:         ['badge--danger',  '❌ Inactivo'],
            // Inspecciones (enums reales del backend)
            PROGRAMADA:       ['badge--warning', '⏳ Programada'],
            EN_PROCESO:       ['badge--info',    '🔄 En Proceso'],
            COMPLETADA:       ['badge--success', '✅ Completada'],
            CANCELADA:        ['badge--danger',  '❌ Cancelada'],
            PENDIENTE_REVISION:['badge--warning','🔍 Pend. Revisión'],
            // Compatibilidad con nombres alternativos
            PENDIENTE:        ['badge--warning', '⏳ Pendiente'],
            EN_PROGRESO:      ['badge--info',    '🔄 En Progreso'],
            // Lotes
            PLANIFICADO:      ['badge--secondary','📋 Planificado'],
            EN_PRODUCCION:    ['badge--info',    '🌱 En Producción'],
            COSECHADO:        ['badge--success', '🌾 Cosechado'],
            ABANDONADO:       ['badge--danger',  '🚫 Abandonado'],
        };
        const [cls, label] = map[estado] || ['badge--secondary', estado || '—'];
        return `<span class="badge ${cls}">${label}</span>`;
    }
}

// ─── USUARIOS PAGE ────────────────────────────────────────────────────────────

class UsuariosPage extends BasePage {
    constructor() { super('usuarios'); this._data = []; this._grupos = []; }

    async render(container) {
        if (!R.isAdmin()) {
            container.innerHTML = `<div class="access-denied"><div class="access-denied__icon">🔒</div><h2>Acceso Restringido</h2><p>Solo administradores pueden gestionar usuarios.</p></div>`;
            return;
        }
        container.innerHTML = `
            ${this.pageShell('Gestión de Usuarios','👤','Administra los usuarios del sistema',
                `<button class="btn btn-primary" id="btn-new-user">➕ Nuevo Usuario</button>`)}
            ${this.searchBarHTML('Buscar por nombre, correo...')}
            <div class="stats-mini" id="user-stats"></div>
            ${this.tableWrap(['#','Nombre','Correo','Grupo','Estado','Acciones'],'users-tbody')}`;

        document.getElementById('btn-new-user')?.addEventListener('click', () => this._openForm());
        await this._load();
        this.bindSearch(() => this._data, d => this._render(d));
    }

    async _load() {
        const tbody = document.getElementById('users-tbody');
        if (tbody) tbody.innerHTML = this.skeletonRows(6);
        try {
            const [users, grupos] = await Promise.all([
                apiUsuarios.get(Endpoints.USUARIOS.LIST),
                apiUsuarios.get(Endpoints.GRUPOS.LIST)
            ]);
            this._data = Array.isArray(users) ? users : (users?.data ?? users?.content ?? []);
            this._grupos = Array.isArray(grupos) ? grupos : (grupos?.data ?? grupos?.content ?? []);
            this._renderStats();
            this._render(this._data);
        } catch(e) { if(tbody) tbody.innerHTML = this.emptyRow(6, 'Error al cargar usuarios'); }
    }

    _renderStats() {
        const el = document.getElementById('user-stats');
        if (!el) return;
        const activos = this._data.filter(u => u.estado === 'ACTIVO').length;
        el.innerHTML = `
            <div class="stat-mini"><span class="stat-mini__val">${this._data.length}</span><span class="stat-mini__lbl">Total</span></div>
            <div class="stat-mini stat-mini--success"><span class="stat-mini__val">${activos}</span><span class="stat-mini__lbl">Activos</span></div>
            <div class="stat-mini stat-mini--danger"><span class="stat-mini__val">${this._data.length - activos}</span><span class="stat-mini__lbl">Inactivos</span></div>`;
    }

    _render(data) {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;
        if (!data.length) { tbody.innerHTML = this.emptyRow(6); return; }
        tbody.innerHTML = data.map((u, i) => `
            <tr>
                <td><span class="row-num">${i+1}</span></td>
                <td><strong>${u.nombre || u.name || '—'}</strong></td>
                <td><span class="text-muted">${u.correo || u.email || '—'}</span></td>
                <td><span class="chip">${u.grupos?.[0]?.nombre || u.grupo?.nombre || u.grupoNombre || '—'}</span></td>
                <td>${this.badgeEstado(u.estado)}</td>
                <td class="actions-cell">
                    <button class="btn-icon btn-icon--edit" title="Editar" onclick="usuariosPage._openForm(${u.id})">✏️</button>
                    <button class="btn-icon btn-icon--toggle" title="Cambiar estado" onclick="usuariosPage._toggleEstado(${u.id},'${u.estado}')">🔄</button>
                </td>
            </tr>`).join('');
    }

    async _openForm(id = null) {
        const grupoOpts = this._grupos.map(g => `<option value="${g.id}">${g.nombre}</option>`).join('');
        let vals = { nombre:'', correo:'', contrasena:'', grupoId:'' };
        if (id) {
            try {
                const u = await apiUsuarios.get(Endpoints.USUARIOS.GET(id));
                vals = { nombre: u.nombre||u.name||'', correo: u.correo||u.email||'',
                         grupoId: u.grupos?.[0]?.id || u.grupo?.id || u.grupoId || '' };
            } catch(e) { this._err(e, 'Error al cargar usuario'); }
        }
        const body = `
            ${!id ? `<div class="form-group"><label>N° Identificación</label><input class="form-control" id="f-cedula" placeholder="Cédula o NIT"></div>` : ''}
            <div class="form-group"><label>Nombre completo</label><input class="form-control" id="f-nombre" value="${vals.nombre}" placeholder="Nombre y apellido"></div>
            <div class="form-group"><label>Correo electrónico</label><input class="form-control" id="f-correo" type="email" value="${vals.correo}" placeholder="correo@ejemplo.com"></div>
            ${!id ? `<div class="form-group"><label>Contraseña</label><input class="form-control" id="f-pass" type="password" placeholder="Mínimo 8 caracteres"></div>` : ''}
            <div class="form-group"><label>Grupo / Rol</label><select class="form-control" id="f-grupo"><option value="">Seleccione...</option>${grupoOpts}</select></div>`;
        this.modal.open(id ? 'Editar Usuario' : 'Nuevo Usuario', body, async () => {
            const data = {
                nombre: document.getElementById('f-nombre')?.value?.trim(),
                correo: document.getElementById('f-correo')?.value?.trim()
            };
            if (!id) {
                data.password = document.getElementById('f-pass')?.value;
                data.numeroIdentificacion = document.getElementById('f-cedula')?.value?.trim();
            }
            if (!data.nombre || !data.correo) { this.modal.setError('Nombre y correo son obligatorios'); return; }
            if (!id && (!data.password || data.password.length < 8)) { this.modal.setError('La contraseña debe tener al menos 8 caracteres'); return; }
            if (!id && !data.numeroIdentificacion) { this.modal.setError('El número de identificación es obligatorio'); return; }
            const grupoId = parseInt(document.getElementById('f-grupo')?.value);
            try {
                let savedUser;
                if (id) {
                    savedUser = await apiUsuarios.put(Endpoints.USUARIOS.UPDATE(id), { nombre: data.nombre });
                } else {
                    savedUser = await apiUsuarios.post(Endpoints.USUARIOS.CREATE, data);
                    // Asignar grupo al usuario recién creado
                    if (grupoId && savedUser?.id) {
                        await apiUsuarios.post(`/api/v1/usuarios/${savedUser.id}/grupos/${grupoId}`, {}).catch(() => {});
                    }
                }
                Notify.success(id ? 'Usuario actualizado' : 'Usuario creado exitosamente');
                this.modal.close();
                await this._load();
            } catch(e) { this.modal.setError(e.message || 'Error al guardar'); }
        });
        if (vals.grupoId) setTimeout(() => { const s = document.getElementById('f-grupo'); if(s) s.value = vals.grupoId; }, 50);
    }

    async _toggleEstado(id, estadoActual) {
        const nuevo = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
        try {
            await apiUsuarios.patch(Endpoints.USUARIOS.ESTADO(id) + '?estado=' + nuevo);
            Notify.success(`Usuario ${nuevo.toLowerCase()}`);
            await this._load();
        } catch(e) { Notify.error('Error al cambiar estado'); }
    }
}

// ─── DEPARTAMENTOS PAGE ───────────────────────────────────────────────────────

class DepartamentosPage extends BasePage {
    constructor() { super('departamentos'); this._data = []; }

    async render(container) {
        const canW = R.canWrite('departamentos');
        container.innerHTML = `
            ${this.pageShell('Departamentos','🗺️','Gestión de departamentos del país',
                canW ? `<button class="btn btn-primary" id="btn-new-dep">➕ Nuevo Departamento</button>` : '')}
            ${this.searchBarHTML('Buscar departamento...')}
            ${this.tableWrap(['#','Código','Nombre','Estado', canW ? 'Acciones' : ''], 'dep-tbody')}`;
        if (canW) document.getElementById('btn-new-dep')?.addEventListener('click', () => this._openForm());
        await this._load();
        this.bindSearch(() => this._data, d => this._render(d));
    }

    async _load() {
        const tbody = document.getElementById('dep-tbody');
        if (tbody) tbody.innerHTML = this.skeletonRows(R.canWrite('departamentos') ? 5 : 4);
        try {
            this._data = await territorialModule.getDepartamentos();
            this._render(this._data);
        } catch(e) {
            if(tbody) tbody.innerHTML = this.errorRow(4, 'Error al cargar departamentos');
            this._err(e, 'Error cargando departamentos');
        }
    }

    _render(data) {
        const tbody = document.getElementById('dep-tbody');
        if (!tbody) return;
        if (!data.length) { tbody.innerHTML = this.emptyRow(5); return; }
        const canW = R.canWrite('departamentos');
        tbody.innerHTML = data.map((d,i) => `
            <tr>
                <td><span class="row-num">${i+1}</span></td>
                <td><code>${d.codigoDane || d.codigo || d.codigoDepartamento || '—'}</code></td>
                <td><strong>${d.nombre}</strong></td>
                <td>${this.badgeEstado(d.activo !== false ? 'ACTIVO' : 'INACTIVO')}</td>
                ${canW ? `<td class="actions-cell">
                    <button class="btn-icon btn-icon--edit" onclick="departamentosPage._openForm(${d.id})">✏️</button>
                    <button class="btn-icon btn-icon--delete" onclick="departamentosPage._delete(${d.id})">🗑️</button>
                </td>` : '<td></td>'}
            </tr>`).join('');
    }

    async _openForm(id = null) {
        let v = { nombre:'', codigoDane:'' };
        if (id) { try { const r = await territorialModule.getDepartamento(id); v = r; } catch(e) { this._err(e,'Error al cargar departamento'); } }
        const body = `
            <div class="form-group"><label>Código DANE</label><input class="form-control" id="f-cod" value="${v.codigoDane||v.codigo||''}" placeholder="Ej: 05, 25, 76..."></div>
            <div class="form-group"><label>Nombre</label><input class="form-control" id="f-nom" value="${v.nombre||''}" placeholder="Nombre del departamento"></div>`;
        this.modal.open(id ? 'Editar Departamento' : 'Nuevo Departamento', body, async () => {
            const data = { nombre: document.getElementById('f-nom')?.value?.trim(), codigoDane: document.getElementById('f-cod')?.value?.trim() };
            if (!data.nombre) { this.modal.setError('El nombre es obligatorio'); return; }
            try {
                if (id) await territorialModule.updateDepartamento(id, data);
                else await territorialModule.createDepartamento(data);
                this.modal.close(); await this._load();
            } catch(e) { this.modal.setError(e.message); }
        });
    }

    async _delete(id) {
        if (!confirm('¿Eliminar este departamento?')) return;
        try { await territorialModule.deleteDepartamento(id); Notify.success('Departamento eliminado'); await this._load(); }
        catch(e) { this._err(e,'No se pudo eliminar el departamento'); }
    }
}

// ─── MUNICIPIOS PAGE ──────────────────────────────────────────────────────────

class MunicipiosPage extends BasePage {
    constructor() { super('municipios'); this._data = []; this._deps = []; }

    async render(container) {
        const canW = R.canWrite('municipios');
        container.innerHTML = `
            ${this.pageShell('Municipios','🏘️','Gestión de municipios',
                canW ? `<button class="btn btn-primary" id="btn-new-mun">➕ Nuevo Municipio</button>` : '')}
            <div class="filter-row">
                <select class="form-control form-control--sm" id="filter-dep">
                    <option value="">Todos los departamentos</option>
                </select>
                ${this.searchBarHTML('Buscar municipio...')}
            </div>
            ${this.tableWrap(['#','Código','Nombre','Departamento','Estado', canW ? 'Acciones' : ''], 'mun-tbody')}`;
        if (canW) document.getElementById('btn-new-mun')?.addEventListener('click', () => this._openForm());
        await this._loadDeps();
        await this._load();
        document.getElementById('filter-dep')?.addEventListener('change', e => this._load(e.target.value || null));
        this.bindSearch(() => this._data, d => this._render(d));
    }

    async _loadDeps() {
        this._deps = await territorialModule.getDepartamentos().catch(() => []);
        const sel = document.getElementById('filter-dep');
        if (sel) this._deps.forEach(d => sel.insertAdjacentHTML('beforeend', `<option value="${d.id}">${d.nombre}</option>`));
    }

    async _load(depId = null) {
        const tbody = document.getElementById('mun-tbody');
        if (tbody) tbody.innerHTML = this.skeletonRows(6);
        try { this._data = await territorialModule.getMunicipios(depId); this._render(this._data); }
        catch(e) { if(tbody) tbody.innerHTML = this.errorRow(6, this._err(e,'Error al cargar datos')); }
    }

    _render(data) {
        const tbody = document.getElementById('mun-tbody');
        if (!tbody) return;
        if (!data.length) { tbody.innerHTML = this.emptyRow(6); return; }
        const canW = R.canWrite('municipios');
        tbody.innerHTML = data.map((m,i) => `
            <tr>
                <td><span class="row-num">${i+1}</span></td>
                <td><code>${m.codigoDane||m.codigo||m.codigoMunicipio||'—'}</code></td>
                <td><strong>${m.nombre}</strong></td>
                <td>${m.departamentoNombre||m.departamento?.nombre||'—'}</td>
                <td>${this.badgeEstado(m.activo !== false ? 'ACTIVO' : 'INACTIVO')}</td>
                ${canW ? `<td class="actions-cell">
                    <button class="btn-icon btn-icon--edit" onclick="municipiosPage._openForm(${m.id})">✏️</button>
                    <button class="btn-icon btn-icon--delete" onclick="municipiosPage._delete(${m.id})">🗑️</button>
                </td>` : '<td></td>'}
            </tr>`).join('');
    }

    async _openForm(id = null) {
        const depOpts = this._deps.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('');
        let v = { nombre:'', codigoDane:'', departamentoId:'' };
        if (id) { try { v = await territorialModule.getMunicipio(id); } catch(e) { this._err(e,'Error al cargar datos'); } }
        const body = `
            <div class="form-group"><label>Código DANE</label><input class="form-control" id="f-cod" value="${v.codigoDane||v.codigo||''}" placeholder="Ej: 05001, 76001..."></div>
            <div class="form-group"><label>Nombre</label><input class="form-control" id="f-nom" value="${v.nombre||''}" placeholder="Nombre del municipio"></div>
            <div class="form-group"><label>Departamento</label><select class="form-control" id="f-dep"><option value="">Seleccione...</option>${depOpts}</select></div>`;
        this.modal.open(id ? 'Editar Municipio' : 'Nuevo Municipio', body, async () => {
            const data = { nombre: document.getElementById('f-nom')?.value?.trim(), codigoDane: document.getElementById('f-cod')?.value?.trim(), departamentoId: parseInt(document.getElementById('f-dep')?.value) };
            if (!data.nombre || !data.departamentoId) { this.modal.setError('Nombre y departamento son obligatorios'); return; }
            try {
                if (id) await territorialModule.updateMunicipio(id, data);
                else await territorialModule.createMunicipio(data);
                this.modal.close(); await this._load();
            } catch(e) { this.modal.setError(e.message); }
        });
        if (v.departamento?.id || v.departamentoId) setTimeout(() => { const s = document.getElementById('f-dep'); if(s) s.value = v.departamento?.id || v.departamentoId; }, 50);
    }

    async _delete(id) {
        if (!confirm('¿Eliminar este municipio?')) return;
        try { await territorialModule.deleteMunicipio(id); Notify.success('Municipio eliminado'); await this._load(); } catch(e) { this._err(e,'No se pudo eliminar el municipio'); }
    }
}

// ─── LUGARES PAGE (PRODUCTOR + ADMIN) ─────────────────────────────────────────

class LugaresPage extends BasePage {
    constructor() { super('lugares'); this._data = []; this._municipios = []; }

    async render(container) {
        const canW = R.canWrite('lugares');
        container.innerHTML = `
            ${this.pageShell('Lugares de Producción','🌿','Gestiona los lugares de producción agrícola',
                canW ? `<button class="btn btn-primary" id="btn-new-lugar">➕ Nuevo Lugar</button>` : '')}
            <div class="filter-row">
                <select class="form-control form-control--sm" id="filter-estado-lugar">
                    <option value="">Todos los estados</option>
                    <option value="ACTIVO">✅ Activo</option>
                    <option value="INACTIVO">❌ Inactivo</option>
                </select>
                ${this.searchBarHTML('Buscar lugar...')}
            </div>
            ${this.tableWrap(['#','Nombre','Área (ha)','Estado', canW ? 'Acciones' : ''], 'lugar-tbody')}`;
        if (canW) document.getElementById('btn-new-lugar')?.addEventListener('click', () => this._openForm());
        await this._load();
        document.getElementById('filter-estado-lugar')?.addEventListener('change', () => {
            const est = document.getElementById('filter-estado-lugar')?.value;
            const filtered = est ? this._data.filter(l => (l.activo !== false ? 'ACTIVO' : 'INACTIVO') === est) : this._data;
            this._render(filtered);
        });
        this.bindSearch(() => this._data, d => this._render(d));
    }

    async _load() {
        const tbody = document.getElementById('lugar-tbody');
        if (tbody) tbody.innerHTML = this.skeletonRows(4);
        try { this._data = await territorialModule.getLugares(); this._render(this._data); }
        catch(e) { if(tbody) tbody.innerHTML = this.errorRow(4, this._err(e,'Error al cargar datos')); }
    }

    _render(data) {
        const tbody = document.getElementById('lugar-tbody');
        if (!tbody) return;
        if (!data.length) { tbody.innerHTML = this.emptyRow(4, 'No hay lugares de producción registrados'); return; }
        const canW = R.canWrite('lugares');
        tbody.innerHTML = data.map((l,i) => `
            <tr>
                <td><span class="row-num">${i+1}</span></td>
                <td><strong>${l.nombre}</strong></td>
                <td>${l.area || '—'} ha</td>
                <td>${this.badgeEstado(l.activo !== false ? 'ACTIVO' : 'INACTIVO')}</td>
                ${canW ? `<td class="actions-cell">
                    <button class="btn-icon btn-icon--edit" onclick="lugaresPage._openForm(${l.id})">✏️</button>
                    <button class="btn-icon btn-icon--delete" onclick="lugaresPage._delete(${l.id})">🗑️</button>
                </td>` : '<td></td>'}
            </tr>`).join('');
    }

    async _openForm(id = null) {
        let v = { nombre:'', area:'', estado:'ACTIVO' };
        if (id) { try { v = await territorialModule.getLugar(id); } catch(e) { this._err(e,'Error al cargar datos'); } }
        const body = `
            <div class="form-group"><label>Nombre del Lugar</label><input class="form-control" id="f-nom" value="${v.nombre||''}" placeholder="Nombre descriptivo del lugar de producción"></div>
            <div class="form-row">
                <div class="form-group"><label>Área (hectáreas)</label><input class="form-control" id="f-area" type="number" step="0.01" min="0" value="${v.area||''}" placeholder="0.00"></div>
                <div class="form-group"><label>Estado</label>
                    <select class="form-control" id="f-estado">
                        <option value="ACTIVO" ${(v.activo !== false)?'selected':''}>✅ Activo</option>
                        <option value="INACTIVO" ${(v.activo === false)?'selected':''}>❌ Inactivo</option>
                    </select>
                </div>
            </div>`;
        this.modal.open(id ? 'Editar Lugar de Producción' : 'Nuevo Lugar de Producción', body, async () => {
            const data = {
                nombre: document.getElementById('f-nom')?.value?.trim(),
                area: parseFloat(document.getElementById('f-area')?.value) || 0,
                estado: document.getElementById('f-estado')?.value || 'ACTIVO'
            };
            if (!data.nombre) { this.modal.setError('El nombre es obligatorio'); return; }
            if (!data.area || data.area <= 0) { this.modal.setError('El área debe ser mayor a 0'); return; }
            try {
                if (id) await territorialModule.updateLugar(id, data);
                else await territorialModule.createLugar(data);
                this.modal.close(); await this._load();
            } catch(e) { this.modal.setError(e.message); }
        });
    }

    async _delete(id) {
        if (!confirm('¿Eliminar este lugar de producción?')) return;
        try { await territorialModule.deleteLugar(id); Notify.success('Lugar eliminado'); await this._load(); } catch(e) { this._err(e,'No se pudo eliminar el lugar'); }
    }
}

// ─── PREDIOS PAGE (PROPIETARIO + ADMIN) ───────────────────────────────────────

class PrediosPage extends BasePage {
    constructor() { super('predios'); this._data = []; this._lugares = []; this._municipios = []; }

    async render(container) {
        const canW = R.canWrite('predios');
        container.innerHTML = `
            ${this.pageShell('Predios','🏡','Gestión de predios agrícolas registrados',
                canW ? `<button class="btn btn-primary" id="btn-new-predio">➕ Nuevo Predio</button>` : '')}
            <div class="filter-row">
                <select class="form-control form-control--sm" id="filter-lugar"><option value="">Todos los lugares</option></select>
                ${this.searchBarHTML('Buscar por número predial o nombre...')}
            </div>
            ${this.tableWrap(['#','N° Predial','Nombre','Área (ha)','Lugar','Estado', canW ? 'Acciones' : ''], 'predio-tbody')}`;
        if (canW) document.getElementById('btn-new-predio')?.addEventListener('click', () => this._openForm());
        await Promise.all([this._loadLugares(), this._loadMunicipios()]);
        await this._load();
        document.getElementById('filter-lugar')?.addEventListener('change', e => this._load(e.target.value || null));
        this.bindSearch(() => this._data, d => this._render(d));
    }

    async _loadLugares() {
        this._lugares = await territorialModule.getLugares().catch(() => []);
        const sel = document.getElementById('filter-lugar');
        if (sel) this._lugares.forEach(l => sel.insertAdjacentHTML('beforeend', `<option value="${l.id}">${l.nombre}</option>`));
    }

    async _loadMunicipios() {
        this._municipios = await territorialModule.getMunicipios().catch(() => []);
    }

    async _load(lugarId = null) {
        const tbody = document.getElementById('predio-tbody');
        if (tbody) tbody.innerHTML = this.skeletonRows(7);
        try { this._data = await territorialModule.getPredios(lugarId); this._render(this._data); }
        catch(e) { if(tbody) tbody.innerHTML = this.errorRow(7, this._err(e,'Error al cargar datos')); }
    }

    _render(data) {
        const tbody = document.getElementById('predio-tbody');
        if (!tbody) return;
        if (!data.length) { tbody.innerHTML = this.emptyRow(7, 'No hay predios registrados'); return; }
        const canW = R.canWrite('predios');
        tbody.innerHTML = data.map((p,i) => `
            <tr>
                <td><span class="row-num">${i+1}</span></td>
                <td><code>${p.numeroPredial||'—'}</code></td>
                <td><strong>${p.nombre||p.nombrePredio||'—'}</strong></td>
                <td>${p.area||p.areaHectareas||'—'} ha</td>
                <td>${p.lugarProduccionNombre||p.lugarProduccion?.nombre||p.lugarNombre||'—'}</td>
                <td>${this.badgeEstado(p.activo !== false ? 'ACTIVO' : 'INACTIVO')}</td>
                ${canW ? `<td class="actions-cell">
                    <button class="btn-icon btn-icon--edit" onclick="prediosPage._openForm(${p.id})">✏️</button>
                    <button class="btn-icon btn-icon--delete" onclick="prediosPage._delete(${p.id})">🗑️</button>
                </td>` : '<td></td>'}
            </tr>`).join('');
    }

    async _openForm(id = null) {
        const lugOpts = this._lugares.map(l => `<option value="${l.id}">${l.nombre} (${l.area||0} ha)</option>`).join('');
        const munOpts = this._municipios.map(m => `<option value="${m.id}">${m.nombre} — ${m.departamentoNombre||''}</option>`).join('');
        let v = {};
        if (id) { try { v = await territorialModule.getPredio(id); } catch(e) { this._err(e,'Error al cargar datos'); } }
        const body = `
            <div class="form-row">
                <div class="form-group"><label>Nombre del Predio <span style="color:red">*</span></label><input class="form-control" id="f-nom" value="${v.nombre||v.nombrePredio||''}" placeholder="Nombre descriptivo"></div>
                <div class="form-group"><label>Número Predial <span style="color:red">*</span></label><input class="form-control" id="f-npredial" value="${v.numeroPredial||''}" placeholder="Ej: 050615001"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Área (ha) <span style="color:red">*</span></label><input class="form-control" id="f-area" type="number" step="0.01" min="0.01" value="${v.area||''}" placeholder="0.00"></div>
                <div class="form-group"><label>Vereda <span style="color:red">*</span></label><input class="form-control" id="f-vereda" value="${v.vereda||''}" placeholder="Ej: Vereda El Carmelo"></div>
            </div>
            <div class="form-group"><label>Municipio <span style="color:red">*</span></label>
                <select class="form-control" id="f-municipio"><option value="">Seleccione el municipio...</option>${munOpts}</select>
            </div>
            <div class="form-group"><label>Lugar de Producción <span style="color:red">*</span></label>
                <select class="form-control" id="f-lugar"><option value="">Seleccione el lugar...</option>${lugOpts}</select>
            </div>`;
        this.modal.open(id ? 'Editar Predio' : 'Nuevo Predio', body, async () => {
            const data = {
                nombre: document.getElementById('f-nom')?.value?.trim(),
                numeroPredial: document.getElementById('f-npredial')?.value?.trim(),
                area: parseFloat(document.getElementById('f-area')?.value) || null,
                vereda: document.getElementById('f-vereda')?.value?.trim(),
                municipioId: parseInt(document.getElementById('f-municipio')?.value),
                lugarProduccionId: parseInt(document.getElementById('f-lugar')?.value)
            };
            if (!data.nombre || !data.numeroPredial) { this.modal.setError('Nombre y número predial son obligatorios'); return; }
            if (!data.municipioId) { this.modal.setError('Debe seleccionar un municipio'); return; }
            if (!data.lugarProduccionId) { this.modal.setError('Debe seleccionar un lugar de producción'); return; }
            if (!data.vereda) { this.modal.setError('La vereda es obligatoria'); return; }
            try {
                if (id) await territorialModule.updatePredio(id, data);
                else await territorialModule.createPredio(data);
                this.modal.close(); await this._load();
            } catch(e) { this.modal.setError(e.message); }
        });
        const lid = v.lugarProduccionId || v.lugarProduccion?.id;
        if (lid) setTimeout(() => { const s = document.getElementById('f-lugar'); if(s) s.value = lid; }, 50);
        const mid = v.municipioId || v.idMunicipio;
        if (mid) setTimeout(() => { const s = document.getElementById('f-municipio'); if(s) s.value = mid; }, 50);
    }

    async _delete(id) {
        if (!confirm('¿Eliminar este predio?')) return;
        try { await territorialModule.deletePredio(id); Notify.success('Predio eliminado'); await this._load(); } catch(e) { this._err(e,'No se pudo eliminar el predio'); }
    }
}

// ─── CULTIVOS PAGE (ADMIN CRUD, TODOS leen) ───────────────────────────────────

class CultivosPage extends BasePage {
    constructor() { super('cultivos'); this._data = []; this._predios = []; this._plagas = []; }

    async render(container) {
        const canW = R.canWrite('cultivos');
        container.innerHTML = `
            ${this.pageShell('Cultivos','🌾','Catálogo de cultivos hortifrutícolas',
                canW ? `<button class="btn btn-primary" id="btn-new-cultivo">➕ Nuevo Cultivo</button>` : '')}
            <div class="filter-row">
                ${this.searchBarHTML('Buscar por nombre común o científico...')}
            </div>
            ${this.tableWrap(['#','Nombre Común','Variedad','Nombre Científico','Descripción', canW ? 'Acciones' : ''], 'cultivo-tbody')}`;
        if (canW) document.getElementById('btn-new-cultivo')?.addEventListener('click', () => this._openForm());
        await this._load();
        this.bindSearch(() => this._data, d => this._render(d));
    }

    async _load() {
        const tbody = document.getElementById('cultivo-tbody');
        if (tbody) tbody.innerHTML = this.skeletonRows(5);
        try { this._data = await territorialModule.getCultivos(); this._render(this._data); }
        catch(e) { if(tbody) tbody.innerHTML = this.errorRow(5, this._err(e,'Error al cargar datos')); }
    }

    _render(data) {
        const tbody = document.getElementById('cultivo-tbody');
        if (!tbody) return;
        if (!data.length) { tbody.innerHTML = this.emptyRow(7, 'No hay cultivos registrados'); return; }
        const canW = R.canWrite('cultivos');
        tbody.innerHTML = data.map((c,i) => {
            const nombre = c.nombreComun || c.nombreVariedad || '—';
            const desc = c.descripcion ? (c.descripcion.length > 50 ? c.descripcion.substring(0,50)+'...' : c.descripcion) : '—';
            return `<tr>
                <td><span class="row-num">${i+1}</span></td>
                <td><div class="cell-main"><span class="crop-dot"></span><strong>${nombre}</strong></div></td>
                <td class="text-muted">${c.nombreVariedad || '—'}</td>
                <td><em class="text-muted">${c.nombreCientifico || '—'}</em></td>
                <td class="text-muted">${desc}</td>
                ${canW ? `<td class="actions-cell">
                    <button class="btn-icon btn-icon--edit" onclick="cultivosPage._openForm(${c.id})">✏️</button>
                    <button class="btn-icon btn-icon--delete" onclick="cultivosPage._delete(${c.id})">🗑️</button>
                </td>` : '<td></td>'}
            </tr>`;
        }).join('');
    }

    async _verPlagas(cultivoId, nombre) {
        const cultivo = await territorialModule.getCultivo(cultivoId).catch(() => null);
        const plagas = cultivo?.plagas || [];
        const canW = R.canWrite('cultivos');
        const plagaOpts = canW ? (await territorialModule.getPlagas().catch(() => [])).map(p => `<option value="${p.id}">${p.nombreComun||p.nombre} — ${p.tipo||''}</option>`).join('') : '';
        const lista = plagas.length
            ? plagas.map(p => `<div class="plaga-item"><span class="plaga-risk-dot plaga-risk-dot--${(p.nivelRiesgo||'bajo').toLowerCase()}"></span> ${p.nombreComun||p.nombre||'?'} ${canW ? `<button class="btn-icon btn-icon--delete btn-xs" onclick="cultivosPage._desasociarPlaga(${cultivoId},${p.id})">✕</button>` : ''}</div>`).join('')
            : '<p class="text-muted">Sin plagas asociadas</p>';
        const body = `
            <h4 style="margin-bottom:8px">Plagas en <em>${nombre}</em></h4>
            <div class="plagas-list">${lista}</div>
            ${canW ? `<hr style="margin:16px 0"><div class="form-group"><label>Asociar plaga del catálogo</label><div class="input-row"><select class="form-control" id="f-plaga-sel"><option value="">Seleccione...</option>${plagaOpts}</select><button class="btn btn-secondary btn-sm" onclick="cultivosPage._asociarPlaga(${cultivoId})">Asociar</button></div></div>` : ''}`;
        this.modal.open(`Plagas del Cultivo`, body, null);
        const saveBtn = this.modal.el?.querySelector('.btn-save');
        if (saveBtn) saveBtn.style.display = 'none';
    }

    async _asociarPlaga(cultivoId) {
        const sel = document.getElementById('f-plaga-sel');
        if (!sel?.value) { Notify.warning('Seleccione una plaga'); return; }
        try {
            await territorialModule.asociarPlagaCultivo(cultivoId, sel.value);
            Notify.success('Plaga asociada al cultivo');
            this.modal.close();
        } catch(e) { this._err(e,'No se pudo asociar la plaga'); }
    }

    async _desasociarPlaga(cultivoId, plagaId) {
        if (!confirm('¿Desasociar esta plaga?')) return;
        try { await territorialModule.desasociarPlagaCultivo(cultivoId, plagaId); this.modal.close(); } catch(e) { this._err(e,'No se pudo desasociar la plaga'); }
    }

    async _openForm(id = null) {
        const predioOpts = this._predios.map(p => `<option value="${p.id}">${p.nombre||p.numeroPredial}</option>`).join('');
        let v = {};
        if (id) { try { v = await territorialModule.getCultivo(id); } catch(e) { this._err(e,'Error al cargar datos'); } }
        const body = `
            <div class="form-row">
                <div class="form-group"><label>Nombre Común</label><input class="form-control" id="f-especie" value="${v.nombreComun||''}" placeholder="Ej: Tomate, Mango, Aguacate"></div>
                <div class="form-group"><label>Nombre Científico</label><input class="form-control" id="f-cientifico" value="${v.nombreCientifico||''}" placeholder="Ej: Solanum lycopersicum"></div>
            </div>
            <div class="form-group"><label>Variedad</label><input class="form-control" id="f-variedad" value="${v.nombreVariedad||''}" placeholder="Ej: Cherry, Hass, Caturra"></div>
            <div class="form-group"><label>Descripción</label><textarea class="form-control" id="f-notas" rows="3" placeholder="Características del cultivo">${v.descripcion||''}</textarea></div>`;
        this.modal.open(id ? 'Editar Cultivo' : 'Registrar Cultivo', body, async () => {
            const data = {
                nombreComun: document.getElementById('f-especie')?.value?.trim(),
                nombreVariedad: document.getElementById('f-variedad')?.value?.trim(),
                nombreCientifico: document.getElementById('f-cientifico')?.value?.trim(),
                descripcion: document.getElementById('f-notas')?.value?.trim() || 'Sin descripcion'
            };
            if (!data.nombreComun) { this.modal.setError('El nombre común es obligatorio'); return; }
            if (!data.descripcion || data.descripcion === 'Sin descripcion') data.descripcion = 'Sin descripcion';
            try {
                if (id) await territorialModule.updateCultivo(id, data);
                else await territorialModule.createCultivo(data);
                this.modal.close(); await this._load();
            } catch(e) { this.modal.setError(e.message); }
        });
        const pid = v.predio?.id || v.predioId;
        if (pid) setTimeout(() => { const s = document.getElementById('f-predio'); if(s) s.value = pid; }, 50);
    }

    async _delete(id) {
        if (!confirm('¿Eliminar este cultivo?')) return;
        try { await territorialModule.deleteCultivo(id); Notify.success('Cultivo eliminado'); await this._load(); } catch(e) { this._err(e,'No se pudo eliminar el cultivo'); }
    }
}

// ─── LOTES PAGE (PRODUCTOR + ADMIN) ───────────────────────────────────────────

class LotesPage extends BasePage {
    constructor() { super('lotes'); this._data = []; this._cultivos = []; this._lugares = []; }

    async render(container) {
        const canW = R.canWrite('lotes');
        container.innerHTML = `
            ${this.pageShell('Lotes de Producción','🌱','Control de lotes y ciclos de producción',
                canW ? `<button class="btn btn-primary" id="btn-new-lote">➕ Nuevo Lote</button>` : '')}
            <div class="filter-row">
                <select class="form-control form-control--sm" id="filter-cultivo"><option value="">Todos los cultivos</option></select>
                ${this.searchBarHTML('Buscar lote...')}
            </div>
            ${this.tableWrap(['#','Código','Cultivo','Área (ha)','Estado','Acciones'], 'lote-tbody')}`;
        if (canW) document.getElementById('btn-new-lote')?.addEventListener('click', () => this._openForm());
        await Promise.all([this._loadCultivos(), this._loadLugares()]);
        await this._load();
        document.getElementById('filter-cultivo')?.addEventListener('change', e => this._load(e.target.value || null));
        this.bindSearch(() => this._data, d => this._render(d));
    }

    async _loadCultivos() {
        this._cultivos = await territorialModule.getCultivos().catch(() => []);
        const sel = document.getElementById('filter-cultivo');
        if (sel) this._cultivos.forEach(c => sel.insertAdjacentHTML('beforeend',
            `<option value="${c.id}">${c.nombreComun||c.nombreVariedad||'Cultivo'}</option>`));
    }

    async _loadLugares() {
        this._lugares = await territorialModule.getLugares().catch(() => []);
    }

    async _load(cultivoId = null) {
        const tbody = document.getElementById('lote-tbody');
        if (tbody) tbody.innerHTML = this.skeletonRows(6);
        try { this._data = await territorialModule.getLotes(cultivoId); this._render(this._data); }
        catch(e) { if(tbody) tbody.innerHTML = this.errorRow(6, this._err(e,'Error al cargar datos')); }
    }

    _render(data) {
        const tbody = document.getElementById('lote-tbody');
        if (!tbody) return;
        if (!data.length) { tbody.innerHTML = this.emptyRow(6, 'No hay lotes registrados'); return; }
        const canW = R.canWrite('lotes');
        tbody.innerHTML = data.map((l,i) => {
            const estado = l.estado || 'PLANIFICADO';
            const acciones = canW ? `
                <button class="btn-icon btn-icon--edit" onclick="lotesPage._openForm(${l.id})">✏️</button>
                ${estado === 'PLANIFICADO' ? `<button class="btn-icon btn-icon--success" title="Iniciar producción" onclick="lotesPage._iniciar(${l.id})">▶️</button>` : ''}
                ${estado === 'EN_PRODUCCION' ? `<button class="btn-icon btn-icon--warning" title="Registrar cosecha" onclick="lotesPage._cosechar(${l.id})">🌾</button>` : ''}
                <button class="btn-icon btn-icon--delete" onclick="lotesPage._delete(${l.id})">🗑️</button>` : '';
            return `<tr>
                <td><span class="row-num">${i+1}</span></td>
                <td><code>${l.numero||l.codigoLote||l.codigo||'—'}</code>${l.nombre ? `<br><small class="text-muted">${l.nombre}</small>` : ''}</td>
                <td><strong>${l.cultivoNombre||l.cultivo?.nombreComun||l.cultivo?.especie||'—'}</strong></td>
                <td>${l.area||l.areaHectareas||'—'} ha</td>
                <td>${this.badgeEstado(estado)}</td>
                <td class="actions-cell">${acciones}</td>
            </tr>`;
        }).join('');
    }

    async _iniciar(id) {
        if (!confirm('¿Iniciar producción de este lote?')) return;
        try { await territorialModule.iniciarProduccionLote(id); Notify.success('Producción iniciada'); await this._load(); } catch(e) { this._err(e,'No se pudo iniciar producción'); }
    }

    async _cosechar(id) {
        if (!confirm('¿Registrar cosecha de este lote?')) return;
        try { await territorialModule.cosecharLote(id); Notify.success('Cosecha registrada'); await this._load(); } catch(e) { this._err(e,'No se pudo registrar cosecha'); }
    }

    async _openForm(id = null) {
        let v = {};
        if (id) { try { v = await territorialModule.getLote(id); } catch(e) { this._err(e,'Error al cargar datos'); } }
        const culOpts = this._cultivos.map(c => `<option value="${c.id}">${c.nombreComun||c.nombreVariedad||'Cultivo'}</option>`).join('');
        const lugOpts = this._lugares.map(l => `<option value="${l.id}">${l.nombre} (${l.area||0} ha)</option>`).join('');
        const body = `
            <div class="form-row">
                <div class="form-group"><label>Nombre del Lote <span style="color:red">*</span></label><input class="form-control" id="f-nombre" value="${v.nombre||''}" placeholder="Ej: Lote Norte"></div>
                <div class="form-group"><label>Área (ha) <span style="color:red">*</span></label><input class="form-control" id="f-area" type="number" step="0.01" min="0.01" value="${v.area||''}"></div>
            </div>
            <div class="form-group"><label>Lugar de Producción <span style="color:red">*</span></label>
                <select class="form-control" id="f-lugar"><option value="">Seleccione el lugar...</option>${lugOpts}</select>
            </div>
            <div class="form-group"><label>Cultivo <span style="color:red">*</span></label>
                <select class="form-control" id="f-cultivo"><option value="">Seleccione el cultivo...</option>${culOpts}</select>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Estado</label>
                    <select class="form-control" id="f-estado">
                        <option value="ACTIVO" ${(v.estado||'ACTIVO')==='ACTIVO'?'selected':''}>🌱 Activo</option>
                        <option value="EN_PRODUCCION" ${v.estado==='EN_PRODUCCION'?'selected':''}>🌿 En Producción</option>
                        <option value="COSECHADO" ${v.estado==='COSECHADO'?'selected':''}>🌾 Cosechado</option>
                        <option value="INACTIVO" ${v.estado==='INACTIVO'?'selected':''}>❌ Inactivo</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Fecha Siembra <span style="color:red">*</span></label><input class="form-control" id="f-inicio" type="date" value="${v.fechaSiembra||''}"></div>
                <div class="form-group"><label>Fecha Estimada Cosecha <span style="color:red">*</span></label><input class="form-control" id="f-cosecha" type="date" value="${v.fechaCosechaEstimada||''}"></div>
            </div>`;
        this.modal.open(id ? 'Editar Lote' : 'Nuevo Lote', body, async () => {
            const data = {
                nombre: document.getElementById('f-nombre')?.value?.trim(),
                area: parseFloat(document.getElementById('f-area')?.value) || null,
                estado: document.getElementById('f-estado')?.value || 'ACTIVO',
                idLugar: parseInt(document.getElementById('f-lugar')?.value),
                cultivoId: parseInt(document.getElementById('f-cultivo')?.value),
                fechaSiembra: document.getElementById('f-inicio')?.value || null,
                fechaCosechaEstimada: document.getElementById('f-cosecha')?.value || null
            };
            if (!data.nombre) { this.modal.setError('El nombre del lote es obligatorio'); return; }
            if (!data.cultivoId) { this.modal.setError('Debe seleccionar un cultivo'); return; }
            if (!data.idLugar) { this.modal.setError('Debe seleccionar un lugar de producción'); return; }
            if (!data.fechaSiembra) { this.modal.setError('La fecha de siembra es obligatoria'); return; }
            if (!data.fechaCosechaEstimada) { this.modal.setError('La fecha estimada de cosecha es obligatoria'); return; }
            try {
                if (id) await territorialModule.updateLote(id, data);
                else await territorialModule.createLote(data);
                this.modal.close(); await this._load();
            } catch(e) { this.modal.setError(e.message); }
        });
        const cid = v.cultivoId; if (cid) setTimeout(() => { const s = document.getElementById('f-cultivo'); if(s) s.value = cid; }, 50);
        const lid = v.idLugar || v.lugarProduccion?.id; if (lid) setTimeout(() => { const s = document.getElementById('f-lugar'); if(s) s.value = lid; }, 50);
    }

    async _delete(id) {
        if (!confirm('¿Eliminar este lote?')) return;
        try { await territorialModule.deleteLote(id); Notify.success('Lote eliminado'); await this._load(); } catch(e) { this._err(e,'No se pudo eliminar el lote'); }
    }
}

// ─── PLAGAS PAGE (ADMIN CRUD, TODOS leen) ─────────────────────────────────────

class PlagasPage extends BasePage {
    constructor() { super('plagas'); this._data = []; this._cultivos = []; }

    async render(container) {
        const canW = R.canWrite('plagas');
        container.innerHTML = `
            ${this.pageShell('Catálogo de Plagas','🐛','Registro de plagas asociadas a cultivos',
                canW ? `<button class="btn btn-primary" id="btn-new-plaga">➕ Nueva Plaga</button>` : '')}
            <div class="filter-row">
                ${this.searchBarHTML('Buscar por nombre científico o común...')}
            </div>
            ${this.tableWrap(['#','Nombre Común','Nombre Científico','Cultivo Asociado', canW ? 'Acciones' : ''], 'plaga-tbody')}`;
        if (canW) document.getElementById('btn-new-plaga')?.addEventListener('click', () => this._openForm());
        this._cultivos = await territorialModule.getCultivos().catch(() => []);
        await this._load();
        this.bindSearch(() => this._data, d => this._render(d));
    }

    async _load() {
        const tbody = document.getElementById('plaga-tbody');
        if (tbody) tbody.innerHTML = this.skeletonRows(4);
        try { this._data = await territorialModule.getPlagas({}); this._render(this._data); }
        catch(e) { if(tbody) tbody.innerHTML = this.errorRow(4, this._err(e,'Error al cargar datos')); }
    }

    _render(data) {
        const tbody = document.getElementById('plaga-tbody');
        if (!tbody) return;
        if (!data.length) { tbody.innerHTML = this.emptyRow(4, 'No hay plagas en el catálogo'); return; }
        const canW = R.canWrite('plagas');
        tbody.innerHTML = data.map((p,i) => {
            // Find cultivo name from loaded cultivos list
            const cult = this._cultivos.find(c => c.id === (p.idCultivo || p.cultivo?.id));
            const cultivoNombre = cult ? `${cult.nombreComun||cult.nombreVariedad}` : (p.idCultivo ? `Cultivo #${p.idCultivo}` : '—');
            return `<tr>
                <td><span class="row-num">${i+1}</span></td>
                <td><strong>${p.nombreComun||p.nombre||'—'}</strong></td>
                <td><em class="text-muted">${p.nombreCientifico||'—'}</em></td>
                <td><span class="chip">${cultivoNombre}</span></td>
                ${canW ? `<td class="actions-cell">
                    <button class="btn-icon btn-icon--edit" onclick="plagasPage._openForm(${p.id})">✏️</button>
                    <button class="btn-icon btn-icon--delete" onclick="plagasPage._delete(${p.id})">🗑️</button>
                </td>` : '<td></td>'}
            </tr>`;
        }).join('');
    }

    async _openForm(id = null) {
        let v = {};
        if (id) { try { v = await territorialModule.getPlaga(id); } catch(e) { this._err(e,'Error al cargar datos'); } }
        const culOpts = this._cultivos.map(c => `<option value="${c.id}">${c.nombreComun||c.nombreVariedad||'Cultivo'}</option>`).join('');
        const currentCultivo = v.idCultivo || v.cultivo?.id;
        const body = `
            <div class="form-row">
                <div class="form-group"><label>Nombre Común <span style="color:red">*</span></label><input class="form-control" id="f-nom" value="${v.nombreComun||v.nombre||''}" placeholder="Ej: Mosca blanca"></div>
                <div class="form-group"><label>Nombre Científico <span style="color:red">*</span></label><input class="form-control" id="f-cientifico" value="${v.nombreCientifico||''}" placeholder="Ej: Bemisia tabaci"></div>
            </div>
            <div class="form-group"><label>Cultivo Asociado <span style="color:red">*</span></label>
                <select class="form-control" id="f-cultivo-plaga"><option value="">Seleccione el cultivo afectado...</option>${culOpts}</select>
            </div>`;
        this.modal.open(id ? 'Editar Plaga' : 'Nueva Plaga en Catálogo', body, async () => {
            const data = {
                nombreComun: document.getElementById('f-nom')?.value?.trim(),
                nombreCientifico: document.getElementById('f-cientifico')?.value?.trim(),
                idCultivo: parseInt(document.getElementById('f-cultivo-plaga')?.value)
            };
            if (!data.nombreComun || !data.nombreCientifico) { this.modal.setError('Nombre común y científico son obligatorios'); return; }
            if (!data.idCultivo) { this.modal.setError('Debe seleccionar un cultivo asociado'); return; }
            try {
                if (id) await territorialModule.updatePlaga(id, data);
                else await territorialModule.createPlaga(data);
                this.modal.close(); await this._load();
            } catch(e) { this.modal.setError(e.message); }
        });
        if (currentCultivo) setTimeout(() => { const s = document.getElementById('f-cultivo-plaga'); if(s) s.value = currentCultivo; }, 50);
    }

    async _delete(id) {
        if (!confirm('¿Eliminar esta plaga del catálogo?')) return;
        try { await territorialModule.deletePlaga(id); Notify.success('Plaga eliminada'); await this._load(); } catch(e) { this._err(e,'No se pudo eliminar la plaga'); }
    }
}

// ─── INSPECCIONES PAGE (ASISTENTE_TECNICO + ADMIN) ────────────────────────────

class InspeccionesPage extends BasePage {
    constructor() { super('inspecciones'); this._data = []; this._lotes = []; }

    async render(container) {
        const canW = R.canWrite('inspecciones');
        container.innerHTML = `
            ${this.pageShell('Inspecciones Fitosanitarias','🔬','Gestión de inspecciones de campo',
                canW ? `<button class="btn btn-primary" id="btn-new-insp">➕ Nueva Inspección</button>` : '')}
            <div class="filter-row">
                <select class="form-control form-control--sm" id="filter-estado-insp">
                    <option value="">Todos los estados</option>
                    <option value="PROGRAMADA">⏳ Programada</option>
                    <option value="EN_PROCESO">🔄 En Proceso</option>
                    <option value="COMPLETADA">✅ Completada</option>
                    <option value="CANCELADA">❌ Cancelada</option>
                    <option value="PENDIENTE_REVISION">🔍 Pend. Revisión</option>
                </select>
                ${this.searchBarHTML('Buscar por lote o fecha...')}
            </div>
            <div class="stats-mini" id="insp-stats"></div>
            ${this.tableWrap(['#','Fecha','Lote','Inspector','Estado','Acciones'], 'insp-tbody')}`;
        if (canW) document.getElementById('btn-new-insp')?.addEventListener('click', () => this._openForm());
        await this._loadLotes();
        await this._load();
        document.getElementById('filter-estado-insp')?.addEventListener('change', e => this._load(e.target.value || null));
        this.bindSearch(() => this._data, d => this._render(d));
    }

    async _loadLotes() {
        this._lotes = await territorialModule.getLotes().catch(() => []);
    }

    async _load(estado = null) {
        const tbody = document.getElementById('insp-tbody');
        if (tbody) tbody.innerHTML = this.skeletonRows(6);
        try {
            const ep = estado ? Endpoints.INSPECCIONES.BY_ESTADO(estado) : Endpoints.INSPECCIONES.LIST;
            const res = await apiInspecciones.get(ep);
            this._data = Array.isArray(res) ? res : (res?.data ?? res?.content ?? []);
            this._renderStats();
            this._render(this._data);
        } catch(e) { if(tbody) tbody.innerHTML = this.errorRow(6, this._err(e,'Error al cargar datos')); }
    }

    _renderStats() {
        const el = document.getElementById('insp-stats');
        if (!el) return;
        const counts = this._data.reduce((acc, i) => { acc[i.estado] = (acc[i.estado]||0)+1; return acc; }, {});
        el.innerHTML = `
            <div class="stat-mini"><span class="stat-mini__val">${this._data.length}</span><span class="stat-mini__lbl">Total</span></div>
            <div class="stat-mini stat-mini--warning"><span class="stat-mini__val">${counts.PROGRAMADA||0}</span><span class="stat-mini__lbl">Programadas</span></div>
            <div class="stat-mini stat-mini--info"><span class="stat-mini__val">${counts.EN_PROCESO||0}</span><span class="stat-mini__lbl">En Proceso</span></div>
            <div class="stat-mini stat-mini--success"><span class="stat-mini__val">${counts.COMPLETADA||0}</span><span class="stat-mini__lbl">Completadas</span></div>`;
    }

    _render(data) {
        const tbody = document.getElementById('insp-tbody');
        if (!tbody) return;
        if (!data.length) { tbody.innerHTML = this.emptyRow(6, 'No hay inspecciones registradas'); return; }
        const canW = R.canWrite('inspecciones');
        tbody.innerHTML = data.map((insp,i) => {
            const fecha = insp.fechaInspeccion ? new Date(insp.fechaInspeccion).toLocaleDateString('es-CO') : '—';
            const estado = insp.estado || 'PROGRAMADA';
            const inspId = insp.idInspeccion || insp.id;
            const acciones = `
                <button class="btn-icon btn-icon--info" title="Ver detalle" onclick="inspeccionDetallePage.render(document.getElementById('page-content'), ${inspId})">👁️</button>
                ${canW && estado === 'PROGRAMADA' ? `<button class="btn-icon btn-icon--success" title="Iniciar" onclick="inspeccionesPage._iniciar(${inspId})">▶️</button>` : ''}
                ${canW && estado === 'EN_PROCESO' ? `<button class="btn-icon btn-icon--primary" title="Completar" onclick="inspeccionesPage._completar(${inspId})">✅</button>` : ''}
                ${canW && (estado === 'PROGRAMADA' || estado === 'EN_PROCESO') ? `<button class="btn-icon btn-icon--delete" title="Cancelar" onclick="inspeccionesPage._cancelar(${inspId})">❌</button>` : ''}`;
            return `<tr>
                <td><span class="row-num">${i+1}</span></td>
                <td>${fecha}<br><small class="text-muted">${insp.numeroInspeccion||''}</small></td>
                <td><strong>Lote ${insp.idLote || insp.loteId || '—'}</strong></td>
                <td class="text-muted">${insp.nombreInspector || insp.inspector || '—'}</td>
                <td>${this.badgeEstado(estado)}</td>
                <td class="actions-cell">${acciones}</td>
            </tr>`;
        }).join('');
    }

    async _iniciar(id) {
        if (!confirm('¿Iniciar esta inspección?')) return;
        try { await apiInspecciones.patch(Endpoints.INSPECCIONES.INICIAR(id)); Notify.success('Inspección iniciada'); await this._load(); } catch(e) { this._err(e,'No se pudo iniciar la inspección'); }
    }

    async _completar(id) {
        if (!confirm('¿Marcar como completada?')) return;
        try { await apiInspecciones.patch(Endpoints.INSPECCIONES.COMPLETAR(id)); Notify.success('Inspección completada'); await this._load(); } catch(e) { this._err(e,'No se pudo completar la inspección'); }
    }

    async _cancelar(id) {
        if (!confirm('¿Cancelar esta inspección?')) return;
        try { await apiInspecciones.patch(Endpoints.INSPECCIONES.CANCELAR(id)); Notify.success('Inspección cancelada'); await this._load(); } catch(e) { this._err(e,'No se pudo cancelar la inspección'); }
    }

    async _openForm(id = null) {
        const loteOpts = this._lotes.map(l => `<option value="${l.id}">${l.numero||l.codigoLote||'Lote '+l.id}${l.nombre?' - '+l.nombre:''}</option>`).join('');
        let v = {};
        if (id) { try { v = await apiInspecciones.get(Endpoints.INSPECCIONES.GET(id)); } catch(e) { this._err(e,'Error al cargar datos'); } }
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const body = `
            <div class="form-row">
                <div class="form-group"><label>Fecha de Inspección</label><input class="form-control" id="f-fecha" type="date" value="${v.fechaInspeccion||new Date().toISOString().split('T')[0]}"></div>
                <div class="form-group"><label>Tipo</label>
                    <select class="form-control" id="f-tipo">
                        <option value="RUTINARIA" ${(v.tipoInspeccion||'RUTINARIA')==='RUTINARIA'?'selected':''}>Rutinaria</option>
                        <option value="EMERGENCIA" ${v.tipoInspeccion==='EMERGENCIA'?'selected':''}>Emergencia</option>
                        <option value="SEGUIMIENTO" ${v.tipoInspeccion==='SEGUIMIENTO'?'selected':''}>Seguimiento</option>
                        <option value="CUARENTENA" ${v.tipoInspeccion==='CUARENTENA'?'selected':''}>Cuarentena</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Lote a Inspeccionar</label><select class="form-control" id="f-lote"><option value="">Seleccione...</option>${loteOpts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Nombre del Inspector</label><input class="form-control" id="f-inspector" value="${v.nombreInspector||user.nombre||''}" placeholder="Nombre completo"></div>
                <div class="form-group"><label>Cédula del Inspector</label><input class="form-control" id="f-cedula" value="${v.cedulaInspector||''}" placeholder="Número de cédula"></div>
            </div>
            <div class="form-group"><label>Observaciones</label><textarea class="form-control" id="f-obs" rows="3" placeholder="Condiciones del campo, clima, etc.">${v.observaciones||''}</textarea></div>`;
        this.modal.open(id ? 'Editar Inspección' : 'Programar Nueva Inspección', body, async () => {
            const data = {
                fechaInspeccion: document.getElementById('f-fecha')?.value,
                tipoInspeccion: document.getElementById('f-tipo')?.value,
                estado: v.estado || 'PROGRAMADA',
                idLote: parseInt(document.getElementById('f-lote')?.value),
                nombreInspector: document.getElementById('f-inspector')?.value?.trim(),
                cedulaInspector: document.getElementById('f-cedula')?.value?.trim(),
                observaciones: document.getElementById('f-obs')?.value?.trim()
            };
            if (!data.idLote || !data.fechaInspeccion) { this.modal.setError('Fecha y lote son obligatorios'); return; }
            if (!data.nombreInspector || !data.cedulaInspector) { this.modal.setError('Nombre y cédula del inspector son obligatorios'); return; }
            try {
                if (id) await apiInspecciones.put(Endpoints.INSPECCIONES.UPDATE(id), data);
                else await apiInspecciones.post(Endpoints.INSPECCIONES.CREATE, data);
                this.modal.close(); await this._load();
            } catch(e) { this.modal.setError(e.message); }
        });
        if (v.idLote) setTimeout(() => { const s = document.getElementById('f-lote'); if(s) s.value = v.idLote; }, 50);
    }
}

// ─── INSPECCIÓN DETALLE PAGE (Panel especial de conteo de plagas) ─────────────

class InspeccionDetallePage extends BasePage {
    constructor() { super('inspeccion-detalle'); this._inspeccion = null; this._detalles = []; this._plagasCatalogo = []; }

    async render(container, inspeccionId) {
        container.innerHTML = `<div class="loading-screen"><div class="spinner"></div><p>Cargando inspección...</p></div>`;
        try {
            const [insp, detalles, plagas] = await Promise.all([
                apiInspecciones.get(Endpoints.INSPECCIONES.GET(inspeccionId)),
                apiInspecciones.get(Endpoints.INSPECCIONES.DETALLES.LIST(inspeccionId)).catch(() => []),
                territorialModule.getPlagas().catch(() => [])
            ]);
            this._inspeccion = insp;
            this._detalles = Array.isArray(detalles) ? detalles : (detalles?.data ?? detalles?.content ?? []);
            this._plagasCatalogo = plagas;
            this._renderDetalle(container, inspeccionId);
        } catch(e) {
            container.innerHTML = `<div class="error-state"><h3>Error al cargar inspección</h3><p>${e.message}</p><button class="btn btn-secondary" onclick="loadPage('inspecciones')">← Volver</button></div>`;
        }
    }

    _renderDetalle(container, inspeccionId) {
        const insp = this._inspeccion;
        const canW = R.canWrite('inspecciones');
        const fecha = insp.fechaInspeccion ? new Date(insp.fechaInspeccion).toLocaleDateString('es-CO') : '—';

        // Estadísticas calculadas
        const totalPlagasDetectadas = this._detalles.reduce((s, d) => s + (d.plagas?.length || 0), 0);
        const totalPlantas = this._detalles.reduce((s, d) => s + (d.plantasMuestreadas || 0), 0);
        const totalArea = this._detalles.reduce((s, d) => s + (d.area || 0), 0);
        const cultivosUnicos = new Set(this._detalles.map(d => d.cultivoId || d.cultivo?.id)).size;

        // Conteo de plagas por tipo del catálogo
        const plagaConteo = {};
        this._detalles.forEach(det => {
            (det.plagas || []).forEach(pd => {
                const key = pd.plagaId || pd.id;
                if (!plagaConteo[key]) plagaConteo[key] = { nombre: pd.nombre || pd.plagaNombre || '?', count: 0, riesgo: pd.nivelRiesgo || 'BAJO' };
                plagaConteo[key].count += (pd.cantidad || pd.conteo || 1);
            });
        });

        container.innerHTML = `
        <div class="page-header">
            <div class="page-header__left">
                <button class="btn-back" onclick="loadPage('inspecciones')">← Volver</button>
                <div class="page-header__icon">🔬</div>
                <div>
                    <h1 class="page-header__title">Inspección #${inspeccionId}</h1>
                    <p class="page-header__subtitle">${fecha} · Lote: ${insp.idLote || insp.loteId || '—'} · Tipo: ${insp.tipoInspeccion||'—'} · ${this.badgeEstado(insp.estado)}</p>
                </div>
            </div>
            <div class="page-header__actions">
                ${canW ? `<button class="btn btn-primary" id="btn-add-cultivo-det">➕ Agregar Cultivo</button>` : ''}
            </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-grid stats-grid--4">
            <div class="stat-card stat-card--green">
                <div class="stat-card__icon">🌾</div>
                <div class="stat-card__body">
                    <div class="stat-card__value">${cultivosUnicos}</div>
                    <div class="stat-card__label">Cultivos Inspeccionados</div>
                </div>
            </div>
            <div class="stat-card stat-card--red">
                <div class="stat-card__icon">🐛</div>
                <div class="stat-card__body">
                    <div class="stat-card__value">${totalPlagasDetectadas}</div>
                    <div class="stat-card__label">Plagas Detectadas</div>
                </div>
            </div>
            <div class="stat-card stat-card--blue">
                <div class="stat-card__icon">🌿</div>
                <div class="stat-card__body">
                    <div class="stat-card__value">${totalPlantas}</div>
                    <div class="stat-card__label">Plantas Muestreadas</div>
                </div>
            </div>
            <div class="stat-card stat-card--orange">
                <div class="stat-card__icon">📐</div>
                <div class="stat-card__body">
                    <div class="stat-card__value">${totalArea.toFixed(2)} ha</div>
                    <div class="stat-card__label">Área Evaluada</div>
                </div>
            </div>
        </div>

        <!-- Inspection Panel: 2 columns -->
        <div class="inspection-panel">
            <!-- Left: Cultivo Details -->
            <div class="inspection-panel__left">
                <h3 class="panel-title">📋 Detalle por Cultivo</h3>
                <div id="cultivo-detalles-list">
                    ${this._detalles.length ? this._detalles.map(d => this._renderDetalleCard(d, inspeccionId, canW)).join('')
                        : `<div class="empty-state"><div class="empty-state__icon">🌱</div><p>Aún no hay cultivos registrados en esta inspección</p></div>`}
                </div>
            </div>

            <!-- Right: Plaga Counter Panel -->
            <div class="inspection-panel__right">
                <div class="plaga-counter-panel">
                    <h3 class="panel-title">🔢 Conteo de Plagas</h3>
                    ${Object.keys(plagaConteo).length ? `
                        <div class="plaga-counter-list">
                            ${Object.values(plagaConteo).sort((a,b) => b.count - a.count).map(p => `
                                <div class="plaga-counter-item">
                                    <div class="plaga-counter-item__info">
                                        <span class="plaga-risk-dot plaga-risk-dot--${(p.riesgo||'bajo').toLowerCase()}"></span>
                                        <span class="plaga-counter-item__name">${p.nombre}</span>
                                    </div>
                                    <span class="plaga-counter-item__count">${p.count}</span>
                                </div>`).join('')}
                        </div>
                        <div class="plaga-counter-total">Total registros: <strong>${totalPlagasDetectadas}</strong></div>
                    ` : `<div class="empty-state"><div class="empty-state__icon">✅</div><p>Sin plagas detectadas</p></div>`}

                    <hr style="margin:16px 0; opacity:0.3">
                    <h4 class="panel-subtitle">📚 Catálogo de Plagas</h4>
                    <div class="plaga-catalog-list">
                        ${this._plagasCatalogo.map(p => `
                            <div class="plaga-catalog-item">
                                <span class="plaga-risk-dot plaga-risk-dot--${(p.nivelRiesgo||'bajo').toLowerCase()}"></span>
                                <div class="plaga-catalog-item__info">
                                    <span class="plaga-catalog-item__name">${p.nombre||p.nombreComun}</span>
                                    <span class="plaga-catalog-item__scientific">${p.nombreCientifico||''}</span>
                                </div>
                                <span class="chip chip--xs">${p.tipo||'—'}</span>
                            </div>`).join('') || '<p class="text-muted">Catálogo vacío</p>'}
                    </div>
                </div>
            </div>
        </div>`;

        if (canW) document.getElementById('btn-add-cultivo-det')?.addEventListener('click', () => this._addCultivo(inspeccionId));
    }

    _renderDetalleCard(det, inspeccionId, canW) {
        const plagas = det.plagas || [];
        const plagaItems = plagas.map(p => `
            <div class="plaga-detected-item">
                <span class="plaga-risk-dot plaga-risk-dot--${(p.nivelRiesgo||'bajo').toLowerCase()}"></span>
                <span>${p.nombre||p.plagaNombre||'?'}</span>
                <span class="plaga-count-badge">${p.cantidad||p.conteo||1}</span>
                ${canW ? `<button class="btn-icon btn-icon--delete btn-xs" onclick="inspeccionDetallePage._deletePlagaDet(${p.id})">✕</button>` : ''}
            </div>`).join('') || '<span class="text-muted text-sm">Sin plagas registradas</span>';

        return `
        <div class="cultivo-info-card">
            <div class="cultivo-info-card__header">
                <div class="cultivo-info-card__title">
                    <span class="crop-dot"></span>
                    <strong>${det.cultivo?.especie||det.cultivoNombre||'Cultivo'}</strong>
                    ${det.cultivo?.variedad ? `<span class="chip chip--xs">${det.cultivo.variedad}</span>` : ''}
                </div>
                <div class="cultivo-info-card__meta">
                    <span>🌿 ${det.plantasMuestreadas||0} plantas</span>
                    <span>📐 ${det.area||0} ha</span>
                </div>
            </div>
            <div class="cultivo-info-card__plagas">
                <div class="plagas-detected-header">
                    <span>Plagas detectadas:</span>
                    ${canW ? `<button class="btn btn-xs btn-outline-danger" onclick="inspeccionDetallePage.addPlaga(${det.id})">+ Agregar plaga</button>` : ''}
                </div>
                ${plagaItems}
            </div>
            ${det.observaciones ? `<div class="cultivo-info-card__obs"><em>${det.observaciones}</em></div>` : ''}
        </div>`;
    }

    async _addCultivo(inspeccionId) {
        const cultivos = await territorialModule.getCultivos().catch(() => []);
        const culOpts = cultivos.map(c => `<option value="${c.id}">${c.nombreComun||c.nombreVariedad||c.especie||'Cultivo'} ${c.nombreVariedad&&c.nombreComun ? '- '+c.nombreVariedad : ''}</option>`).join('');
        const body = `
            <div class="form-group"><label>Cultivo</label><select class="form-control" id="f-cultivo-det"><option value="">Seleccione...</option>${culOpts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Plantas Muestreadas</label><input class="form-control" id="f-plantas" type="number" min="0" placeholder="0"></div>
                <div class="form-group"><label>Área Evaluada (ha)</label><input class="form-control" id="f-area-det" type="number" step="0.01" min="0" placeholder="0.00"></div>
            </div>
            <div class="form-group"><label>Observaciones</label><textarea class="form-control" id="f-obs-det" rows="3" placeholder="Descripción del estado del cultivo..."></textarea></div>`;
        this.modal.open('Agregar Cultivo a la Inspección', body, async () => {
            const data = {
                cultivoId: parseInt(document.getElementById('f-cultivo-det')?.value),
                plantasMuestreadas: parseInt(document.getElementById('f-plantas')?.value) || 0,
                area: parseFloat(document.getElementById('f-area-det')?.value) || 0,
                observaciones: document.getElementById('f-obs-det')?.value?.trim()
            };
            if (!data.cultivoId) { this.modal.setError('Seleccione un cultivo'); return; }
            try {
                await apiInspecciones.post(Endpoints.INSPECCIONES.DETALLES.CREATE(inspeccionId), data);
                Notify.success('Cultivo agregado a la inspección');
                this.modal.close();
                await this.render(document.getElementById('page-content'), inspeccionId);
            } catch(e) { this.modal.setError(e.message || 'Error al agregar cultivo'); }
        });
    }

    async addPlaga(detalleId) {
        const plagas = this._plagasCatalogo;
        const plagaOpts = plagas.map(p => `<option value="${p.id}">${p.nombre||p.nombreComun} (${p.nivelRiesgo||'?'})</option>`).join('');
        const body = `
            <div class="form-group"><label>Plaga Detectada</label><select class="form-control" id="f-plaga-det"><option value="">Seleccione del catálogo...</option>${plagaOpts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Cantidad / Conteo</label><input class="form-control" id="f-cantidad" type="number" min="1" value="1" placeholder="Número de individuos/focos"></div>
                <div class="form-group"><label>Incidencia (%)</label><input class="form-control" id="f-incidencia" type="number" min="0" max="100" step="0.1" placeholder="0.0"></div>
            </div>
            <div class="form-group"><label>Observaciones</label><textarea class="form-control" id="f-obs-plaga" rows="2" placeholder="Descripción del daño observado..."></textarea></div>`;
        this.modal.open('Registrar Plaga Detectada', body, async () => {
            const data = {
                plagaId: parseInt(document.getElementById('f-plaga-det')?.value),
                cantidad: parseInt(document.getElementById('f-cantidad')?.value) || 1,
                incidencia: parseFloat(document.getElementById('f-incidencia')?.value) || null,
                observaciones: document.getElementById('f-obs-plaga')?.value?.trim()
            };
            if (!data.plagaId) { this.modal.setError('Seleccione una plaga del catálogo'); return; }
            try {
                await apiInspecciones.post(Endpoints.INSPECCIONES.DETALLES.PLAGAS.CREATE(detalleId), data);
                Notify.success('Plaga registrada en el detalle');
                this.modal.close();
                await this.render(document.getElementById('page-content'), this._inspeccion.idInspeccion || this._inspeccion.id);
            } catch(e) { this.modal.setError(e.message || 'Error al registrar plaga'); }
        });
    }

    async _deletePlagaDet(plagaDetId) {
        if (!confirm('¿Eliminar este registro de plaga?')) return;
        try {
            await apiInspecciones.delete(Endpoints.INSPECCIONES.DETALLES.PLAGAS.DELETE(plagaDetId));
            Notify.success('Registro eliminado');
            await this.render(document.getElementById('page-content'), this._inspeccion.idInspeccion || this._inspeccion.id);
        } catch(e) { this._err(e,'No se pudo eliminar el registro'); }
    }
}

// ─── REPORTES PAGE ────────────────────────────────────────────────────────────

class ReportesPage extends BasePage {
    constructor() { super('reportes'); this._data = []; }

    async render(container) {
        container.innerHTML = `
            ${this.pageShell('Reportes','📊','Generación de reportes fitosanitarios','')}
            <div class="report-filters card">
                <h3 class="card__title">🔍 Filtros de Reporte</h3>
                <div class="form-row">
                    <div class="form-group"><label>Fecha Inicio</label><input class="form-control" id="r-fecha-inicio" type="date"></div>
                    <div class="form-group"><label>Fecha Fin</label><input class="form-control" id="r-fecha-fin" type="date"></div>
                    <div class="form-group"><label>Estado</label>
                        <select class="form-control" id="r-estado">
                            <option value="">Todos</option>
                            <option value="COMPLETADA">Completadas</option>
                            <option value="PROGRAMADA">Programadas</option>
                            <option value="EN_PROCESO">En Proceso</option>
                            <option value="CANCELADA">Canceladas</option>
                        </select>
                    </div>
                </div>
                <div class="form-group__actions">
                    <button class="btn btn-primary" id="btn-generar-reporte">📊 Generar Reporte</button>
                    <button class="btn btn-secondary" id="btn-export-pdf">📥 Exportar PDF</button>
                </div>
            </div>
            <div id="reporte-resultado"></div>`;

        document.getElementById('btn-generar-reporte')?.addEventListener('click', () => this._generar());
        document.getElementById('btn-export-pdf')?.addEventListener('click', () => this._exportPDF());

        // Fechas por defecto: último mes
        const hoy = new Date();
        const hace30 = new Date(hoy); hace30.setDate(hace30.getDate() - 30);
        const fi = document.getElementById('r-fecha-inicio');
        const ff = document.getElementById('r-fecha-fin');
        if (fi) fi.value = hace30.toISOString().split('T')[0];
        if (ff) ff.value = hoy.toISOString().split('T')[0];
    }

    async _generar() {
        const fi = document.getElementById('r-fecha-inicio')?.value;
        const ff = document.getElementById('r-fecha-fin')?.value;
        const estado = document.getElementById('r-estado')?.value;
        const el = document.getElementById('reporte-resultado');
        if (el) el.innerHTML = `<div class="loading-screen"><div class="spinner"></div><p>Generando reporte...</p></div>`;
        try {
            const res = await apiInspecciones.get(Endpoints.INSPECCIONES.LIST);
            this._data = Array.isArray(res) ? res : (res?.data ?? res?.content ?? []);
            let filtrado = this._data;
            if (fi) filtrado = filtrado.filter(i => i.fechaInspeccion >= fi);
            if (ff) filtrado = filtrado.filter(i => i.fechaInspeccion <= ff + 'T23:59:59');
            if (estado) filtrado = filtrado.filter(i => i.estado === estado);
            this._renderReporte(filtrado);
        } catch(e) {
            if (el) el.innerHTML = `<div class="error-state"><p>Error al generar reporte: ${e.message}</p></div>`;
        }
    }

    _renderReporte(data) {
        const el = document.getElementById('reporte-resultado');
        if (!el) return;
        if (!data.length) { el.innerHTML = `<div class="empty-state"><div class="empty-state__icon">📭</div><p>No hay inspecciones en el período seleccionado</p></div>`; return; }
        const completadas = data.filter(i => i.estado === 'COMPLETADA').length;
        const pct = data.length ? Math.round(completadas/data.length*100) : 0;
        el.innerHTML = `
            <div class="report-summary">
                <div class="report-stat"><div class="report-stat__val">${data.length}</div><div class="report-stat__lbl">Total Inspecciones</div></div>
                <div class="report-stat report-stat--success"><div class="report-stat__val">${completadas}</div><div class="report-stat__lbl">Completadas</div></div>
                <div class="report-stat report-stat--info"><div class="report-stat__val">${pct}%</div><div class="report-stat__lbl">Tasa de Completitud</div></div>
            </div>
            <div class="table-wrapper" id="reporte-table">
                <table class="data-table">
                    <thead><tr><th>#</th><th>Fecha</th><th>Lote</th><th>Inspector</th><th>Estado</th></tr></thead>
                    <tbody>
                        ${data.map((r,i) => `
                            <tr>
                                <td><span class="row-num">${i+1}</span></td>
                                <td>${r.fechaInspeccion ? new Date(r.fechaInspeccion).toLocaleDateString('es-CO') : '—'}</td>
                                <td>${r.lote?.codigoLote||r.loteId||'—'}</td>
                                <td>${r.inspector||r.inspectorNombre||'—'}</td>
                                <td>${this.badgeEstado(r.estado)}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    }

    _exportPDF() {
        if (!this._data.length) { Notify.warning('Genera el reporte primero'); return; }
        Notify.info('Preparando exportación...');
        window.print();
    }
}

// ─── INSTANCIAS GLOBALES ──────────────────────────────────────────────────────

const usuariosPage        = new UsuariosPage();
const departamentosPage   = new DepartamentosPage();
const municipiosPage      = new MunicipiosPage();
const lugaresPage         = new LugaresPage();
const prediosPage         = new PrediosPage();
const cultivosPage        = new CultivosPage();
const lotesPage           = new LotesPage();
const plagasPage          = new PlagasPage();
const inspeccionesPage    = new InspeccionesPage();
const inspeccionDetallePage = new InspeccionDetallePage();
const reportesPage        = new ReportesPage();

// Exponer globalmente
Object.assign(window, {
    Notify, R, PageModal, BasePage,
    UsuariosPage, DepartamentosPage, MunicipiosPage, LugaresPage,
    PrediosPage, CultivosPage, LotesPage, PlagasPage,
    InspeccionesPage, InspeccionDetallePage, ReportesPage,
    usuariosPage, departamentosPage, municipiosPage, lugaresPage,
    prediosPage, cultivosPage, lotesPage, plagasPage,
    inspeccionesPage, inspeccionDetallePage, reportesPage
});
