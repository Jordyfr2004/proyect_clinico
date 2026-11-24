# Integración definitiva y cierre del frontend web — Clínica Dental

Actúa como ingeniero senior especializado en React, TypeScript, Laravel, integración de APIs, seguridad y diseño UX/UI clínico.

**Repositorio:** https://github.com/Jordyfr2004/proyect_clinico.git

**Rama de trabajo:** `frontend-web`

**Cuenta de GitHub para publicar los cambios:** `jerenyvera09`

**Objetivo:** completar el frontend web hasta alcanzar el nivel funcional del backend oficial, dejando una aplicación profesional, consistente, conectada a datos reales, sin integraciones obsoletas y preparada para su validación final y publicación en GitHub.

## 1. Alcance y restricciones obligatorias

- Trabajar exclusivamente en la rama `frontend-web` y dentro de `frontend-web/`.
- Consultar la rama `origin/backend` únicamente como fuente de contratos.
- Referencias de la auditoría:
  - Backend: `7ea26c5181f8881d6487513ef1e883c31431bf30`.
  - Frontend web: `a06c83da76f1083770a0e29abfe3f43a73a02acd`.
- Ejecutar `git fetch origin` y comprobar si existen actualizaciones posteriores.
- Revisar `git status` y preservar todos los cambios locales del usuario.
- No fusionar backend o master con frontend-web. Utilizar `git show`, `git diff` o un worktree independiente para consultar Laravel.
- No modificar backend-api, frontend móvil, master ni contratos del servidor.
- No ejecutar reset destructivo ni eliminar cambios ajenos.
- Utilizar exclusivamente la cuenta de GitHub `jerenyvera09` para publicar los cambios.
- Aprovechar las credenciales existentes de esa cuenta. No solicitar nuevamente autenticación si ya está disponible.
- Al finalizar correctamente la implementación y las pruebas, realizar commit y push a `origin/frontend-web`.
- No introducir datos simulados, endpoints inventados, estadísticas ficticias ni funcionalidades sin respaldo real de Laravel.
- Conservar las mejoras visuales, animaciones, formularios y flujos previamente aprobados.

## 2. Auditoría inicial obligatoria

Comparar las rutas de `backend-api/routes/api.php`, controladores, servicios, modelos, migraciones y validaciones con:

- `frontend-web/src/features/`
- `frontend-web/src/services/`
- `frontend-web/src/app/AppRouter.tsx`
- `frontend-web/src/layouts/AppLayout.tsx`
- `frontend-web/src/features/auth/roleAccess.ts`

Construir una matriz de integración por módulo con endpoint, método HTTP, permisos, parámetros, payload, respuesta, estado actual y corrección necesaria.

Después de la auditoría, implementar las correcciones directamente. No limitarse a entregar recomendaciones ni detenerse únicamente en la planificación.

## 3. Agenda y Citas médicas — Prioridad crítica

Archivos principales:

- `src/features/agenda/AgendaPage.tsx`
- `src/features/agenda/AgendaPatientSearch.tsx`
- `src/features/agenda/agendaService.ts`
- `src/features/medical-appointments/MedicalAppointmentsPage.tsx`

Adaptar el frontend al nuevo contrato de reservas:

- Admitir citas para pacientes registrados y reservas por nombre.
- Consumir `GET /pacientes?agenda=1&buscar=...` mediante un contrato específico, sin romper la consulta paginada general de pacientes.
- Diferenciar los resultados con `registrado: true` y `registrado: false`.
- Permitir introducir un nombre para una nueva reserva.
- Enviar a `POST /agenda/cita-medica` exclusivamente `codigo_paciente` o `nombre_reserva`, nunca ambos.
- Actualizar esquemas Zod y tipos para admitir `paciente_id`, `paciente` y `nombre_reserva` conforme a Laravel.
- Mostrar correctamente el nombre de las reservas en calendarios, registros, búsqueda, detalles, edición, cancelación y eliminación.
- Impedir el registro de datos clínicos en reservas sin paciente registrado.
- Para completar una cita de paciente registrado, respetar la exigencia de diagnóstico y tratamiento.
- Para completar una reserva, permitir actividad y precio sin exigir datos clínicos.
- Manejar conflictos de horario, estados inválidos y respuestas 409/422.
- Mantener selector Año → Mes → Días, animaciones, scroll independiente, paneles laterales y diseño premium aprobado.

