# Integración móvil: plan de ejecución

Especificación: solicitud completa del usuario del 24/11/2026. Fuente de contratos: origin/backend 7ea26c5181f8881d6487513ef1e883c31431bf30. Base móvil: a9a2c1af92e032bda28c3b835a87c727e47ed389. Fetch realizado: no hay revisiones posteriores.

Objetivo: integrar las funciones autorizadas al paciente conservando los diseños actuales, Expo 58 y React Native 0.88. Trabajar y publicar solamente frontend/, rama frontend. Sin mezclas de ramas ni escrituras sobre datos clínicos reales.

Arquitectura: conservar servicios tipados, componentes compartidos y useRemote. Aislar sesión en el cliente y al montar rutas privadas. Actualizar citas mediante eventos internos y foco; serializar recordatorios e invalidar trabajo tardío. Descargar binarios autenticados y exportarlos solo por acción explícita; usar caché temporal nativa y Blob en Web.

## Tareas

- [x] 1. Sesión/comunicación: pruebas de 401 tardío, respuestas tardías, abort, configuración HTTPS, restauración sin red y almacenamiento Web efímero; corregir client, auth-context, session-storage y guardas.
- [x] 2. Citas: conservar pruebas existentes, agregar restricciones de fecha inválida y zona del consultorio, reprogramación solo programada, motivo de 255 caracteres, doble envío y escritura confirmada/consulta fallida. Implementar acciones visibles, confirmaciones y modal accesible con scroll/teclado.
- [x] 3. Recordatorios: cola serializada con generación, limpieza al salir, publicación después de consultas y mutaciones, pruebas de sincronización concurrente y permisos denegados.
- [x] 4. Archivos/perfil: comprobar versiones compatibles de document-picker, file-system y sharing; pruebas de formatos/tamaño, multipart Web, descarga autenticada y limpieza. Selección de imágenes/PDF, cámara, descripción, exportación explícita; estados de error y refresco. Foto: validación y confirmaciones multiplataforma.
- [x] 5. Retirar recetas y consumidores exclusivos; historial con validación de identidad; acceso a archivos; conservar inicio y catálogo. Completar validaciones de autenticación y regresiones.
- [x] 6. Matriz completa de contratos, documentación de limitaciones y resultados. Ejecutar lint, Jest completo, TypeScript, Expo Doctor, exportación Android/iOS/Web y diff --check; QA de navegador según disponibilidad. Revisión independiente final; corregir hallazgos importantes y repetir verificaciones afectadas.
- [ ] 7. Revisar diff y secretos; commit solicitado con identidad ya configurada de andriw4452R; push sin force a frontend; comprobar SHA remoto y autor; restaurar cuenta principal y configuración original incluso ante errores.

## Evidencia y decisiones

- Estado inicial: 18 suites, 102 pruebas: 4 fallidas en appointments.test.tsx, 98 aprobadas. No se eliminarán pruebas válidas.
- Archivo ajeno sin seguimiento en raíz preservado. Identidad local original: andriw4452R / Andriw_YT@outlook.com; global: jerenyvera09 / jeremyvera14a@gmail.com. Cuenta CLI activa inicial: jerenyvera09. Ambas credenciales disponibles.
- Decisión: ejecutar directamente el alcance detallado autorizado; no añadir una fase de aprobación de diseño ni ramas/worktrees adicionales, por la instrucción explícita del usuario.
- Revisión prioritaria: logout con operaciones en vuelo; subida confirmada seguida de consulta fallida; fechas inválidas/vencidas; archivos desconocidos; falta de API/dispositivos y permisos.

## Cierre de la verificacion

150 pruebas / 28 suites aprobadas; lint, TypeScript y Expo Doctor 20/20 aprobados. Exportacion Android/iOS/Web aprobada. Revision independiente y regresiones corregidas, incluidas rutas secundarias SDK 58 y etiquetas de tabs detectadas en navegador. API real devuelve 404, sin cuenta/base aislada ni dispositivo/AVD. La tarea 7 solo se declara completada en la respuesta final tras verificar el push y restaurar la cuenta principal.
