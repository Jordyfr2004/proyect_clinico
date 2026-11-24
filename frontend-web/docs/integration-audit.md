# Matriz de integración y evidencia — 23 de noviembre de 2026

## Fuente y alcance

Se ejecutaron `git status`, `git fetch origin`, `git branch --show-current`, `git remote -v` y `git rev-parse`. El árbol inicial estaba limpio. HEAD y origin/frontend-web coincidían en `a06c83da76f1083770a0e29abfe3f43a73a02acd`; origin/backend permanecía en `7ea26c5181f8881d6487513ef1e883c31431bf30`. No había actualizaciones posteriores a los commits de la solicitud.

Se consultaron rutas, controladores, servicios, modelos, Requests y migraciones mediante `git show origin/backend:...`. No se mezcló ni modificó Laravel. Doctora = D; asistente = A; todos los endpoints privados requieren Bearer Sanctum.

## Contratos auditados

| Módulo / endpoint | HTTP / rol | Parámetros o payload admitido | Respuesta consumida | Estado inicial → corrección / resultado |
|---|---|---|---|---|
| `/auth/login`, `/user`, `/auth/logout` | POST / GET / POST; personal | username/password; sin payload de usuario inventado | access_token, token_type, user / usuario / confirmación | Contrato correcto. Protegidos login/logout tardíos y eventos 401/403 de otra sesión; desmontaje del expediente al cambiar identidad. |
| `/auth/forgot-password`, `/auth/reset-password` | POST público | email; email/code/password/password_confirmation | message | Verificados correo ≤254, código de seis dígitos, contraseña ≥8 y ≤72 bytes; sin cambios de contrato. |
| `/usuarios/{id}/foto`, `/perfil/foto` | GET / POST / DELETE; autenticado | foto JPG/PNG/WebP ≤5 MB al actualizar perfil propio | Blob / data.foto_perfil_url | Descarga protegida existente con object URL y revocación; sin URLs con token. |
| `/pacientes` general | GET D/A | buscar, page | paginador Laravel con data/metadatos | Conservada búsqueda/paginación general; no se reutiliza su parser para Agenda. |
| `/pacientes/{id}`; `/pacientes` | GET/PUT por ID; POST D/A | nombres ≤255, cedula ≤20; telefono ≤20 y direccion ≤255 opcionales; fecha no futura | data / message,data | Listado, detalle, alta y edición correctos. Añadida protección de borradores al cerrar, navegar, usar historial y cerrar sesión. |
| `/pacientes?agenda=1` | GET D/A | agenda=1, buscar ≤255 | data no paginada; registrado true/false, ID/código nulos en reservas | Nuevo contrato específico; admite paciente, reserva existente y nuevo nombre libre. |
| `/agenda` | GET D | fecha o mes/anio, tipo, estado según consulta | data[] con paciente_id/paciente/nombre_reserva nulos según registro | Se conserva nombre de reserva y se renderizan relaciones nulas sin códigos inventados. |
| `/agenda/personal` | POST D | fecha, hora_inicio, hora_fin posterior, descripcion | message,data | Conservado flujo aprobado. |
| `/agenda/cita-medica` | POST D | fecha, horas, descripcion opcional; codigo_paciente **o** nombre_reserva ≤255 | message,data; 409/422 | Nueva reserva; unión exclusiva y payload sin identidades simultáneas. |
| `/agenda/solicitud/{id}/programar` | PUT D | fecha y ambas horas | message,data | Conservados validación, conflictos y solicitudes reales. |
| `/agenda/{id}` | PUT D | horario completo si cambia; descripcion parcial | message,data; 409/422 | Nombre visible en edición. Se invalidan Caja, Actividades y totales porque Laravel mueve la fecha de la actividad vinculada. |
| `/agenda/{id}/datos-clinicos` | PUT D | diagnostico, tratamiento obligatorios; observacion opcional | message,data | Oculto en reservas; únicamente paciente registrado. El expediente comparte prefijo de caché Agenda. |
| `/agenda/{id}/completar` | PUT D | actividad ≤255 y precio decimal ≥0, ≤99999999.99 | message,data | Registro exige diagnóstico y tratamiento; reserva admite actividad/precio. Invalida Caja/Actividades/reportes/dashboard. |
| `/agenda/{id}/cancelar`; `/agenda/{id}` | PUT / DELETE D | ID real | message,data / message | Confirmaciones muestran nombre de reserva. El borrado invalida actividades cuya FK se pone a null. |
| `/resumen-cita/{id}` | **Ausente** oficialmente | solo entorno académico explícito | contrato académico validado si está habilitado | `VITE_ENABLE_ACADEMIC_ORCHESTRATION=true` requerido en UI y servicio. Deshabilitado por defecto; sin peticiones normales. |
| `/actividades` | GET D/A | fecha, semana, mes, anio, codigo_paciente | data[]; paciente y paciente_id nulos, agenda_id/agenda opcionales | Corregido parser y nombre desde agenda.nombre_reserva. Indicador de vinculación, fallback neutral. |
| `/actividades/resumen` | GET D/A | periodo con fecha o mes/anio o anio | periodo,total | Total exclusivo del servidor. No se sustituye un fallo por cero. |
| `/actividades/paciente/codigo/{codigo}` | GET D/A | código codificado en URL | data.codigo_paciente,nombres | Confirmación de paciente real para alta manual conservada. |
| `/actividades` | POST D | codigo_paciente, fecha, actividad, precio | message,data | Creación manual solo con paciente registrado. |
| `/actividades/{id}` | PUT / DELETE D | payload parcial / ID | message,data / message | Vinculadas: paciente/fecha inmutables, solo actividad/precio. Anónimas existentes sin agenda conservan null al corregir precio. Invalida Caja y totales. |
| `/reportes/caja` | GET D | periodo con fecha/mes/anio | ingresos,egresos,saldo,movimientos | Totales originales. Ingreso sin nombre/código: “Sin paciente registrado”; acciones “—”. No se inventa nombre ausente en respuesta. |
| `/egresos` y `/egresos/{id}` | GET/POST; PUT/DELETE D | filtros históricos; alta fecha/concepto/monto; edición concepto/monto | data[] / message,data / message | Conservadas acciones solo de egresos. Bordes de 1px, altura adaptable, menú con portal y transición 240ms con reduced-motion. |
| `/historiales-clinicos/paciente/{id}` | GET D/A | ID paciente | data con id,paciente_id y cinco campos clínicos | Contrato existente correcto; carga/error/ausencia y permisos preservados. |
| `/historiales-clinicos`; `/{id}` | POST / PUT D | paciente_id al crear; sexo,lugar_nacimiento,antecedentes_enfermedades,cirugias,medicacion_actual | data | Conservado flujo real; campos bloqueados en envío y protección de cambios pendientes. |
| `/odontogramas/paciente/{id}` | GET D/A | paciente UUID de ruta | paciente,odontograma nullable; datos array/objeto | Nuevo servicio valida identidad; distingue piezas sin evaluar de sanas. Se carga el registro real. |
| `/odontogramas/paciente/{id}` | PUT / DELETE D | `{datos: ...}` / ID | message,data / message | Nuevo guardado y eliminación confirmada. JSON desconocido preservado; formato incompatible en consulta. Comparación previa a ambas mutaciones; errores conservan borrador. |
| Diagnósticos / tratamientos | GET `/agenda?tipo=cita_medica` D | sin filtro de paciente inventado | citas filtradas localmente por UUID exacto | Sustituye integración pendiente. Sin consulta ni enlace a agenda para A. Registro/edición a través de Citas médicas. |
| `/evidencias-clinicas/paciente/{id}` | GET D/A | ID paciente | paciente,data[] | Verificación de identidad; tipos caso_clinico,rx,documento. |
| `/evidencias-clinicas/{id}/archivo` | GET D/A | ID; responseType blob | Blob autenticado | Consulta/descarga JPG/JPEG/PNG/WebP/PDF; object URLs revocados al cerrar, reemplazar o desmontar. Sin URLs públicas ni tokens en enlaces. |
| `/evidencias-clinicas`; `/{id}` | POST / PUT / DELETE D | multipart con paciente_id,tipo,archivo ≤20MB; descripción creación ≤1000; fecha opcional en alta, requerida en edición | message,data / message | Contrato actualizado, formularios con límites reales y permisos. Actualización no impone un límite de descripción inexistente en Laravel. |
| `/configuracion/acciones`, `/sesiones`; `/acciones/{id}` | GET; DELETE acción D | fecha / ID | acciones[] / sesiones[] / message | Se conservan ambas secciones y ocultación permitida de acciones. |
| `/configuracion/cambios` | GET D | tabla ≤100, registro_id ≤100, usuario_id UUID, fecha | cambios[] ≤200; usuario/rol; datos_anteriores/nuevos JSON nullable | Nueva sección, filtros reales y detalle anterior/nuevo; secretos anidados enmascarados antes de caché. Sin modificación ni paginación ficticia. |
| `/categorias-servicios` y `/{id}/{activar,desactivar}` | GET/POST; PUT D | nombre / estado por ruta | data[] / message,data | Alta/edición/activación verificadas; sin cambios innecesarios. |
| `/categorias-servicios/{id}` | DELETE D | ID | servicio llama `servicios()` inexistente | **Bloqueo Laravel:** operación continúa fuera de la UI. Se requiere corregir relación del servidor. |
| `/servicios-consultorio`, `/{id}`, `/{id}/{activar,desactivar}` | GET/POST/PUT/DELETE D | categoria_id,nombre,descripcion; imagen/precio/duracion_minutos opcionales | data[] / message,data / message | Gestión existente auditada conforme al contrato; se preserva presentación. |
| `/reportes/clinicos`, `/economicos`, `/ingresos`, `/dashboard` | GET D | sin filtros no admitidos | objetos agregados oficiales | Contratos validados; sin gráficos ficticios. Dashboard muestra reservas correctamente. |
| `/reportes/financieros` | GET D | anio | anio,meses[12] con ingresos/egresos/saldo | Contrato existente correcto; datos solo del servidor. |
| `/usuarios/asistentes`, `/{id}`, `/{id}/{activar,desactivar,password}` | GET/POST/DELETE; PUT D | name,email,username,password; cambio con confirmación | data[] / message,data / message | Gestión múltiple y confirmaciones existentes auditadas; no se amplían permisos. |
| `/usuarios`; `/{id}/{activar,desactivar,desvincular-paciente}` | GET; PUT D | buscar,page / ID | paginador de cuentas / message,data | Se recorren páginas reales y se filtran cuentas paciente; operaciones existentes conformes. |
| Recetas / plantillas / WebSockets | Sin contrato vigente | — | — | Eliminados ocho archivos de recetas, rutas, pestañas y permisos asociados. No había dependencias Echo/Pusher/Reverb activas que retirar. Eliminado IntegrationPending sin consumidores. |