## 4. Actividades — Compatibilidad con reservas

Archivos: `src/features/activities/`.

- Actualizar `activityService.ts` para admitir `paciente_id` y `paciente` nulos, así como la relación `agenda` y `agenda_id` realmente devueltos por Laravel.
- Mostrar el nombre de la reserva obtenido desde `agenda.nombre_reserva` cuando corresponda.
- No inventar códigos de paciente.
- Mantener la creación manual de actividades únicamente para pacientes registrados, según el contrato existente.
- Diferenciar actividades manuales y vinculadas a citas cuando la respuesta permita identificarlo.
- En actividades vinculadas, impedir cambios de paciente y fecha cuando Laravel los prohíba.
- Permitir editar actividad y precio mediante payload parcial, omitiendo campos no modificables.
- Mantener sincronizados registros y total económico.
- Conservar formularios, filtros, menús, validaciones y animaciones aprobadas.

## 5. Dashboard y Caja

Archivos: `src/features/dashboard/`, `src/features/cash/`.

- Adaptar el Dashboard para mostrar citas de reservas sin paciente registrado.
- Evitar errores de lectura de propiedades nulas.
- Mantener los indicadores y accesos rápidos existentes.
- Verificar que completar citas y modificar actividades actualice los datos económicos correspondientes.
- Mantener ingresos, egresos y saldo calculados exclusivamente por Laravel.
- En Caja, admitir ingresos sin nombre ni código de paciente.
- Si la respuesta de `/reportes/caja` no incluye el nombre de la reserva, mostrar una indicación neutral y no inventar información.
- Conservar las acciones únicamente para egresos.
- Verificar fechas históricas, filtros, registro, edición y eliminación de egresos.
- Terminar el pulido pendiente de Caja: bordes finos, altura adaptable del listado, menús sin recortes, guion en acciones de ingresos y animaciones perceptibles de 200–300 ms.
- No agregar ingresos manuales ni alterar el cálculo financiero.

## 6. Pacientes y expediente clínico

Archivos: `src/features/patients/`, `src/features/clinical-history/`.

- Verificar listado, búsqueda, paginación, registro, edición, fotografía y expediente.
- Mantener los permisos de doctora y asistente establecidos por Laravel.
- Revisar campos obligatorios, opcionales, fechas, mensajes y errores reales.
- Mejorar la presentación del expediente con el estilo premium de los módulos aprobados.
- Verificar la creación, consulta y actualización del historial clínico.
- Resolver estados de carga, errores, navegación y conservación de cambios no guardados.

## 7. Odontograma — Integración completa

El componente `OdontogramPreview.tsx` actualmente solo mantiene cambios temporales.

Convertirlo en un odontograma funcional utilizando:

- `GET /odontogramas/paciente/{pacienteId}`
- `PUT /odontogramas/paciente/{pacienteId}`
- `DELETE /odontogramas/paciente/{pacienteId}`

Implementar un servicio tipado y validación de respuestas.

Laravel recibe `{ datos: ... }` y devuelve la información del paciente y su odontograma. Revisar la estructura persistida y el modelo antes de definir su representación en React.

- Cargar los datos reales del paciente seleccionado.
- Guardar condiciones y observaciones de las piezas dentales.
- Conservar datos existentes que la interfaz no reconozca, evitando sobrescrituras destructivas.
- Diferenciar piezas sin evaluar de piezas diagnosticadas como sanas.
- Permitir modificar y eliminar únicamente a la doctora.
- La asistente únicamente puede consultar.
- Añadir confirmación de eliminación, estados de guardado y aviso de cambios pendientes.
- Comprobar persistencia al recargar la página y cambiar de paciente.
- Eliminar textos de demostración y la etiqueta «Vista previa» cuando la integración sea funcional.

## 8. Diagnósticos y tratamientos

Revisar `PatientDiagnosisSection.tsx`.

