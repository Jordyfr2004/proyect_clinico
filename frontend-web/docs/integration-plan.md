# Integración definitiva del frontend — plan y registro de ejecución

**Objetivo:** alinear exclusivamente frontend-web con origin/backend `7ea26c5181f8881d6487513ef1e883c31431bf30`, preservando los flujos y el diseño aprobados.

**Especificación:** [solicitud completa](integration-request.md). **Arquitectura:** React/TypeScript, Axios/Zod, consultas clínicas en memoria aisladas por sesión. Laravel mantiene permisos, persistencia y totales.

## Restricciones y decisiones

- Rama `frontend-web`; cambios únicamente dentro de `frontend-web/`. Sin merge, reset destructivo, force push ni datos clínicos reales.
- Se verificó la rama limpia existente; no se crearon otras ramas ni worktrees porque el usuario exige trabajar en esta rama.
- Se ejecutó directamente el alcance detallado y autorizado. Se distribuyeron módulos independientes siguiendo la guía de agentes paralelos; una revisión independiente posterior examinó la integración completa.
- Publicación solo con `jerenyvera09` y después de lint, pruebas, TypeScript/build y `git diff --check` correctos.
- Se conservaron estilos y componentes existentes. No se incorporaron dependencias de runtime.

## Bloques de implementación

- [x] Agenda/citas/dashboard: búsqueda específica `agenda=1`, creación con identidad exclusiva, reservas, completado según identidad y aislamiento académico.
- [x] Actividades/Caja: relaciones nulas, payload parcial para vinculadas y anónimas existentes, invalidación de totales y registros afectados, pulido del listado.
- [x] Expediente: odontograma persistente con JSON preservado, preflight de concurrencia, diagnóstico por UUID y evidencias autenticadas con Blob.
- [x] Configuración: `GET /configuracion/cambios`, filtros reales, detalles y enmascarado de secretos antes de la caché.
- [x] Retirar recetas, rutas, permisos, servicios, componentes y pruebas exclusivas; conservar práctica académica deshabilitada por defecto.
- [x] Auditar pacientes, historial, autenticación, catálogo, reportes y usuarios; conservar contratos correctos y documentar bloqueo de categorías.
- [x] Añadir regresiones y observar fallos antes de implementar las correcciones de contratos, permisos, caché, sesión y preservación de datos.
- [x] Corregir revisión independiente: pérdida de borradores con Atrás; condiciones dentales desconocidas; borrado concurrente; cachés económicas/clínicas; logout pendiente; actividades anónimas desvinculadas.
- [x] QA renderizado con Playwright y respuestas aisladas de prueba: escritorio, móvil, navegación, detalles de auditoría y persistencia simulada del odontograma.
- [x] Verificación final tras las correcciones: 458 pruebas, lint, TypeScript/build y diff check correctos. Preparación del commit y push autorizado; su resultado se verifica contra la referencia remota y se comunica en la entrega.

## Decisiones de compatibilidad y límites

- Los datos dentales se guardan bajo `datos.frontend_web_v1.teeth`. Se preservan claves ajenas. Arrays heredados, espacios de nombres incompatibles o piezas con valores desconocidos quedan en consulta, sin conversión destructiva.
- La lectura previa a PUT/DELETE detecta cambios posteriores a la carga. El backend no dispone de versión/ETag transaccional: aún existe una carrera entre lectura y escritura que solo el servidor puede resolver.
- La asistente consulta odontogramas/evidencias/historial y actividades; no consulta `/agenda` ni datos clínicos restringidos de citas.
- La eliminación de categorías sigue bloqueada por `CategoriaServicioService::eliminar()` que usa una relación `servicios()` ausente en el modelo oficial.
- La API configurada no fue accesible en las consultas de lectura `/health` y `/agenda`. No se ejecutaron mutaciones reales, migraciones ni operaciones destructivas contra Laravel.

La matriz, verificaciones y límites de validación figuran en [integration-audit.md](integration-audit.md).
