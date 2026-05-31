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
            // Caso de uso: Programar Inspección → Productor + Admin
            // Caso de uso: Gestionar Inspección → AsistenteTécnico + Admin
            case 'inspecciones':  return r === 'ADMINISTRADOR' || r === 'ASISTENTE_TECNICO' || r === 'PRODUCTOR';
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
            <span class="search-bar__icon"></span>
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
        return `<tr><td colspan="${cols}" class="empty-state"><div class="empty-state__icon"></div><p>${msg}</p></td></tr>`;
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
            <div class="empty-state__icon"></div>
            <p style="color:#e53935;font-weight:600">${msg}</p>
        </td></tr>`;
    }

    /**
     * Genera una celda <td> con menú desplegable de acciones.
     * @param {string} uid  - Identificador único para el menú (ej: `u-${id}`)
     * @param {string} btns - HTML interno con los <button class="btn-icon ...">
     * @param {string} [emptyCell='<td></td>'] - Celda vacía si no hay acciones
     */
    actionsCell(uid, btns, emptyCell = '<td></td>') {
        if (!btns || !btns.trim()) return emptyCell;
        const menuId = `dd-${uid}`;
        return `<td class="actions-cell">
            <div class="actions-menu-wrap" style="position:relative;display:inline-block">
                <button class="btn-actions-toggle"
                    onclick="event.stopPropagation();document.querySelectorAll('.actions-dropdown.open').forEach(d=>{if(d.id!=='${menuId}')d.classList.remove('open')});document.getElementById('${menuId}').classList.toggle('open')"
                    style="background:#f0f2f5;border:1px solid #dde1e7;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:0.8rem;font-weight:600;color:#1a2332;white-space:nowrap;line-height:1.4">
                    Acciones ▾
                </button>
                <div id="${menuId}" class="actions-dropdown"
                    style="position:absolute;right:0;top:calc(100% + 4px);background:#fff;border:1px solid #dde1e7;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.12);z-index:999;min-width:160px;padding:4px 0;display:none">
                    ${btns}
                </div>
            </div>
        </td>`;
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
            ACTIVO:           ['badge--success', 'Activo'],
            INACTIVO:         ['badge--danger',  'Inactivo'],
            // Inspecciones (enums reales del backend)
            PROGRAMADA:       ['badge--warning', 'Programada'],
            EN_PROCESO:       ['badge--info',    'En Proceso'],
            COMPLETADA:       ['badge--success', 'Completada'],
            CANCELADA:        ['badge--danger',  'Cancelada'],
            PENDIENTE_REVISION: ['badge--warning','Pend. Aprobación'],
            APROBADA:           ['badge--success','Aprobada'],
            // Compatibilidad con nombres alternativos
            PENDIENTE:        ['badge--warning', 'Pendiente'],
            EN_PROGRESO:      ['badge--info',    'En Progreso'],
            // Lotes
            PLANIFICADO:      ['badge--secondary','Planificado'],
            EN_PRODUCCION:    ['badge--info',    'En Producción'],
            COSECHADO:        ['badge--success', 'Cosechado'],
            ABANDONADO:       ['badge--danger',  'Abandonado'],
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
            container.innerHTML = `<div class="access-denied"><div class="access-denied__icon"></div><h2>Acceso Restringido</h2><p>Solo administradores pueden gestionar usuarios.</p></div>`;
            return;
        }
        container.innerHTML = `
            ${this.pageShell('Gestión de Usuarios','','Administra los usuarios del sistema',
                `<button class="btn btn-primary" id="btn-new-user">+ Nuevo Usuario</button>`)}
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
                ${this.actionsCell(`us-${u.id}`, `
                    <button class="btn-icon btn-icon--edit" onclick="usuariosPage._openForm(${u.id})">Editar</button>
                    <button class="btn-icon btn-icon--toggle" onclick="usuariosPage._toggleEstado(${u.id},'${u.estado}')">Cambiar estado</button>
                `)}
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
            ${this.pageShell('Departamentos','','Gestión de departamentos del país',
                canW ? `<button class="btn btn-primary" id="btn-new-dep">+ Nuevo Departamento</button>` : '')}
            ${this.searchBarHTML('Buscar departamento...')}
            ${this.tableWrap(['#','Código','Nombre','Estado', canW ? 'Acciones' : ''], 'dep-tbody')}`;
        if (canW) document.getElementById('btn-new-dep')?.addEventListener('click', () => this._openForm());
        await this._load();
        this.bindSearch(() => this._data, d => this._render(d));
    }

    async _load() {
        const tbody = document.getElementById('dep-tbody');
        if (tbody) tbody.innerHTML = this.skeletonRows(5);
        try {
            this._data = await territorialModule.getDepartamentos();
            this._render(this._data);
        } catch(e) {
            if(tbody) tbody.innerHTML = this.errorRow(5, 'Error al cargar departamentos');
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
                ${canW ? this.actionsCell(`dep-${d.id}`, `
                    <button class="btn-icon btn-icon--edit" onclick="departamentosPage._openForm(${d.id})">Editar</button>
                    <button class="btn-icon btn-icon--delete" onclick="departamentosPage._delete(${d.id})">Eliminar</button>
                `) : '<td></td>'}
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
            ${this.pageShell('Municipios','','Gestión de municipios',
                canW ? `<button class="btn btn-primary" id="btn-new-mun">+ Nuevo Municipio</button>` : '')}
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
                ${canW ? this.actionsCell(`mun-${m.id}`, `
                    <button class="btn-icon btn-icon--edit" onclick="municipiosPage._openForm(${m.id})">Editar</button>
                    <button class="btn-icon btn-icon--delete" onclick="municipiosPage._delete(${m.id})">Eliminar</button>
                `) : '<td></td>'}
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
            ${this.pageShell('Lugares de Producción','','Gestiona los lugares de producción agrícola',
                canW ? `<button class="btn btn-primary" id="btn-new-lugar">+ Nuevo Lugar</button>` : '')}
            <div class="filter-row">
                <select class="form-control form-control--sm" id="filter-estado-lugar">
                    <option value="">Todos los estados</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="INACTIVO">Inactivo</option>
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
        if (tbody) tbody.innerHTML = this.skeletonRows(5);
        try { this._data = await territorialModule.getLugares(); this._render(this._data); }
        catch(e) { if(tbody) tbody.innerHTML = this.errorRow(5, this._err(e,'Error al cargar datos')); }
    }

    _render(data) {
        const tbody = document.getElementById('lugar-tbody');
        if (!tbody) return;
        if (!data.length) { tbody.innerHTML = this.emptyRow(5, 'No hay lugares de producción registrados'); return; }
        const canW = R.canWrite('lugares');
        tbody.innerHTML = data.map((l,i) => `
            <tr>
                <td><span class="row-num">${i+1}</span></td>
                <td><strong>${l.nombre}</strong></td>
                <td>${l.area || '—'} ha</td>
                <td>${this.badgeEstado(l.activo !== false ? 'ACTIVO' : 'INACTIVO')}</td>
                ${canW ? this.actionsCell(`lug-${l.id}`, `
                    <button class="btn-icon btn-icon--edit" onclick="lugaresPage._openForm(${l.id})">Editar</button>
                    <button class="btn-icon btn-icon--delete" onclick="lugaresPage._delete(${l.id})">Eliminar</button>
                `) : '<td></td>'}
            </tr>`).join('');
    }

    async _openForm(id = null) {
        let v = { nombre:'', area:'', activo: true };
        if (id) { try { v = await territorialModule.getLugar(id); } catch(e) { this._err(e,'Error al cargar datos'); } }
        const body = `
            <div class="form-group"><label>Nombre del Lugar</label><input class="form-control" id="f-nom" value="${v.nombre||''}" placeholder="Nombre descriptivo del lugar de producción"></div>
            <div class="form-row">
                <div class="form-group"><label>Área (hectáreas)</label><input class="form-control" id="f-area" type="number" step="0.01" min="0" value="${v.area||''}" placeholder="0.00"></div>
                <div class="form-group"><label>Estado</label>
                    <select class="form-control" id="f-estado">
                        <option value="ACTIVO" ${(v.activo !== false && v.estado !== 'INACTIVO')?'selected':''}>Activo</option>
                        <option value="INACTIVO" ${(v.activo === false || v.estado === 'INACTIVO')?'selected':''}>Inactivo</option>
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
            ${this.pageShell('Predios','','Gestión de predios agrícolas registrados',
                canW ? `<button class="btn btn-primary" id="btn-new-predio">+ Nuevo Predio</button>` : '')}
            <div class="filter-row">
                <select class="form-control form-control--sm" id="filter-lugar"><option value="">Todos los lugares</option></select>
                ${this.searchBarHTML('Buscar por número predial o nombre...')}
            </div>
            ${this.tableWrap(['#','N° Predial','Nombre','Vereda','Área (ha)','Lugar', canW ? 'Acciones' : ''], 'predio-tbody')}`;
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
                <td class="text-muted">${p.vereda||'—'}</td>
                <td>${p.area||p.areaHectareas||'—'} ha</td>
                <td>${p.lugarProduccionNombre||p.lugarProduccion?.nombre||p.lugarNombre||'—'}</td>
                ${canW ? this.actionsCell(`pred-${p.id}`, `
                    <button class="btn-icon btn-icon--edit" onclick="prediosPage._openForm(${p.id})">Editar</button>
                    <button class="btn-icon btn-icon--delete" onclick="prediosPage._delete(${p.id})">Eliminar</button>
                `) : '<td></td>'}
            </tr>`).join('');
    }

    async _openForm(id = null) {
        const lugOpts = this._lugares.map(l => `<option value="${l.id}">${l.nombre} (${l.area||0} ha)</option>`).join('');
        const munOpts = this._municipios.map(m => `<option value="${m.id}">${m.nombre} — ${m.departamentoNombre||''}</option>`).join('');
        let v = {};
        if (id) { try { v = await territorialModule.getPredio(id); } catch(e) { this._err(e,'Error al cargar datos'); } }

        // AVISO: Si no hay Lugares de Producción, el predio no puede guardarse
        const sinLugares = this._lugares.length === 0;

        const body = `
            ${sinLugares ? `
            <div style="padding:12px 14px;background:#fff8e1;border-radius:10px;border-left:4px solid #ffa726;margin-bottom:14px;font-size:0.85rem">
                <strong>No hay Lugares de Producción registrados.</strong><br>
                Para registrar un predio, primero debe crear un Lugar de Producción en el módulo
                <button class="btn btn-sm btn-secondary" style="margin-left:6px" onclick="this.closest('.modal-overlay').classList.remove('active');loadPage('lugares')">
                    Ir a Lugares
                </button>
            </div>` : ''}` + `
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
            ${this.pageShell('Cultivos','','Catálogo de cultivos hortifrutícolas',
                canW ? `<button class="btn btn-primary" id="btn-new-cultivo">+ Nuevo Cultivo</button>` : '')}
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
        if (tbody) tbody.innerHTML = this.skeletonRows(6);
        try { this._data = await territorialModule.getCultivos(); this._render(this._data); }
        catch(e) { if(tbody) tbody.innerHTML = this.errorRow(6, this._err(e,'Error al cargar datos')); }
    }

    _render(data) {
        const tbody = document.getElementById('cultivo-tbody');
        if (!tbody) return;
        const canW = R.canWrite('cultivos');
        if (!data.length) { tbody.innerHTML = this.emptyRow(6, 'No hay cultivos registrados'); return; }
        tbody.innerHTML = data.map((c,i) => {
            const nombre = c.nombreComun || c.nombreVariedad || '—';
            const desc = c.descripcion ? (c.descripcion.length > 50 ? c.descripcion.substring(0,50)+'...' : c.descripcion) : '—';
            return `<tr>
                <td><span class="row-num">${i+1}</span></td>
                <td><div class="cell-main"><span class="crop-dot"></span><strong>${nombre}</strong></div></td>
                <td class="text-muted">${c.nombreVariedad || '—'}</td>
                <td><em class="text-muted">${c.nombreCientifico || '—'}</em></td>
                <td class="text-muted">${desc}</td>
                ${canW ? this.actionsCell(`cul-${c.id}`, `
                    <button class="btn-icon btn-icon--edit" onclick="cultivosPage._openForm(${c.id})">Editar</button>
                    <button class="btn-icon btn-icon--delete" onclick="cultivosPage._delete(${c.id})">Eliminar</button>
                `) : '<td></td>'}
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
            ${this.pageShell('Lotes de Producción','','Control de lotes y ciclos de producción',
                canW ? `<button class="btn btn-primary" id="btn-new-lote">+ Nuevo Lote</button>` : '')}
            <div class="filter-row">
                <select class="form-control form-control--sm" id="filter-cultivo"><option value="">Todos los cultivos</option></select>
                ${this.searchBarHTML('Buscar lote...')}
            </div>
            ${this.tableWrap(['#','Nombre / Lote','Cultivo / Lugar','Área (ha)','Estado','Acciones'], 'lote-tbody')}`;
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
            const estado = l.estado || 'ACTIVO';
            const accionesBtns = canW ? `
                <button class="btn-icon btn-icon--edit" onclick="lotesPage._openForm(${l.id})">Editar</button>
                ${estado === 'ACTIVO' ? `<button class="btn-icon btn-icon--success" onclick="lotesPage._iniciar(${l.id})">Iniciar producción</button>` : ''}
                ${estado === 'EN_PRODUCCION' ? `<button class="btn-icon btn-icon--warning" onclick="lotesPage._cosechar(${l.id})">Registrar cosecha</button>` : ''}
                <button class="btn-icon btn-icon--delete" onclick="lotesPage._delete(${l.id})">Eliminar</button>` : '';
            // Buscar lugar en cache
            const lugar = this._lugares ? this._lugares.find(lg => lg.id === l.idLugar) : null;
            return `<tr>
                <td><span class="row-num">${i+1}</span></td>
                <td><strong>${l.nombre||l.numero||'Lote #'+l.id}</strong>${l.numero ? `<br><code style="font-size:0.72rem">${l.numero}</code>` : ''}</td>
                <td>
                    <div><strong>${l.cultivoNombre||l.cultivo?.nombreComun||'—'}</strong></div>
                    ${lugar ? `<small class="text-muted">${lugar.nombre}</small>` : (l.lugarNombre ? `<small class="text-muted">${l.lugarNombre}</small>` : '')}
                </td>
                <td>${l.area||l.areaHectareas||'—'} ha</td>
                <td>${this.badgeEstado(estado)}</td>
                ${this.actionsCell(`lot-${l.id}`, accionesBtns)}
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
                        <option value="ACTIVO" ${(v.estado||'ACTIVO')==='ACTIVO'?'selected':''}>Activo (preparado)</option>
                        <option value="EN_PRODUCCION" ${v.estado==='EN_PRODUCCION'?'selected':''}>En Producción</option>
                        <option value="COSECHADO" ${v.estado==='COSECHADO'?'selected':''}>Cosechado</option>
                        <option value="INACTIVO" ${v.estado==='INACTIVO'?'selected':''}>Inactivo</option>
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
            ${this.pageShell('Catálogo de Plagas','','Registro de plagas asociadas a cultivos',
                canW ? `<button class="btn btn-primary" id="btn-new-plaga">+ Nueva Plaga</button>` : '')}
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
        if (tbody) tbody.innerHTML = this.skeletonRows(5);
        try { this._data = await territorialModule.getPlagas({}); this._render(this._data); }
        catch(e) { if(tbody) tbody.innerHTML = this.errorRow(5, this._err(e,'Error al cargar datos')); }
    }

    _render(data) {
        const tbody = document.getElementById('plaga-tbody');
        if (!tbody) return;
        if (!data.length) { tbody.innerHTML = this.emptyRow(5, 'No hay plagas en el catálogo'); return; }
        const canW = R.canWrite('plagas');
        tbody.innerHTML = data.map((p,i) => {
            // Buscar cultivo en cache usando idCultivo
            const cult = this._cultivos.find(c => c.id === (p.idCultivo || p.cultivo?.id));
            const cultivoLabel = cult ? `${cult.nombreComun||cult.nombreVariedad||'Cultivo'}` : (p.idCultivo ? `Cultivo #${p.idCultivo}` : '—');
            return `<tr>
                <td><span class="row-num">${i+1}</span></td>
                <td><strong>${p.nombreComun||p.nombre||'—'}</strong></td>
                <td><em class="text-muted">${p.nombreCientifico||'—'}</em></td>
                <td><span class="chip">${cultivoLabel}</span></td>
                ${canW ? this.actionsCell(`plg-${p.id}`, `
                    <button class="btn-icon btn-icon--edit" onclick="plagasPage._openForm(${p.id})">Editar</button>
                    <button class="btn-icon btn-icon--delete" onclick="plagasPage._delete(${p.id})">Eliminar</button>
                `) : '<td></td>'}
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
                <select class="form-control" id="f-cultivo-plaga"><option value="">— Seleccione el cultivo afectado —</option>${culOpts}</select>
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

// ─── INSPECCIONES PAGE ────────────────────────────────────────────────────────
// Flujo (casos de uso InformacionImportante.docx):
//   PRODUCTOR → Programa inspección (PROGRAMADA)
//   ADMIN ICA  → Aprueba/Asigna al asistente (→ EN_PROCESO)
//   ASISTENTE  → Ve su agenda, ejecuta conteo (→ PENDIENTE_REVISION)
//   ADMIN ICA  → Aprueba informe final (→ COMPLETADA)

class InspeccionesPage extends BasePage {
    constructor() { super('inspecciones'); this._data = []; this._lotes = []; }

    async render(container) {
        const role = R.role();
        // El ASISTENTE TÉCNICO ve su AGENDA directamente
        if (role === 'ASISTENTE_TECNICO') {
            return this._renderAgenda(container);
        }
        // El PRODUCTOR ve su panel de solicitud de inspecciones
        if (role === 'PRODUCTOR') {
            return this._renderProductor(container);
        }
        // ADMIN y otros: vista completa de gestión
        const canW = R.canWrite('inspecciones');
        container.innerHTML = `
            ${this.pageShell('Inspecciones Fitosanitarias','',
                R.isAdmin() ? 'Aprobar, asignar y gestionar inspecciones hortifrutícolas' : 'Gestión de inspecciones',
                canW ? `<button class="btn btn-primary" id="btn-new-insp">+ Nueva Inspección</button>` : '')}
            <div class="filter-row">
                <select class="form-control form-control--sm" id="filter-estado-insp">
                    <option value="">Todos los estados</option>
                    <option value="PROGRAMADA">Programada</option>
                    <option value="EN_PROCESO">En Proceso</option>
                    <option value="PENDIENTE_REVISION">Pend. Aprobación ICA</option>
                    <option value="APROBADA">Aprobadas</option>
                    <option value="COMPLETADA">Aprobada</option>
                    <option value="CANCELADA">Cancelada</option>
                </select>
                ${this.searchBarHTML('Buscar por código ICA, lote...')}
            </div>
            <div class="stats-mini" id="insp-stats"></div>
            ${this.tableWrap(['#','Fecha / Código ICA','Lote / Tipo','Estado','Acciones'], 'insp-tbody')}`;
        if (canW) document.getElementById('btn-new-insp')?.addEventListener('click', () => this._openForm());
        await this._loadLotes();
        await this._load();
        document.getElementById('filter-estado-insp')?.addEventListener('change', e => this._load(e.target.value || null));
        this.bindSearch(() => this._data, d => this._render(d));
    }

    // ── VISTA PRODUCTORA: Solicitar nueva inspección ─────────────────────────
    async _renderProductor(container) {
        await this._loadLotes();
        container.innerHTML = `
            ${this.pageShell('Mis Inspecciones','','Solicita y consulta inspecciones fitosanitarias',
                `<button class="btn btn-primary" id="btn-solicitar">Solicitar Inspección</button>`)}
            <div class="stats-mini" id="insp-stats"></div>
            ${this.tableWrap(['#','Fecha / Código','Lote / Cultivo / Tipo','Estado',''], 'insp-tbody')}`;
        document.getElementById('btn-solicitar')?.addEventListener('click', () => this._openForm());
        await this._load();
    }

    // ── VISTA ASISTENTE: Agenda de inspecciones asignadas ────────────────────
    async _renderAgenda(container) {
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header__left">
                    <div class="page-header__icon"></div>
                    <div>
                        <h1 class="page-header__title">Mi Agenda de Campo</h1>
                        <p class="page-header__subtitle">Inspecciones fitosanitarias hortifrutícolas asignadas</p>
                    </div>
                </div>
            </div>
            <div class="stats-mini" id="insp-stats"></div>
            <div id="agenda-container"><div class="loading-screen"><div class="spinner"></div><p>Cargando agenda...</p></div></div>`;
        await Promise.all([
            this._loadLotes(),
            this._loadGeoData()  // Cargar datos geográficos para la cadena de ubicación
        ]);
        await this._load();
    }

    async _loadGeoData() {
        try {
            const [lugares, predios, munis, deps] = await Promise.all([
                territorialModule.getLugares().catch(() => []),
                territorialModule.getPredios().catch(() => []),
                territorialModule.getMunicipios().catch(() => []),
                territorialModule.getDepartamentos().catch(() => [])
            ]);
            this._lugares  = lugares;
            this._predios  = predios;
            this._munis    = munis;
            this._deps     = deps;
        } catch {}
    }

    // Resolver cadena de ubicación a partir de un loteId
    _resolverUbicacion(loteId) {
        if (!loteId) return null;
        const lote   = this._lotes.find(l => l.id === loteId);
        if (!lote) return null;
        const lugar  = (this._lugares||[]).find(lg => lg.id === lote.idLugar);
        const predio = lugar ? (this._predios||[]).find(p => p.lugarProduccionId === lugar.id) : null;
        const muni   = predio ? (this._munis||[]).find(m => m.id === predio.municipioId) : null;
        const dep    = muni ? (this._deps||[]).find(d => d.id === muni.departamentoId) : null;
        return { lote, lugar, predio, muni, dep };
    }

    _renderAgendaCards(data) {
        const agendaEl = document.getElementById('agenda-container');
        if (!agendaEl) return;
        // Solo mostrar las inspecciones activas del asistente
        const activas = data.filter(i => ['PROGRAMADA','EN_PROCESO','COMPLETADA','PENDIENTE_REVISION'].includes(i.estado));
        if (!activas.length) {
            agendaEl.innerHTML = `<div class="empty-state"><div class="empty-state__icon"></div><h4>Sin inspecciones pendientes</h4><p>No tienes inspecciones asignadas por el momento</p></div>`;
            return;
        }
        // Agrupar por fecha
        const porFecha = activas.reduce((acc, i) => {
            const f = i.fechaInspeccion || 'Sin fecha';
            if (!acc[f]) acc[f] = [];
            acc[f].push(i);
            return acc;
        }, {});
        const estadoColor = { PROGRAMADA:'agenda-card--azul', EN_PROCESO:'agenda-card--verde', COMPLETADA:'agenda-card--amarillo', PENDIENTE_REVISION:'agenda-card--amarillo' };
        const estadoIcon  = { PROGRAMADA:'', EN_PROCESO:'', COMPLETADA:'', PENDIENTE_REVISION:'' };
        agendaEl.innerHTML = Object.entries(porFecha).sort(([a],[b])=>a.localeCompare(b)).map(([fecha, insps]) => {
            const fechaFmt = fecha !== 'Sin fecha' ? new Date(fecha+'T00:00:00').toLocaleDateString('es-CO',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : 'Sin fecha asignada';
            return `
            <div class="agenda-grupo">
                <div class="agenda-fecha-header">${fechaFmt}</div>
                <div class="agenda-cards-grid">
                    ${insps.map(insp => {
                        const id = insp.idInspeccion || insp.id;
                        const loteId = insp.idLote || insp.loteId;
                        // Intentar resolver ubicación completa desde el cache de lotes
                        const ubi = this._resolverUbicacion(loteId);
                        const loteInfo = ubi?.lote || null;
                        const clase    = estadoColor[insp.estado] || 'agenda-card--azul';
                        const icon     = estadoIcon[insp.estado] || '';
                        const tipo     = insp.tipo || insp.tipoInspeccion || 'Rutinaria';
                        const codigo   = insp.numeroInspeccion || insp.codigoIca || ('INSP-' + id);
                        return `
                        <div class="agenda-card ${clase}" onclick="inspeccionDetallePage.render(document.getElementById('page-content'), ${id})">
                            <div class="agenda-card__header">
                                <span class="agenda-card__icon">${icon}</span>
                                <span class="agenda-card__code">${codigo}</span>
                                ${this.badgeEstado(insp.estado)}
                            </div>
                            <!-- Cultivo y lote -->
                            <div class="agenda-card__lote">
                                ${loteInfo
                                    ? `<strong>${loteInfo.nombre}</strong><span class="text-muted"> — ${loteInfo.cultivoNombre||'Cultivo hortifrutícola'}</span>`
                                    : `<strong>Inspección ${tipo}</strong>`
                                }
                            </div>
                            <!-- CADENA DE UBICACIÓN en la tarjeta de agenda -->
                            ${ubi ? `
                            <div class="agenda-card__ubicacion">
                                ${ubi.dep ? `<div class="agenda-ubi-row"><span>Dep.:</span><span>${ubi.dep.nombre}</span></div>` : ''}
                                ${ubi.muni ? `<div class="agenda-ubi-row"><span>Mun.:</span><span>${ubi.muni.nombre}</span></div>` : ''}
                                ${ubi.predio?.vereda ? `<div class="agenda-ubi-row"><span>Vereda:</span><span>${ubi.predio.vereda}</span></div>` : ''}
                                ${ubi.lugar ? `<div class="agenda-ubi-row"><span>Lugar:</span><span>${ubi.lugar.nombre}</span></div>` : ''}
                            </div>` : `
                            <div class="agenda-card__ubicacion" style="color:#aab4be;font-size:0.75rem;padding:6px 0">
                                Registre el conteo para ver la ubicación
                            </div>`}
                            <div class="agenda-card__tipo">
                                <span class="chip chip--xs">${tipo}</span>
                            </div>
                            ${insp.estado === 'EN_PROCESO' ? `
                            <div class="agenda-card__actions" style="flex-direction:column;gap:6px">
                                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); inspeccionDetallePage.render(document.getElementById('page-content'), ${id})">
                                    1. Registrar Conteo de Plantas
                                </button>
                                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); inspeccionesPage._completarCampo(${id})">
                                    2. Completar Trabajo de Campo
                                </button>
                            </div>` : insp.estado === 'PROGRAMADA' ? `
                            <div class="agenda-card__actions">
                                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); inspeccionesPage._iniciar(${id})">
                                    Comenzar Inspección
                                </button>
                            </div>` : insp.estado === 'COMPLETADA' ? `
                            <div class="agenda-card__actions">
                                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); inspeccionesPage._enviarRevision(${id})">
                                    Enviar a Admin ICA
                                </button>
                            </div>` : ''}
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }).join('');
    }

    async _loadLotes() {
        this._lotes = await territorialModule.getLotes().catch(() => []);
    }

    async _load(estado = null) {
        const tbody = document.getElementById('insp-tbody');
        if (tbody) tbody.innerHTML = this.skeletonRows(5);
        try {
            const ep = estado ? Endpoints.INSPECCIONES.BY_ESTADO(estado) : Endpoints.INSPECCIONES.LIST;
            const res = await apiInspecciones.get(ep);
            this._data = Array.isArray(res) ? res : (res?.data ?? res?.content ?? []);

            // Resolver idLote desde detalles (nuevo esquema: idLote está en DETALLE_INSPECCION)
            // Solo para inspecciones sin idLote directo
            const sinLote = this._data.filter(i => !i.idLote && !i.loteId);
            if (sinLote.length > 0) {
                await Promise.all(sinLote.map(async insp => {
                    try {
                        const dets = await apiInspecciones.get(
                            Endpoints.INSPECCIONES.DETALLES.LIST(insp.idInspeccion || insp.id)
                        ).catch(() => []);
                        const lst = Array.isArray(dets) ? dets : [];
                        const loteIdFromDet = lst.find(d => d.idLote)?.idLote || null;
                        if (loteIdFromDet) insp._loteId = loteIdFromDet;
                    } catch(_) {}
                }));
            }

            this._renderStats();
            if (R.isAT()) {
                this._renderAgendaCards(this._data);
            } else {
                this._render(this._data);
            }
        } catch(e) {
            if(tbody) tbody.innerHTML = this.errorRow(5, this._err(e,'Error al cargar datos'));
            const agendaEl = document.getElementById('agenda-container');
            if (agendaEl) agendaEl.innerHTML = `<div class="error-state"><p>Error al cargar agenda</p></div>`;
        }
    }

    _renderStats() {
        const el = document.getElementById('insp-stats');
        if (!el) return;
        const counts = this._data.reduce((acc, i) => { acc[i.estado] = (acc[i.estado]||0)+1; return acc; }, {});
        // Flujo: PROGRAMADA → EN_PROCESO → PENDIENTE_REVISION → COMPLETADA
        el.innerHTML = `
            <div class="stat-mini"><span class="stat-mini__val">${this._data.length}</span><span class="stat-mini__lbl">Total</span></div>
            <div class="stat-mini stat-mini--warning"><span class="stat-mini__val">${counts.PROGRAMADA||0}</span><span class="stat-mini__lbl">Programadas</span></div>
            <div class="stat-mini stat-mini--info"><span class="stat-mini__val">${counts.EN_PROCESO||0}</span><span class="stat-mini__lbl">En Proceso</span></div>
            <div class="stat-mini stat-mini--danger"><span class="stat-mini__val">${counts.PENDIENTE_REVISION||0}</span><span class="stat-mini__lbl">Pend. Revisión</span></div>
            <div class="stat-mini stat-mini--success"><span class="stat-mini__val">${counts.APROBADA||0}</span><span class="stat-mini__lbl">Aprobadas</span></div>`;
    }

    _render(data) {
        const tbody = document.getElementById('insp-tbody');
        if (!tbody) return;
        if (!data.length) { tbody.innerHTML = this.emptyRow(5, 'No hay inspecciones registradas'); return; }
        const canW = R.canWrite('inspecciones');
        const isAdmin = R.isAdmin();
        tbody.innerHTML = data.map((insp,i) => {
            const fecha = insp.fechaInspeccion ? new Date(insp.fechaInspeccion).toLocaleDateString('es-CO') : '—';
            const estado = insp.estado || 'PROGRAMADA';
            const inspId = insp.idInspeccion || insp.id;

            // Flujo de acciones según casos de uso:
            // Asistente/Admin: PROGRAMADA→iniciar, EN_PROCESO→enviar a revisión
            // Admin ICA: PENDIENTE_REVISION→aprobar, COMPLETADA→generar informe
            const isAT = R.isAT();
            const isProd = R.role() === 'PRODUCTOR';
            // ── Flujo real del backend:
            // PROGRAMADA → [iniciar] → EN_PROCESO → [completar] → COMPLETADA
            //            → [revision] → PENDIENTE_REVISION (Admin revisa)
            // Admin puede cancelar en cualquier estado activo
            const acciones = `
                <button class="btn-icon btn-icon--info" title="Ver detalle / Conteo" onclick="inspeccionDetallePage.render(document.getElementById('page-content'), ${inspId})">Ver</button>
                ${(isAdmin || isAT) && estado === 'PROGRAMADA' ? `<button class="btn-icon btn-icon--success" title="Iniciar — el Asistente comienza la inspección" onclick="inspeccionesPage._iniciar(${inspId})">Iniciar</button>` : ''}
                ${(isAdmin || isAT) && estado === 'EN_PROCESO' ? `<button class="btn-icon btn-icon--primary" title="Completar trabajo de campo" onclick="inspeccionesPage._completarCampo(${inspId})">Completar</button>` : ''}
                ${(isAdmin || isAT) && estado === 'COMPLETADA' ? `<button class="btn-icon btn-icon--warning" title="Enviar a revisión del Administrador ICA" onclick="inspeccionesPage._enviarRevision(${inspId})" style="background:#fff8e1;color:#e65100">Enviar</button>` : ''}
                ${isAdmin && estado === 'PENDIENTE_REVISION' ? `<button class="btn-icon btn-icon--success" title="Aprobar inspección" onclick="inspeccionesPage._aprobarInspeccion(${inspId})" style="background:#e8f5e9;color:#2e7d32;font-weight:700">Aprobar</button>` : ''}
                ${isAdmin && estado === 'PENDIENTE_REVISION' ? `<button class="btn-icon btn-icon--warning" title="Devolver al AT para corrección" onclick="inspeccionesPage._devolver(${inspId})" style="background:#fff8e1;color:#e65100">Devolver</button>` : ''}
                ${isAdmin && (estado === 'APROBADA') ? `<button class="btn-icon btn-icon--info" title="Generar informe oficial" onclick="inspeccionesPage._generarInforme(${inspId})" style="background:#e3f2fd;color:#1565c0">Informe</button>` : ''}
                ${(isAdmin || (isProd && estado === 'PROGRAMADA')) ? `<button class="btn-icon btn-icon--delete" title="Cancelar" onclick="inspeccionesPage._cancelar(${inspId})" ${(estado==='PENDIENTE_REVISION'||estado==='COMPLETADA')&&!isAdmin?'style="display:none"':''}>Cancelar</button>` : ''}`;

            // Resaltar fila si está pendiente de aprobación
            const rowClass = estado === 'PENDIENTE_REVISION' ? 'style="background:#fff8e1"'
                          : estado === 'APROBADA'            ? 'style="background:#f1f8e9"' : '';

            // Buscar info del lote (nuevo esquema: idLote puede venir de _loteId resuelto desde detalles)
            const _lid = insp.idLote || insp.loteId || insp._loteId;
            const loteInfo = _lid ? this._lotes.find(l => l.id === _lid) : null;
            const loteNombre = loteInfo
                ? `<strong>${loteInfo.nombre || 'Lote #'+loteInfo.id}</strong>`
                : `<span style="color:#aab4be">Sin lote asignado</span>`;
            const cultivoNombre = loteInfo?.cultivoNombre
                ? `<small class="text-muted">${loteInfo.cultivoNombre}</small>`
                : '';
            const tipoChip = `<span class="chip chip--xs" style="margin-top:2px">${insp.tipoInspeccion||insp.tipo||'Rutinaria'}</span>`;

            return `<tr ${rowClass}>
                <td><span class="row-num">${i+1}</span></td>
                <td style="white-space:nowrap">${fecha}<br><code style="font-size:0.7rem;color:#6b7a8d">${insp.numeroInspeccion||insp.codigoIca||'—'}</code></td>
                <td>${loteNombre}${cultivoNombre ? '<br>'+cultivoNombre : ''}<br>${tipoChip}</td>
                <td>${this.badgeEstado(estado)}</td>
                ${this.actionsCell(`insp-${inspId}`, acciones)}
            </tr>`;
        }).join('');
    }

    async _iniciar(id) {
        if (!confirm('¿Iniciar esta inspección fitosanitaria?')) return;
        try { await apiInspecciones.patch(Endpoints.INSPECCIONES.INICIAR(id)); Notify.success('Inspección iniciada'); await this._load(); } catch(e) { this._err(e,'No se pudo iniciar la inspección'); }
    }

    // Paso 2: Asistente completa el trabajo de campo (EN_PROCESO → COMPLETADA)
    // REQUISITO BACKEND: debe tener al menos un detalle (conteo de plantas) registrado
    async _completarCampo(id) {
        try {
            // Verificar si hay detalles registrados
            const detalles = await apiInspecciones.get(Endpoints.INSPECCIONES.DETALLES.LIST(id)).catch(() => []);
            const lista = Array.isArray(detalles) ? detalles : (detalles?.data ?? detalles?.content ?? []);
            if (!lista.length) {
                Notify.warning('Debe registrar al menos un conteo de plantas antes de completar. Use el botón "Conteo de Plantas en Vivo".');
                return;
            }
            if (!confirm(`¿Completar trabajo de campo?\n\n${lista.length} conteo(s) registrado(s).\nEl Asistente Técnico no podrá modificar más datos después de completar.`)) return;
            await apiInspecciones.patch(Endpoints.INSPECCIONES.COMPLETAR(id));
            Notify.success('Trabajo de campo completado — listo para enviar al Admin ICA');
            await this._load();
        } catch(e) { this._err(e,'No se pudo completar la inspección'); }
    }

    // Paso 3: Asistente/Admin envía a revisión del Admin ICA (COMPLETADA → PENDIENTE_REVISION)
    async _enviarRevision(id) {
        if (!confirm('¿Enviar esta inspección al Administrador ICA para revisión y aprobación oficial?')) return;
        try { await apiInspecciones.patch(Endpoints.INSPECCIONES.REVISION(id)); Notify.success('Inspección enviada al Administrador ICA para revisión'); await this._load(); } catch(e) { this._err(e,'No se pudo enviar a revisión — verifique que el trabajo de campo esté completado primero'); }
    }

    // Devolver para corrección (Admin devuelve al Asistente → EN_PROCESO)
    async _devolver(id) {
        if (!confirm('¿Devolver esta inspección al Asistente Técnico para corrección?\nEl estado volverá a EN_PROCESO y el AT podrá añadir más datos.')) return;
        try {
            await apiInspecciones.patch(Endpoints.INSPECCIONES.DEVOLVER(id));
            Notify.warning('Inspección devuelta al Asistente Técnico para corrección');
            await this._load();
        } catch(e) { this._err(e,'No se pudo devolver la inspección'); }
    }

    // Aprobar inspección (Admin ICA: PENDIENTE_REVISION → APROBADA)
    async _aprobarInspeccion(id) {
        // Cargar datos de la inspección para mostrar resumen
        let insp, detalles = [];
        try {
            [insp, detalles] = await Promise.all([
                apiInspecciones.get(Endpoints.INSPECCIONES.GET(id)),
                apiInspecciones.get(Endpoints.INSPECCIONES.DETALLES.LIST(id)).catch(() => [])
            ]);
        } catch(e) { this._err(e,'No se pudo cargar la inspección'); return; }

        const det = Array.isArray(detalles) ? detalles : [];
        const totalPlantas = det.reduce((s, d) => s + (d.totalPlantas || 0), 0);
        const loteInfo = (this._lotes||[]).find(l => l.id === (insp.idLote || insp.loteId));

        // Cargar plagas de cada detalle en paralelo
        const plagasPorDet = await Promise.all(
            det.map(d => apiInspecciones.get(Endpoints.INSPECCIONES.DETALLES.PLAGAS.LIST(d.idDetalle)).catch(() => []))
        );
        const todasPlagas = plagasPorDet.flat();
        const totalAfect = todasPlagas.reduce((s, p) => s + (p.plantasAfectadas || 0), 0);
        const pctIncid = totalPlantas > 0 ? ((totalAfect / totalPlantas) * 100).toFixed(1) : '0.0';
        const nivelIncid = parseFloat(pctIncid) >= 20 ? 'ALTA' : parseFloat(pctIncid) >= 10 ? 'MEDIA' : 'BAJA';
        const colorIncid = parseFloat(pctIncid) >= 20 ? '#ef5350' : parseFloat(pctIncid) >= 10 ? '#ffa726' : '#66bb6a';

        const plagasResumen = todasPlagas.length === 0
            ? `<p style="color:#888;font-size:0.83rem">Sin plagas registradas</p>`
            : todasPlagas.map(p => {
                const inc = totalPlantas > 0 ? ((p.plantasAfectadas / totalPlantas) * 100).toFixed(1) : '0.0';
                const col = parseFloat(inc) >= 20 ? '#ef5350' : parseFloat(inc) >= 10 ? '#ffa726' : '#66bb6a';
                return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0;font-size:0.82rem">
                    <span>${p.nombrePlaga || 'Plaga #'+p.idPlaga}</span>
                    <span style="color:${col};font-weight:700">${inc}% (${p.plantasAfectadas} plantas)</span>
                </div>`;
            }).join('');

        const bodyHtml = `
            <div style="background:#f8fffe;border:1px solid #c8e6c9;border-radius:8px;padding:14px;margin-bottom:14px">
                <div style="font-size:0.78rem;color:#388e3c;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Resumen de la Inspección</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.83rem">
                    <div><strong>Lote:</strong> ${loteInfo ? (loteInfo.nombre + ' — ' + (loteInfo.cultivoNombre||'Cultivo')) : ('Lote #'+(insp.idLote||'—'))}</div>
                    <div><strong>AT responsable:</strong> ${insp.nombreInspector || '—'}</div>
                    <div><strong>Muestreos realizados:</strong> ${det.length}</div>
                    <div><strong>Total plantas:</strong> ${totalPlantas}</div>
                    <div><strong>Incidencia general:</strong> <span style="color:${colorIncid};font-weight:700">${pctIncid}% — ${nivelIncid}</span></div>
                    <div><strong>Plagas detectadas:</strong> ${todasPlagas.length}</div>
                </div>
            </div>
            ${todasPlagas.length > 0 ? `<div style="margin-bottom:10px"><div style="font-size:0.75rem;font-weight:700;color:#6b7a8d;text-transform:uppercase;margin-bottom:4px">Plagas Registradas</div>${plagasResumen}</div>` : ''}
            <div class="form-group" style="margin-top:10px">
                <label style="font-weight:600">Observaciones de aprobación <span style="color:#888;font-weight:400">(opcional)</span></label>
                <textarea class="form-control" id="f-obs-aprobacion" rows="2" placeholder="Conforme con los resultados del muestreo fitosanitario..."></textarea>
            </div>
            <div style="background:#fff3e0;border-radius:6px;padding:10px;font-size:0.8rem;color:#e65100;margin-top:8px">
                Al aprobar, la inspección queda registrada como <strong>APROBADA</strong> y no podrá modificarse.
            </div>`;

        this.modal.open('Aprobar Inspección Fitosanitaria', bodyHtml, async () => {
            try {
                await apiInspecciones.patch(Endpoints.INSPECCIONES.APROBAR(id));
                Notify.success('Inspección aprobada oficialmente por el Administrador ICA');
                this.modal.close();
                await this._load();
            } catch(e) { this.modal.setError(e.message || 'Error al aprobar la inspección'); }
        });
        // Personalizar botón de confirmación
        setTimeout(() => {
            const btn = document.querySelector('#modal-generic .btn-save');
            if (btn) { btn.textContent = 'Aprobar Oficialmente'; btn.style.cssText += ';background:#2e7d32 !important;border-color:#2e7d32 !important'; }
        }, 30);
    }

    // Generar Informe (Admin ICA, inspección APROBADA) — genera el informe directamente
    async _generarInforme(inspId) {
        Notify.info('Cargando informe de inspección...');
        // Navegar a reportes y auto-generar el informe de esa inspección
        await loadPage('reportes');
        setTimeout(() => {
            if (window.reportesPage) reportesPage._generarParaInspeccion(inspId);
        }, 400);
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
        const loteOpts = this._lotes.map(l =>
            `<option value="${l.id}">${l.nombre||'Lote '+l.id} — ${l.cultivoNombre||'Cultivo'} (${l.estado})</option>`
        ).join('');
        let v = {};
        if (id) { try { v = await apiInspecciones.get(Endpoints.INSPECCIONES.GET(id)); } catch(e) { this._err(e,'Error al cargar datos'); } }
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const isProductor = R.role() === 'PRODUCTOR';
        const isAdmin = R.role() === 'ADMINISTRADOR';

        // Cargar lista de Asistentes Técnicos para el selector (solo admin)
        let atUsers = [];
        if (isAdmin) {
            try {
                const allUsers = await apiUsuarios.get('/usuarios');
                const lst = Array.isArray(allUsers) ? allUsers : (allUsers?.content || allUsers?.data || []);
                atUsers = lst.filter(u => (u.grupos||[]).some(g => (g.nombre||g) === 'ASISTENTE_TECNICO'));
            } catch(_) { /* sin AT disponibles */ }
        }
        const atOpts = atUsers.map(u =>
            `<option value="${u.id}|${(u.nombre||'').replace(/['"]/g,'')}|${u.numeroIdentificacion||''}" ${v.nombreInspector === u.nombre ? 'selected' : ''}>${u.nombre} — ${u.correo}</option>`
        ).join('');

        const body = `
            <div class="form-row">
                <div class="form-group"><label>Fecha Programada</label><input class="form-control" id="f-fecha" type="date" value="${v.fechaInspeccion||new Date().toISOString().split('T')[0]}"></div>
                <div class="form-group"><label>Tipo de Inspección</label>
                    <select class="form-control" id="f-tipo">
                        <option value="RUTINARIA" ${(v.tipoInspeccion||'RUTINARIA')==='RUTINARIA'?'selected':''}>Rutinaria (control periódico)</option>
                        <option value="EMERGENCIA" ${v.tipoInspeccion==='EMERGENCIA'?'selected':''}>Emergencia (daño urgente)</option>
                        <option value="SEGUIMIENTO" ${v.tipoInspeccion==='SEGUIMIENTO'?'selected':''}>Seguimiento (post-tratamiento)</option>
                        <option value="CUARENTENA" ${v.tipoInspeccion==='CUARENTENA'?'selected':''}>Cuarentena (aislamiento)</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Lote a Inspeccionar <span style="color:red">*</span></label>
                <select class="form-control" id="f-lote"><option value="">— Seleccione el lote del cultivo —</option>${loteOpts}</select>
            </div>
            ${isAdmin ? `
            <div class="form-group">
                <label>Asistente Técnico Asignado ${atUsers.length === 0 ? '<span style="color:#e65100;font-size:0.78rem">(ningún AT registrado)</span>' : ''}</label>
                ${atUsers.length > 0
                    ? `<select class="form-control" id="f-at-selector">
                        <option value="">— Asignar AT (opcional por ahora) —</option>
                        ${atOpts}
                       </select>
                       <small style="color:#6b7a8d">El AT podrá iniciar la inspección una vez asignado.</small>`
                    : `<div style="padding:10px;background:#fff3e0;border-radius:6px;font-size:0.82rem;color:#e65100">
                        No hay Asistentes Técnicos registrados. Puede registrar inspecciones sin asignar AT por ahora.
                       </div>`
                }
            </div>` : `
            <div style="padding:10px;background:#e8f5e9;border-radius:8px;margin:8px 0;font-size:0.83rem;color:#2e7d32">
                El Administrador ICA asignará el Asistente Técnico responsable de esta inspección.
            </div>`}
            <div class="form-group"><label>${isProductor ? 'Motivo / Problema observado' : 'Observaciones'}</label>
                <textarea class="form-control" id="f-obs" rows="3" placeholder="${isProductor ? 'Describa el problema observado en el cultivo...' : 'Instrucciones de campo, condiciones especiales...'}">${v.observaciones||''}</textarea>
            </div>`;

        const titulo = isProductor ? 'Solicitar Inspección Fitosanitaria' : (id ? 'Editar Inspección' : 'Programar Inspección');
        this.modal.open(titulo, body, async () => {
            // Resolver AT seleccionado (si aplica)
            let nombreInspector = 'Pendiente asignación';
            let cedulaInspector = 'PENDIENTE';
            if (isAdmin) {
                const selAT = document.getElementById('f-at-selector')?.value;
                if (selAT) {
                    const [, nombre, cedula] = selAT.split('|');
                    nombreInspector = nombre || 'Pendiente asignación';
                    cedulaInspector = cedula || 'PENDIENTE';
                }
            } else if (isProductor) {
                nombreInspector = user.nombre || 'Pendiente asignación';
            }
            const data = {
                fechaInspeccion: document.getElementById('f-fecha')?.value,
                tipoInspeccion: document.getElementById('f-tipo')?.value,
                estado: v.estado || 'PROGRAMADA',
                idLote: parseInt(document.getElementById('f-lote')?.value),
                nombreInspector,
                cedulaInspector,
                observaciones: document.getElementById('f-obs')?.value?.trim()
            };
            if (!data.idLote) { this.modal.setError('Debe seleccionar un lote'); return; }
            if (!data.fechaInspeccion) { this.modal.setError('La fecha es obligatoria'); return; }
            try {
                if (id) await apiInspecciones.put(Endpoints.INSPECCIONES.UPDATE(id), data);
                else await apiInspecciones.post(Endpoints.INSPECCIONES.CREATE, data);
                Notify.success(isProductor ? 'Solicitud enviada — el Administrador ICA la revisará' : (atUsers.length > 0 && document.getElementById('f-at-selector')?.value ? 'Inspección programada y AT asignado' : 'Inspección programada'));
                this.modal.close(); await this._load();
            } catch(e) { this.modal.setError(e.message); }
        });
        if (v.idLote) setTimeout(() => { const s = document.getElementById('f-lote'); if(s) s.value = v.idLote; }, 50);
    }
}

