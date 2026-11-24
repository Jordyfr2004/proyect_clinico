# Resultados del cierre móvil — 24/11/2026

## Estado y alcance

Implementación y verificación local completadas en `frontend/`, rama `frontend`. No equivale a aceptación contra una API desplegada ni a prueba en un teléfono físico. La matriz completa de los 22 contratos, funcionalidades por módulo, dependencias y límites está en [mobile-integration.md](mobile-integration.md).

No se modificaron Laravel, frontend-web, la base de datos ni otras ramas. Se preservó el archivo ajeno sin seguimiento de la raíz. No se fusionaron ramas, no se cambiaron remotos y no se usó force. Se conservaron los rediseños de Inicio/Servicios y los campos de correo y fecha de nacimiento.

## Verificaciones reales

| Comprobación | Resultado |
| --- | --- |
| `npm ci --legacy-peer-deps` | Instalación reproducible desde lockfile aprobada; después se actualizó únicamente zod transitivo dentro del rango permitido |
| `npm run lint` | Aprobado, sin errores ni warnings de ESLint |
| `npm test` / `npm test -- --silent` | **28 suites, 150 pruebas aprobadas**; 0 fallidas |
| `npx tsc --noEmit` | Aprobado, 0 errores |
| `npx expo-doctor` | **20/20 comprobaciones aprobadas** |
| `npx expo export --platform all --output-dir dist --max-workers 2` | Aprobado para Android, iOS y Web; bundles Hermes Android/iOS y 36 rutas estáticas Web |
| `git diff --check` | Aprobado; avisos LF/CRLF de Git en Windows, sin errores de whitespace |
| Búsqueda de recetas y WebSockets | Ningún consumidor/ruta de producción de recetas ni integración Reverb/Pusher/Echo añadida |
| `npm audit` después de actualizar zod | Sin severidad alta ni crítica; permanecen avisos moderados de dependencias transitivas |
| `npm audit --omit=dev` | 3 avisos moderados, 0 altos/críticos en la consulta registrada; no es una prueba de ausencia de vulnerabilidades |

La ejecución inicial tenía 4 regresiones de cancelación/reprogramación (18 suites, 102 pruebas; 98 aprobadas). Las cuatro se conservaron y quedaron aprobadas. La suite final agrega cobertura de rutas reales de Expo, además de componentes, servicios, reglas y fronteras HTTP.

No se generó APK/IPA firmado: exportar bundles no compila ni ejecuta una aplicación nativa. ADB estaba instalado, pero `adb devices -l` no encontró dispositivos; no se encontraron AVD configurados. iOS no pudo ejecutarse en este entorno Windows.

## QA en navegador

Browser plugin no disponible. Se usó Playwright CLI con Chromium, sirviendo la exportación mediante HTTP local de solo lectura en `127.0.0.1:8087`. El arranque inicial de Expo Web fue rechazado por la política automática; la exportación estática permitió completar esta comprobación sin ese arranque.

Se inspeccionaron DOM, consola y capturas en 360×800 y 768×1024. Los flujos privados usan **respuestas interceptadas de prueba**, con datos identificados como simulados y sin escrituras a Laravel. Se comprobaron login, selección de fecha de registro, Inicio, detalles/reprogramación/cancelación de citas, sincronización visible de Inicio, Servicios, acceso a Mis archivos y navegación inferior. La selección/subida PDF Web se comprueba adicionalmente con archivo local y multipart interceptado. Las pruebas Jest cubren recuperación/verificación, perfil, restricciones de archivos, descarga privada y concurrencia.

La selección de `sample.pdf`, subida con MIME/nombre/campos multipart correctos, mensaje de confirmación, listado posterior y descarga `sample.pdf` se observaron en Chromium. CDP omite los bytes de archivo de `postData`: la comprobación del navegador valida metadatos multipart, mientras que la prueba del servicio valida el Blob real. Un primer mock de QA exigía esos bytes omitidos y provocó un timeout simulado; el formulario conservó archivo y descripción y permitió completar el intento tras corregir ese mock. No fue una escritura real en Laravel.

Hallazgos visuales corregidos:

- El selector nativo de fecha no soportaba Web: ahora utiliza input date y mantiene el selector nativo en Android/iOS.
- Las etiquetas de tabs se reducían a unos 5 px de alto: ahora tienen 16 px de línea y altura suficiente, con ajuste por escala de fuente.
- `href:null` en Expo Router 58 redirigía Historial/Mis archivos a Inicio. Ahora se oculta únicamente el botón; la ruta sigue autorizada y accesible. Se añadió una regresión con Expo Router real.

Las capturas y scripts de navegador están fuera del repositorio, en `%TEMP%/clinic-mobile-qa`; solo contienen datos de prueba. Durante una reexportación, una pestaña antigua pidió chunks ya reemplazados y devolvió 404; se recargó la exportación y se repitió el flujo. Eso se distinguió de los errores de la aplicación. La versión final Web evita cargar los listeners nativos de notificaciones.