Actualmente contiene apartados de integración pendiente. Laravel almacena diagnóstico, tratamiento y observación en las citas médicas.

- Para doctora, evaluar la consulta de citas mediante el endpoint oficial `GET /agenda`, filtrando estrictamente por el UUID del paciente en el frontend si el servidor no ofrece ese filtro.
- Mostrar únicamente información clínica perteneciente al paciente seleccionado.
- No inventar `/diagnosticos`, `/tratamientos` ni parámetros no admitidos.
- No consumir rutas exclusivas de doctora desde una sesión de asistente.
- Mantener el registro y edición clínica mediante el flujo oficial de Citas médicas.
- Si no existe un contrato autorizado y adecuado para una consulta determinada, documentar el bloqueo y no simular información ni ampliar permisos.

## 9. Evidencias clínicas

Archivos: `src/features/evidence/`.

Actualizar el contrato conforme a `EvidenciaClinicaController.php`:

- Tipos `caso_clinico`, `rx` y `documento`.
- Archivos JPG, JPEG, PNG, WebP y PDF.
- Tamaño máximo de 20 MB.
- Validar descripción, fecha y demás restricciones de Laravel.
- Integrar `GET /evidencias-clinicas/{id}/archivo` mediante una solicitud autenticada y manejo seguro de Blob.
- Permitir consultar o descargar imágenes y documentos según los permisos existentes.
- Revocar object URLs cuando ya no se utilicen.
- Mantener registro, edición y eliminación exclusivamente para doctora.
- La asistente únicamente consulta.
- No exponer archivos privados mediante URLs públicas, tokens en enlaces ni almacenamiento local inseguro.

## 10. Eliminar integraciones obsoletas

Laravel eliminó recetas y plantillas de recetas, incluida su estructura de base de datos.

- Retirar rutas, pestañas, enlaces, componentes, servicios, tipos y pruebas exclusivamente asociados a recetas.
- Revisar `src/features/prescriptions/`, `AppRouter.tsx`, `PatientWorkspace.tsx` y `roleAccess.ts`.
- No dejar botones que conduzcan a endpoints inexistentes.
- Comprobar si existen referencias a Reverb, Laravel Echo, Pusher o WebSockets y retirar las integraciones obsoletas si están presentes.
- No reintroducir WebSockets: el backend mantiene únicamente eventos internos de citas.
- Limpiar imports y dependencias exclusivamente obsoletas, después de verificar que no tengan otros usos.

**Práctica de orquestación 3.3:** conservar el aporte académico existente. Como `/resumen-cita/{id}` no está disponible en las rutas del backend oficial auditado, aislarlo de los flujos normales de producción. Solo habilitarlo en un entorno académico explícitamente configurado. No generar peticiones 404 recurrentes ni inventar respuestas.

## 11. Configuración y auditoría

Archivos: `src/features/audit/`.

Implementar una nueva sección «Historial de cambios» dentro de Configuración mediante:

`GET /configuracion/cambios`

Filtros admitidos:

- `tabla`
- `registro_id`
- `usuario_id`
- `fecha`

La respuesta contiene `cambios`, información de usuario y rol, además de `datos_anteriores` y `datos_nuevos`.

- Diseñar una lista profesional con fecha, usuario, operación y registro afectado.
- Permitir consultar valores anteriores y nuevos mediante un panel de detalles.
- Manejar objetos JSON, valores nulos y registros eliminados.
- Ocultar o enmascarar credenciales, tokens y otros secretos.
- Respetar el límite de 200 registros que establece el servicio.
- No implementar paginación ficticia ni acciones de modificación sobre la auditoría.
- Mantener acceso exclusivo de doctora.
- Conservar las secciones Acciones y Sesiones.

## 12. Mis servicios, Reportes y Usuarios

Revisar integralmente:

- `src/features/catalog/`
- `src/features/reports/`
- `src/features/assistant/`

**Mis servicios:**
- Gestión real de categorías y servicios.
- Creación, edición, activación, desactivación y eliminación según las restricciones del backend.

**Reportes:**
- Clínicos, económicos, financieros e ingresos.
- Consultas reales, filtros admitidos y consistencia con Actividades y Caja.
- No generar gráficos con valores ficticios.

