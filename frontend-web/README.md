# Frontend web — Clínica Dental

Portal administrativo para doctora y asistente construido con React, TypeScript, Vite, React Router, Axios, Zod y Tailwind. El paciente utiliza la aplicación móvil; su rol autenticado no accede al área administrativa web.

## Desarrollo

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Configura `VITE_API_BASE_URL` con la base confirmada de Laravel, sin barra final. Los archivos `.env` y `.env.local` no se versionan. Las variables `VITE_*` son públicas y no deben contener secretos. Axios envía el Bearer Sanctum vigente. Solo el token se conserva en `sessionStorage`; los datos clínicos y las consultas permanecen en memoria y se eliminan al cerrar o cambiar de sesión.

```powershell
npm run lint
npm test
npm run build
git diff --check
```

El build ejecuta `tsc -b` antes de Vite. No existe un script TypeScript separado. Las pruebas Vitest usan mocks de contratos; no equivalen a E2E autenticado contra Laravel.

## Módulos integrados

- Autenticación, recuperación de contraseña y fotografía protegida del perfil propio.
- Dashboard, Agenda y Citas médicas: pacientes registrados y reservas por nombre, sin datos clínicos para reservas; completado con actividad y precio; generación económica confirmada por Laravel.
- Actividades y Caja: relaciones de paciente nulas, edición parcial de actividades vinculadas o anónimas existentes, ingresos solo generados por el servidor y gestión de egresos.
- Pacientes y expediente: paginación/búsqueda, alta/edición, historial clínico, odontograma persistente y evidencias JPG/JPEG/PNG/WebP/PDF de hasta 20 MB con descarga autenticada.
- Diagnósticos y tratamientos: lectura desde citas oficiales, filtro local por UUID exacto, exclusivamente doctora. La asistente consulta historial, odontograma y evidencias, según Laravel.
- Mis servicios, Reportes, Usuarios y Configuración. Historial de cambios con filtros reales, hasta 200 registros, detalle anterior/nuevo y secretos enmascarados; se conservan Acciones y Sesiones.

Los borradores clínicos se protegen ante cierre, navegación interna, Atrás/Adelante, recarga y cierre voluntario de sesión. Los formularios conservan cambios tras errores. El odontograma preserva JSON ajeno; los formatos heredados incompatibles quedan en consulta. Se utiliza `datos.frontend_web_v1.teeth` para las condiciones y observaciones editables, sin migrar estructuras de otros clientes.

Recetas y plantillas se retiraron porque el backend oficial eliminó sus rutas y tablas. No hay integración de WebSockets. La [práctica académica 3.3](docs/practica-3-3-orquestacion-frontend-hache.md) se conserva; `/resumen-cita/{id}` solo se habilita con `VITE_ENABLE_ACADEMIC_ORCHESTRATION=true` y una API académica que realmente publique esa ruta. Mantener la opción en `false` para el backend oficial.

## Auditoría y límites de validación

Consulta la [matriz completa de endpoints, permisos, payloads y resultados](docs/integration-audit.md), el [registro de ejecución](docs/integration-plan.md) y el [inventario de cambios](docs/integration-files.md).

Referencia auditada: `origin/backend` en `7ea26c5181f8881d6487513ef1e883c31431bf30`, tras `git fetch origin`. Laravel es la autoridad de datos, permisos y totales. No se agregan endpoints, ingresos, estadísticas ni datos clínicos simulados en producción.

La API configurada no estuvo accesible durante esta integración. La persistencia real y los flujos autenticados deben validarse en una base de pruebas aislada. El QA local con Playwright y respuestas de prueba se documenta separadamente de Laravel real.

Bloqueo del servidor: la eliminación de categorías usa una relación `servicios()` inexistente en el modelo oficial, por lo que no se ofrece en la web. El odontograma comprueba la última versión antes de PUT/DELETE; una garantía atómica frente a concurrencia requiere versionado del backend.
