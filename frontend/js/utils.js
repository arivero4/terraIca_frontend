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