// ─── INSPECCIÓN DETALLE PAGE ──────────────────────────────────────────────────
// Conteo en vivo de plantas y plagas para cultivos hortifrutícolas
// Flujo: ver detalle + widget de conteo fitosanitario interactivo

class InspeccionDetallePage extends BasePage {
    constructor() {
        super('inspeccion-detalle');
        this._inspeccion = null;
        this._detalles = [];
        this._plagasCatalogo = [];
        this._loteInfo = null;
        // Estado en vivo del conteo (en memoria, se guarda al confirmar)
        this._conteoVivo = { totalPlantas: 0, plagas: [] };
    }

    async render(container, inspeccionId) {
        container.innerHTML = `<div class="loading-screen"><div class="spinner"></div><p>Cargando inspección fitosanitaria...</p></div>`;
        try {
            const [insp, detalles, plagas, lotes] = await Promise.all([
                apiInspecciones.get(Endpoints.INSPECCIONES.GET(inspeccionId)),
                apiInspecciones.get(Endpoints.INSPECCIONES.DETALLES.LIST(inspeccionId)).catch(() => []),
                territorialModule.getPlagas({}).catch(() => []),
                territorialModule.getLotes().catch(() => [])
            ]);
            this._inspeccion = insp;
            this._detalles = Array.isArray(detalles) ? detalles : (detalles?.data ?? detalles?.content ?? []);
            this._plagasCatalogo = plagas;
            this._lotesDisponibles = lotes; // Guardar todos los lotes para el selector
            // Encontrar info del lote si la inspección lo tiene
            this._loteInfo = lotes.find(l => l.id === (insp.idLote || insp.loteId)) || null;

            // Cargar plagas de cada detalle guardado (en paralelo)
            if (this._detalles.length > 0) {
                const plagasPorDetalle = await Promise.all(
                    this._detalles.map(det =>
                        apiInspecciones.get(
                            Endpoints.INSPECCIONES.DETALLES.PLAGAS.LIST(det.idDetalle || det.id)
                        ).catch(() => [])
                    )
                );
                this._detalles.forEach((det, i) => {
                    det._plagas = Array.isArray(plagasPorDetalle[i]) ? plagasPorDetalle[i] : [];
                });
            }

            this._renderDetalle(container, inspeccionId);
        } catch(e) {
            container.innerHTML = `<div class="error-state"><h3>Error al cargar inspección</h3><p>${e.message}</p><button class="btn btn-secondary" onclick="loadPage('inspecciones')">← Volver</button></div>`;
        }
    }

