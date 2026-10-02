# Contexto operativo del frontend web

Este proyecto es un sistema de gestión para un consultorio odontológico. Esta carpeta corresponde exclusivamente a la Máquina 2 / Frontend Web: publica el portal administrativo exclusivo de doctora y asistente. El paciente pertenece al flujo móvil; su registro, verificación de identidad y vinculación con expediente no se exponen en web.

El alcance web validado incluye autenticación y recuperación de contraseña; usuarios, roles y permisos; pacientes; horarios, disponibilidad, agenda, cancelaciones, reprogramaciones y lista de espera; diagnósticos, tratamientos, historial clínico, línea de tiempo y odontograma; radiografías, fotografías, casos clínicos y documentos; planes y presupuestos; ingresos y egresos; estadísticas, reportes, dashboard, notificaciones y recordatorios. Inventario no figura en el alcance inicial validado.

Flujo de integración: **Web → entrada/API del sistema → Backend → persistencia y servidor de archivos**. El frontend no accede directamente a PostgreSQL ni al File Server. No se deben inventar endpoints, contratos HTTP ni estructuras de datos, ni usar datos clínicos simulados para completar pantallas. Una función dependiente del backend permanece como integración pendiente hasta contar con un contrato real.

El frontend integra autenticación Bearer real (`POST /auth/login`, `GET /user`, `POST /auth/logout`), la cuenta única de asistente solo para doctora —incluida eliminación con confirmación— y pacientes administrativos GET listado, GET detalle y POST para doctora y asistente. La búsqueda filtra en el cliente los pacientes recibidos; el resumen usa solo los seis campos confirmados. `paciente` se conserva en AuthUser para reconocer respuestas del backend, pero el guard impide montar AppLayout y ofrece cerrar sesión. No hay registro público ni perfil de paciente en web. No existen datos simulados en runtime.

PUT paciente sigue pendiente: no existe `PacienteController::update()`. Historial clínico se integra en la pestaña del expediente: GET por paciente para doctora/asistente; POST y PUT solo para doctora, usando `sexo`, `lugar_nacimiento`, `antecedentes_enfermedades`, `cirugias` y `medicacion_actual`. Recuperación de contraseña, diagnósticos, tratamientos, odontograma, radiografías, agenda/citas, horarios, lista de espera y reportes/dashboard siguen pendientes de backend. También permanecen registrados el GET `/usuarios/{id}` duplicado, los módulos placeholder y las rutas clínicas sin autorización por rol. Revalidar siempre el contrato contra `origin/backend` actualizado. Tests y QA con respuestas aisladas no equivalen a E2E autenticado con Laravel; no se documenta aún una prueba E2E real de estas integraciones. La eliminación de asistente y escritura clínica real requieren prueba manual autorizada.

Solo el `access_token` se conserva en sessionStorage como decisión provisional V1; nunca contraseñas ni objetos clínicos. No hay cierre por inactividad: la duración y su alineación con backend deben acordarse antes de implementarlo.

`VITE_API_BASE_URL` se configura localmente para la API confirmada; `.env` y `.env.local` no se versionan.

No se almacenan secretos ni credenciales en variables `VITE_*`, ya que quedan expuestas al cliente. Antes de considerar estable un cambio deben pasar `npm run lint`, `npm test` y `npm run build`.

El PDF original **Definicion del proyecto.pdf** sigue siendo la fuente formal de requisitos; este archivo es solo un resumen operativo para futuras sesiones.
