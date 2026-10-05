# Decisiones del frontend web

## 2026-09-27

- No usar datos simulados como sustituto de integraciones reales. Las funciones sin contrato de backend permanecen pendientes de integración.
- Retirar provisionalmente Inventario: no aparece en el alcance funcional inicial validado para la aplicación web en el PDF.
- Representar respuestas HTTP 403 con un aviso descartable; una operación denegada no debe bloquear permanentemente toda la aplicación.
- Mantener accesibilidad básica en la navegación móvil: `aria-expanded` refleja su estado y Escape cierra el menú.
- Mantener el frontend separado del backend, la base de datos y la aplicación móvil; la comunicación con datos y archivos pasa por la API del sistema.

## 2026-09-28

- El registro público corresponde únicamente a clientes, sin selector de rol. La doctora será la única superadmin y creará a los asistentes desde el área administrativa. La integración del registro queda pendiente hasta confirmar el contrato del backend.

## 2026-09-30

- El backend confirmó que el inicio de sesión utiliza `username`: la doctora usa su nombre de usuario y los pacientes pueden usar su cédula. La autenticación emplea tokens Bearer de Laravel Sanctum. El frontend envía el token en `Authorization` y conserva únicamente el `access_token` en `sessionStorage`, de forma provisional para esta V1; el usuario se reconstruye con `GET /user`.

## 2026-10-01

- El backend contempla una única cuenta de asistente. Su gestión en Usuarios consume exclusivamente los endpoints confirmados de consulta, creación, activación, desactivación y cambio de contraseña, bajo el acceso de doctora. Un GET 404 indica que aún no existe la cuenta y habilita su creación; no se muestran datos ni acciones ficticios.
- La recuperación de contraseña permanece pendiente de integración. Una sesión ya autenticada regresa al Dashboard desde esa ruta pública.
- Decisión histórica, sustituida por la aclaración de alcance siguiente: el registro público de pacientes consumía el contrato verificado de `POST /auth/register-paciente` y acepta la sesión con la infraestructura existente. El listado y detalle básico de pacientes y el perfil propio solo muestran respuestas validadas del backend. Estos flujos están cubiertos por pruebas automatizadas; su prueba extremo a extremo queda pendiente de Laravel disponible.
- La integración de `POST /pacientes` se mantuvo bloqueada mientras Request y Controller usaban `nombre` y el modelo usaba `nombres`. En `origin/backend` `60b3e13f81c9cfe5dc4e400085a61186ca67d925`, los tres usan `nombres`; se habilitó el registro administrativo con pruebas automatizadas. La prueba extremo a extremo autenticada sigue pendiente de una sesión real. La edición PUT continúa pendiente porque `PacienteController::update()` no está implementado; tampoco se conectan módulos con respuestas placeholder.

### Aclaración de alcance y auditoría de baseline — 2026-10-01

- Web = doctora/asistente; paciente = móvil. Se retiran registro público y perfil del paciente, con sus servicios y pruebas exclusivos. La decisión del 2026-09-28 sobre registro público no implica registro web. AuthUser conserva `paciente`, pero el guard anterior a AppLayout le muestra una vista neutral con cierre de sesión, nunca navegación administrativa.
- Login y sesión reales, cuenta única de asistente y pacientes administrativos GET/GET/POST permanecen integrados. Desactivar asistente requiere confirmación accesible porque revoca tokens; la respuesta de consulta/creación valida email. En esta auditoría todavía no se integraban DELETE asistente ni PUT paciente.
- No hay datos simulados en runtime; los mocks pertenecen únicamente a pruebas. Solo se persiste access_token en sessionStorage como V1 provisional, con riesgo residual ante XSS; migrar a HttpOnly requiere acuerdo backend. No se implementa timeout por inactividad hasta confirmar duración y política compartida.
- Historial clínico se identificó como siguiente candidato: GET listado devuelve `data[]`, GET por paciente/id devuelve `data` o 404, doctora/asistente pueden consultar; POST/PUT son solo doctora. Campos actuales: paciente_id, sexo, lugar_nacimiento, antecedentes_enfermedades, cirugias y medicacion_actual. En esa auditoría todavía no se consumía desde web. El historial propio del paciente pertenece al móvil.
- Contratos verificados en esta auditoría contra frontend `18363bc3a9b78f28994a3ce4895a194cb5a55102` y backend `9bd91032fe053a844759c2bbd54df503c1fa37fe`. Son referencias históricas de la inspección, no versiones fijadas: hacer fetch y revalidar antes de cada integración.
- QA automatizado y navegador con respuestas aisladas de prueba no equivalen a E2E con Laravel y una sesión real.

### Hallazgos de seguridad y bloqueos de esta inspección