## Verificaciones y revisión

Las pruebas son Vitest/jsdom con respuestas aisladas. Se observaron regresiones fallidas antes de corregir contratos, cachés, cambios de sesión, borradores y preservación dental. La primera suite integrada pasó 452/452. Se repite la suite final después de las correcciones de revisión; el resultado definitivo se registra en la entrega y al pie de este documento.

Revisión independiente: corregidos seis grupos de hallazgos reproducibles (formato dental desconocido, DELETE concurrente, cachés financieras, caché clínica, logout con borradores y actividad anónima desvinculada). También se corrigió la pérdida de borradores al usar Atrás/Adelante o navegación programática mediante el router con datos. No se difirieron hallazgos menores de la revisión.

QA de navegador: Browser plugin no disponible; se utilizó Playwright CLI temporal sin incorporarlo a dependencias del repositorio. URL local `http://127.0.0.1:5173`; escritorio 1440×1000 y móvil 390×844. Se recorrieron Dashboard, Agenda, Citas, Actividades, Caja, Pacientes, Historial, Odontograma, Evidencias, Mis servicios, Reportes, Usuarios y Configuración. Se abrió el detalle de auditoría con secretos enmascarados, se guardó un diente y se conservó al recargar **en el backend simulado del navegador**, y se abrió/cerró el menú móvil con Escape. Capturas y script de QA permanecen en el directorio temporal, fuera del repositorio.

