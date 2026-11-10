# Rendimiento, red y consistencia de datos

Base y límites de medida: los conteos siguientes son **deducciones de llamadas en el código**, no capturas de Network ni tiempos del backend. No hubo credenciales ni entorno de prueba autorizado para medir pantallas protegidas. El build Vite transformó 2099 módulos; `index` pesa 334,44 kB (105,46 kB gzip) y el chunk de esquemas 136,22 kB (42,61 kB gzip). Estos tamaños no equivalen a tiempo de interacción real. Ver fichas WEB-004 a WEB-008, WEB-012, WEB-015 y WEB-016 en [MATRIZ_HALLAZGOS.md](MATRIZ_HALLAZGOS.md).

## A. Renderizado

- Las rutas de `AppRouter.tsx:17-30` son `lazy`, una decisión favorable para la carga inicial. No se midió coste de reconciliación de React ni Web Vitals.
- `PatientsPage`, `PatientAccountsSection`, `CashPage`, `CatalogPage`, `MedicalAppointmentsPage`, `ActivitiesPage` y `SystemActivityPage` representan la consulta como una unión `loading|ready|error`. Cuando vuelven a `loading` dejan de renderizar tabla/lista válida. Esto produce sustitución visual completa; el tiempo visible depende de la red (WEB-007).
- En `DashboardPage.tsx:87-103`, los datos independientes se manejan por clave, pero un `retry` global reinicia cada clave. Un fallo localizado causa parpadeo de tarjetas sanas (WEB-015).
- React StrictMode está activo en `main.tsx:8-10`. En desarrollo puede exponer efectos duplicados; los efectos que aplazan `load` a un microtask y solo invalidan `requestId` podrían enviar ambos GET (WEB-016). **No se extrapola a producción.**

## B. Red

| Vista y condición | GET deducidos al montar, sin contar fotos | Al volver a la vista | Nota |
| --- | ---: | ---: | --- |
| Dashboard doctora | 4: agenda de mes, solicitudes pendientes, reporte dashboard, actividades de mes | 4 | `DashboardPage.tsx:87-103`; cada retry también 4. |
| Dashboard asistente | 2: pacientes página 1, actividades de mes | 2 | No accede al reporte doctor ni Agenda. |
| Agenda | 1: mes | 1 | Consulta el mes completo. |
| Citas médicas | 2: mes y pendientes | 2 | Repite consultas de Agenda si se navega entre ambas. |
| Pacientes | 1 GET por página/término | 1 | 250 ms de debounce; página/filtro se reinicia al remontar. |
| Expediente con Historial | 2: paciente e historial por paciente | 2 | Además posibles GET de foto. `key={patientId}` evita arrastre entre pacientes. |
| Expediente con Evidencias | 2: paciente y evidencias | 2 | Además posible foto. |
| Usuarios | 1 asistentes + **N** GET secuenciales de `/usuarios` | igual | N = `last_page`, 20 cuentas/página; fotos adicionales. |
| Actividades / Caja / Servicios / Citas | 2 por vista | 2 | Cada pareja se agrega mediante `Promise.all`. |
| Reportes | 4 | 4 | Cuatro `useReport` independientes. |
| Auditoría | 1 por vista/fecha | 1 | Cambiar acciones/sesiones solicita fuente distinta. |

La ausencia de un caché de consultas no es en sí un defecto; los efectos verificables sí lo son: WEB-004 (O(N) páginas), WEB-005 (HTTP obsoleto no cancelado), WEB-006 (nuevos GET al regresar), WEB-012 (foto por avatar/montaje) y WEB-015 (retry amplio). `requestId` o bandera `active` protegen el estado React en varios módulos, **no** reducen trabajo de red. No se midió latencia, bytes por foto, waterfall, ni la fracción atribuible a Laravel. Una implementación de `AbortSignal` debe respetar que cancelar la espera de una escritura no revierte la transacción del servidor.

## C. Estado local

`useState` de búsqueda/página/mes/fecha vive en componentes de ruta: `PatientsPage.tsx:16-23`, `AgendaPage.tsx:46-52`, `MedicalAppointmentsPage.tsx:103-111`, `CashPage.tsx:49-56`, `ActivitiesPage.tsx:74-82`, `ReportsPage.tsx:39-40`, `SystemActivityPage.tsx:23-26`. Al remontar, recuperan los valores iniciales; no hay estado de consulta compartido ni parámetros de URL que preserven la selección. El paciente del expediente se remonta con `key={patientId}`, correcto para evitar mezcla clínica entre IDs, aun cuando causa una nueva carga.

