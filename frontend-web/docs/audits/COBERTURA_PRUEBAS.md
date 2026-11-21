# Cobertura de pruebas y verificación ejecutada

Base: `77369a2d20d71ff616d29d6c99787d10ab4e9b51`. `npm run test` pasó con **32 archivos y 268 pruebas**; Vitest + Testing Library + jsdom. También pasaron lint, build y `npx tsc --noEmit -p tsconfig.app.json`. No se ejecutó suite Playwright E2E ni pruebas contra Laravel real. Los mocks de tests son aislados; no existen mocks clínicos en runtime detectados.

## Qué demuestran y qué no

La suite comprueba componentes y servicios con respuestas controladas, navegación en `MemoryRouter`, restricciones de rol y varios errores 401/403/404/409/422. `apiClient.test.ts` valida baseURL, Accept, Bearer y emisión básica de eventos; **no** simultaneidad de sesiones. `AuthContext.test.tsx` demuestra que la caída de red en restauración borra token, lo que convierte WEB-002 en una decisión de política/resiliencia que debe revisarse, no en regresión inadvertida. `PatientWorkspace` usa `key={patientId}`, así que no se registró como fuga entre expedientes. Varias pruebas comprueban bloqueo de doble envío de mutaciones concretas, pero no lo convierten en garantía universal de idempotencia ni reconciliación de resultados ambiguos.

Una prueba que pasa con un `vi.mock` de un servicio verifica la UI **frente a esa respuesta simulada**; no verifica despliegue Laravel, middleware, CORS, FTP, correo, rendimiento ni persistencia. El contador 268 no es porcentaje de cobertura de líneas/ramas; no se ejecutó instrumentación de cobertura.

## Matriz de funciones

| Función | Pruebas existentes | Escenarios cubiertos visibles | Escenarios faltantes / riesgo |
| --- | --- | --- | --- |
| Router, roles, drawer, 403 | `AppRouter.test.tsx` | redirección sin auth, rutas por rol, aviso 403, Escape/Tab/foco móvil | E2E con HTTP 403/401 real, zoom/lector de pantalla, sesión A/B (WEB-001). |
| Login/Auth/recuperación | `authService`, `AuthContext`, `loginSchema`, `ForgotPasswordPage` | payload, Bearer, 422/429, restauración y logout; fallo de red actual | login con contraseña corta permitida por Laravel (WEB-014), dos sesiones sucesivas y respuesta tardía, correo real, throttling integrado. |
| Fotografías | `profilePhotoService`, `ProtectedPhoto`, `ProfilePhotoControl` | GET Blob, fallback, subida/borrado y foco | deduplicación al montar avatares iguales (WEB-012), bytes/MIME reales, rechazo FTP, memoria bajo navegación prolongada. |
| Dashboard | `DashboardPage.test.tsx` | fuentes reales por rol, carga, error, retry y vacíos honestos | conteo exacto de GET al reintentar una sola tarjeta (WEB-015), navegación ida/vuelta, network waterfall. |
| Pacientes/expediente | `patientService`, `patientPages` | GET paginado/búsqueda, POST payload, nulos, error 422, foco y secciones | PUT 200 + GET 503 (WEB-009); POST aceptado/respuesta perdida (WEB-010); preservación de búsqueda/página (WEB-006); filtros rápidos/cancelación. |
| Historial/diagnósticos/odontograma/tratamientos | `clinicalHistoryService`, `ClinicalHistorySection`, `patientPages` | lectura y permisos, crear/editar, 404/422, pestañas pendientes | cambio rápido de expediente durante respuestas, E2E con relaciones reales; no hay flujo CRUD de módulos pendientes que probar. |
| Evidencias | `PatientEvidenceSection.test.tsx`, `realModulesService.test.ts` | metadatos recibidos y estados | descarga real de archivo no implementada; MIME/FTP, respuestas malformadas, fotos grandes. |
| Agenda/Citas | `agendaService`, `AgendaPage`, `MedicalAppointmentsPage` | contratos, meses/estados, programación, 409/422, clínicos, foco | cambios rápidos de mes con GET retenidos, fallo parcial de las dos consultas (WEB-008), navegación Agenda↔Citas con conteo de GET. |
| Actividades | `activityService`, `ActivitiesPage` | filtros, total, lookup 404, CRUD y fallo de recarga | código editado durante lookup pendiente (WEB-011), múltiples respuestas invertidas, precisión de centavos en backend. |
| Caja/Reportes | `CashPage`, `reportService`, `ReportsPage`, `realModulesService` | importes backend, filtros, CRUD, errores de reporte | resumen 200/lista 503 y viceversa (WEB-008), decimales extremos, año/período límite, rendimiento de reportes. |
| Usuarios | `assistantService`, `UsersPage`, `PatientAccountsSection` | 404/409/422, bloqueos mutación, DELETE confirmado, focus | GET fallido después de DELETE 200 (WEB-013), 50 páginas de cuentas (WEB-004), término cambiado durante barrido. |
| Servicios/Auditoría | `catalogService`, `CatalogPage`, `SystemActivityPage`, `realModulesService` | cargas, CRUD/estados, filtro y ocultación | respuestas parciales en Servicios (WEB-008), nombres accesibles repetidos en Auditoría (WEB-017), volumen alto. |
| Infraestructura HTTP/errores | `apiClient.test.ts`, `AppErrorBoundary.test.tsx` | eventos básicos y fallback de render | timeout  y JSON/HTML malformado, 401 tardío de otra sesión, estrés StrictMode (WEB-003/016). |

## Pruebas prioritarias nuevas

1. Interceptor con petición A retenida, token B aceptado, 401 de A; después 401 de B. Demuestra WEB-001 y ausencia de exposición entre sesiones.
2. Paciente: PUT 200 seguido de GET 503; POST que se confirma pero pierde respuesta. Aserciones separadas de mutación y reconciliación, sin DB real.
3. Barrido de 3+ páginas con búsqueda que cambia antes de finalizar; medir peticiones, cancelación y resultado mostrado.
4. Actividades: lookup A diferido, cambiar código a B y resolver A; el nombre A no puede mostrarse bajo B.
5. Cada pareja de consultas 200/503 y 503/200; datos válidos visibles y error local; sin fabricar ceros.
6. Router ida/vuelta a pacientes y meses; filtros/query y cuentas de red según diseño aceptado.
7. Dos filas de auditoría con nombres accesibles distintos; navegación por teclado y lector manual.
8. Pruebas de foto con dos avatares del mismo usuario, revocación de Blob y limpieza después de logout.
9. Escenario de React StrictMode en desarrollo con contador de GET; separar del build producción.

## E2E recomendado y restricciones

En staging con cuentas y datos desechables **autorizados**, Playwright debería cubrir doctora/asistente/paciente, acceso directo a rutas, login/401/403/logout, cada formulario real, 404/409/422/429/5xx, red lenta/desconectada, cambios rápidos de filtros, 390/768/1280/1920 px, zoom 200 %, foco, Escape, scroll horizontal y consola. No crear datos clínicos falsos en runtime: las respuestas simuladas solo en tests aislados. Un eventual test de mutación E2E debe usar un entorno descartable y permisos expresos, nunca la base clínica de trabajo. Las pruebas de lector de pantalla y contrastes WCAG 2.2 AA necesitan revisión manual adicional. Esta auditoría no presenta esas verificaciones como ejecutadas.
