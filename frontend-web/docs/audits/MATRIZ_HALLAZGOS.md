# Matriz de hallazgos — frontend web

Fecha: 2026-10-17. Base: `frontend-web` en `77369a2d20d71ff616d29d6c99787d10ab4e9b51`; contratos: `origin/backend` en `e676dec44e503d58ec3e22933a048779265fd9c0`. Se leyó código y se ejecutó la línea base; **no se ejecutaron recorridos autenticados ni mutaciones clínicas**. «Confirmado» significa que la condición consta en el código, no que se haya observado en producción. Las rutas y líneas se refieren a esta base.

| ID | Severidad | Estado | Módulo | Resumen | Prioridad |
| --- | --- | --- | --- | --- | --- |
| WEB-001 | P2 | Probable | Auth / HTTP | Un 401 tardío de una sesión anterior puede cerrar la nueva | 1 |
| WEB-002 | P4 | Confirmado por código | Auth | La política de restauración descarta el token ante cualquier fallo de red | 4 |
| WEB-003 | P4 | Confirmado por código | HTTP | No existe límite temporal explícito para solicitudes Axios | 4 |
| WEB-004 | P2 | Confirmado por código | Usuarios | La búsqueda de cuentas recorre todas las páginas del servidor | 2 |
| WEB-005 | P2 | Confirmado por código | Consultas | Se descartan resultados obsoletos pero no se cancelan sus HTTP | 3 |
| WEB-006 | P2 | Confirmado por código | Navegación | Al volver a pantallas, se pierden filtros y se consultan datos de nuevo | 3 |
| WEB-007 | P2 | Confirmado por código | Listas | Cambiar filtro/página sustituye datos válidos por `loading` | 3 |
| WEB-008 | P2 | Confirmado por código | Caja / Citas / Servicios | `Promise.all` oculta un resultado válido si falla su consulta hermana | 3 |
| WEB-009 | P2 | Confirmado por código | Pacientes | Un GET fallido después de PUT confirmado se presenta como fallo de edición | 1 |
| WEB-010 | P2 | Probable | Pacientes | Un POST confirmado con respuesta perdida invita a repetir el alta | 1 |
| WEB-011 | P3 | Probable | Actividades | La búsqueda asíncrona puede mostrar un paciente de otro código | 2 |
| WEB-012 | P3 | Confirmado por código | Fotografías | Cada avatar descarga otra vez el archivo protegido | 3 |
| WEB-013 | P3 | Confirmado por código | Asistente | DELETE confirmado + recarga fallida carece de estado explícito de operación | 2 |
| WEB-014 | P3 | Confirmado por código | Login | La regla local de ocho caracteres es más estricta que el login Laravel | 2 |
| WEB-015 | P3 | Confirmado por código | Dashboard | Reintentar un panel reinicia también todas las consultas sanas | 3 |
| WEB-016 | P3 | Probable | Desarrollo / red | StrictMode y efectos aplazados pueden duplicar GET en desarrollo | 4 |
| WEB-017 | P3 | Confirmado por código | Auditoría / a11y | Todos los botones «Ocultar de la vista» tienen el mismo nombre accesible | 3 |
| WEB-018 | P3 | Confirmado por auditoría | Dependencias | `source-map-js@1.2.1` figura en alerta alta de herramientas de desarrollo | 2 |

## Evidencia, reproducción y salida esperada

### WEB-001 — 401 de sesión antigua

- **Archivo:** `src/services/apiClient.ts:13-25`, `src/features/auth/AuthProvider.tsx:37-46`.
- **Evidencia/causa:** el interceptor lee el token *actual* al recibir cualquier 401; no compara el token con el de la petición que falló. El listener borra la sesión vigente.
- **Escenario:** emitir una petición con token A; cerrar esa sesión e iniciar B antes de que responda; hacer que la petición A termine en 401. **Pendiente de reproducción automatizada** de este orden temporal.
- **Esperado:** ignorar el 401 perteneciente a A. **Resultado deducible:** si B está en `sessionStorage`, se emite `clinic:unauthorized` y B se borra.
- **Impacto:** cierre involuntario de sesión; no demuestra acceso indebido ni exfiltración. Frecuencia: solo en cruce de sesiones y respuestas tardías. **Confianza:** alta en el mecanismo, media en frecuencia.
- **Corrección/prueba:** asociar cada respuesta con la credencial o generación de sesión de su petición; prueba de promesas diferidas A/B y 401 tardío, más 401 de B que sí cierre B.

