# Integración móvil con Laravel

## Configuración

Copie `.env.example` a `.env.local` y establezca `EXPO_PUBLIC_API_URL` con la URL real del API, incluyendo `/api`. En dispositivos físicos, `localhost` apunta al propio teléfono; use un host accesible desde el dispositivo. Producción debe usar HTTPS.

No se guardan contraseñas ni perfiles en almacenamiento local. El único dato persistente es el bearer token, mediante `expo-secure-store`. Al iniciar, la aplicación valida el token con `GET /user`; una respuesta 401 elimina la sesión local.

## Contratos consumidos

- Autenticación: `POST /auth/login`, `POST /auth/register-paciente`, `POST /auth/logout`, `GET /user`.
- Recuperación: `POST /auth/forgot-password`, `POST /auth/reset-password`.
- Citas: `GET /agenda/mis-citas`, `POST /agenda/solicitar-cita`.
- Paciente: `GET /paciente/mi-perfil`, `GET /paciente/mi-historial`.
- Foto: `POST /perfil/foto`, `DELETE /perfil/foto`; la lectura usa la URL autenticada devuelta por Laravel.
- Catálogo: `GET /categorias-servicios/activas`, `GET /servicios-consultorio/activos`.

Los estados 401, 403, 404, 409, 422, 429, 500 y 503 se conservan como errores tipados. Los mensajes de validación del backend se mantienen disponibles en `fieldErrors`, aunque las pantallas muestran el mensaje general del servidor.

## Límites de integración

- La aplicación no crea, edita ni cancela citas porque esos contratos no están habilitados para pacientes.
- El historial clínico es de solo lectura.
- El perfil demográfico es de solo lectura; el backend únicamente expone escritura para la foto.
- No existe modo sin conexión ni caché clínica. Una falla de red se muestra como tal.
- La verificación integral requiere un backend Laravel configurado, correo de recuperación operativo y una cuenta real de paciente activa.
