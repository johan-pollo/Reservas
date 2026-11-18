# Backend de reservas

La configuración paso a paso de MongoDB Atlas, reCAPTCHA, el frontend, el primer administrador y la migración de datos está en el [README principal](../README.md#configuración-de-mongodb-atlas-y-ejecución-local).

## Ejecutar localmente

Desde esta carpeta, crea `.env` copiando `.env.example`, completa sus variables y luego ejecuta:

```powershell
npm ci
npm run dev
```

El backend requiere `MONGODB_URI` y un `JWT_SECRET` de al menos 32 caracteres. Prepara las colecciones `users`, `services` y `reservations` al iniciar. Comprueba la API en `http://localhost:3000/api/health`.

## Pruebas

```powershell
npm test
```
