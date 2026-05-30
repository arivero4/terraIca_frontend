/**
 * Utilities - Funciones auxiliares reutilizables
 */

/**
 * DOM Utilities
 */
const DOM = {
    /**
     * Selecciona elemento por query selector
     */
    select(selector) {
        return document.querySelector(selector);
    },

    /**
     * Selecciona múltiples elementos
     */
    selectAll(selector) {
        return document.querySelectorAll(selector);
    },

    /**
     * Crea elemento HTML
     */
    createElement(tag, classes = '', html = '') {
        const element = document.createElement(tag);
        if (classes) element.className = classes;
        if (html) element.innerHTML = html;
        return element;
    },

    /**
     * Añade evento
     */
    on(element, event, handler) {
        if (element) element.addEventListener(event, handler);
    },

    /**
     * Remueve evento
     */
    off(element, event, handler) {
        if (element) element.removeEventListener(event, handler);
    },

    /**
     * Muestra elemento
     */
    show(element) {
        if (element) element.style.display = '';
    },

    /**
     * Oculta elemento
     */
    hide(element) {
        if (element) element.style.display = 'none';
    },

    /**
     * Alterna visibilidad
     */
    toggle(element) {
        if (element) element.style.display = element.style.display === 'none' ? '' : 'none';
    },

    /**
     * Añade clase
     */
    addClass(element, className) {
        if (element) element.classList.add(className);
    },

    /**
     * Remueve clase
     */
    removeClass(element, className) {
        if (element) element.classList.remove(className);
    },

    /**
     * Alterna clase
     */
    toggleClass(element, className) {
        if (element) element.classList.toggle(className);
    },

    /**
     * Limpia HTML
     */
    clear(element) {
        if (element) element.innerHTML = '';
    }
};

/**
 * Validation Utilities
 */
const Validation = {
    /**
     * Valida email
     */
    isEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Valida teléfono
     */
    isPhone(phone) {
        const regex = /^[0-9]{7,15}$/;
        return regex.test(phone.replace(/\D/g, ''));
    },

    /**
     * Valida contraseña
     */
    isStrongPassword(password) {
        return password.length >= 8 &&
               /[A-Z]/.test(password) &&
               /[a-z]/.test(password) &&
               /[0-9]/.test(password) &&
               /[^A-Za-z0-9]/.test(password);
    },

    /**
     * Valida URL
     */
    isURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Valida campo requerido
     */
    isRequired(value) {
        return value && value.trim().length > 0;
    }
};

/**
 * Format Utilities
 */
const Format = {
    /**
     * Formatea fecha
     */
    date(date, format = 'DD/MM/YYYY') {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return format
            .replace('DD', day)
            .replace('MM', month)
            .replace('YYYY', year);
    },

    /**
     * Formatea hora
     */
    time(date, format = 'HH:MM:SS') {
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('HH', hours)
            .replace('MM', minutes)
            .replace('SS', seconds);
    },

    /**
     * Formatea moneda
     */
    currency(value, currency = 'COP') {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency
        }).format(value);
    },

    /**
     * Formatea número
     */
    number(value, decimals = 2) {
        return Number(value).toFixed(decimals);
    },

    /**
     * Formatea texto en título
     */
    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    },

    /**
     * Trunca texto
     */
    truncate(text, length = 50) {
        return text.length > length ? text.substring(0, length) + '...' : text;
    }
};

/**
 * Storage Utilities
 */
const Storage = {
    /**
     * Guarda en localStorage
     */
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    /**
     * Obtiene de localStorage
     */
    get(key) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    },

    /**
     * Remueve de localStorage
     */
    remove(key) {
        localStorage.removeItem(key);
    },

    /**
     * Limpia localStorage
     */
    clear() {
        localStorage.clear();
    }
};

/**
 * Toast/Notification Utilities
 */