1. **Alta, backend/móvil pendiente:** `AuthController::registerPaciente()` busca por cédula y vincula un expediente existente usando datos suministrados, sin OTP/verificación de identidad en el flujo inspeccionado. Una cédula conocida podría permitir apropiarse de una cuenta de expediente aún no vinculada. Resolver antes de dar por completo el registro móvil.
2. **Alta, bloqueo de futuras integraciones:** `routes/api.php` aplica únicamente auth:sanctum a citas, horarios, lista de espera, diagnósticos, tratamientos, odontogramas, radiografías y reportes/dashboard. Un paciente autenticado puede invocar esos placeholders; definir autorización por rol/propiedad antes de introducir datos reales. Los guard del web no sustituyen controles backend.
3. **Media, corregida en web:** `src/app/AppRouter.tsx`, ProtectedArea, anteriormente montaba AppLayout para cualquier sesión autenticada. Ahora verifica personal antes del shell; las rutas manuales de paciente y el logout están cubiertos por pruebas.
4. **Media, corregida en web:** `src/features/assistant/UsersPage.tsx` desactivaba directamente una cuenta que revoca sesiones. Ahora requiere confirmación, con cancelación, Escape, foco y bloqueo de envío repetido.
5. **Media, pendientes backend:** GET usuarios/{id} duplicado y PUT pacientes/{id} sin update real. Recuperación, citas, horarios, lista de espera, reportes/dashboard, diagnósticos, tratamientos, odontograma y radiografías siguen devolviendo mensajes placeholder.
6. **Pendientes de producto/despliegue:** duración de inactividad no acordada; E2E real pendiente. Cabeceras CSP y política de expiración de tokens deben verificarse en el despliegue; no se infieren del código web.
7. **Media, corregida en web:** el drawer permitía que Tab alcanzara el contenido detrás del menú. AppLayout ahora mantiene Tab/Shift+Tab dentro del drawer visible, con semántica de diálogo; conserva Escape y retorno del foco. Verificado con navegador y test de regresión.

El backend solo fue leído con `git show origin/backend:<ruta>`. No se modificó. No se encontraron secretos, IP/URL backend hardcodeadas, HTML inseguro, logs de depuración ni llamadas HTTP fuera del cliente central en runtime. Los 422 muestran mensajes de validación; no se renderizan trace/exception ni cuerpos de error completos. FormField permanece como infraestructura reutilizable aunque actualmente no tenga consumidores.

QA Playwright de baseline: login, Dashboard, Agenda, Pacientes, detalle (resumen y 404), Usuarios, Reportes y Configuración en 390×844, 768×1024, 1280×720 y 1920×1080, sin scroll horizontal. Verificados foco visible, drawer/Escape/retorno, foco del formulario administrativo y confirmación/cancelación del asistente. Solo se usaron respuestas interceptadas de pruebas, fuera del runtime; no se realizaron mutaciones reales. Los 404 esperados generan mensajes de recurso inexistente en consola, sin excepciones JavaScript. `npm audit --omit=dev`: cero vulnerabilidades al ejecutar esta auditoría.

### Integraciones de asistente e historial — 2026-10-01

- Se integra DELETE `/usuarios/asistente` solo para doctora desde Usuarios, con confirmación accesible y aviso de cierre de sesiones e irreversibilidad. El cliente espera confirmación HTTP, vuelve a consultar GET y solo ofrece crear una nueva cuenta si GET devuelve 404. Errores de red conservan la cuenta visible; un DELETE 404 también fuerza reconsulta.
- La pestaña `/pacientes/:patientId/historial` usa GET por paciente. Doctora puede crear el único historial mediante POST y editarlo mediante PUT; asistente solo consulta. El `paciente_id` proviene del expediente y no se edita; PUT transmite solo `sexo`, `lugar_nacimiento`, `antecedentes_enfermedades`, `cirugias` y `medicacion_actual`, con vacíos opcionales como null. No se integra historial propio del paciente, index ni show sin necesidad de UI.
- Los contratos se revalidaron en `origin/backend` `9bd91032fe053a844759c2bbd54df503c1fa37fe` (rutas, controladores, modelo y migración). Se agregaron pruebas de servicios, roles, estados y mutaciones. E2E autenticado con Laravel queda pendiente; ninguna eliminación ni escritura clínica real se ejecutó automáticamente.

## 2026-10-02 — Contratos actuales

- En `origin/backend` `4e460146d32f9d68e30aad205083192323a5f371`, PUT de pacientes, Agenda de doctora y Actividades de doctora/asistente tienen implementación real. Las menciones anteriores a PUT paciente y Agenda como pendientes son históricas. La web usa estos contratos con recarga desde GET después de mutaciones.
- Diagnósticos, tratamientos, odontograma, radiografías, reportes/dashboard y recuperación de contraseña siguen pendientes de backend. Completar una cita requiere diagnóstico y tratamiento ya registrados según el backend actual; un 409 se muestra sin simular esos datos.

## 2026-10-04 — Integraciones verificadas

- Con `origin/backend` `fa89d0c056bfeaeb6c3b54115a1f1c3edef84714`, Agenda crea y programa desde el día seleccionado. La gestión de cuentas de pacientes, Caja y auditoría/sesiones usan sus contratos reales y las restricciones de doctora.
- Evidencias clínicas se consultan en el expediente para doctora/asistente como metadatos de solo lectura. No se abre ni se sube el archivo hasta contar con el contrato de almacenamiento. Odontograma espera la estructura de `datos`; reportes generales y recuperación de contraseña permanecen pendientes.
- Diagnóstico, tratamiento y observación de citas médicas ya se registran desde Agenda mediante el contrato confirmado. Las vistas independientes de Diagnósticos y Tratamientos en el expediente permanecen pendientes; los listados históricos anteriores describen el estado de esas integraciones en su fecha.
