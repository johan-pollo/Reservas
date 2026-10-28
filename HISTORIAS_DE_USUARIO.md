# Historias de Usuario — Sistema de Reservas

**Proyecto:** Sistema de Gestión de Reservas y Agendamiento  
**Equipo:** Hervis Castellanos (Frontend) · Johan Galvis (Backend) · Maria Gonzalez (DevOps)  
**Rotación de roles por Sprint:** Sprint 1 → Sprint 2 → Sprint 3

---

## Tabla de contenido

| Código | Historia de Usuario | Sprint | Estado |
|--------|---------------------|--------|--------|
| [HUS-01](#hus-01--inicio-de-sesión) | Inicio de sesión | Sprint 1 | ✅ Completado |
| [HUS-02](#hus-02--registro-de-usuario) | Registro de usuario | Sprint 1 | ✅ Completado |
| [HUS-03](#hus-03--dashboard) | Dashboard con estadísticas | Sprint 2 | ✅ Completado |
| [HUS-04](#hus-04--gestión-de-usuarios) | Gestión de usuarios (Admin) | Sprint 2 | ✅ Completado |
| [HUS-05](#hus-05--gestión-de-servicios) | Gestión de servicios (Admin) | Sprint 2 | ✅ Completado |
| [HUS-06](#hus-06--crear-reserva) | Crear reserva | Sprint 3 | ✅ Completado |
| [HUS-07](#hus-07--consultar-reservas) | Consultar reservas | Sprint 3 | ✅ Completado |
| [HUS-08](#hus-08--actualizar-reserva) | Actualizar reserva | Sprint 3 | ✅ Completado |
| [HUS-09](#hus-09--cancelar-reserva) | Cancelar reserva | Sprint 3 | ✅ Completado |

---

## HUS-01 — Inicio de sesión

**Historia de Usuario**

> Como usuario registrado, quiero iniciar sesión con mi correo y contraseña para acceder al panel de control de la aplicación según mis permisos.

**Criterios de aceptación**

- El usuario puede ingresar su correo electrónico y contraseña.
- El sistema valida que los campos no estén vacíos y que el correo tenga formato válido.
- Si las credenciales son correctas, el sistema emite un JWT y redirige al dashboard.
- Si las credenciales son incorrectas, el sistema muestra un mensaje de error genérico (no revela si el correo existe).
- La cuenta se bloquea temporalmente tras 5 intentos fallidos (configurable via `LOGIN_MAX_ATTEMPTS`).
- Los usuarios con cuenta inactiva reciben un error `401`.

**Endpoint implementado**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Autentica al usuario y retorna un JWT válido por 1 hora |

**Tareas**

| ID | Tarea | Área | Responsable |
|----|-------|------|-------------|
| T01 | Diseñar wireframe de la pantalla de Login | UI/UX | Frontend |
| T02 | Definir paleta de colores y tipografía | UI/UX | Frontend |
| T03 | Crear estructura HTML del formulario de Login | Frontend | Frontend |
| T04 | Implementar validaciones de campos obligatorios | Frontend | Frontend |
| T05 | Mostrar/ocultar contraseña | Frontend | Frontend |
| T06 | Crear endpoint `POST /api/auth/login` | Backend | Backend |
| T07 | Validar credenciales y comparar hash bcrypt | Backend | Backend |
| T08 | Consultar usuario en MongoDB | Base de datos | Backend |
| T09 | Implementar emisión de token JWT | Backend | Backend |
| T10 | Implementar bloqueo por intentos fallidos | Backend | Backend |
| T11 | Mostrar mensajes de error y éxito | Frontend | Frontend |
| T12 | Probar login exitoso y credenciales incorrectas | QA | DevOps |
| T13 | Crear Pull Request y realizar Code Review | Git/GitHub | Todos |

**Prueba automatizada:** ✅ `test/auth.test.js`

---

## HUS-02 — Registro de usuario

**Historia de Usuario**

> Como visitante, quiero registrarme proporcionando mi información personal para crear una cuenta y poder utilizar el sistema.

**Criterios de aceptación**

- El formulario solicita nombre, correo, teléfono (opcional), contraseña, confirmación de contraseña y aceptación de términos.
- La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula, número y símbolo.
- El correo se normaliza (minúsculas, sin espacios) y se valida su unicidad.
- El sistema valida el token reCAPTCHA con Google antes de crear la cuenta.
- El hash de la contraseña se almacena con bcrypt; la contraseña en texto plano nunca se persiste.
- Un correo ya registrado retorna `409 Conflict`.
- Si reCAPTCHA no está configurado en el servidor, retorna `503`.

**Endpoint implementado**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Crea una nueva cuenta con validación CAPTCHA |

**Tareas**

| ID | Tarea | Área | Responsable |
|----|-------|------|-------------|
| T01 | Diseñar wireframe del formulario de Registro | UI/UX | Frontend |
| T02 | Crear formulario con todos los campos requeridos | Frontend | Frontend |
| T03 | Implementar validación de formato de correo | Frontend | Frontend |
| T04 | Implementar indicador de fortaleza de contraseña | Frontend | Frontend |
| T05 | Integrar reCAPTCHA en el formulario | Frontend | Frontend |
| T06 | Crear endpoint `POST /api/auth/register` | Backend | Backend |
| T07 | Verificar unicidad del correo en MongoDB | Backend | Backend |
| T08 | Verificar token reCAPTCHA con Google | Backend | Backend |
| T09 | Hashear contraseña con bcrypt y guardar usuario | Backend | Backend |
| T10 | Mostrar confirmación y redirigir al login | Frontend | Frontend |
| T11 | Probar registro válido y correo duplicado | QA | DevOps |
| T12 | Crear Pull Request y Code Review | Git/GitHub | Todos |

**Prueba automatizada:** ✅ `test/auth.test.js`

---

## HUS-03 — Dashboard

**Historia de Usuario**

> Como usuario autenticado, quiero visualizar un panel principal para consultar rápidamente el estado del sistema y mis métricas según mi perfil de acceso.

**Criterios de aceptación**

- El dashboard requiere un JWT válido (`Authorization: Bearer <token>`).
- Un **administrador** visualiza estadísticas globales: total de usuarios, servicios (totales y activos) y reservas (por estado).
- Un **usuario regular** visualiza únicamente sus propias estadísticas y reservas recientes.
- Se muestran hasta 5 reservas recientes.
- Las cuentas inactivas reciben `401` aunque presenten un token válido.
- El sistema consulta el rol y el estado activo del usuario en cada petición (no confía solo en el token).

**Endpoint implementado**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/dashboard/stats` | Retorna estadísticas del sistema y reservas recientes |

**Tareas**

| ID | Tarea | Área | Responsable |
|----|-------|------|-------------|
| T01 | Diseñar layout del Dashboard (header, sidebar, tarjetas) | UI/UX | Frontend |
| T02 | Crear componentes de tarjetas estadísticas | Frontend | Frontend |
| T03 | Diseñar sección de reservas recientes | UI/UX | Frontend |
| T04 | Crear endpoint `GET /api/dashboard/stats` | Backend | Backend |
| T05 | Implementar lógica diferencial admin vs. usuario | Backend | Backend |
| T06 | Integrar Dashboard con la API | Frontend | Frontend |
| T07 | Implementar diseño responsive | UI/UX | Frontend |
| T08 | Probar estadísticas admin y usuario regular | QA | DevOps |
| T09 | Crear PR | Git | Todos |

**Prueba automatizada:** ✅ `test/dashboard.test.js`

---

## HUS-04 — Gestión de usuarios

**Historia de Usuario**

> Como administrador, quiero gestionar usuarios para mantener actualizada la información del sistema, controlando accesos, roles y estados de cuenta.

**Criterios de aceptación**

- Solo usuarios con rol `admin` y cuenta activa pueden acceder a las rutas `/api/users`.
- El listado soporta filtros por nombre/correo (`search`), rol, estado y paginación (1–100 resultados por página).
- La creación de usuarios aplica las mismas políticas de contraseña que el registro.
- La edición permite modificar nombre, correo, teléfono, rol y estado activo.
- La eliminación es lógica: desactiva la cuenta (`isActive: false`) sin borrar el documento.
- Un administrador no puede quitarse su propio rol ni desactivar su propia cuenta.
- Si es el único administrador activo, no se puede degradar ni desactivar.
- Los cambios concurrentes se serializan para garantizar siempre al menos un administrador activo.

**Endpoints implementados**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/users` | Listado con filtros y paginación |
| `POST` | `/api/users` | Creación de usuario por admin |
| `PUT` | `/api/users/:id` | Actualización parcial de usuario |
| `DELETE` | `/api/users/:id` | Desactivación lógica de cuenta |

**Tareas**

| ID | Tarea | Área | Responsable |
|----|-------|------|-------------|
| T01 | Diseñar pantalla de Gestión de Usuarios | UI/UX | Frontend |
| T02 | Crear tabla con búsqueda, filtros y paginación | Frontend | Frontend |
| T03 | Crear formulario Nuevo/Editar Usuario | Frontend | Frontend |
| T04 | Implementar modal de confirmación para eliminar | UI/UX | Frontend |
| T05 | Crear endpoints CRUD de usuarios | Backend | Backend |
| T06 | Implementar lógica de protección de último admin | Backend | Backend |
| T07 | Serializar cambios concurrentes de roles | Backend | Backend |
| T08 | Probar CRUD completo y casos límite | QA | DevOps |
| T09 | Crear PR y Code Review | Git/GitHub | Todos |

**Prueba automatizada:** ✅ `test/users.test.js`

---

## HUS-05 — Gestión de servicios

**Historia de Usuario**

> Como administrador, quiero gestionar el catálogo de servicios disponibles para que puedan ser consultados y seleccionados durante el proceso de reserva.

**Criterios de aceptación**

- La lectura del catálogo está disponible para cualquier usuario autenticado.
- La creación, edición y eliminación requieren rol `admin`.
- Cada servicio tiene: nombre, descripción, precio (≥0), duración (entero positivo en minutos), imagen URL (opcional), categoría y estado (`active`/`inactive`).
- El listado soporta filtros de texto (nombre, descripción, categoría), estado y paginación.
- Los recursos inexistentes retornan `404`; datos inválidos retornan `400`.

**Endpoints implementados**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/services` | Catálogo con filtros y paginación |
| `POST` | `/api/services` | Creación de servicio (Admin) |
| `PUT` | `/api/services/:id` | Actualización de servicio (Admin) |
| `DELETE` | `/api/services/:id` | Eliminación de servicio (Admin) |

**Tareas**

| ID | Tarea | Área | Responsable |
|----|-------|------|-------------|
| T01 | Diseñar pantalla de catálogo de servicios | UI/UX | Frontend |
| T02 | Crear tarjetas/listado de servicios | Frontend | Frontend |
| T03 | Crear formulario Nuevo/Editar Servicio | Frontend | Frontend |
| T04 | Implementar búsqueda y filtro por categoría/estado | Frontend | Frontend |
| T05 | Crear modelo Servicio en Mongoose | BD | Backend |
| T06 | Crear endpoints CRUD de servicios | Backend | Backend |
| T07 | Validar precio y duración en servidor | Backend | Backend |
| T08 | Probar CRUD completo | QA | DevOps |
| T09 | Crear PR y Code Review | Git | Todos |

**Prueba automatizada:** ✅ `test/services.test.js`

---

## HUS-06 — Crear reserva

**Historia de Usuario**

> Como usuario, quiero crear una reserva seleccionando un servicio, una fecha y una hora disponibles, para agendar mi cita sin solapamientos de horario.

**Criterios de aceptación**

- El usuario debe estar autenticado para poder reservar.
- El formulario solicita: servicio, fecha y hora (formato `HH:mm`), y observaciones opcionales (máx. 500 caracteres).
- El servidor valida que el servicio exista y esté activo.
- Si ya existe una reserva no cancelada para el mismo servicio, fecha y hora, retorna **`409 Conflict`**.
- La reserva se guarda con estado `confirmed` por defecto.
- La respuesta incluye los datos del servicio populados.

**Endpoint implementado**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/reservations` | Crea una reserva validando disponibilidad |

**Tareas**

| ID | Tarea | Área | Responsable |
|----|-------|------|-------------|
| T01 | Diseñar flujo de reserva paso a paso | UI/UX | Frontend |
| T02 | Crear selector de servicio | Frontend | Frontend |
| T03 | Crear selector de fecha y hora | Frontend | Frontend |
| T04 | Diseñar tarjeta resumen antes de confirmar | UI/UX | Frontend |
| T05 | Mostrar modal de confirmación con datos finales | Frontend | Frontend |
| T06 | Crear modelo `Reservation` en Mongoose | BD | Backend |
| T07 | Crear endpoint `POST /api/reservations` | Backend | Backend |
| T08 | Validar disponibilidad y detectar traslapes | Backend | Backend |
| T09 | Guardar reserva con estado `confirmed` | BD | Backend |
| T10 | Mostrar mensajes de horario no disponible | Frontend | Frontend |
| T11 | Probar reserva exitosa y conflicto 409 | QA | DevOps |
| T12 | Crear PR y Code Review | Git/GitHub | Todos |

**Prueba automatizada:** ✅ `test/reservations.test.js` — *"HUS-06: agenda una reserva y valida disponibilidad evitando traslapes (409 Conflict)"*

---

## HUS-07 — Consultar reservas

**Historia de Usuario**

> Como usuario, quiero consultar el historial de mis reservas con información clara sobre fechas, horarios y estados, y poder filtrar por criterios de búsqueda.

**Criterios de aceptación**

- El listado retorna únicamente las reservas del usuario autenticado (según su JWT).
- Soporta filtros opcionales por estado (`pending`, `confirmed`, `cancelled`, `completed`) y rango de fechas (`startDate`, `endDate`).
- El resultado incluye paginación (`page`, `limit`, `total`, `totalPages`).
- Los datos del servicio se incluyen populados (nombre, precio, duración, categoría).
- Los administradores pueden ver todas las reservas del sistema.

**Endpoint implementado**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/reservations` | Listado de reservas del usuario con filtros y paginación |

**Tareas**

| ID | Tarea | Área | Responsable |
|----|-------|------|-------------|
| T01 | Diseñar pantalla "Mis Reservas" | UI/UX | Frontend |
| T02 | Crear tabla/lista de tarjetas con badges de estado | Frontend | Frontend |
| T03 | Implementar filtros de búsqueda por estado y fecha | Frontend | Frontend |
| T04 | Crear endpoint `GET /api/reservations` | Backend | Backend |
| T05 | Filtrar por ID del usuario desde el token JWT | Backend | Backend |
| T06 | Implementar populate de Mongoose con datos del servicio | Backend | Backend |
| T07 | Soportar parámetros de consulta (query params) | Backend | Backend |
| T08 | Probar consultas y filtros | QA | DevOps |
| T09 | Crear PR | Git | Todos |

**Prueba automatizada:** ✅ `test/reservations.test.js` — *"HUS-07: lista reservas asociadas al usuario autenticado con filtros"*

---

## HUS-08 — Actualizar reserva

**Historia de Usuario**

> Como usuario, quiero modificar una reserva existente para cambiar su fecha u hora cuando sea necesario, sin generar conflictos de disponibilidad.

**Criterios de aceptación**

- Solo el propietario de la reserva (o un administrador) puede modificarla.
- No se permite reprogramar reservas con estado `cancelled`.
- El servidor re-valida que la nueva fecha y hora no colisionen con otra reserva existente (retorna `409` en caso de conflicto).
- Se actualizan los campos: fecha, hora y/u observaciones.
- La respuesta incluye la reserva actualizada con el servicio populado.

**Endpoint implementado**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `PUT` | `/api/reservations/:id` | Reprograma fecha y hora de una reserva |

**Tareas**

| ID | Tarea | Área | Responsable |
|----|-------|------|-------------|
| T01 | Añadir botón "Editar" en la tarjeta de cada reserva activa | Frontend | Frontend |
| T02 | Abrir modal con datos actuales pre-cargados | Frontend | Frontend |
| T03 | Permitir seleccionar nueva fecha y hora | Frontend | Frontend |
| T04 | Crear endpoint `PUT /api/reservations/:id` | Backend | Backend |
| T05 | Verificar propietario de la reserva | Backend | Backend |
| T06 | Bloquear edición en reservas canceladas | Backend | Backend |
| T07 | Re-validar disponibilidad del nuevo horario | Backend | Backend |
| T08 | Actualizar el registro en MongoDB | BD | Backend |
| T09 | Actualizar lista automáticamente al guardar cambios | Frontend | Frontend |
| T10 | Probar actualización y conflicto de horario | QA | DevOps |
| T11 | Crear PR y Code Review | Git/GitHub | Todos |

**Prueba automatizada:** ✅ `test/reservations.test.js` — *"HUS-08: permite modificar la reserva re-validando disponibilidad"*

---

## HUS-09 — Cancelar reserva

**Historia de Usuario**

> Como usuario, quiero cancelar una reserva activa para liberar el horario seleccionado y permitir que otros usuarios lo puedan reservar.

**Criterios de aceptación**

- Solo el propietario (o un administrador) puede cancelar la reserva.
- Si la reserva ya está en estado `cancelled`, retorna `400 Bad Request`.
- El estado del documento cambia a `cancelled` en MongoDB.
- El horario queda inmediatamente disponible para nuevas reservas.
- La respuesta incluye la reserva con estado actualizado.

**Endpoint implementado**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `PATCH` | `/api/reservations/:id/cancel` | Cancela la reserva y libera el cupo horario |

**Tareas**

| ID | Tarea | Área | Responsable |
|----|-------|------|-------------|
| T01 | Añadir botón "Cancelar Reserva" con estilo destructivo (rojo) | Frontend | Frontend |
| T02 | Mostrar modal de confirmación con datos de la reserva | UI/UX | Frontend |
| T03 | Cambiar estado visual inmediatamente tras la respuesta | Frontend | Frontend |
| T04 | Crear endpoint `PATCH /api/reservations/:id/cancel` | Backend | Backend |
| T05 | Comprobar existencia y propiedad de la reserva | Backend | Backend |
| T06 | Validar que la reserva esté activa (no ya cancelada) | Backend | Backend |
| T07 | Modificar estado a `cancelled` en MongoDB | BD | Backend |
| T08 | Devolver confirmación para liberar el horario | Backend | Backend |
| T09 | Probar cancelación exitosa y re-agenda del horario liberado | QA | DevOps |
| T10 | Crear PR y Code Review | Git/GitHub | Todos |

**Prueba automatizada:** ✅ `test/reservations.test.js` — *"HUS-09: cancela una reserva y libera el horario"*

---

## Criterios de aceptación globales del sistema

| Criterio | Descripción |
|----------|-------------|
| **Autenticación** | Todas las rutas protegidas requieren `Authorization: Bearer <JWT>` válido |
| **Autorización RBAC** | Las rutas administrativas requieren rol `admin` activo |
| **Estado activo** | El sistema consulta `isActive` en cada petición; tokens válidos de cuentas inactivas se rechazan |
| **Seguridad** | Helmet (cabeceras seguras), CORS parametrizable, Rate Limiting en `/api/auth` |
| **Validaciones** | Todos los endpoints validan entradas y retornan mensajes de error descriptivos |
| **Datos sensibles** | El `passwordHash` nunca se incluye en las respuestas al cliente |

---

## Modelo de datos — Colecciones MongoDB

### `users`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | String | Nombre completo del usuario |
| `email` | String | Correo normalizado (único) |
| `phone` | String | Teléfono (opcional) |
| `passwordHash` | String | Hash bcrypt de la contraseña |
| `role` | `user` \| `admin` | Rol del sistema |
| `isActive` | Boolean | Estado activo de la cuenta |

### `services`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | String | Nombre del servicio |
| `description` | String | Descripción (opcional) |
| `price` | Number | Precio ≥ 0 |
| `durationMinutes` | Number | Duración en minutos (entero > 0) |
| `imageUrl` | String | URL de imagen (opcional) |
| `category` | String | Categoría del servicio |
| `status` | `active` \| `inactive` | Estado del servicio |

### `reservations`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `userId` | ObjectId | Referencia al usuario |
| `serviceId` | ObjectId | Referencia al servicio |
| `date` | Date | Fecha de la reserva |
| `time` | String | Hora en formato `HH:mm` |
| `notes` | String | Observaciones (opcional) |
| `status` | `pending` \| `confirmed` \| `cancelled` \| `completed` | Estado de la reserva |

---

## Roles en el Sprint 3 (Rotación de roles)

| Integrante | Rol Sprint 3 | Responsabilidades |
|------------|-------------|-------------------|
| **Hervis Castellanos** | Frontend Developer | HUS-06/07/08/09 interfaz, formulario de reservas, modal de cancelación |
| **Johan Galvis** | Backend Developer | HUS-06/07/08/09 API endpoints, validaciones y pruebas automatizadas |
| **Maria Gonzalez** | DevOps Engineer | GitHub Actions CI, gestión de Issues, PR reviews y release final |

---

## Flujo Git/GitHub por Historia de Usuario

```
Issue (HUS-XX)
    ↓
Rama feature/HUS-XX-descripcion
    ↓
Desarrollo + Commits
    ↓
Push → GitHub Actions (CI) valida
    ↓
Pull Request → Code Review
    ↓
Merge a develop
    ↓
Release PR → main (versión estable)
```

---

*Documento generado con base en los archivos de la carpeta `Documentación/` del proyecto.*  
*Fuentes: `HUS_Tareas_UIUX_GitHub.md` · `HUS GITHUB Project.docx` · `Sprint 3 devops.docx`*