const Notify = {
    _container: null,

    _getContainer() {
        if (!this._container || !document.body.contains(this._container)) {
            this._container = document.createElement('div');
            this._container.className = 'notify-container';
            document.body.appendChild(this._container);
        }
        return this._container;
    },

    success(message, duration = 3500) { this.show(message, 'success', duration); },
    error(message,   duration = 5000) { this.show(message, 'error',   duration); },
    warning(message, duration = 4000) { this.show(message, 'warning', duration); },
    info(message,    duration = 3500) { this.show(message, 'info',    duration); },

    show(message, type = 'info', duration = 3500) {
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `notify-toast notify-toast--${type}`;
        toast.innerHTML = `<span class="notify-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;

        this._getContainer().appendChild(toast);
        // Forzar reflow antes de añadir .show para que la transición funcione
        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }
};

/**
 * Loader Utilities
 */
const Loader = {
    /**
     * Muestra loader
     */
    show(target) {
        const loader = DOM.createElement('div', 'loader');
        loader.innerHTML = '<div class="loader__spinner"></div>';
        if (target) {
            target.appendChild(loader);
        } else {
            document.body.appendChild(loader);
        }
        return loader;
    },

    /**
     * Oculta loader
     */
    hide(loader) {
        if (loader) loader.remove();
    }
};

/**
 * Debounce Utilities
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle Utilities
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Sleep/Delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Plagas Image Utilities
 * Obtiene imágenes de plagas desde Wikipedia/Wikimedia Commons
 * para que el Asistente Técnico identifique plagas en campo
 */
const PlagaImages = {
    // Cache en memoria para evitar múltiples peticiones
    _cache: {},

    // Mapa de nombres científicos conocidos → imagen directa (fallback rápido)
    _knownImages: {
        'Bemisia tabaci':           'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Bemisia_tabaci.jpg/200px-Bemisia_tabaci.jpg',
        'Tetranychus urticae':      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Tetranychus_urticae_with_silk_threads.jpg/200px-Tetranychus_urticae_with_silk_threads.jpg',
        'Tetranychus cinnabarinus': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Tetranychus_urticae_with_silk_threads.jpg/200px-Tetranychus_urticae_with_silk_threads.jpg',
        'Aphis gossypii':           'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Aphis_gossypii_Glover.jpg/200px-Aphis_gossypii_Glover.jpg',
        'Spodoptera frugiperda':    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Spodoptera_frugiperda_adult.jpg/200px-Spodoptera_frugiperda_adult.jpg',
        'Phytophthora infestans':   'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Phytophthora_infestans_on_potato_leaf.jpg/200px-Phytophthora_infestans_on_potato_leaf.jpg',
        'Botrytis cinerea':         'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Botrytis_cinerea_on_Vitis.jpg/200px-Botrytis_cinerea_on_Vitis.jpg',
        'Xanthomonas campestris':   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Bacterial_leaf_scorch.jpg/200px-Bacterial_leaf_scorch.jpg',
        'Frankliniella occidentalis':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Frankliniella_occidentalis.jpg/200px-Frankliniella_occidentalis.jpg',
        'Heliothrips haemorrhoidalis':'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Frankliniella_occidentalis.jpg/200px-Frankliniella_occidentalis.jpg',
        'Acyrthosiphon pisum':      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Acyrthosiphon_pisum_%28pea_aphid%29.jpg/200px-Acyrthosiphon_pisum_%28pea_aphid%29.jpg'
    },

    // Icono SVG fallback por tipo de organismo
    _fallbackIcons: {
        'INSECTO': '🦟', 'HONGO': '🍄', 'BACTERIA': '🦠',
        'VIRUS': '🔬', 'ACARO': '🕷️', 'NEMATODO': '🪱', 'default': '🐛'
    },

    /**
     * Obtiene la URL de imagen para una plaga.
     * Primero busca en cache, luego en mapa conocido, luego en Wikipedia.
     */
    async getImageUrl(nombreCientifico) {
        if (!nombreCientifico) return null;
        const key = nombreCientifico.trim();

        // 1. Cache
        if (this._cache[key] !== undefined) return this._cache[key];

        // 2. Mapa conocido
        if (this._knownImages[key]) {
            this._cache[key] = this._knownImages[key];
            return this._knownImages[key];
        }

        // 3. Wikipedia API (genus + species)
        try {
            const search = key.split(' ').slice(0,2).join('_');
            const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(search)}&prop=pageimages&format=json&pithumbsize=220&origin=*`;
            const resp = await fetch(url, { signal: AbortSignal.timeout(3000) });
            const data = await resp.json();
            const pages = data.query?.pages;
            if (pages) {
                const page = Object.values(pages)[0];
                const imgUrl = page?.thumbnail?.source || null;
                this._cache[key] = imgUrl;
                return imgUrl;
            }
        } catch {}

        this._cache[key] = null;
        return null;
    },

    /**
     * Renderiza un elemento de imagen de plaga con fallback al ícono
     */
    async renderImg(nombreCientifico, tipo, size = 80) {
        const url = await this.getImageUrl(nombreCientifico);
        if (url) {
            return `<img src="${url}" alt="${nombreCientifico||'Plaga'}"
                        style="width:${size}px;height:${size}px;object-fit:cover;border-radius:10px;border:2px solid #e2e8f0"
                        onerror="this.style.display='none';this.nextSibling.style.display='flex'">
                    <div style="display:none;width:${size}px;height:${size}px;border-radius:10px;background:#f0f4f8;align-items:center;justify-content:center;font-size:${size/2.5}rem;border:2px solid #e2e8f0">
                        ${this._fallbackIcons[tipo?.toUpperCase()] || this._fallbackIcons.default}
                    </div>`;
        }
        return `<div style="width:${size}px;height:${size}px;border-radius:10px;background:#f0f4f8;display:flex;align-items:center;justify-content:center;font-size:${size/2.5}rem;border:2px solid #e2e8f0">
                    ${this._fallbackIcons[tipo?.toUpperCase()] || this._fallbackIcons.default}
                </div>`;
    },

    /**
     * Renderiza imagen pequeña inline (para listas)
     */
    async renderThumb(nombreCientifico, tipo) {
        return this.renderImg(nombreCientifico, tipo, 44);
    }
};

// Exponer globalmente para acceso desde HTML
window.DOM = DOM;
window.Validation = Validation;
window.Format = Format;
window.Storage = Storage;
window.Notify = Notify;
window.Loader = Loader;
window.debounce = debounce;
window.throttle = throttle;
window.delay = delay;
window.PlagaImages = PlagaImages;