    _renderDetalle(container, inspeccionId) {
        const insp = this._inspeccion;
        const canW = R.canWrite('inspecciones') && (insp.estado === 'EN_PROCESO');
        const canView = true;
        const fecha = insp.fechaInspeccion ? new Date(insp.fechaInspeccion).toLocaleDateString('es-CO',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : '—';
        const lote = this._loteInfo;
        const inspId = insp.idInspeccion || insp.id;

        // Calcular totales de detalles guardados
        const totalPlantasGuardadas = this._detalles.reduce((s,d) => s+(d.totalPlantas||d.plantasMuestreadas||0), 0);
        const totalAfectadasGuardadas = this._detalles.reduce((s,d) => {
            // sumar plantas afectadas de cada detalle_plaga
            return s + (d.plantasAfectadas || d.plantas_afectadas || 0);
        }, 0);

        container.innerHTML = `
        <!-- Header con info de la inspección -->
        <div class="page-header">
            <div class="page-header__left">
                <button class="btn-back" onclick="loadPage('inspecciones')">← Volver</button>
                <div class="page-header__icon"></div>
                <div>
                    <h1 class="page-header__title">Inspección Fitosanitaria</h1>
                    <p class="page-header__subtitle">${fecha} · ${this.badgeEstado(insp.estado)}</p>
                </div>
            </div>
            <div class="page-header__actions">
                ${canW ? `<button class="btn btn-primary" id="btn-guardar-conteo">Guardar Conteo</button>` : ''}
                ${R.isAT() && insp.estado === 'EN_PROCESO' ? `<button class="btn btn-secondary" onclick="inspeccionesPage._enviarRevision(${inspId});loadPage('inspecciones')">Enviar a Revisión ICA</button>` : ''}
            </div>
        </div>

        <!-- Info del lote/cultivo hortifrutícola -->
        <div class="insp-lote-banner">
            <div class="insp-lote-icon"></div>
            <div class="insp-lote-info">
                <div class="insp-lote-nombre">${lote ? lote.nombre : 'Lote #'+(insp.idLote||'—')}</div>
                <div class="insp-lote-cultivo">Cultivo: <strong>${lote ? (lote.cultivoNombre||'Hortifrutícola') : '—'}</strong></div>
            </div>
            <div class="insp-lote-code">
                <span class="chip">${insp.numeroInspeccion||insp.codigoIca||('INSP-'+inspId)}</span>
                <span class="chip chip--tipo">${insp.tipo||insp.tipoInspeccion||'Rutinaria'}</span>
            </div>
        </div>

        <!-- Stats resumen -->
        <div class="stats-grid stats-grid--4" style="margin:16px 0">
            <div class="stat-card stat-card--green">
                <div class="stat-card__icon"></div>
                <div class="stat-card__body">
                    <div class="stat-card__value" id="live-total-plantas">${totalPlantasGuardadas}</div>
                    <div class="stat-card__label">Plantas Inspeccionadas</div>
                </div>
            </div>
            <div class="stat-card stat-card--red">
                <div class="stat-card__icon"></div>
                <div class="stat-card__body">
                    <div class="stat-card__value" id="live-total-afectadas">${totalAfectadasGuardadas}</div>
                    <div class="stat-card__label">Plantas Afectadas</div>
                </div>
            </div>
            <div class="stat-card stat-card--orange">
                <div class="stat-card__icon"></div>
                <div class="stat-card__body">
                    <div class="stat-card__value" id="live-incidencia">${totalPlantasGuardadas > 0 ? ((totalAfectadasGuardadas/totalPlantasGuardadas)*100).toFixed(1)+'%' : '—'}</div>
                    <div class="stat-card__label">Incidencia Total</div>
                </div>
            </div>
            <div class="stat-card stat-card--blue">
                <div class="stat-card__icon"></div>
                <div class="stat-card__body">
                    <div class="stat-card__value" id="live-num-plagas">${this._detalles.length}</div>
                    <div class="stat-card__label">Plagas Registradas</div>
                </div>
            </div>
        </div>

        <!-- Panel principal de dos columnas -->
        <div class="inspection-panel">

            <!-- Columna izquierda: CONTEO EN VIVO (solo si EN_PROCESO) -->
            <div class="inspection-panel__left">
                ${canW ? `
                <!-- Widget de Conteo en Vivo -->
                <div class="conteo-vivo-panel">
                    <div class="conteo-vivo-header">
                        <h3>Conteo en Vivo — Campo</h3>
                        <span class="chip chip--tipo">Cultivo Hortifrutícola</span>
                    </div>

                    <!-- SELECTOR DE LOTE (requerido por el nuevo esquema) -->
                    <div class="conteo-plantas-total" style="background:#e8f5e9;border-color:#a5d6a7">
                        <label class="conteo-label">Lote a inspeccionar <span style="color:#c62828">*</span></label>
                        <select class="form-control" id="conteo-lote-select" style="font-size:0.9rem;font-weight:600">
                            <option value="">— Seleccione el lote a inspeccionar —</option>
                            ${(this._lotesDisponibles||[]).map(l =>
                                `<option value="${l.id}" ${this._loteInfo?.id===l.id?'selected':''}>
                                    ${l.nombre||'Lote #'+l.id} — ${l.cultivoNombre||'Cultivo'}
                                </option>`
                            ).join('')}
                        </select>
                    </div>

                    <!-- Total de plantas -->
                    <div class="conteo-plantas-total">
                        <label class="conteo-label">Total de plantas inspeccionadas en este muestreo</label>
                        <div class="conteo-input-row">
                            <button class="conteo-btn conteo-btn--minus" onclick="inspeccionDetallePage._cambiarPlantas(-10)">−10</button>
                            <button class="conteo-btn conteo-btn--minus" onclick="inspeccionDetallePage._cambiarPlantas(-1)">−1</button>
                            <input type="number" class="conteo-input-num" id="input-total-plantas" min="0" value="${this._conteoVivo.totalPlantas}" oninput="inspeccionDetallePage._updateTotalPlantas(this.value)">
                            <button class="conteo-btn conteo-btn--plus" onclick="inspeccionDetallePage._cambiarPlantas(1)">+1</button>
                            <button class="conteo-btn conteo-btn--plus" onclick="inspeccionDetallePage._cambiarPlantas(10)">+10</button>
                        </div>
                    </div>

                    <!-- Lista de plagas en conteo vivo -->
                    <div class="conteo-plagas-header">
                        <span>Plagas detectadas y plantas afectadas</span>
                        <button class="btn btn-sm btn-secondary" onclick="inspeccionDetallePage._agregarPlagaConteo()">+ Agregar plaga</button>
                    </div>
                    <div id="conteo-plagas-list">
                        ${this._conteoVivo.plagas.length === 0 ?
                            `<div class="conteo-empty"><p>Selecciona "Agregar plaga" para registrar una plaga detectada</p></div>` :
                            this._renderConteoPlayas()
                        }
                    </div>

                    <!-- Resumen en vivo -->
                    <div class="conteo-resumen" id="conteo-resumen">
                        ${this._renderResumenVivo()}
                    </div>

                    <!-- Observaciones del muestreo -->
                    <div class="form-group" style="margin-top:12px">
                        <label class="conteo-label">Observaciones del muestreo</label>
                        <textarea class="form-control" id="conteo-obs" rows="2" placeholder="Condiciones del cultivo, clima, estado general..."></textarea>
                    </div>
                </div>` : ''}

                <!-- Detalles guardados previamente -->
                <h3 class="panel-title" style="margin-top:${canW?'20px':'0'}">Registros Guardados</h3>
                <div id="detalles-guardados-list">
                    ${this._detalles.length ? this._renderDetallesGuardados() :
                        `<div class="empty-state"><div class="empty-state__icon"></div><p>${canW ? 'Usa el conteo en vivo para registrar el primer muestreo' : 'Sin registros de muestreo'}</p></div>`}
                </div>
            </div>

            <!-- Columna derecha: catálogo de plagas con imágenes -->
            <div class="inspection-panel__right">
                <div class="plaga-counter-panel">
                    <h3 class="panel-title">Guía Visual de Plagas</h3>
                    <p style="font-size:0.78rem;color:#8a94a6;margin-bottom:12px">
                        ${canW ? 'Identifica la plaga y haz clic para agregarla al conteo' : 'Catálogo de plagas hortifrutícolas'}
                    </p>
                    <div id="plaga-catalog-imgs" class="plaga-catalog-list">
                        <div style="text-align:center;padding:12px;color:#8a94a6;font-size:0.8rem">
                            <div class="spinner" style="width:24px;height:24px;margin:0 auto 8px"></div>
                            Cargando imágenes...
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        // Vincular evento guardar
        if (canW) {
            document.getElementById('btn-guardar-conteo')?.addEventListener('click', () => this._guardarConteo(inspeccionId));
        }

        // Cargar imágenes del catálogo de plagas (async, no bloquea el render)
        this._renderCatalogWithImages(canW);
    }

    // ── Carga imágenes de plagas desde Wikipedia ──────────────────────────────
    async _renderCatalogWithImages(canW) {
        const container = document.getElementById('plaga-catalog-imgs');
        if (!container) return;

        const items = await Promise.all(this._plagasCatalogo.map(async p => {
            const riesgo = (p.nivelRiesgo || 'bajo').toLowerCase();
            const riesgoBadge = riesgo === 'alto'
                ? '<span class="plaga-risk-badge plaga-risk-badge--alto">ALTO RIESGO</span>'
                : riesgo === 'medio'
                ? '<span class="plaga-risk-badge plaga-risk-badge--medio">RIESGO MEDIO</span>'
                : '<span class="plaga-risk-badge plaga-risk-badge--bajo">BAJO RIESGO</span>';

            const imgHtml = await PlagaImages.renderImg(p.nombreCientifico, p.tipo, 56);
            const nombre = p.nombreComun || p.nombre || '—';
            const cientifico = p.nombreCientifico || '';
            const onClickAttr = canW
                ? `onclick="inspeccionDetallePage._agregarPlagaDesdeCatalogo(${p.id},'${nombre.replace(/'/g,"\\'")}','${riesgo}')" role="button" tabindex="0"`
                : '';

            return `
            <div class="plaga-card-img ${canW ? 'plaga-card-img--clickable' : ''}" ${onClickAttr}
                 title="${canW ? 'Clic para agregar al conteo' : cientifico}">
                <div class="plaga-card-img__photo">${imgHtml}</div>
                <div class="plaga-card-img__info">
                    <div class="plaga-card-img__nombre">${nombre}</div>
                    <div class="plaga-card-img__cientifico">${cientifico}</div>
                    ${riesgoBadge}
                </div>
                ${canW ? '<div class="plaga-card-img__add">＋</div>' : ''}
            </div>`;
        }));

        container.innerHTML = items.join('') || '<p class="text-muted">Catálogo vacío</p>';
    }

    // ── CONTEO EN VIVO: funciones de actualización ────────────────────────────

    _renderConteoPlayas() {
        return this._conteoVivo.plagas.map((p, idx) => {
            const total = this._conteoVivo.totalPlantas;
            const pct = total > 0 ? ((p.afectadas/total)*100).toFixed(1) : '0.0';
            const riesgoClass = p.riesgo === 'alto' ? 'conteo-plaga--alto' : p.riesgo === 'medio' ? 'conteo-plaga--medio' : 'conteo-plaga--bajo';
            // Buscar imagen en caché (ya cargada por el catálogo)
            const cachedImg = PlagaImages._cache[p.nombreCientifico];
            const imgHtml = cachedImg
                ? `<img src="${cachedImg}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;margin-right:8px;flex-shrink:0" onerror="this.style.display='none'">`
                : `<span style="font-size:1.2rem;margin-right:8px">${PlagaImages._fallbackIcons[p.tipo?.toUpperCase()] || '🐛'}</span>`;
            return `
            <div class="conteo-plaga-row ${riesgoClass}">
                <div class="conteo-plaga-nombre" style="align-items:center">
                    ${imgHtml}
                    <div>
                        <div style="font-weight:600;font-size:0.88rem">${p.nombre}</div>
                        <div style="font-size:0.72rem;color:#6b7a8d">${pct}% incidencia</div>
                    </div>
                </div>
                <div class="conteo-plaga-controls">
                    <button class="conteo-btn conteo-btn--minus" onclick="inspeccionDetallePage._cambiarAfectadas(${idx},-1)">−</button>
                    <input type="number" class="conteo-input-sm" min="0" value="${p.afectadas}"
                           onchange="inspeccionDetallePage._setAfectadas(${idx}, this.value)">
                    <button class="conteo-btn conteo-btn--plus" onclick="inspeccionDetallePage._cambiarAfectadas(${idx},1)">+</button>
                    <span class="conteo-plantas-label">plantas</span>
                    <button class="btn-icon btn-icon--delete" style="width:24px;height:24px;font-size:0.7rem" onclick="inspeccionDetallePage._quitarPlaga(${idx})">✕</button>
                </div>
                <div class="conteo-barra-incidencia">
                    <div class="conteo-barra-fill" style="width:${Math.min(parseFloat(pct),100)}%;background:${p.riesgo==='alto'?'#ef5350':p.riesgo==='medio'?'#ffa726':'#66bb6a'}"></div>
                </div>
            </div>`;
        }).join('');
    }

    _renderResumenVivo() {
        const total = this._conteoVivo.totalPlantas;
        const totalAfect = this._conteoVivo.plagas.reduce((s,p) => s+p.afectadas, 0);
        const pct = total > 0 ? ((totalAfect/total)*100).toFixed(1) : '—';
        const nivel = total > 0 ? (parseFloat(pct) >= 20 ? 'ALTO' : parseFloat(pct) >= 10 ? 'MEDIO' : 'BAJO') : '—';
        return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0">
            <span style="font-size:0.8rem;color:#6b7a8d">Total afectadas: <strong>${totalAfect}</strong> de <strong>${total}</strong></span>
            <span style="font-size:0.8rem">Incidencia: <strong>${pct}%</strong> ${nivel}</span>
        </div>`;
    }

    _renderDetallesGuardados() {
        if (!this._detalles.length) return '';
        return this._detalles.map((det, i) => {
            const total = det.totalPlantas || det.plantasMuestreadas || 0;
            // Calcular afectadas sumando las plagas del detalle (dato real de DETALLE_PLAGA)
            const plagasDet = det._plagas || [];
            const afect = plagasDet.reduce((s, p) => s + (p.plantasAfectadas || 0), 0);
            const pct   = total > 0 ? ((afect / total) * 100).toFixed(1) : '0.0';
            const pctN  = parseFloat(pct);
            const color = pctN >= 20 ? '#ef5350' : pctN >= 10 ? '#ffa726' : '#66bb6a';
            const nivel = pctN >= 20 ? 'ALTA' : pctN >= 10 ? 'MEDIA' : 'BAJA';

            // HTML para la lista de plagas detectadas en este muestreo
            const plagasHtml = plagasDet.length === 0
                ? `<p style="font-size:0.78rem;color:#aab;margin:6px 0 0">Sin plagas registradas en este muestreo</p>`
                : `<div style="margin-top:10px">
                    <div style="font-size:0.75rem;font-weight:700;color:#6b7a8d;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Plagas detectadas (${plagasDet.length})</div>
                    ${plagasDet.map(p => {
                        // Cruzar con catálogo para obtener nombreCientifico e imagen
                        const cat = this._plagasCatalogo.find(c => c.id === (p.idPlaga || p.plagaId));
                        const nombreCientifico = p.nombreCientifico || cat?.nombreCientifico || null;
                        const tipo = cat?.tipo || null;
                        const cachedImg = nombreCientifico ? PlagaImages._cache[nombreCientifico] : null;
                        const imgHtml = cachedImg
                            ? `<img src="${cachedImg}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;flex-shrink:0" onerror="this.style.display='none'">`
                            : `<span style="font-size:1.1rem;width:32px;text-align:center;flex-shrink:0">${PlagaImages._fallbackIcons?.[tipo?.toUpperCase()] || '🐛'}</span>`;
                        const incPct = total > 0 ? ((p.plantasAfectadas / total) * 100).toFixed(1) : (p.nivelIncidencia ? p.nivelIncidencia.toFixed(1) : '0.0');
                        const incN   = parseFloat(incPct);
                        const incCol = incN >= 20 ? '#ef5350' : incN >= 10 ? '#ffa726' : '#66bb6a';
                        const pNombre = p.nombrePlaga || cat?.nombreComun || cat?.nombre || ('Plaga #' + (p.idPlaga || '?'));
                        const nivelSev = p.nivelSeveridad || (incN >= 20 ? 'ALTO' : incN >= 10 ? 'MEDIO' : 'BAJO');
                        return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f0f2f5">
                            ${imgHtml}
                            <div style="flex:1;min-width:0">
                                <div style="font-weight:600;font-size:0.83rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${pNombre}</div>
                                ${nombreCientifico ? `<div style="font-size:0.7rem;color:#8a94a6;font-style:italic">${nombreCientifico}</div>` : ''}
                            </div>
                            <div style="text-align:right;flex-shrink:0">
                                <div style="font-size:0.95rem;font-weight:700;color:${incCol}">${incPct}%</div>
                                <div style="font-size:0.68rem;color:${incCol};font-weight:600">${nivelSev}</div>
                                <div style="font-size:0.68rem;color:#8a94a6">${p.plantasAfectadas} plantas</div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>`;

            const cultivoLabel = (() => {
                if (det.nombreCultivo) return det.nombreCultivo;
                if (det.idLote) {
                    const lx = (this._lotesDisponibles||[]).find(x => x.id === det.idLote);
                    return lx ? (lx.nombre + ' — ' + (lx.cultivoNombre||'Cultivo')) : 'Lote #' + det.idLote;
                }
                return 'Muestreo de campo';
            })();

            return `
            <div class="resultado-tecnico-card">
                <div class="resultado-tecnico-header">
                    <div>
                        <span class="chip chip--xs">Muestreo #${i + 1}</span>
                        <strong style="display:block;margin-top:4px">${cultivoLabel}</strong>
                        <span style="font-size:0.78rem;color:#6b7a8d">${total} plantas inspeccionadas</span>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:1.8rem;font-weight:800;color:${color};line-height:1">${pct}%</div>
                        <div style="font-size:0.72rem;font-weight:600;color:${color}">Incidencia ${nivel}</div>
                    </div>
                </div>
                <div class="resultado-barra-wrap">
                    <div class="resultado-barra-fill" style="width:${Math.min(pctN, 100)}%;background:${color}"></div>
                </div>
                <div style="font-size:0.78rem;color:#6b7a8d;margin-top:6px;display:flex;gap:12px;flex-wrap:wrap">
                    <span><strong>${afect}</strong> plantas afectadas</span>
                    <span>Incidencia: <strong style="color:${color}">${pct}%</strong></span>
                    <span>${plagasDet.length} plaga${plagasDet.length !== 1 ? 's' : ''} detectada${plagasDet.length !== 1 ? 's' : ''}</span>
                </div>
                ${plagasHtml}
            </div>`;
        }).join('');
    }

    _updateTotalPlantas(val) {
        this._conteoVivo.totalPlantas = Math.max(0, parseInt(val)||0);
        this._actualizarVistaViva();
    }

    _cambiarPlantas(delta) {
        this._conteoVivo.totalPlantas = Math.max(0, (this._conteoVivo.totalPlantas||0) + delta);
        const input = document.getElementById('input-total-plantas');
        if (input) input.value = this._conteoVivo.totalPlantas;
        this._actualizarVistaViva();
    }

    _cambiarAfectadas(idx, delta) {
        if (!this._conteoVivo.plagas[idx]) return;
        this._conteoVivo.plagas[idx].afectadas = Math.max(0, (this._conteoVivo.plagas[idx].afectadas||0) + delta);
        this._actualizarVistaViva();
    }

    _setAfectadas(idx, val) {
        if (!this._conteoVivo.plagas[idx]) return;
        this._conteoVivo.plagas[idx].afectadas = Math.max(0, parseInt(val)||0);
        this._actualizarVistaViva();
    }

    _quitarPlaga(idx) {
        this._conteoVivo.plagas.splice(idx, 1);
        this._actualizarVistaViva();
    }

    _actualizarVistaViva() {
        // Actualizar lista de plagas
        const listEl = document.getElementById('conteo-plagas-list');
        if (listEl) {
            listEl.innerHTML = this._conteoVivo.plagas.length === 0 ?
                `<div class="conteo-empty"><p>Selecciona "Agregar plaga" o haz clic en una del catálogo</p></div>` :
                this._renderConteoPlayas();
        }
        // Actualizar resumen
        const resEl = document.getElementById('conteo-resumen');
        if (resEl) resEl.innerHTML = this._renderResumenVivo();
        // Actualizar stats cards en vivo
        const totalAfect = this._conteoVivo.plagas.reduce((s,p)=>s+p.afectadas,0);
        const total = this._conteoVivo.totalPlantas;
        const pct = total > 0 ? ((totalAfect/total)*100).toFixed(1)+'%' : '—';
        const el1 = document.getElementById('live-total-plantas');
        const el2 = document.getElementById('live-total-afectadas');
        const el3 = document.getElementById('live-incidencia');
        const el4 = document.getElementById('live-num-plagas');
        if(el1) el1.textContent = total;
        if(el2) el2.textContent = totalAfect;
        if(el3) el3.textContent = pct;
        if(el4) el4.textContent = this._conteoVivo.plagas.length;
    }

    // Clic en plaga del catálogo o desde modal → agregar al conteo vivo
    _agregarPlagaDesdeCatalogo(id, nombre, riesgo) {
        const idNum = parseInt(id);
        if (this._conteoVivo.plagas.find(p => p.id === idNum)) {
            Notify.warning(`${nombre} ya está en el conteo activo`); return;
        }
        // Buscar datos completos en catálogo para imagen y tipo
        const catalogEntry = this._plagasCatalogo.find(p => p.id === idNum);
        this._conteoVivo.plagas.push({
            id: idNum, nombre, riesgo: riesgo||'bajo', afectadas: 0,
            nombreCientifico: catalogEntry?.nombreCientifico || null,
            tipo: catalogEntry?.tipo || null
        });
        this._actualizarVistaViva();
        Notify.info(`${nombre} añadida — ingresa cuántas plantas afectó`);
    }

    // Agregar plaga via modal (selector)
    async _agregarPlagaConteo() {
        const plagaOpts = this._plagasCatalogo.map(p =>
            `<option value="${p.id}|${(p.nombreComun||p.nombre||'').replace(/['"]/g,'')}|${(p.nivelRiesgo||'bajo').toLowerCase()}">${p.nombreComun||p.nombre||'—'}</option>`
        ).join('');
        const body = `
            <div class="form-group"><label>Plaga detectada</label>
                <select class="form-control" id="f-sel-plaga"><option value="">— Seleccione del catálogo —</option>${plagaOpts}</select>
            </div>
            <p style="font-size:0.8rem;color:#8a94a6">Tip: También puedes hacer clic directamente en el catálogo de plagas de la derecha.</p>`;
        this.modal.open('Agregar Plaga al Conteo', body, () => {
            const sel = document.getElementById('f-sel-plaga')?.value;
            if (!sel) { this.modal.setError('Selecciona una plaga'); return; }
            const [id, nombre, riesgo] = sel.split('|');
            if (this._conteoVivo.plagas.find(p => p.id === parseInt(id))) {
                this.modal.setError(`${nombre} ya está en el conteo`); return;
            }
            const catalogEntry = this._plagasCatalogo.find(p => p.id === parseInt(id));
            this._conteoVivo.plagas.push({
                id: parseInt(id), nombre, riesgo: riesgo||'bajo', afectadas: 0,
                nombreCientifico: catalogEntry?.nombreCientifico || null,
                tipo: catalogEntry?.tipo || null
            });
            this.modal.close();
            this._actualizarVistaViva();
            Notify.success(`${nombre} agregada al conteo`);
        });
    }

    // Guarda el conteo en el backend
    async _guardarConteo(inspeccionId) {
        const total = this._conteoVivo.totalPlantas;
        if (total <= 0) { Notify.warning('Ingresa el número de plantas inspeccionadas'); return; }

        // El nuevo esquema requiere idLote obligatoriamente
        const loteId = parseInt(document.getElementById('conteo-lote-select')?.value);
        if (!loteId) { Notify.warning('Selecciona el lote que estás inspeccionando'); return; }

        const obs = document.getElementById('conteo-obs')?.value?.trim() || '';
        const loteSelec = (this._lotesDisponibles||[]).find(l => l.id === loteId);
        try {
            // Crear detalle de inspección con nuevo esquema
            const det = await apiInspecciones.post(
                Endpoints.INSPECCIONES.DETALLES.CREATE(inspeccionId),
                {
                    totalPlantas: total,
                    idLote: loteId,
                    observaciones: obs || null
                }
            );
            const detId = det?.idDetalle || det?.id;
            if (!detId) throw new Error('No se pudo obtener el ID del detalle');

            // Guardar cada plaga detectada
            for (const p of this._conteoVivo.plagas) {
                if (p.afectadas > 0) {
                    const incidencia = total > 0 ? parseFloat(((p.afectadas/total)*100).toFixed(2)) : 0;
                    await apiInspecciones.post(
                        Endpoints.INSPECCIONES.DETALLES.PLAGAS.CREATE(detId),
                        { plagaId: p.id, nombrePlaga: p.nombre, plantasAfectadas: p.afectadas, incidencia }
                    ).catch(err => console.error(`Error guardando plaga ${p.nombre}:`, err));
                }
            }

            Notify.success(`Conteo guardado: ${total} plantas, ${this._conteoVivo.plagas.filter(p=>p.afectadas>0).length} plagas`);
            // Resetear conteo vivo
            this._conteoVivo = { totalPlantas: 0, plagas: [] };
            // Recargar
            await this.render(document.getElementById('page-content'), inspeccionId);
        } catch(e) { this._err(e,'Error al guardar el conteo'); }
    }

    async _deletePlagaDet(plagaDetId) {
        if (!confirm('¿Eliminar este registro de plaga del conteo?')) return;
        try {
            await apiInspecciones.delete(Endpoints.INSPECCIONES.DETALLES.PLAGAS.DELETE(plagaDetId));
            Notify.success('Registro eliminado');
            await this.render(document.getElementById('page-content'), this._inspeccion.idInspeccion || this._inspeccion.id);
        } catch(e) { this._err(e,'No se pudo eliminar el registro'); }
    }
}