## Revisión independiente y regresiones corregidas

Un revisor independiente leyó el diff, archivos nuevos y contratos Laravel. Los hallazgos importantes se reprodujeron con pruebas y se corrigieron:

1. Una consulta anterior a cancelar podía recrear recordatorios: publicación con revisión de mutación y orden de lecturas.
2. Una preparación local de archivo podía terminar bajo otra cuenta: validación de sesión antes y después de preparar multipart.
3. Una recarga posterior a subir/eliminar podía reutilizar un GET anterior: nueva lectura forzada tras confirmar la escritura.
4. Solicitud pendiente bloqueada después de ser programada: reconciliación del bloqueo local al aceptar una nueva lista.
5. Copias de selectores Web sin liberar: revocación de sus URLs Blob al liberar cada selección.
6. Identidad inválida al restaurar dejaba recordatorios nativos: limpieza coordinada registrada antes de restaurar.
7. Interrupción del body HTTP 200 podía borrar un token válido: conserva la clasificación de error de red.
8. Cancelar una cita podía borrar los recordatorios de otras si fallaba el GET posterior: se preserva el plan confirmado de las citas no afectadas.

También se rechazaron fechas con basura al final, se añadieron reintentos de foto y se actualizó README. Los ajustes surgidos del QA posterior se verificaron por pruebas y navegador; no se presentan como una segunda revisión independiente.

## Cobertura y pendientes de aceptación

| Criterios solicitados | Evidencia y límite |
| --- | --- |
| Registro, verificación, reenvío y recuperación | Servicios, validaciones y pantallas Jest; códigos/correo reales pendientes de API y correo operativo |
| Login/logout y aislamiento entre pacientes | AuthProvider, cliente HTTP, SecureStore/Web, preparación de archivos, sesiones tardías y 401 viejos en Jest |
| Citas sin duplicados, cancelación, reprogramación y restricciones | Pruebas existentes y nuevas; flujo Web simulado con confirmaciones |
| Escritura confirmada/lectura fallida y sincronización | Pruebas de pantallas/servicios/eventos/cola; actualización de Inicio observada en navegador |
| Catálogo e historial | Parsers, filtros, estados vacíos/errores, identidad del historial; catálogo Web simulado |
| Imágenes/PDF, formato/tamaño y descarga | Validación 20 MB/1000 caracteres, multipart Web/nativo y endpoint privado en Jest; selección PDF Web; cámara y hoja de compartir nativas requieren dispositivo |
| Perfil y foto | Contratos y límite de 5 MB, actualización forzada y limpieza en Jest; correo/fecha preservados |
| Recordatorios locales | Plan 24/2 horas, permisos, exclusión de estados, cola y logout probados con adaptador nativo simulado; entrega real de notificación pendiente |
| Recetas retiradas | Servicio/pantalla/entrada de navegación eliminados; sin llamadas al endpoint retirado |
| Navegación/responsividad | Prueba con enrutador real y QA Web; teléfonos físicos/tablets nativas pendientes |

La API configurada devolvió HTTP 404 en GET `/api/health` y `/api/user`. No se dispuso de cuenta de prueba ni base aislada con un despliegue autorizado operativo. **No se realizaron pruebas autenticadas ni escrituras contra Laravel real.** Para aceptación final se requiere responsable del backend, URL vigente con HTTPS/CORS, correo, almacenamiento de archivos y cuenta/base de prueba.

No se declara «100% validado en producción»: quedan pendientes las comprobaciones reales de API, permisos/cámara/compartir y notificaciones Android/iOS. Las limitaciones de contratos (odontograma/datos de cita, escritura demográfica y edición/borrado de archivos) se documentan en la matriz.

## Publicación y cuentas

La publicación autorizada se realiza después de registrar este informe, mediante `andriw4452R`, exclusivamente en `origin/frontend`, con el mensaje solicitado. La identidad de commit existente `andriw4452R / Andriw_YT@outlook.com` se verificó contra commits ya asociados a esa cuenta en GitHub. No se inventó un correo.

La respuesta final contiene el hash completo y enlace del commit, comprobación de HEAD remoto/local, autor asociado y restauración de `jerenyvera09` como cuenta CLI activa. La configuración Git global original y la configuración local existente se preservan; no se eliminan credenciales.

## Inventario de archivos

El listado siguiente registra todos los archivos del cambio (A: creado, M: modificado, D: eliminado). No incluye bundles ignorados, node_modules, `.env`, secretos ni artefactos de navegador.

