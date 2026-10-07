# Sistema de Reservas

Proyecto con un frontend estático de inicio de sesión (HTML, CSS y JavaScript) y una API REST en Node.js/Express para el backend. En este sprint, el backend implementa HUS-01: autenticación de usuarios existentes mediante correo y contraseña. El registro, la recuperación de contraseña y el dashboard todavía no están implementados.

## Requisitos

- Node.js 20 o superior.
- MongoDB local o una instancia accesible.
- Un servidor estático para el frontend, por ejemplo, Live Server de VS Code.

## Frontend de inicio de sesión

El frontend entregado en `Reservas-feature-HUS-01-frontend-login.zip` contiene `index.html`, `login.js` y `styles.css`. El formulario solicita correo y contraseña, permite mostrar u ocultar la contraseña y presenta mensajes de validación.

Actualmente, el JavaScript del formulario simula la autenticación con credenciales de demostración; todavía no llama a la API ni almacena el token. Además, el HTML busca los archivos en `css/styles.css` y `js/login.js`, aunque el ZIP los entrega en la carpeta raíz. Al copiar el frontend, organiza los archivos en esas carpetas o actualiza las rutas en `index.html`.

Para integrar el formulario con el backend, conserva las validaciones existentes y reemplaza el bloque de credenciales simuladas en `login.js`. Declara como `async` el manejador `submit` que ya existe y llama allí a `await authenticate(email, password)` después de validar los campos. No elimines espacios de la contraseña:

```javascript
async function authenticate(email, password) {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await response.json();

    if (!response.ok) {
      loginMessage.textContent = result.message;
      loginMessage.classList.add('error');
      return;
    }

    sessionStorage.setItem('token', result.token);
    loginMessage.textContent = result.message;
    loginMessage.classList.add('success');
  } catch {
    loginMessage.textContent = 'No fue posible conectar con el servidor.';
    loginMessage.classList.add('error');
  }
}
```

El ejemplo usa `email` y `password`, los mismos nombres que los campos del formulario y que espera la API. `sessionStorage` es solo una opción sencilla para una demostración; en una aplicación desplegada, revisa la estrategia de almacenamiento de tokens y la protección contra XSS.

## Configuración y ejecución del backend

Desde la carpeta del backend:

```powershell
Copy-Item .env.example .env
npm ci
```

Genera un secreto aleatorio para JWT y copia el resultado en `JWT_SECRET` dentro de `.env`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Configura también `MONGODB_URI`, `MONGODB_DB_NAME` y `CLIENT_ORIGIN` en `.env`. Para ejecutar la API en desarrollo:

```powershell
npm run dev
```

El servidor conecta a MongoDB, prepara las colecciones `users`, `services` y `reservations`, y crea sus índices. No inserta usuarios ni datos de ejemplo. `GET /api/health` comprueba que la API esté respondiendo.

Abre el frontend con un servidor estático. El origen predeterminado permitido por CORS es `http://localhost:5500`; si utilizas otro, actualiza `CLIENT_ORIGIN` en `.env`.

## Endpoint HUS-01

`POST /api/auth/login`

Solicitud:

```json
{
  "email": "usuario@correo.com",
  "password": "tu-contraseña"
}
```

Respuesta `200`:

```json
{
  "message": "Inicio de sesión exitoso.",
  "token": "<JWT válido durante una hora>",
  "user": {
    "id": "<id del usuario>",
    "name": "Nombre del usuario",
    "email": "usuario@correo.com",
    "role": "user"
  }
}
```

La respuesta del usuario no incluye la contraseña ni su hash. Los datos inválidos devuelven `400`; las credenciales incorrectas, cuentas inactivas o bloqueadas devuelven un error genérico `401`. Se limitan las solicitudes por IP y la cuenta se bloquea temporalmente después de varios intentos fallidos. `LOGIN_MAX_ATTEMPTS` y `LOGIN_LOCK_MINUTES` permiten ajustar los valores predeterminados de cinco intentos y quince minutos.

Para iniciar sesión, ya debe existir en `users` un documento con el correo normalizado y `passwordHash` calculado con bcrypt. HUS-01 no incluye el registro de usuarios. Las contraseñas en texto plano no son aceptadas.

Los modelos `services` y `reservations` están preparados para historias posteriores, pero todavía no tienen endpoints CRUD. Incluyen, respectivamente, nombre, descripción, precio, duración, imagen, categoría y estado; y referencias a usuario y servicio, fecha, hora, observaciones y estado.

## Pruebas

```powershell
npm test
```
