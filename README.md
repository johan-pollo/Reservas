# Sistema de reservas

Aplicación con frontend estático y API REST en Node.js/Express. El backend usa MongoDB mediante Mongoose. Las cuentas, servicios y reservas creados correctamente por la aplicación se guardan en la base de datos; el dashboard calcula sus estadísticas a partir de esos registros.

## Requisitos

- Node.js 20 o superior.
- Cuenta de MongoDB Atlas con un cluster disponible (o una instancia local de MongoDB).
- Un navegador y un servidor estático para abrir el frontend, por ejemplo Live Server de VS Code.

## Configuración de MongoDB Atlas y ejecución local

### 1. Protege las credenciales de Atlas

La URI de conexión compartida anteriormente contenía una contraseña. **Cámbiala o revócala antes de continuar**; no reutilices esa contraseña.

En MongoDB Atlas:

1. Abre **Security → Database Access**. Cambia la contraseña del usuario expuesto o crea un usuario nuevo para esta aplicación. Dale el rol `readWrite` únicamente sobre la base de datos `Reservas`; no uses un usuario administrador del cluster.
2. Abre **Security → Network Access** y añade la IP pública desde la que ejecutarás el backend. No habilites acceso desde todas las IP (`0.0.0.0/0`) para una aplicación real.
3. En **Database → Connect → Drivers**, elige Node.js y copia la URI de conexión. Sustituye el marcador de contraseña por la nueva contraseña. Si contiene caracteres especiales, codifícalos para URI.

La URI es un secreto del backend. No la pongas en `Frontend/config.js`, HTML, JavaScript del navegador, repositorio ni capturas de pantalla.

### 2. Crea el archivo de entorno del backend

En PowerShell, desde la raíz del proyecto:

```powershell
Set-Location .\Backend
Copy-Item .env.example .env
```

Abre `Backend/.env` en VS Code y completa:

- `MONGODB_URI`: URI nueva de Atlas.
- `MONGODB_DB_NAME`: deja `Reservas` para usar esa base de datos.
- `JWT_SECRET`: genera uno con el comando siguiente y pega el resultado.
- `CLIENT_ORIGIN`: origen del frontend. Con Live Server suele ser `http://localhost:5500`; debe coincidir con el puerto que muestra VS Code. Separa varios orígenes con comas, sin barra final (por ejemplo, frontend publicado y direcciones locales).
- `RECAPTCHA_SECRET_KEY`: clave secreta de reCAPTCHA, necesaria para el registro.

Genera un secreto JWT en la terminal:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`Backend/.env` está excluido de Git. No copies secretos en este README ni en el archivo de ejemplo. El backend falla al arrancar si falta `MONGODB_URI`, en vez de conectarse silenciosamente a una base local.

### 3. Configura reCAPTCHA para el registro

En la consola de administración de reCAPTCHA, registra el dominio local que usarás (por ejemplo, `localhost`) y, si vas a publicar la aplicación, también su dominio. Copia:

- La **clave de sitio** en `Frontend/config.js`, en `RESERVAS_RECAPTCHA_SITE_KEY`. Esta clave es pública y se usa en el navegador.
- La **clave secreta** en `RECAPTCHA_SECRET_KEY` de `Backend/.env`. Esta clave es privada y nunca debe ponerse en el frontend.

Reinicia el backend tras cambiar `.env`.

### 4. Inicia el backend y el frontend

Desde `Backend`:

```powershell
npm ci
npm run dev
```

Abre `Frontend` con Live Server. Si el servidor usa un origen distinto de `http://localhost:5500`, actualiza `CLIENT_ORIGIN` en `Backend/.env` y reinicia el backend.

Comprueba `http://localhost:3000/api/health`; debe responder `{"status":"ok"}`. Al iniciar, el backend crea las colecciones e índices `users`, `services` y `reservations` en la base `Reservas`. Atlas no mostrará documentos hasta que se registren usuarios o se creen servicios y reservas desde la aplicación.

### 5. Crea la primera cuenta administradora

No se crean cuentas de ejemplo ni administradores automáticamente. Después de configurar reCAPTCHA:

1. Registra tu propia cuenta desde `Frontend/register.html`.
   El registro crea la cuenta, inicia sesión automáticamente y muestra una notificación en el dashboard.
2. En Atlas, abre **Database → Browse Collections → Reservas → users** y edita el documento de tu cuenta.
3. Cambia únicamente el campo `role` de `user` a `admin` y guarda.
4. Vuelve al dashboard. El backend consulta el rol actualizado de la cuenta y habilita la administración.

No cambies ni copies manualmente `passwordHash`; el registro guarda la contraseña usando bcrypt.

## Datos que guarda la aplicación

- `users`: perfil, rol y estado de cuenta; la contraseña se almacena como hash.
- `services`: nombre, descripción, precio, duración, imagen, categoría y estado.
- `reservations`: usuario, servicio, fecha, hora, observaciones y estado.
- Las estadísticas del dashboard se calculan al consultarlas; no se guardan como documentos aparte.
- El token de inicio de sesión permanece en el almacenamiento local del navegador, pero no es un dato de negocio ni sustituye a MongoDB.

Los servicios y usuarios se desactivan para conservar su historial y referencias. El botón de eliminar servicio ahora realiza una baja lógica (`status: inactive`), no borra el documento.

## Migrar registros existentes

El frontend de este proyecto no guarda usuarios, servicios ni reservas en el navegador; solo guarda el token de sesión. Por eso, si no tienes datos en otra base o archivo, no hay registros anteriores que importar: los nuevos se escribirán en Atlas cuando la API esté conectada.

Si tienes datos de otro sistema:

1. Haz una copia de seguridad de la fuente.
2. Exporta los documentos y revisa que coincidan con los modelos y campos descritos arriba.
3. Importa primero usuarios y servicios y después reservas, conservando las referencias `userId` y `serviceId` correctas. Utiliza MongoDB Compass o `mongosh`.
4. Nunca importes contraseñas en texto plano. Las contraseñas existentes deben migrarse como hashes compatibles o restablecerse para que cada persona elija una nueva.
5. Comprueba los documentos y las referencias en Atlas antes de permitir el uso normal.

## Publicación en Internet

Estas tareas requieren acceso a tus cuentas y las debes completar tú:

1. Publica el backend en un proveedor de Node.js y configura allí `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, `CLIENT_ORIGIN` y `RECAPTCHA_SECRET_KEY` como variables privadas del servicio.
2. Cambia `API_BASE_URL` en `Frontend/config.js` por la URL HTTPS pública de la API. El frontend ya lee esa configuración para login, registro, dashboard, servicios y usuarios.
3. Actualiza `CLIENT_ORIGIN` con el origen HTTPS exacto del frontend.
4. En Atlas, autoriza la dirección de salida del backend publicado. No incluyas la URI de MongoDB en el sitio estático.
5. Prueba registro, login, creación de servicio y reserva; revisa que aparezcan en las colecciones de Atlas.

## Pruebas del backend

```powershell
Set-Location .\Backend
npm test
```

## Endpoints principales

- `POST /api/auth/register` y `POST /api/auth/login`
- `/api/users`: administración de cuentas (requiere administrador).
- `/api/services`: catálogo y administración de servicios.
- `/api/reservations`: crear, consultar, reprogramar y cancelar reservas.
- `GET /api/dashboard/stats`: estadísticas del usuario autenticado.
- `GET /api/health`: estado de la API.
