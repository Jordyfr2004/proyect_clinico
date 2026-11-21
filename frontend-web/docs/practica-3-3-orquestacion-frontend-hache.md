# Práctica 3.3: Orquestación y composición de capacidades

**Fecha:** 21 de noviembre de 2026. **Rama de entrega:** `frontend-web`. La práctica se desarrolló en `practica-3-3-orquestacion-frontend-hache` y se trasladó a la rama oficial conservando los cambios remotos del equipo.

## Necesidad funcional y aporte individual

Agenda necesita consultar en un solo paso los datos de una cita médica y de su paciente. El aporte del frontend es ofrecer «Consultar resumen de cita» en cada registro médico, solicitar el resumen al orquestador y mostrarlo solo si la respuesta satisface el contrato validado. La interfaz no compone datos de dos consultas propias ni usa el paciente ya visible en la lista como sustituto del resumen.

## Secuencia esperada

1. El usuario abre una cita médica de Agenda y selecciona «Consultar resumen de cita».
2. React inicia una petición con `apiClient` a `GET {VITE_API_BASE_URL}/resumen-cita/{id}`. `apiClient` agrega el token vigente y mantiene los eventos globales de 401 y 403.
3. **Pendiente del backend:** el orquestador consulta el servicio de citas por el ID y, a partir de la relación real, consulta el servicio de pacientes.
4. **Pendiente del backend:** el orquestador compone una respuesta coherente y la entrega al frontend. La vista valida la estructura y la coincidencia del ID antes de pintar datos. Cerrar el diálogo cancela la solicitud. Si cambia el ID durante la consulta, la vista oculta inmediatamente el resumen anterior.

## Contratos, rutas, dependencias y puertos

| Elemento | Ruta o contrato | Dependencia / puerto | Estado |
|---|---|---|---|
| API de Agenda existente | `GET /api/agenda` | `VITE_API_BASE_URL` termina en `/api` | Confirmado en código frontend |
| Resumen propuesto | `GET /api/resumen-cita/{id}`; ID codificado en URL | Mismo `apiClient`, autenticación Bearer, HTTPS 443 en la URL configurada de este entorno | Consumo frontend implementado; existencia del endpoint pendiente de verificación |
| Respuesta propuesta | `{ "data": { "cita": { "id": string, "fecha": YYYY-MM-DD, "hora_inicio": HH:mm[:ss], "hora_fin": HH:mm[:ss], "estado": string, "descripcion": string|null }, "paciente": { "codigo_paciente": string, "nombres": string } } }` | El backend debe obtener ambas entidades reales y devolver el mismo ID solicitado | Contrato propuesto, no confirmado con backend |
| Sin información | `{ "data": null }` | Respuesta válida sin resumen | Propuesto, pendiente |
| Servicio de citas | Ruta y puerto internos por definir | Orquestador | Pendiente del backend |
| Servicio de pacientes | Ruta y puerto internos por definir | Orquestador | Pendiente del backend |

No se documentan rutas ni puertos internos como hechos porque no fueron comprobados. El backend debe acordar el esquema anterior o coordinar un ajuste del parser antes de poner el endpoint en servicio. Un 404 no permite distinguir con certeza una cita inexistente de una ruta aún no implementada; la interfaz comunica ambas posibilidades.

## Estados y seguridad de presentación

