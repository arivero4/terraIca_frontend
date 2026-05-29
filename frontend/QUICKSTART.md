# ⚡ QUICK START - Frontend Sistema de Inspecciones

---

## 🎯 5 Minutos para Empezar

### 1. Verificar Requisitos

```bash
# API Gateway corriendo
curl http://localhost:8080/health

# Microservicios corriendo
curl http://localhost:8081/health
curl http://localhost:8082/health
curl http://localhost:8083/health
```

Si alguno falla, iniciar los servicios primero.

### 2. Iniciar Frontend

**Opción A: Node.js**
```bash
npm install -g http-server
cd frontend
http-server . --port 8000 --cors
```

**Opción B: Python**
```bash
cd frontend
python -m http.server 8000
```

**Opción C: PHP**
```bash
cd frontend
php -S localhost:8000
```

**Opción D: Docker**
```bash
docker build -t terraica-frontend .
docker run -p 8000:80 terraica-frontend
```

### 3. Acceder a la Aplicación

```
http://localhost:8000
```

### 4. Credenciales de Prueba

```
Email:    admin@terraica.com
Password: AdminPass123!@
```

---

## 📁 Estructura Clave

```
frontend/
├── js/              # Lógica de negocio
│   ├── api.js       # Cliente HTTP
│   ├── auth.js      # Autenticación
│   ├── utils.js     # Utilidades
│   └── *.js         # Módulos específicos
├── css/             # Estilos
├── pages/           # Páginas adicionales
└── assets/          # Recursos
```

---

## 🔧 Configuración Rápida

### Cambiar URL del API Gateway

**Archivo:** `js/api.js`

```javascript
const API_CONFIG = {
    BASE_URL: 'http://localhost:8080',  // ← Cambiar aquí
    TIMEOUT: 5000,
    RETRY_ATTEMPTS: 3
};
```

### Cambiar Credenciales

Modificar en el microservicio de usuarios o usar las de prueba.

---

## 🚀 Primeros Pasos

### 1. Login
- Abrir http://localhost:8000/login.html
- Ingresar credenciales
- Clic en "Iniciar Sesión"

### 2. Dashboard
- Será redirigido automáticamente
- Ver estadísticas y actividades

### 3. Gestión de Usuarios
- Clic en "Usuarios" en la barra lateral
- Ver lista de usuarios
- Crear nuevo usuario con botón "➕ Nuevo Usuario"

### 4. Otros Módulos
- Similar a usuarios (en desarrollo)

---

## 🐛 Troubleshooting Rápido

### Error: "CORS policy"
```
→ Verificar que API Gateway está corriendo
→ Verificar headers CORS en servidor
```

### Error: "401 Unauthorized"
```
→ Token expirado, hacer login nuevamente
→ Verificar que el token se guardó en localStorage
```

### Error: "Network timeout"
```
→ Aumentar TIMEOUT en js/api.js
→ Verificar conexión a API Gateway
```

### Error: "No se carguen los datos"
```
→ Abrir DevTools (F12)
→ Ver Network tab
→ Verificar requests
→ Ver Console para errores
```

---

## 📊 Verificar Instalación

```bash
# 1. Frontend corriendo
curl http://localhost:8000/index.html

# 2. API Gateway corriendo
curl http://localhost:8080/health

# 3. Verificar localStorage
# Abrir DevTools → Application → Local Storage
# Debe mostrar: authToken, user (después de login)

# 4. Verificar network
# DevTools → Network
# Ver requests a /api/usuarios, /api/territorial, etc.
```

---

## 🎓 Próximos Pasos

### Aprender el Código
1. Lee [README.md](README.md) - Documentación completa
2. Lee [GUIA_PRACTICA.md](GUIA_PRACTICA.md) - Ejemplos prácticos
3. Lee [ARQUITECTURA.md](ARQUITECTURA.md) - Diseño técnico

### Modificar la App
1. Agregar nueva página en `pages/`
2. Crear módulo en `js/`
3. Agregar estilos en `css/`
4. Testar en navegador

### Desplegar
1. Leer [DESPLIEGUE.md](DESPLIEGUE.md)
2. Configurar servidor (Nginx/Apache)
3. HTTPS y certificados SSL
4. Monitoreo y logs

---

## 💡 Ejemplos Rápidos

### Obtener Usuarios

```javascript
// En la consola del navegador
const usuarios = await usuariosModule.getUsuarios();
console.log(usuarios);
```

### Crear Usuario

```javascript
const nuevoUsuario = await usuariosModule.createUsuario({
    nombre: 'Juan',
    apellido: 'Pérez',
    email: 'juan@example.com',
    password: 'SecurePass123!@',
    roles: ['inspector']
});
```

### Mostrar Notificación

```javascript
Notify.success('Operación exitosa');
Notify.error('Error');
Notify.warning('Advertencia');
```

### Validar Email

```javascript
if (Validation.isEmail('test@mail.com')) {
    console.log('Email válido');
}
```

---

## 📞 Necesitas Ayuda?

1. **Error de API?** → Ver DevTools Console
2. **¿No carga la página?** → Verificar servidor web
3. **¿Errores CORS?** → Verificar API Gateway headers
4. **¿Dudas del código?** → Leer archivos .md correspondientes

---

## ✅ Checklist de Verificación

- [ ] Frontend inicia en puerto 8000
- [ ] Puedo acceder a http://localhost:8000
- [ ] API Gateway conecta correctamente
- [ ] Login funciona con credenciales
- [ ] Dashboard carga datos
- [ ] Puedo ver lista de usuarios
- [ ] localStorage guarda token
- [ ] DevTools no muestra errores graves
- [ ] Responsive design funciona en mobile
- [ ] Botones y formularios responden

---

## 🎯 Hito 1 Completado

✅ Frontend instalado y funcionando
✅ Autenticación implementada
✅ Consumo de APIs funcionando
✅ Módulos principales listos
✅ Documentación completa

**Próximo paso:** Leer documentación completa en README.md

---

**Sistema listo para desarrollo profesional**

Versión: 1.0.0 | Fecha: 2026-05-28