`PatientWorkspace.tsx:53-78` añade una segunda consulta tras un PUT ya confirmado: si esa lectura falla, mezcla error de refresco con error de escritura (WEB-009). En `PatientsPage.tsx:56-87`, una respuesta perdida a POST no se reconcilia antes de sugerir nuevo intento (WEB-010). Estas son cuestiones de integridad, no solo rapidez.

## D. Caché y coherencia

**TanStack Query podría justificarse** si se aborda como arquitectura compartida y se demuestra con pruebas de navegación y Network una reducción real de solicitudes/flash. No basta instalarla: debe decidirse quién invalida qué y cómo se aísla la información clínica. Propuesta **para fase posterior, sin implementación ahora**:

| Recurso | Clave de consulta sugerida | Frescura inicial orientativa a validar | Invalidación |
| --- | --- | --- | --- |
| Pacientes | `['session', userId, 'patients', {buscar,page}]` | 15–30 s, dado que altas/ediciones son frecuentes | POST/PUT paciente; invalidar lista y detalle por ID. |
| Paciente / historial / evidencias | `['session', userId, 'patient', patientId, ...]` | 0–15 s para historial; evidencias puede admitir 30 s | Mutaciones respectivas; no mezclar IDs. |
| Agenda/Citas | `['session', userId, 'agenda', {mes,anio,estado}]` | 0–15 s, por cambios de horario | Toda creación/programación/cancelación/finalización; invalidar mes, pendientes y dashboard. |
| Actividades/Caja/Reportes | claves con período/filtros/rol | 0–30 s según sensibilidad operativa | Actividad/egreso invalidan listas, totales, caja, reportes y dashboard pertinentes. |
| Usuarios/Servicios/Auditoría | claves con búsqueda/fecha/rol | 15–60 s tras validar uso | Mutación del propio recurso y dependientes. |
| Fotografías | clave de usuario dueño y versión | Solo memoria en sesión, sin persistencia de Blob | Subida/borrado, logout y cambio de cuenta. |

Los tiempos son **hipótesis para diseño**, no medidas ni requisitos Laravel. No persistir caché clínica en `localStorage`/IndexedDB por defecto. `queryClient.clear()` al logout, 401 o cambio de identidad; cancelar consultas de sesión anterior y comparar identidad/credencial antes de publicar una respuesta. Evitar que un cache hit exponga datos de la doctora a un asistente que inicia sesión en el mismo navegador. Dar a cada recurso sus estados `fetching`, `error`, `data`, distinguiendo datos de período anterior. Si los filtros necesitan sobrevivir navegación/recarga, usar query params de Router y validar sus valores antes de llamar Laravel. La adopción exige pruebas de invalidación cruzada (paciente, citas, actividad/caja/dashboard) y carreras A/B.

Antes de incorporar dependencia, se puede corregir WEB-004 con un contrato backend **confirmado** de paginación/filtro por rol; no inventar ese endpoint en frontend. Si no llega, la UI debe reconocer el coste/alcance de su barrido y evitar presentarlo como instantáneo.

## E. Experiencia visual de actualización

Una UI que conserva datos anteriores necesita declarar que están actualizándose y no mostrarlos como respuesta actual de un filtro nuevo. Para una página/filtro cambiante: mantener estructura y foco, mostrar indicador en la región, marcar resultados anteriores o vaciar solo el contenido que sería clínicamente engañoso; ante 403/401 retirar datos no autorizados inmediatamente. Para mutaciones: usar la respuesta confirmada del servidor donde el contrato ya la incluye y comunicar por separado el estado de sincronización. Para pares independientes (`Promise.all` actual), renderizar cada resultado con su error local sin fabricar cero/listas vacías.

## Medidas que faltan

En entorno de staging con cuentas y datos de prueba autorizados: registrar HAR sin tokens ni identificadores clínicos publicados; contar peticiones en primera visita, retorno y cambios rápidos; medir TTFB/API y tiempo hasta datos; perfilar render con React DevTools; comparar con caché en frío/caliente; verificar 390/768/1280/1920 px con red lenta. Una sola sesión no basta para fijar `staleTime`; medir también invalidación tras escrituras y aislamiento tras logout/cambio de cuenta.
