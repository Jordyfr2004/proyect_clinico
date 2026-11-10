# Auditoría técnica del frontend web

**Fecha y alcance.** 2026-10-17; rama `frontend-web`, commit `77369a2d20d71ff616d29d6c99787d10ab4e9b51` (igual a `origin/frontend-web` al iniciar), árbol de trabajo limpio al inicio. Referencia Laravel leída sin checkout desde `origin/backend` `e676dec44e503d58ec3e22933a048779265fd9c0`. Solo se crearon informes en `docs/audits/`; no se corrigió la aplicación ni se efectuaron operaciones contra datos clínicos.

## Dictamen ejecutivo

La base compila y sus 268 pruebas pasan, pero ello **no valida** las condiciones de red adversa, concurrencia, navegación con estado ni la accesibilidad del portal autenticado. Se registraron **18 hallazgos** (P0: 0; P1: 0; P2: 8; P3: 8; P4: 2). Catorce son comprobables en el código o el lockfile; cuatro describen carreras/condiciones que requieren reproducción controlada. Ninguno se confirmó mediante E2E con una cuenta real. El detalle auditable, con líneas, escenarios y pruebas de aceptación, está en [MATRIZ_HALLAZGOS.md](MATRIZ_HALLAZGOS.md).

Los frentes más expuestos son **Usuarios/cuentas de paciente** (barrido de todas las páginas), **Pacientes** (resultado ambiguo de escritura), **consultas de varias pantallas** (reemplazo por loading, duplicación y fallos parciales), y **Auth** (401 tardío/restauración). Prioridad recomendada: separar éxito de mutación de recarga (WEB-009/010/013), aislar 401 a la sesión que originó la solicitud (WEB-001), después reducir peticiones y preservar datos válidos (WEB-004 a 008, WEB-015). Ningún indicio obtenido autoriza concluir que exista acceso clínico indebido o fuga de token.

## Método y línea base

| Comprobación | Resultado |
| --- | --- |
| `git branch --show-current`, `git status --short`, `git rev-parse HEAD` | `frontend-web`, limpio al inicio, SHA arriba |
| `npm run build` | Pasa; Vite 8.3.0, 2099 módulos transformados; `index` 334,44 kB / 105,46 kB gzip; un chunk de esquemas 136,22 kB / 42,61 kB gzip |
| `npm run lint` | Pasa, Oxlint sin errores |
| `npm run test` | Pasa, 32 archivos y 268 pruebas; última ejecución 10,72 s; Vitest advierte 32 entornos jsdom y 60,32 s agregados de preparación |
| `npx tsc --noEmit -p tsconfig.app.json` | Pasa |
| `npm audit --json` | Sale con código 1: una alerta alta transitiva en `source-map-js@1.2.1` |
| `npm audit --omit=dev --json` | Sale con código 0: cero alertas en dependencias de producción |

No se ejecutó un navegador E2E autenticado: no se proporcionaron credenciales de prueba ni un entorno clínico desechable y no sería correcto usar datos reales para fabricar evidencia. Se intentó abrir un navegador aislado sobre Vite local; la superficie `iab` no estaba disponible. El servidor local temporal se detuvo. Tampoco se midieron tiempos reales de Laravel, waterfall de red, CPU de React, WCAG con tecnologías asistivas ni respuestas de una base de datos real. Las cantidades de GET citadas en el informe de rendimiento se derivan del flujo de código y se etiquetan como tales.

## Arquitectura examinada

- Entrada `src/main.tsx` → `App.tsx` → `AuthProvider` → `AppRouter` → `AppLayout`/rutas perezosas.
- Cliente HTTP único `src/services/apiClient.ts`, token Bearer en `sessionStorage`, eventos globales 401/403; autorización visual por `roleAccess.ts`, Laravel como autoridad.
- Servicios por dominio con validación Zod de respuesta: auth, asistente/cuentas, pacientes, historial, evidencias, agenda/citas, actividades, caja, reportes, categorías/servicios, auditoría y fotografía.
- Pantallas de Diagnósticos/Odontograma/Tratamientos permanecen informativas o pendientes; no se detectó consumo de endpoints clínicos inventados para ellas.
- Estado de consultas predominantemente local por página y rutas lazy. `requestId`/cleanup impiden algunas escrituras de UI fuera de orden, pero no cancelan el HTTP. No hay caché compartida. `AccessibleDialog` contiene Escape, retorno y trampa de foco; sus pruebas existentes son relevantes, no acreditan todas las combinaciones de lector de pantalla/zoom.

## Revisión funcional por módulo