El diálogo distingue carga, éxito validado, `data: null`, 401, 403, 404, 502/503, otros errores HTTP, fallo de conexión y respuesta que incumple el contrato. No muestra datos del resumen en los estados de fallo ni al recibir un nuevo ID mientras conserva un resultado anterior. No extrae ni presenta mensajes arbitrarios del servidor. 401 y 403 siguen pasando por los interceptores globales de `apiClient`; el diálogo solo explica la situación local. Hay reintento manual y cancelación mediante `AbortController`. El botón aparece solo en registros de tipo `cita_medica`, sin alterar las acciones de edición o creación.

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/features/agenda/agendaService.ts` | Petición del resumen y validación Zod, incluida coincidencia de ID. |
| `src/features/agenda/AppointmentSummary.tsx` | Presentación accesible, estados de consulta y aislamiento por ID vigente. |
| `src/features/agenda/AgendaPage.tsx` | Botón de consulta y diálogo existente reutilizado. |
| `src/features/agenda/agendaService.test.ts` | Ruta, contrato, respuesta vacía y rechazo de datos inválidos. |
| `src/features/agenda/AppointmentSummary.test.tsx` | Carga, éxito, ausencia, HTTP, conexión, reintento y cambio de ID. |
| `src/features/agenda/AgendaPage.test.tsx` | Acceso solo desde cita médica y apertura del diálogo. |
| `docs/practica-3-3-orquestacion-frontend-hache.md` | Documentación técnica y resultados. |
| `docs/practica-3-3-orquestacion-frontend-hache.pdf` | Informe breve de la práctica. |

## Pruebas y resultados observados

| Comando | Resultado real |
|---|---|
| `npm run test -- src/features/agenda/agendaService.test.ts` | 8/8 pasan. |
| `npm run test -- src/features/agenda/AppointmentSummary.test.tsx` | 10/10 pasan; la prueba nueva falló antes de la corrección al mostrar el paciente anterior tras cambiar el ID y pasó después. |
| `npm run test -- src/features/agenda/AgendaPage.test.tsx` | 27/27 pasan. |
| `npm run test --` los tres archivos de Agenda | 45/45 pasan tras la corrección. |
| `npm run test` en `frontend-web` actualizada | 407/407 pasan, 41 archivos de prueba. |
| `npm run test` en copia de `frontend-web` original | 377 pasan y 2 fallan; 1 suite ni inicia. El fallo de enlaces en pacientes y el error de compilación de evidencia son iguales. Apareció además un fallo de autenticación que no se repitió en ejecución aislada. |
| `npm run build` en `frontend-web` actualizada | Correcto; Vite advierte que un paquete supera 500 kB. Antes de actualizar la rama, fallaba por errores TypeScript ajenos en `AppRouter.tsx`, `roleAccess.ts` y `PatientEvidenceSection.test.tsx`. |
| `npm run lint` en `frontend-web` actualizada | Correcto. Antes de actualizar la rama, fallaba por `AuthContext` duplicado en `PatientEvidenceSection.test.tsx`. |
| Pruebas aisladas de actividades y autenticación | 43/43 pasan en la copia original; 88/88 pasan en la rama actual junto con las 45 de Agenda. Los fallos de foco y autenticación observados en suites completas son intermitentes en esta comparación; no se atribuyen a la práctica sin más evidencia. |

La copia temporal de `frontend-web` se obtuvo de la rama original sin alterar el árbol actual y se eliminó tras la comparación. Los errores reproducidos en ambas versiones eran preexistentes al trabajo de la práctica; los commits remotos posteriores del equipo los resolvieron. La única regresión comprobada de esta práctica fue la visibilidad transitoria de datos de un ID anterior; quedó corregida y cubierta por una prueba que primero reprodujo el fallo.

Los dobles de respuesta se usan exclusivamente dentro de las pruebas unitarias. Estas pruebas validan el comportamiento del frontend y **no** demuestran conexión real ni orquestación efectiva de los dos servicios.

## Reflexión técnica y evidencias pendientes

La composición desplaza al orquestador la disponibilidad conjunta de citas y pacientes. Si cualquiera falla, el frontend no puede afirmar que el resumen esté completo: presenta indisponibilidad o error y conserva la opción de reintentar. La validación evita que una respuesta parcial o de otra cita se convierta en información clínica visible. El contrato, la ruta operativa, los permisos reales y los puertos internos deben confirmarse con el equipo de backend.

**Evidencias para capturar en una ejecución real:** respuesta de red autenticada de `GET /api/resumen-cita/{id}` para una cita existente (con datos sensibles ocultos), pantalla del resumen exitoso correspondiente, traza del orquestador que demuestre consultas a citas y pacientes, respuesta de cita ausente, fallo 502/503 y recuperación tras reintento. Ninguna de estas capturas se incluye ni se declara verificada en esta entrega.

El 21 de noviembre de 2026 se consultaron sin credenciales la URL configurada de Agenda (`GET /api/agenda`) y la ruta propuesta (`GET /api/resumen-cita/0`). Ambas devolvieron **HTTP 503**. La indisponibilidad de la API impidió verificar si la ruta de resumen existe, qué respuesta entrega con una sesión válida y si coordina realmente citas y pacientes. El esquema documentado sigue siendo una propuesta para acordar con el backend.
