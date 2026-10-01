# Contexto operativo del frontend web

Este proyecto es un sistema de gestión para un consultorio odontológico. Esta carpeta corresponde exclusivamente a la Máquina 2 / Frontend Web: publica la aplicación administrativa utilizada principalmente por la doctora, con acceso según roles y permisos.

El alcance web validado incluye autenticación y recuperación de contraseña; usuarios, roles y permisos; pacientes; horarios, disponibilidad, agenda, cancelaciones, reprogramaciones y lista de espera; diagnósticos, tratamientos, historial clínico, línea de tiempo y odontograma; radiografías, fotografías, casos clínicos y documentos; planes y presupuestos; ingresos y egresos; estadísticas, reportes, dashboard, notificaciones y recordatorios. Inventario no figura en el alcance inicial validado.

Flujo de integración: **Web → entrada/API del sistema → Backend → persistencia y servidor de archivos**. El frontend no accede directamente a PostgreSQL ni al File Server. No se deben inventar endpoints, contratos HTTP ni estructuras de datos, ni usar datos clínicos simulados para completar pantallas. Una función dependiente del backend permanece como integración pendiente hasta contar con un contrato real.

El frontend va un paso detrás del backend. El código integra autenticación Bearer (`POST /auth/login`, `GET /user`, `POST /auth/logout`) y registro público de pacientes (`POST /auth/register-paciente`) mediante la misma sesión. Usuarios está restringido a la doctora e integra la cuenta única de asistente. Doctora y asistente pueden consultar listado, detalle básico y registrar pacientes con `POST /pacientes`; el paciente puede consultar su propio perfil. El contrato `nombres` se verificó en Request, Controller y Model de `origin/backend`. Estas integraciones tienen pruebas automatizadas, pero la prueba extremo a extremo autenticada sigue pendiente de una sesión real. La edición de pacientes, recuperación de contraseña, datos clínicos, agenda y reportes siguen pendientes.

`VITE_API_BASE_URL` se configura localmente para la API confirmada; `.env` y `.env.local` no se versionan.

No se almacenan secretos ni credenciales en variables `VITE_*`, ya que quedan expuestas al cliente. Antes de considerar estable un cambio deben pasar `npm run lint`, `npm test` y `npm run build`.

El PDF original **Definicion del proyecto.pdf** sigue siendo la fuente formal de requisitos; este archivo es solo un resumen operativo para futuras sesiones.