### WEB-002 — restauración ante red intermitente

- **Archivo:** `src/features/auth/AuthProvider.tsx:15-32`.
- **Evidencia/causa:** el `catch` de `GET /user` ejecuta `clearAccessToken()` para cualquier error, incluido fallo sin respuesta HTTP.
- **Escenario:** abrir la aplicación con token aún válido y backend temporalmente inaccesible. **Esperado:** una vía de reintento sin tratar un error de transporte como invalidación confirmada. **Observado por código:** pasa a invitado y descarta la credencial.
- **Impacto:** interrupción de trabajo y nuevo login; es una política conservadora explícitamente probada en `AuthContext.test.tsx`, así que se clasifica como mejora preventiva de resiliencia, no como vulnerabilidad. Condición: fallo de restauración. **Confianza:** alta.
- **Corrección/prueba:** decidir política de sesión con backend; separar 401 de red y probar ambos sin asumir que el token sigue válido indefinidamente.

### WEB-003 — solicitudes sin plazo

- **Archivo:** `src/services/apiClient.ts:7-11`.
- **Evidencia/causa:** `axios.create` no define `timeout`; las mutaciones deshabilitan controles hasta que la promesa termine (p. ej. `src/features/assistant/UsersPage.tsx:117-128`).
- **Escenario:** servidor que acepta conexión y no completa una respuesta. **Esperado:** timeout controlado y opción segura de reconciliar/reintentar. **Observado por configuración:** no hay límite de aplicación; el navegador/sistema puede imponer otro límite, no medido.
- **Impacto:** controles ocupados durante un tiempo indeterminado. Condición dependiente de infraestructura. **Confianza:** alta en la ausencia de configuración, media en impacto real.
- **Corrección/prueba:** plazo por tipo de operación y tratamiento de resultado ambiguo; prueba con petición retenida. No aplicar reintento automático a POST.

### WEB-004 — barrido de cuentas

- **Archivo:** `src/features/assistant/patientAccountsService.ts:17-29`, `src/features/assistant/PatientAccountsSection.tsx:32-38`.
- **Evidencia/causa:** bucle secuencial desde página 1 hasta `last_page`; Laravel usa `paginate(20)` en `backend-api/app/Services/UsuarioService.php`. Cada búsqueda nueva puede iniciar otro barrido.
- **Escenario:** 1.000 cuentas, 50 páginas; abrir Usuarios o buscar. **Esperado:** consulta acotada y respuesta progresiva. **Observado por código:** hasta 50 GET secuenciales por término, incluso si pocos son pacientes.
- **Impacto:** latencia proporcional al total de cuentas, carga Laravel y consumo de red. Frecuencia: cada búsqueda tras debounce de 250 ms. **Confianza:** alta; volumen real no medido.
- **Corrección/prueba:** pedir contrato de filtro por rol o paginación de cuentas de paciente; mientras tanto limitar concurrencia/cancelar búsquedas sin fingir una lista completa. Test de conteo de llamadas y término que cambia durante el barrido.

### WEB-005 — solicitudes obsoletas activas

- **Archivo:** `src/features/patients/PatientsPage.tsx:26-47`, `src/features/assistant/PatientAccountsSection.tsx:32-38`, `src/features/agenda/AgendaPage.tsx:59-71` y patrones equivalentes.
- **Evidencia/causa:** `requestId` evita aplicar respuestas viejas, pero no se pasa `AbortSignal` a Axios. El cleanup solo incrementa un contador.
- **Escenario:** cambiar búsqueda o mes antes de completar GET anterior. **Esperado:** trabajo obsoleto cancelado cuando sea seguro. **Observado por código:** el HTTP sigue hasta terminar.
- **Impacto:** ancho de banda y trabajo backend redundantes; WEB-004 amplifica el coste. Frecuencia: interacción rápida/red lenta. **Confianza:** alta; no se midió tráfico real.
- **Corrección/prueba:** `AbortController` por consulta, cancelación en cleanup y prueba que cuente peticiones finalizadas/canceladas. No cancelar mutaciones ya emitidas como si se revirtieran.

### WEB-006 — vuelta a pantalla sin estado consultado