// ─── REPORTES PAGE ────────────────────────────────────────────────────────────

class ReportesPage extends BasePage {
    constructor() { super('reportes'); this._data = []; this._loteCache = []; this._plagaCache = []; }

    async render(container) {
        container.innerHTML = `
            ${this.pageShell('Reportes','','Generación de reportes fitosanitarios','')}
            <div class="report-filters card">
                <h3 class="card__title">Filtros de Reporte</h3>
                <div class="form-row">
                    <div class="form-group"><label>Fecha Inicio</label><input class="form-control" id="r-fecha-inicio" type="date"></div>
                    <div class="form-group"><label>Fecha Fin</label><input class="form-control" id="r-fecha-fin" type="date"></div>
                    <div class="form-group"><label>Estado</label>
                        <select class="form-control" id="r-estado">
                            <option value="">Todos</option>
                            <option value="COMPLETADA">Completadas</option>
                            <option value="PROGRAMADA">Programadas</option>
                            <option value="APROBADA">Aprobadas</option>
                            <option value="COMPLETADA">Completadas</option>
                            <option value="EN_PROCESO">En Proceso</option>
                            <option value="CANCELADA">Canceladas</option>
                        </select>
                    </div>
                </div>
                <div class="form-group__actions">
                    <button class="btn btn-primary" id="btn-generar-reporte">Generar Reporte</button>
                    <button class="btn btn-secondary" id="btn-export-pdf">Exportar PDF</button>
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

    // Cargar datos base (lotes, plagas del catálogo)
    async _loadBase() {
        if (!this._loteCache.length || !this._plagaCache.length) {
            const [lotes, plagas] = await Promise.all([
                territorialModule.getLotes().catch(() => []),
                territorialModule.getPlagas({}).catch(() => [])
            ]);
            this._loteCache = lotes;
            this._plagaCache = plagas;
        }
    }

    // Cargar detalles + plagas de una inspección
    async _loadDetallesConPlagas(inspId) {
        const dets = await apiInspecciones.get(Endpoints.INSPECCIONES.DETALLES.LIST(inspId)).catch(() => []);
        const lista = Array.isArray(dets) ? dets : [];
        // Cargar plagas de cada detalle en paralelo
        await Promise.all(lista.map(async det => {
            const pls = await apiInspecciones.get(
                Endpoints.INSPECCIONES.DETALLES.PLAGAS.LIST(det.idDetalle || det.id)
            ).catch(() => []);
            det._plagas = Array.isArray(pls) ? pls : [];
        }));
        return lista;
    }

    async _generar() {
        const fi    = document.getElementById('r-fecha-inicio')?.value;
        const ff    = document.getElementById('r-fecha-fin')?.value;
        const estado = document.getElementById('r-estado')?.value;
        const el    = document.getElementById('reporte-resultado');
        if (el) el.innerHTML = `<div class="loading-screen"><div class="spinner"></div><p>Generando reporte técnico...</p></div>`;
        try {
            await this._loadBase();
            const res = await apiInspecciones.get(Endpoints.INSPECCIONES.LIST);
            this._data = Array.isArray(res) ? res : (res?.data ?? res?.content ?? []);
            let filtrado = this._data;
            if (fi) filtrado = filtrado.filter(i => i.fechaInspeccion >= fi);
            if (ff) filtrado = filtrado.filter(i => i.fechaInspeccion <= ff);
            if (estado) filtrado = filtrado.filter(i => i.estado === estado);
            // Cargar detalles + plagas (hasta 15 para no saturar)
            const detailsMap = {};
            await Promise.all(filtrado.slice(0, 15).map(async insp => {
                const id = insp.idInspeccion || insp.id;
                detailsMap[id] = await this._loadDetallesConPlagas(id);
                // Resolver loteId desde detalles si la inspección no lo tiene
                if (!insp.idLote && !insp.loteId) {
                    insp._loteId = detailsMap[id].find(d => d.idLote)?.idLote || null;
                }
            }));
            this._detallesMap = detailsMap;
            this._renderReporte(filtrado);
        } catch(e) {
            if (el) el.innerHTML = `<div class="error-state"><p>Error al generar reporte: ${e.message}</p></div>`;
        }
    }

    // Generar reporte para UNA inspección específica (desde el botón "Informe")
    async _generarParaInspeccion(inspId) {
        const el = document.getElementById('reporte-resultado');
        if (el) el.innerHTML = `<div class="loading-screen"><div class="spinner"></div><p>Cargando informe...</p></div>`;
        try {
            await this._loadBase();
            const insp = await apiInspecciones.get(Endpoints.INSPECCIONES.GET(inspId));
            const detalles = await this._loadDetallesConPlagas(inspId);
            if (!insp.idLote && !insp.loteId) {
                insp._loteId = detalles.find(d => d.idLote)?.idLote || null;
            }
            this._detallesMap = { [inspId]: detalles };
            this._renderReporte([insp]);
        } catch(e) {
            if (el) el.innerHTML = `<div class="error-state"><p>Error al cargar informe: ${e.message}</p></div>`;
        }
    }

    _renderReporte(data) {
        const el = document.getElementById('reporte-resultado');
        if (!el) return;
        if (!data.length) {
            el.innerHTML = `<div class="empty-state"><div class="empty-state__icon"></div><p>No hay inspecciones en el período seleccionado</p></div>`;
            return;
        }
        const aprobadas      = data.filter(i => i.estado === 'APROBADA').length;
        const completadas    = data.filter(i => i.estado === 'COMPLETADA').length;
        const pendRevision   = data.filter(i => i.estado === 'PENDIENTE_REVISION').length;
        const enProceso      = data.filter(i => i.estado === 'EN_PROCESO').length;
        const programadas    = data.filter(i => i.estado === 'PROGRAMADA').length;
        const pctCompletitud = data.length ? Math.round((aprobadas + completadas) / data.length * 100) : 0;
        const lotes = this._loteCache || [];
        const detallesMap = this._detallesMap || {};

        // ── Construir sección de resultados técnicos por inspección ─────────
        const tarjetasInspecciones = data.map((insp, i) => {
            const id       = insp.idInspeccion || insp.id;
            const detalles = detallesMap[id] || [];
            const fecha    = insp.fechaInspeccion
                ? new Date(insp.fechaInspeccion).toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })
                : '—';
            // Resolver lote (nuevo esquema: puede venir de _loteId)
            const _rLid = insp.idLote || insp.loteId || insp._loteId
                || detalles.find(d => d.idLote)?.idLote;
            const loteInfo = _rLid ? lotes.find(l => l.id === _rLid) : null;
            const loteLabel = loteInfo
                ? `${loteInfo.nombre} — ${loteInfo.cultivoNombre || 'Cultivo hortifrutícola'}`
                : (_rLid ? `Lote #${_rLid}` : 'Sin lote registrado');

            // Calcular totales desde DETALLE_PLAGA (datos reales)
            const todasPlagas = detalles.flatMap(d => d._plagas || []);
            const totalPlantas   = detalles.reduce((s, d) => s + (d.totalPlantas || d.plantasMuestreadas || 0), 0);
            const totalAfectadas = todasPlagas.reduce((s, p) => s + (p.plantasAfectadas || 0), 0);
            const incidenciaPct  = totalPlantas > 0 ? ((totalAfectadas / totalPlantas) * 100).toFixed(1) : null;
            const colorInc = incidenciaPct !== null
                ? (parseFloat(incidenciaPct) >= 20 ? '#ef5350' : parseFloat(incidenciaPct) >= 10 ? '#ffa726' : '#66bb6a')
                : '#aab4be';
            const nivelInc = incidenciaPct !== null
                ? (parseFloat(incidenciaPct) >= 20 ? 'ALTA' : parseFloat(incidenciaPct) >= 10 ? 'MEDIA' : 'BAJA')
                : '—';

            // Agrupar plagas únicas (por idPlaga)
            const plagasPorId = {};
            todasPlagas.forEach(p => {
                const pid = p.idPlaga || p.plagaId || 0;
                if (!plagasPorId[pid]) {
                    const cat = this._plagaCache.find(c => c.id === pid);
                    plagasPorId[pid] = {
                        nombre: p.nombrePlaga || cat?.nombreComun || ('Plaga #'+pid),
                        nombreCientifico: p.nombreCientifico || cat?.nombreCientifico || null,
                        totalAfect: 0, maxIncidencia: 0
                    };
                }
                plagasPorId[pid].totalAfect += (p.plantasAfectadas || 0);
                plagasPorId[pid].maxIncidencia = Math.max(plagasPorId[pid].maxIncidencia, p.nivelIncidencia || 0);
            });
            const plagasUnicas = Object.values(plagasPorId);

            const tieneDetalle = detalles.length > 0;
            return `
            <div class="reporte-insp-card">
                <div class="reporte-insp-header">
                    <div class="reporte-insp-info">
                        <span class="chip">#${i + 1}</span>
                        <div>
                            <strong>${fecha}</strong>
                            <div style="font-size:0.78rem;color:#6b7a8d">${insp.numeroInspeccion || insp.codigoIca || ('INSP-'+id)} · ${insp.tipoInspeccion || insp.tipo || 'Rutinaria'}</div>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                        ${this.badgeEstado(insp.estado)}
                        ${insp.nombreInspector && insp.nombreInspector !== 'Pendiente asignación'
                            ? `<span style="font-size:0.72rem;color:#6b7a8d">AT: ${insp.nombreInspector}</span>` : ''}
                    </div>
                </div>
                <div class="reporte-insp-lote">
                    <strong>${loteLabel}</strong>
                </div>

                ${tieneDetalle ? `
                <div class="reporte-resultados-tecnicos">
                    <div class="reporte-resultado-header">Resultados del Muestreo Fitosanitario</div>
                    <div class="reporte-incidencia-row">
                        <div class="reporte-plantas">
                            <span style="font-size:1.6rem;font-weight:800;color:#1a2332">${totalPlantas}</span>
                            <span style="font-size:0.72rem;color:#6b7a8d;display:block">Plantas inspeccionadas</span>
                        </div>
                        <div class="reporte-plantas">
                            <span style="font-size:1.6rem;font-weight:800;color:${colorInc}">${totalAfectadas}</span>
                            <span style="font-size:0.72rem;color:#6b7a8d;display:block">Plantas afectadas</span>
                        </div>
                        <div class="reporte-incidencia-big" style="color:${colorInc}">
                            <span>${incidenciaPct !== null ? incidenciaPct + '%' : '—'}</span>
                            <span style="font-size:0.72rem;display:block;font-weight:600">INCIDENCIA ${nivelInc}</span>
                        </div>
                    </div>
                    ${incidenciaPct !== null ? `
                    <div class="resultado-barra-wrap" style="margin-top:8px">
                        <div class="resultado-barra-fill" style="width:${Math.min(parseFloat(incidenciaPct), 100)}%;background:${colorInc}"></div>
                    </div>` : ''}

                    <!-- Detalles por muestreo con plagas -->
                    ${detalles.map((d, di) => {
                        const tp = d.totalPlantas || d.plantasMuestreadas || 0;
                        const dPlagas = d._plagas || [];
                        const dAfect = dPlagas.reduce((s, p) => s + (p.plantasAfectadas || 0), 0);
                        const pctd = tp > 0 ? ((dAfect / tp) * 100).toFixed(1) : '0.0';
                        const colD = parseFloat(pctd) >= 20 ? '#ef5350' : parseFloat(pctd) >= 10 ? '#ffa726' : '#66bb6a';
                        const loteDetalle = d.idLote ? (lotes.find(l=>l.id===d.idLote)?.nombre || 'Lote #'+d.idLote) : '';
                        return `<div class="reporte-detalle-row" style="border-top:1px solid #f0f2f5;margin-top:6px;padding-top:6px">
                            <div style="display:flex;justify-content:space-between;align-items:center">
                                <span style="font-weight:600;font-size:0.83rem">Muestreo ${di+1}${loteDetalle ? ' — '+loteDetalle : ''}</span>
                                <span style="color:${colD};font-weight:700">${pctd}%</span>
                            </div>
                            <div style="font-size:0.78rem;color:#6b7a8d;margin-top:2px">${tp} plantas · ${dAfect} afectadas · ${dPlagas.length} plaga${dPlagas.length!==1?'s':''} detectada${dPlagas.length!==1?'s':''}</div>
                            ${dPlagas.length > 0 ? `<div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">
                                ${dPlagas.map(p => {
                                    const cat = this._plagaCache.find(c => c.id === (p.idPlaga||p.plagaId));
                                    const nom = p.nombrePlaga || cat?.nombreComun || 'Plaga';
                                    const inc = tp > 0 ? ((p.plantasAfectadas/tp)*100).toFixed(1) : '0.0';
                                    const colP = parseFloat(inc)>=20?'#ef5350':parseFloat(inc)>=10?'#ffa726':'#66bb6a';
                                    return `<span style="background:#f8f9ff;border:1px solid #e0e4ee;border-radius:20px;padding:2px 8px;font-size:0.72rem;color:#1a2332">
                                        ${nom} <strong style="color:${colP}">${inc}%</strong>
                                    </span>`;
                                }).join('')}
                            </div>` : ''}
                        </div>`;
                    }).join('')}

                    <!-- Resumen plagas únicas -->
                    ${plagasUnicas.length > 0 ? `
                    <div style="margin-top:12px;padding-top:10px;border-top:2px solid #e8ecf0">
                        <div style="font-size:0.72rem;font-weight:700;color:#6b7a8d;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Plagas Detectadas (${plagasUnicas.length})</div>
                        ${plagasUnicas.map(p => {
                            const pct = totalPlantas > 0 ? ((p.totalAfect/totalPlantas)*100).toFixed(1) : '0.0';
                            const col = parseFloat(pct)>=20?'#ef5350':parseFloat(pct)>=10?'#ffa726':'#66bb6a';
                            return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f5f5f5;font-size:0.82rem">
                                <div>
                                    <strong>${p.nombre}</strong>
                                    ${p.nombreCientifico ? `<em style="color:#8a94a6;font-size:0.72rem;margin-left:4px">${p.nombreCientifico}</em>` : ''}
                                </div>
                                <span style="color:${col};font-weight:700;white-space:nowrap">${pct}% · ${p.totalAfect} plantas</span>
                            </div>`;
                        }).join('')}
                    </div>` : ''}
                </div>` : `
                <div class="reporte-sin-detalle">
                    <span>Sin datos de muestreo registrados aún</span>
                </div>`}

                ${insp.observaciones ? `<div class="reporte-obs"><strong>Observaciones:</strong> ${insp.observaciones}</div>` : ''}
            </div>`;
        }).join('');

        el.innerHTML = `
            <!-- Resumen ejecutivo -->
            <div class="reporte-ejecutivo">
                <div class="reporte-ejecutivo-title">Resumen Ejecutivo — Período ${document.getElementById('r-fecha-inicio')?.value || '...'} al ${document.getElementById('r-fecha-fin')?.value || '...'}</div>
                <div class="report-summary">
                    <div class="report-stat">
                        <div class="report-stat__val">${data.length}</div>
                        <div class="report-stat__lbl">Total</div>
                    </div>
                    <div class="report-stat" style="background:#e8f5e9">
                        <div class="report-stat__val" style="color:#2e7d32">${aprobadas}</div>
                        <div class="report-stat__lbl">Aprobadas</div>
                    </div>
                    <div class="report-stat" style="background:#fff8e1">
                        <div class="report-stat__val" style="color:#e65100">${pendRevision}</div>
                        <div class="report-stat__lbl">Pend. Revisión</div>
                    </div>
                    <div class="report-stat" style="background:#e3f2fd">
                        <div class="report-stat__val" style="color:#1565c0">${enProceso}</div>
                        <div class="report-stat__lbl">En Proceso</div>
                    </div>
                    <div class="report-stat" style="background:#f3e5f5">
                        <div class="report-stat__val" style="color:#6a1b9a">${pctCompletitud}%</div>
                        <div class="report-stat__lbl">Completitud</div>
                    </div>
                </div>
            </div>

            <!-- Resultados técnicos por inspección -->
            <div style="margin-top:20px">
                <h3 style="font-size:0.95rem;font-weight:700;color:#1a2332;margin-bottom:14px">
                    Resultados Técnicos del Asistente Técnico
                    ${Object.keys(detallesMap).length < data.length ? `<span style="font-size:0.75rem;color:#8a94a6;font-weight:400">(mostrando primeras ${Object.keys(detallesMap).length})</span>` : ''}
                </h3>
                <div class="reporte-inspecciones-grid">${tarjetasInspecciones}</div>
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

// Cerrar dropdowns de acciones al hacer clic fuera
document.addEventListener('click', () => {
    document.querySelectorAll('.actions-dropdown.open').forEach(d => d.classList.remove('open'));
});