**Usuarios:**
- Gestión de asistentes.
- Activación, desactivación, eliminación y cambio de contraseña.
- Gestión de cuentas de pacientes y desvinculación según Laravel.
- Confirmaciones seguras y mensajes claros.

Conectar cualquier operación pendiente que sea necesaria para los flujos web autorizados y pulir su presentación. No crear funcionalidades que correspondan exclusivamente a la aplicación móvil.

## 13. Autenticación, permisos y seguridad

Revisar login, recuperación de contraseña, sesión, logout, perfil y fotografías.

- Respetar autenticación Sanctum y el contrato real.
- Mantener doctora y asistente como los roles del portal web.
- La doctora puede acceder a las funciones autorizadas de administración.
- La asistente puede consultar y gestionar pacientes según Laravel, consultar historiales, odontogramas, evidencias y actividades según sus permisos.
- Impedir modificaciones o consultas no autorizadas, incluso mediante navegación directa.
- Evitar peticiones a endpoints prohibidos.
- Limpiar caché y datos clínicos al cerrar sesión o cambiar de cuenta.
- Gestionar errores 401, 403, 404, 409, 422, 429, 5xx y desconexiones.
- Evitar doble envío, respuestas antiguas sobrescribiendo datos actuales y falsos mensajes de éxito.

## 14. Pulido visual integral — Nivel premium

Conservar el estilo clínico premium establecido en Dashboard, Agenda, Citas médicas y Actividades.

Aplicarlo especialmente a Pacientes, expediente clínico, Odontograma, Mis servicios, Reportes, Usuarios y Configuración.

- Identidad azul y blanca, iconografía consistente, tipografía y espaciados equilibrados.
- Formularios profesionales y compactos.
- Menús sin recortes y scroll correctamente delimitado.
- Estados vacíos, carga, errores y éxito consistentes.
- Animaciones perceptibles, discretas y útiles, respetando `prefers-reduced-motion`.
- Responsive en escritorio, tablet y móvil.
- Accesibilidad por teclado, gestión del foco y diálogos accesibles.
- Evitar espacios innecesarios, títulos redundantes y componentes decorativos sin utilidad.
- No rediseñar módulos previamente aprobados salvo para incorporar nuevas funciones reales o corregir errores demostrados.

El objetivo es que todos los módulos mantengan el mismo estándar profesional, visual y funcional.

## 15. Limpieza de producción

Buscar datos mock, demo, fixture, placeholder funcional, IntegrationPending, TODO, endpoints obsoletos y funciones temporales.

Eliminar o resolver únicamente lo que corresponda.

Los mocks utilizados en pruebas automatizadas deben conservarse cuando sean necesarios. No confundir fixtures de testing con datos simulados en producción.

No mostrar cero cuando una consulta falla ni presentar un éxito si Laravel no confirmó la operación.

Revisar también archivos innecesarios, imports sin utilizar, componentes obsoletos y código duplicado, sin eliminar funcionalidades vigentes.

## 16. Pruebas y criterios de aceptación

Ejecutar los scripts existentes de:

- Lint.
- Pruebas automatizadas.
- Build de producción.
- Comprobación TypeScript cuando exista un script correspondiente.
- `git diff --check`.

Añadir pruebas de regresión para los nuevos contratos y funcionalidades.

Verificar especialmente:

1. Cita de paciente registrado.
2. Reserva sin paciente.
3. Completar ambos tipos de cita.
4. Generación de actividad sin paciente y actualización de Caja.
5. Guardar, consultar y eliminar odontograma.
6. Evidencias de tipo documento y descarga autenticada.
7. Auditoría con valores anteriores y nuevos.
8. Permisos de doctora y asistente.
9. Eliminación de rutas obsoletas.
10. Navegación y responsive de todos los módulos.
11. Conservación de los flujos previamente aprobados.
12. Ausencia de datos simulados en producción.

Realizar pruebas contra Laravel real si existe un entorno de integración accesible. Utilizar una base de datos de pruebas aislada para operaciones destructivas. No modificar datos clínicos reales ni ejecutar migraciones destructivas.

