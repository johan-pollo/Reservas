# Sistema de Reservas

Proyecto con un frontend estático de inicio de sesión (HTML, CSS y JavaScript) y una API REST en Node.js/Express. El backend implementa HUS-01 (inicio de sesión), HUS-02 (registro de usuarios), HUS-03 (estadísticas del dashboard) y HUS-04 (gestión de usuarios). La recuperación de contraseña y la verificación por correo todavía no están implementadas.

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

Configura también `MONGODB_URI`, `MONGODB_DB_NAME`, `CLIENT_ORIGIN` y `RECAPTCHA_SECRET_KEY` en `.env`. Obtén la clave secreta para el servidor y la clave de sitio para el frontend en la consola de administración de reCAPTCHA; el backend verifica los tokens con Google. Sin `RECAPTCHA_SECRET_KEY`, el endpoint de registro responde `503` en lugar de crear una cuenta sin validar el CAPTCHA.

Para ejecutar la API en desarrollo:

```powershell
npm run dev
```

El servidor conecta a MongoDB, prepara las colecciones `users`, `services` y `reservations`, y crea sus índices. No inserta usuarios ni datos de ejemplo. `GET /api/health` comprueba que la API esté respondiendo.

Abre el frontend con un servidor estático. El origen predeterminado permitido por CORS es `http://localhost:5500`; si utilizas otro, actualiza `CLIENT_ORIGIN` en `.env`.

## Endpoint HUS-02: registro

`POST /api/auth/register`

Solicitud JSON:

```json
{
  "name": "Ana Pérez",
  "email": "ana@correo.com",
  "phone": "3001234567",
  "password": "ClaveSegura123!",
  "confirmPassword": "ClaveSegura123!",
  "termsAccepted": true,
  "captchaToken": "<token emitido por reCAPTCHA>"
}
```

El backend normaliza el correo, valida el nombre, el teléfono, la confirmación de contraseña y la aceptación de términos. La contraseña debe tener al menos ocho caracteres, mayúscula, minúscula, número y símbolo; se almacena únicamente como hash bcrypt y se rechazan contraseñas de más de 72 bytes. El rol se asigna en el servidor y no se toma del formulario.

Una respuesta `201` confirma el registro y devuelve el perfil público (`id`, `name`, `email`, `phone` y `role`); no inicia sesión ni devuelve un JWT. El usuario puede iniciar sesión con HUS-01 después de registrarse. El correo existente devuelve `409`, los datos o tokens CAPTCHA inválidos devuelven `400`, y un CAPTCHA no configurado devuelve `503`. Las solicitudes al endpoint de autenticación están limitadas por IP.

El frontend incluido en este repositorio solo contiene el formulario de inicio de sesión: todavía no incluye formulario de registro ni integración cliente con reCAPTCHA. La clave de sitio y el token CAPTCHA deberán conectarse cuando se implemente esa pantalla. La verificación por correo también queda pendiente.

## Endpoint HUS-03: estadísticas del dashboard

`GET /api/dashboard/stats`

Requiere el JWT emitido por el inicio de sesión en el encabezado `Authorization: Bearer <token>`. El backend verifica la firma, la vigencia y que la cuenta todavía exista y esté activa; no confía en el rol incluido en el token y consulta el rol actual del usuario.

Ejemplo de respuesta `200` para una persona administradora:

```json
{
  "user": {
    "id": "<id>",
    "name": "Ana Pérez",
    "role": "admin"
  },
  "stats": {
    "users": 12,
    "services": { "total": 8, "active": 6 },
    "reservations": {
      "total": 24,
      "pending": 4,
      "confirmed": 10,
      "cancelled": 3,
      "completed": 7
    }
  },
  "recentReservations": [
    {
      "id": "<id>",
      "date": "2026-11-01T00:00:00.000Z",
      "time": "10:00",
      "status": "pending",
      "notes": "",
      "userId": "<id>",
      "serviceId": "<id>"
    }
  ]
}
```