- **Archivo:** `src/app/AppRouter.tsx:107-147`, `src/features/patients/PatientsPage.tsx:16-23`, `src/features/agenda/AgendaPage.tsx:46-52`, `src/features/medical-appointments/MedicalAppointmentsPage.tsx:103-111`.
- **Evidencia/causa:** rutas montan componentes de página con `useState` local inicial; no hay caché compartida ni filtros en URL. Al navegar fuera y regresar, se reconstruyen estados y efectos.
- **Escenario:** buscar en Pacientes, ir a un expediente y volver. **Esperado:** preservar búsqueda/página o explicitar el reinicio. **Observado por estructura React:** búsqueda vuelve a `''`, página a `1`, nuevo GET; meses seleccionados también vuelven al actual.
- **Impacto:** pérdida de contexto, nuevas solicitudes, sensación de lentitud. Frecuencia: navegación habitual. **Confianza:** alta en estructura; no se midió latencia de API.
- **Corrección/prueba:** filtros en URL y/o caché particionada por sesión/rol/paciente; prueba de navegación ida/vuelta y conteo de GET.

### WEB-007 — datos válidos sustituidos por carga

- **Archivo:** `src/features/patients/PatientsPage.tsx:37-39,101,121`; `src/features/assistant/PatientAccountsSection.tsx:32-35,53`; `src/features/cash/CashPage.tsx:62-65`.
- **Evidencia/causa:** al iniciar filtro o recarga, el estado discriminado pasa a `{kind:'loading'}` y deja de contener los datos anteriores.
- **Escenario:** lista con datos, cambiar página/filtro con 500 ms de red. **Esperado:** mantener contenido válido identificado como anterior mientras llega el siguiente, salvo donde ocultarlo sea necesario. **Observado por render:** reemplazo inmediato por `LoadingState`, luego tabla entera reaparece.
- **Impacto:** parpadeo, salto visual y pérdida de contexto; en error tampoco se conservan datos anteriores. Frecuencia: cada actualización. **Confianza:** alta.
- **Corrección/prueba:** estado `data + fetchStatus`, transición con datos previos etiquetados, manejo de error sin presentar datos obsoletos como actuales. Prueba con respuesta diferida.

### WEB-008 — errores parciales tratados como totales

- **Archivo:** `src/features/cash/CashPage.tsx:62-67`, `src/features/catalog/CatalogPage.tsx:43-49`, `src/features/medical-appointments/MedicalAppointmentsPage.tsx:117-125`, `src/features/activities/ActivitiesPage.tsx:88-93`.
- **Evidencia/causa:** un único `Promise.all` y un único `State` abarcan dos recursos independientes.
- **Escenario:** `/egresos` responde 200 y `/reportes/caja` 503. **Esperado:** señalar el fallo del resumen conservando los egresos válidos, si su presentación independiente lo permite. **Observado por código:** estado de error único y se ocultan ambos.
- **Impacto:** disponibilidad visual menor que la del backend; botones de reintento repiten las dos consultas. Frecuencia: fallos parciales. **Confianza:** alta.
- **Corrección/prueba:** estados de consulta por recurso; prueba 200/503 en ambos órdenes, sin inventar importes ni listas.

### WEB-009 — PUT y GET confundidos

- **Archivo:** `src/features/patients/PatientWorkspace.tsx:53-78`; `src/features/patients/patientService.ts:52-58`.
- **Evidencia/causa:** `saveEdit` hace `await updatePatient` y luego `await getPatient` dentro del mismo `try`; el `catch` no sabe cuál falló.
- **Escenario:** PUT 200 válido seguido de GET 503. **Esperado:** comunicar que la edición fue confirmada y que falló actualizar la vista. **Observado por código:** se mantiene el diálogo con error de carga genérico, sin éxito confirmado.
- **Impacto:** reenvío innecesario y ambigüedad de integridad. Frecuencia: fallo de recarga posterior. **Confianza:** alta.
- **Corrección/prueba:** separar fases; usar el paciente validado en el PUT para actualizar vista y tratar GET posterior como fallo secundario. Test PUT 200/GET 503.

### WEB-010 — POST ambiguo tras desconexión