Si alguna prueba depende de un backend inaccesible, documentarla como pendiente. No afirmar que pasó.

Corregir los errores detectados y repetir las verificaciones antes de publicar.

## 17. Publicación obligatoria en GitHub — Cuenta jerenyvera09

Una vez terminada la implementación y aprobadas las verificaciones locales obligatorias, publicar los cambios.

**Cuenta autorizada:** `jerenyvera09`.

**Repositorio de destino:** `Jordyfr2004/proyect_clinico`.

**Rama de destino:** `frontend-web`.

Procedimiento obligatorio:

1. Comprobar la rama activa mediante `git branch --show-current`.
2. Verificar que el remoto `origin` corresponde al repositorio oficial.
3. Comprobar la identidad de Git y la cuenta autenticada de GitHub.
4. Si existen varias cuentas autenticadas, seleccionar `jerenyvera09` utilizando las credenciales ya disponibles.
5. Configurar la identidad del autor del commit con el nombre y correo previamente asociados a `jerenyvera09`. No inventar un correo electrónico.
6. No solicitar autenticación nuevamente si la sesión y las credenciales existentes permiten publicar.
7. Revisar `git status`, `git diff` y los archivos que se incluirán.
8. Confirmar que todos los archivos del nuevo commit corresponden exclusivamente al frontend web.
9. No incluir archivos `.env`, credenciales, tokens, node_modules, información clínica privada ni archivos temporales.
10. Crear un commit descriptivo, por ejemplo:

`feat(frontend-web): completar integracion con backend y pulido final del sistema`

11. Subir los cambios mediante:

`git push origin frontend-web`

12. Verificar posteriormente que el commit local coincide con el commit remoto de `origin/frontend-web`.
13. Confirmar que el directorio local permanece en la rama `frontend-web` y con la cuenta `jerenyvera09` como principal.
14. Entregar el hash completo del commit y su enlace directo en GitHub.

**Restricciones de publicación:**

- No subir cambios a `master`, `backend` ni `frontend`.
- No crear ramas adicionales innecesarias.
- No modificar el remoto oficial.
- No utilizar `--force` ni sobrescribir commits de otros colaboradores.
- No utilizar otra cuenta para realizar el push.
- No cerrar sesiones ni eliminar credenciales existentes de otras cuentas.
- Si existen conflictos remotos, resolverlos de forma segura sin perder cambios propios o ajenos.
- Si las credenciales existentes de `jerenyvera09` no están disponibles o no tienen permisos, informar el bloqueo sin publicar desde otra cuenta.
- No publicar código con errores críticos, pruebas locales fallidas o build incorrecto.

La autorización para realizar commit y push a `frontend-web` queda concedida mediante este prompt.

## 18. Entrega final

Trabajar internamente por etapas, comprobando cada grupo de cambios antes de continuar. No detenerse únicamente en la planificación.

Entregar al finalizar:

- Matriz de integración actualizada.
- Funcionalidades completadas por módulo.
- Archivos creados, modificados y eliminados.
- Endpoints conectados y contratos corregidos.
- Resultados reales de lint, pruebas y build.
- Diferenciación entre pruebas con mocks y pruebas contra Laravel.
- Bloqueos que requieran intervención del responsable del backend.
- Estado final de Git.
- Cuenta utilizada para publicar: `jerenyvera09`.
- Rama publicada: `frontend-web`.
- Hash completo y enlace del commit en GitHub.
- Confirmación de coincidencia entre HEAD local y origin/frontend-web.
- Confirmación de que no se modificaron otras ramas ni componentes.

**Objetivo definitivo:** dejar frontend-web funcionalmente alineado con el backend oficial disponible, con una apariencia premium en todos sus módulos, sin simulaciones, sin perder el trabajo anterior y con los cambios correctamente publicados en GitHub mediante la cuenta `jerenyvera09`.

No declarar el frontend terminado al 100% mientras existan errores críticos o integraciones obligatorias sin verificar.

Realiza la implementación completa, las verificaciones y la publicación autorizada. No te limites a explicar qué se debería hacer.