| Estado | Archivo |
| --- | --- |
| M | `frontend/.env.example` |
| M | `frontend/README.md` |
| M | `frontend/app.json` |
| M | `frontend/docs/mobile-integration.md` |
| M | `frontend/package-lock.json` |
| M | `frontend/package.json` |
| M | `frontend/src/api/__tests__/client.test.ts` |
| M | `frontend/src/api/client.ts` |
| M | `frontend/src/api/errors.ts` |
| M | `frontend/src/app/(private)/(tabs)/__tests__/appointments.test.tsx` |
| M | `frontend/src/app/(private)/(tabs)/__tests__/patient-screens.test.tsx` |
| M | `frontend/src/app/(private)/(tabs)/_layout.tsx` |
| M | `frontend/src/app/(private)/(tabs)/appointments.tsx` |
| M | `frontend/src/app/(private)/(tabs)/documents.tsx` |
| M | `frontend/src/app/(private)/(tabs)/history.tsx` |
| M | `frontend/src/app/(private)/(tabs)/index.tsx` |
| D | `frontend/src/app/(private)/(tabs)/prescriptions.tsx` |
| M | `frontend/src/app/(private)/(tabs)/profile.tsx` |
| M | `frontend/src/app/(private)/(tabs)/services.tsx` |
| M | `frontend/src/app/(private)/_layout.tsx` |
| M | `frontend/src/app/(public)/_layout.tsx` |
| M | `frontend/src/app/(public)/forgot-password.tsx` |
| M | `frontend/src/app/(public)/login.tsx` |
| M | `frontend/src/app/(public)/register.tsx` |
| M | `frontend/src/app/(public)/reset-password.tsx` |
| M | `frontend/src/app/(public)/verify-email.tsx` |
| M | `frontend/src/app/_layout.tsx` |
| M | `frontend/src/app/index.tsx` |
| D | `frontend/src/components/app-tabs.tsx` |
| D | `frontend/src/components/app-tabs.web.tsx` |
| M | `frontend/src/components/reminder-sync.tsx` |
| M | `frontend/src/components/ui/date-field.tsx` |
| M | `frontend/src/components/ui/patient-ui.tsx` |
| M | `frontend/src/config/env.ts` |
| M | `frontend/src/features/auth/__tests__/auth-context.test.tsx` |
| M | `frontend/src/features/auth/__tests__/auth.test.ts` |
| M | `frontend/src/features/auth/__tests__/service.test.ts` |
| M | `frontend/src/features/auth/__tests__/validation.test.ts` |
| M | `frontend/src/features/auth/auth-context.tsx` |
| M | `frontend/src/features/auth/parsers.ts` |
| M | `frontend/src/features/auth/session-storage.ts` |
| M | `frontend/src/features/auth/validation.ts` |
| M | `frontend/src/features/patient/__tests__/contracts.test.ts` |
| M | `frontend/src/features/patient/appointment-display.ts` |
| M | `frontend/src/features/patient/appointments.ts` |
| M | `frontend/src/features/patient/documents.ts` |
| M | `frontend/src/features/patient/history.ts` |
| D | `frontend/src/features/patient/prescriptions.ts` |
| M | `frontend/src/features/patient/profile.ts` |
| M | `frontend/src/features/patient/reminder-plan.ts` |
| M | `frontend/src/features/patient/reminders.ts` |
| M | `frontend/src/hooks/use-remote.ts` |
| M | `frontend/src/hooks/use-theme.ts` |
| A | `frontend/docs/2026-11-24-mobile-closure-plan.md` |
| A | `frontend/docs/mobile-closure-results.md` |
| A | `frontend/src/app/(private)/(tabs)/__tests__/documents.test.tsx` |
| A | `frontend/src/app/__tests__/secondary-navigation.test.tsx` |
| A | `frontend/src/components/session-restoration.tsx` |
| A | `frontend/src/components/ui/__tests__/date-field-web.test.tsx` |
| A | `frontend/src/components/ui/confirm-action.ts` |
| A | `frontend/src/features/auth/session-cleanup.ts` |
| A | `frontend/src/features/patient/__tests__/appointment-events.test.ts` |
| A | `frontend/src/features/patient/__tests__/appointment-rules.test.ts` |
| A | `frontend/src/features/patient/__tests__/file-cache.test.ts` |
| A | `frontend/src/features/patient/__tests__/files.test.ts` |
| A | `frontend/src/features/patient/__tests__/profile-photo.test.ts` |
| A | `frontend/src/features/patient/__tests__/reminders.test.ts` |
| A | `frontend/src/features/patient/appointment-events.ts` |
| A | `frontend/src/features/patient/file-cache.ts` |
| A | `frontend/src/features/patient/file-upload.ts` |
| A | `frontend/src/features/patient/reminders.web.ts` |
| A | `frontend/src/hooks/__tests__/use-reduced-motion.test.ts` |
| A | `frontend/src/hooks/use-appointment-refresh.ts` |
| A | `frontend/src/hooks/use-private-photo.ts` |
| A | `frontend/src/hooks/use-reduced-motion.ts` |