- **Archivo:** `src/features/patients/PatientsPage.tsx:56-87`.
- **Evidencia/causa:** `!error.response` muestra «Inténtalo de nuevo»; el cliente no puede saber si Laravel ya confirmó la transacción antes de perder la respuesta.
- **Escenario:** POST se confirma en servidor y se corta la conexión antes de llegar el 201. **Esperado:** estado de resultado incierto, consulta de reconciliación por cédula/código antes de repetir. **Resultado potencial:** el usuario repite el alta; Laravel puede rechazar duplicado o crear uno según reglas de unicidad. No se probó este fallo extremo.
- **Impacto:** intentos duplicados y dudas sobre el registro. Frecuencia: red intermitente. **Confianza:** alta en ambigüedad HTTP, media en resultado concreto.
- **Corrección/prueba:** mensaje de resultado no verificable y reconciliación con GET ya existente; prueba de POST confirmado con respuesta perdida sin tocar datos reales.

### WEB-011 — búsqueda de paciente fuera de orden

- **Archivo:** `src/features/activities/ActivitiesPage.tsx:42-60`.
- **Evidencia/causa:** `lookup()` captura `code`, espera `lookupPatientByCode`, luego ejecuta `setPatient`/`setLookupError` sin comprobar si el input cambió; el input sigue editable durante `lookingUp`.
- **Escenario:** buscar código A, escribir B antes de la respuesta A. **Esperado:** no vincular visualmente el nombre A al código B. **Resultado potencial:** `setPatient(A.nombres)` aparece bajo B. El backend revalida el código al guardar, por lo que no se infiere corrupción automática.
- **Impacto:** confirmación visual engañosa y errores de envío. Frecuencia: edición durante red lenta. **Confianza:** alta en secuencia, pendiente prueba de UI.
- **Corrección/prueba:** comparar código consultado con código actual o cancelar lookup; prueba con promesa diferida y edición intermedia.

### WEB-012 — descargas repetidas de fotografías

- **Archivo:** `src/features/auth/ProtectedPhoto.tsx:18-29`, `src/features/auth/profilePhotoService.ts:9-13`; ejemplo de listas `src/features/patients/PatientsPage.tsx:108-118`.
- **Evidencia/causa:** cada montaje de `ProtectedPhoto` ejecuta su propio GET Blob. La revocación del Object URL está implementada correctamente; **no se halló fuga demostrada**.
- **Escenario:** dos avatares del mismo usuario o vuelta al listado. **Esperado:** reutilización segura durante la sesión o carga bajo demanda. **Observado por código:** un GET por instancia/montaje.
- **Impacto:** tráfico repetido de fotos protegidas y posible retraso de listas. Frecuencia: vistas con avatares. **Confianza:** alta en patrón; bytes reales no medidos.
- **Corrección/prueba:** caché en memoria con clave usuario y invalidación explícita tras foto/logout; test de deduplicación y revocación de URL.

### WEB-013 — DELETE asistente sin conclusión visible

- **Archivo:** `src/features/assistant/UsersPage.tsx:117-128`.
- **Evidencia/causa:** tras `deleteAssistant`, solo se muestra éxito/error específico cuando `load()` devuelve `ready`; si la recarga falla, no se fija mensaje sobre el DELETE confirmado.
- **Escenario:** DELETE 200, GET asistentes 503. **Esperado:** mensaje «eliminar confirmado; recarga falló». **Observado por código:** se cierra confirmación y aparece error genérico de lista, sin distinguir qué pasó con la cuenta.
- **Impacto:** incertidumbre sobre borrado irreversible y reintentos innecesarios. Frecuencia: fallo de GET posterior. **Confianza:** alta.
- **Corrección/prueba:** separar resultado de mutación y recarga; test DELETE 200/GET 503.

### WEB-014 — longitud de contraseña en login

- **Archivo:** `src/features/auth/loginSchema.ts:3-6`; contrato `origin/backend:backend-api/app/Http/Controllers/Api/Auth/AuthController.php`, método `login`.
- **Evidencia/causa:** Zod exige mínimo 8; Laravel solo exige `required|string` para iniciar sesión. La política de contraseñas de **creación** no debe inferirse como contrato de login.
- **Escenario:** credencial existente de menos de ocho caracteres (existencia no verificada). **Esperado:** permitir que Laravel decida autenticación. **Observado por código:** el formulario bloquea el POST.
- **Impacto:** imposibilidad de acceso para cuenta heredada de esa clase. Frecuencia desconocida. **Confianza:** alta en desalineación, baja en prevalencia.
- **Corrección/prueba:** quitar la longitud mínima del login, conservar no vacío; prueba con valor corto y respuesta Laravel 401/200 controlada.