| Módulo | Recorrido de código revisado | Conclusión y límites |
| --- | --- | --- |
| Login/recuperación/perfil | formularios → `authService`/foto → Axios → Auth/Password/UsuarioController → UI | Rutas y payload principales coinciden; WEB-001/002/014 y fotos WEB-012. Flujo real de correo no probado. |
| Dashboard | permisos → cuatro fuentes en doctora/dos en asistente → tarjetas/listas | Sin KPIs inventados: errores y loading se distinguen; WEB-015 y pérdida de datos WEB-006. No se midió respuesta real. |
| Pacientes/expediente | paginación/búsqueda → GET/POST/PUT → respuesta y recarga | Contrato de paginación de 20 coincide; WEB-009/010, carga WEB-007. `PatientDetail key={patientId}` evita reutilizar datos entre IDs al cambiar ruta. |
| Historial clínico | lectura por paciente, creación/edición doctora, reconciliación 404/422 | Comprueba `paciente_id` del resultado antes de mostrarlo; no se halló defecto nuevo confirmado. Sin E2E concurrente. |
| Diagnósticos/Odontograma/Tratamientos | pestaña y contenido informativo | No se simulan registros ni se hacen escrituras. Futuros contratos no se trataron como implementación actual. |
| Evidencias | GET por paciente y metadatos | Lectura real; validación de respuesta; no se descarga el archivo desde esta pantalla. Ausencia de prueba de descarga/E2E. |
| Agenda/Citas | meses, solicitudes pendientes, creación/edición/cancelación/finalización | Métodos y rutas principales presentes; WEB-006/008. Solo la doctora ve estas rutas, coherente con middleware Laravel. |
| Actividades | filtros/lista/resumen/lookup/CRUD | WEB-011, WEB-008, pérdida de filtros al remontar. Laravel revalida código antes de mutar. |
| Caja/Reportes | ingresos/egresos, períodos, formatos decimales | `reportService` exige cadenas monetarias de dos decimales, como `ReporteService`; WEB-008 en Caja. No se validó precisión con importes reales extremos. |
| Usuarios/Servicios/Auditoría | paginación/barrido, mutaciones, estados | WEB-004/013/017; WEB-008 para Servicios. Roles de doctora coinciden con Laravel. |

## Riesgos diferenciados

**Frontend confirmado:** mezcla de resultado de escritura y recarga; consultas que borran visualmente datos válidos; barrido paginado; nombres accesibles repetidos; desalineación de longitud del login. **Condiciones probables:** respuesta 401 de sesión vieja, respuesta perdida de POST, lookup fuera de orden, duplicación diagnóstica por StrictMode. **Backend/infraestructura pendiente de medir:** latencia, frecuencia de 5xx, tamaño de fotos, volumen de usuarios, validez de sesiones al caer `/user`, manejo de errores al perder respuesta de mutaciones. No se imputa al frontend la implementación interna de Laravel ni se recomienda escribir en producción para probarla.

## Evidencia positiva y seguridad

No se encontró `dangerouslySetInnerHTML`, almacenamiento de token en `localStorage`, logs de token, inserción de mocks clínicos en runtime ni uso directo de File Server/PostgreSQL. React escapa texto de respuestas; Zod rechaza varias formas inesperadas. Las rutas y acciones se ocultan según rol en la interfaz y los grupos de rutas Laravel tienen middleware propio. `ProtectedPhoto` usa Bearer vía Axios y revoca Object URLs al desmontar; no se demuestra fuga de Blob. Estos controles **no** equivalen a una certificación de seguridad ni WCAG 2.2 AA.

## Entrega y lectura

- [MATRIZ_HALLAZGOS.md](MATRIZ_HALLAZGOS.md): 18 fichas con causalidad, impacto, corrección y prueba.
- [AUDITORIA_RENDIMIENTO.md](AUDITORIA_RENDIMIENTO.md): red, render, estado, caché y propuesta TanStack Query.
- [AUDITORIA_SEGURIDAD.md](AUDITORIA_SEGURIDAD.md): sesiones, permisos, fotos, dependencias y límites de explotación.
- [AUDITORIA_BACKEND_CONTRATOS.md](AUDITORIA_BACKEND_CONTRATOS.md): trazabilidad pantalla/servicio/Laravel.
- [COBERTURA_PRUEBAS.md](COBERTURA_PRUEBAS.md): cobertura existente y casos faltantes.
- [PLAN_CORRECCIONES.md](PLAN_CORRECCIONES.md): orden y criterios de aceptación sin implementación.