No se ejecutaron pruebas autenticadas contra Laravel: la API configurada no respondió a `/health` ni `/agenda` en dos consultas de lectura con timeout. No se tocaron datos clínicos reales ni se ejecutaron migraciones.

## Pendientes que requieren entorno o backend

1. Validar contra una base de pruebas aislada la creación/completado de ambos tipos de cita, generación de actividad, Caja y cambios de fecha; CRUD odontograma y evidencias; permisos y auditoría PostgreSQL.
2. Corregir `CategoriaServicio::servicios()` para habilitar eliminación de categorías.
3. Incorporar versionado o precondición atómica de odontogramas si se necesita garantizar ausencia de escrituras concurrentes entre el GET previo y PUT/DELETE. La web evita sobrescribir versiones ya cambiadas al comprobarlas, pero no puede cerrar esa carrera por sí sola.
4. Los datos dentales de formatos heredados incompatibles quedan preservados en consulta; no se intentó migrarlos sin un contrato de representación compartido.

El frontend no se declara validado al 100% mientras falte la comprobación real con Laravel. Estos límites no equivalen a pruebas aprobadas.

## Resultado final local

| Verificación | Resultado observado |
|---|---|
| `npm run lint` | Correcto, sin advertencias. |
| `npm test` | **458 pruebas, 46 archivos, todos correctos** después de las correcciones de revisión. |
| `npm run build` | Correcto; ejecuta `tsc -b` y Vite. Aviso no bloqueante de bundle mayor de 500 kB. |
| `git diff --check` | Correcto, sin errores de espacios. |
| Playwright 1440×1000 | 13 rutas principales; sin alertas de error, desbordamiento horizontal ni errores de página; ningún endpoint inesperado. |
| Playwright 390×844 y 768×1024 | Las 13 rutas principales sin desbordamiento horizontal ni overlays de error. Reporte anual comprobado al entrar en pantalla (su carga es diferida). Menú móvil abre/cierra con Escape. |
| Interacciones Playwright | Auditoría no muestra secretos de la respuesta de prueba; odontograma conserva Caries tras guardar/recargar en backend simulado. |
| Archivo privado Playwright | PDF solicitado con Authorization Bearer y expuesto solo mediante enlace Blob local; sin URL pública. |
| Permisos asistente Playwright | Navegación directa denegada en Agenda/Citas/Caja/Reportes/Usuarios/Configuración/Servicios; ninguna petición a endpoints restringidos. Odontograma y evidencias sin controles de mutación; diagnóstico no consulta Agenda. |
| Laravel real | Pendiente: API inaccesible; no se ejecutaron mutaciones reales. |

Las pruebas de revisión añadidas reproducen y corrigen: formato dental no reconocido, eliminación de una versión cambiada por otro editor, invalidación económica al completar/editar citas, diagnóstico actualizado al regresar al expediente, logout cancelado con borrador y edición parcial de actividad anónima desvinculada. [Inventario completo de archivos](integration-files.md).