### WEB-015 — reintento del dashboard demasiado amplio

- **Archivo:** `src/features/dashboard/DashboardPage.tsx:84-103,121-129`.
- **Evidencia/causa:** todos los botones `onRetry` incrementan el mismo `retry`; el efecto relanza agenda, pendientes, reporte/pacientes y actividades y pone todos en `loading`.
- **Escenario:** falla solo Actividades y se pulsa su reintento. **Esperado:** consultar Actividades sin borrar métricas sanas. **Observado por código:** se repiten 2 GET en asistente o 4 GET en doctora.
- **Impacto:** tráfico y parpadeo evitables. Frecuencia: cada reintento parcial. **Confianza:** alta.
- **Corrección/prueba:** retry por recurso, preservar datos sanos; prueba de llamadas exactas por botón.

### WEB-016 — duplicación en desarrollo

- **Archivo:** `src/main.tsx:8-10`, `src/features/agenda/AgendaPage.tsx:71`, `src/features/cash/CashPage.tsx:68` y efectos similares.
- **Evidencia/causa:** React StrictMode puede ejecutar setup/cleanup/setup de efectos en desarrollo; cada setup agenda un microtask de `load`, mientras cleanup solo invalida estado y no cancela HTTP.
- **Escenario:** montar una página con consultas bajo servidor Vite en desarrollo. **Esperado:** una petición efectiva por query o cancelación de la primera. **Resultado probable:** dos GET, uno sin uso. No se capturó Network para confirmar conteo; build de producción no hace este ciclo de diagnóstico.
- **Impacto:** ruido en QA y carga de desarrollo; no se afirma duplicación de producción por StrictMode. **Confianza:** media.
- **Corrección/prueba:** instrumentar conteo en dev con pruebas de StrictMode y cancelación/deduplicación; no eliminar StrictMode para ocultarlo.

### WEB-017 — acciones indistinguibles para lector de pantalla

- **Archivo:** `src/features/audit/SystemActivityPage.tsx:56`.
- **Evidencia/causa:** cada fila de acciones usa un botón cuyo nombre accesible es solo «Ocultar de la vista»; la identidad de la acción está en texto hermano, sin relación programática con el control.
- **Escenario:** navegar entre botones del listado con lector de pantalla. **Esperado:** identificar qué registro ocultará cada botón. **Observado por DOM:** nombres accesibles repetidos.
- **Impacto:** riesgo de ocultar el registro equivocado; afecta navegación asistiva. **Confianza:** alta en DOM, pendiente prueba con lector real.
- **Corrección/prueba:** `aria-label` con acción/módulo o `aria-describedby` hacia encabezado único; prueba de nombres accesibles en dos filas y validación manual WCAG 2.2 AA aplicable.

### WEB-018 — advisory de dependencia transitiva

- **Archivo:** `package-lock.json`; comando `npm audit --json`, ruta comprobada con `npm ls source-map-js`.
- **Evidencia/causa:** versión instalada `source-map-js@1.2.1`, afectada por [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q); versión corregida `1.2.2`. Llega por herramientas de desarrollo/build (`vite`/PostCSS, Tailwind, jsdom). `npm audit --omit=dev` reporta cero alertas.
- **Escenario de explotación:** un proceso que analice un *indexed source map* controlado por atacante puede bloquear su event loop; **no se encontró una ruta de entrada de mapas externos al frontend clínico servido**. **Esperado:** cadena de herramientas parcheada. **Observado:** una alerta alta en `npm audit`; ninguna en dependencias de producción.
- **Impacto:** disponibilidad potencial del entorno que procese mapas no confiables, condicionado a esa entrada; no es una XSS ni fuga clínica demostrada. **Confianza:** alta en versión/advisory, baja en explotabilidad de este proyecto.
- **Corrección/prueba:** actualización compatible de lockfile a `>=1.2.2` en fase autorizada, después `npm audit`, lint/tests/build; evaluar escenarios de build con mapas no confiables.

## Recuento

18 hallazgos: P0 0, P1 0, P2 8, P3 8, P4 2. Confirmados por análisis de código/auditoría: 14; probables que requieren reproducción controlada: 4; reproducidos en navegador autenticado: 0. Las prioridades no sustituyen la severidad: WEB-009/010 se atienden primero por el efecto sobre operaciones de escritura.
