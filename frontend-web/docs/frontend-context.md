# Contexto operativo del frontend web

Este proyecto es un sistema de gestión para un consultorio odontológico. Esta carpeta corresponde exclusivamente a la Máquina 2 / Frontend Web: publica la aplicación administrativa utilizada principalmente por la doctora, con acceso según roles y permisos.

El alcance web validado incluye autenticación y recuperación de contraseña; usuarios, roles y permisos; pacientes; horarios, disponibilidad, agenda, cancelaciones, reprogramaciones y lista de espera; diagnósticos, tratamientos, historial clínico, línea de tiempo y odontograma; radiografías, fotografías, casos clínicos y documentos; planes y presupuestos; ingresos y egresos; estadísticas, reportes, dashboard, notificaciones y recordatorios. Inventario no figura en el alcance inicial validado.

Flujo de integración: **Web → entrada/API del sistema → Backend → persistencia y servidor de archivos**. El frontend no accede directamente a PostgreSQL ni al File Server. No se deben inventar endpoints, contratos HTTP ni estructuras de datos, ni usar datos clínicos simulados para completar pantallas. Una función dependiente del backend permanece como integración pendiente hasta contar con un contrato real.

No se almacenan secretos ni credenciales en variables `VITE_*`, ya que quedan expuestas al cliente. Antes de considerar estable un cambio deben pasar `npm run lint`, `npm test` y `npm run build`.

El PDF original **Definicion del proyecto.pdf** sigue siendo la fuente formal de requisitos; este archivo es solo un resumen operativo para futuras sesiones.