La respuesta incluye hasta cinco reservas recientes. La persona administradora consulta conteos globales; cualquier otro usuario autenticado recibe únicamente sus propios conteos y reservas, y `stats.users` será `null`. El total de servicios y los servicios activos son globales porque representan el catálogo disponible. Sin token, con token inválido o expirado, o con cuenta inactiva, la API responde `401`.

## Endpoints HUS-04: gestión de usuarios

Todas las rutas `/api/users` requieren un JWT válido de una cuenta **activa** con rol `admin`. La API vuelve a consultar la cuenta en cada solicitud, así que los cambios de rol o la desactivación tienen efecto inmediato.

- `GET /api/users?page=1&limit=20&search=ana&role=user&status=active` lista usuarios con paginación y filtros opcionales de nombre/correo, rol y estado. `limit` admite de 1 a 100. La respuesta incluye `users` y `pagination` con el total de coincidencias y páginas.
- `POST /api/users` crea un usuario. Envía `name`, `email` y `password`; `phone` es opcional y `role` admite `user` o `admin` (por defecto `user`). La contraseña debe cumplir la política de fortaleza usada en HUS-02 y se almacena como hash bcrypt. Devuelve `201`.
- `PUT /api/users/:id` actualiza parcialmente `name`, `email`, `phone`, `role` o `isActive`. No permite modificar directamente hashes ni contraseñas.
- `DELETE /api/users/:id` desactiva la cuenta (`isActive: false`) en lugar de borrar el documento, para conservar las referencias de reservas existentes.

Las respuestas nunca incluyen el hash de la contraseña. Los correos duplicados devuelven `409`, los datos o identificadores inválidos `400`, un usuario inexistente `404`, y los intentos de gestión sin permisos `401` o `403`. Un administrador no puede quitarse su propio rol ni desactivar su cuenta. El estado de cuenta y el rol se consultan en MongoDB para cada petición protegida.

Los cambios administrativos de creación, rol y estado de cuentas se serializan dentro del proceso de Node.js. Así, solicitudes concurrentes atendidas por una misma instancia no pueden desactivar o degradar simultáneamente a todos los administradores activos. Si se despliega la API con varios procesos o instancias, esta exclusión debe sustituirse por un bloqueo distribuido o por una transacción MongoDB coordinada.

## Endpoints HUS-05: gestión de servicios

Todas las rutas `/api/services` requieren un JWT válido de una cuenta activa. La lectura está disponible para usuarios autenticados; crear, actualizar y eliminar requiere rol `admin`.

- `GET /api/services?page=1&limit=20&search=corte&status=active&category=Cabello` lista servicios con paginación y filtros opcionales por texto, estado y categoría. La búsqueda revisa nombre, descripción y categoría.
- `POST /api/services` crea un servicio con `name`, `price` y `durationMinutes`; acepta opcionalmente `description`, `imageUrl`, `category` y `status`. El estado predeterminado es `active`.
- `PUT /api/services/:id` actualiza parcialmente cualquiera de los campos permitidos.
- `DELETE /api/services/:id` realiza una baja lógica al cambiar `status` a `inactive`; el documento se conserva para mantener válidas las referencias desde reservas históricas.

El precio debe ser un número mayor o igual a cero; la duración, un entero positivo; el estado, `active` o `inactive`. Las respuestas usan `service` para una operación individual y `services` más `pagination` para listados. Datos o identificadores inválidos devuelven `400`, recursos inexistentes `404` y solicitudes sin permisos `401` o `403`. El endpoint `DELETE` no borra físicamente el servicio.

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

Para iniciar sesión, el usuario debe estar registrado en `users` con su correo normalizado y `passwordHash` calculado con bcrypt. Las contraseñas en texto plano no son aceptadas.

El modelo `Service` guarda nombre, descripción, precio, duración, imagen, categoría y estado. El modelo `Reservation` guarda referencias a usuario y servicio, fecha, hora, observaciones y estado.

## Pruebas

```powershell
npm test
```
