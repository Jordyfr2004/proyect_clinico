# Auditoría de seguridad del frontend

**Modelo y alcance.** Se revisó código cliente, dependencias y permisos declarados en `origin/backend` `e676dec44e503d58ec3e22933a048779265fd9c0`. Sin pentest, cuentas autorizadas, configuración de despliegue, tráfico real ni pruebas de ataque contra Laravel. Las reglas de React mejoran UX; la autoridad de autorización sigue en middleware y servicios Laravel. Esta revisión no certifica ausencia de vulnerabilidades.

## Autenticación y sesión

- `src/features/auth/authStorage.ts` guarda el Bearer en `sessionStorage`; no se encontró persistencia en `localStorage`. Es accesible al JavaScript de la misma origin, por lo que una XSS futura tendría consecuencias: no se afirma que exista XSS actual. No se registran tokens en `console` según búsqueda de código.
- `src/services/apiClient.ts:7-17` agrega `Authorization: Bearer` por solicitud y `Accept: application/json`. `AuthProvider.tsx:54-68` borra la sesión local al cerrar incluso si `/auth/logout` falla, apropiado para la interfaz. No prueba revocación remota cuando falla el servidor.
- **WEB-001:** un 401 tardío se asocia con el token vigente al llegar, no con el token que viajó. Riesgo principal: disponibilidad/cierre accidental de una nueva sesión, no exposición demostrada.
- **WEB-002:** fallo de transporte en restauración de `/user` borra token; se confunde no verificado con inválido. Una mejora debe conservar la regla de no mostrar datos clínicos cuando la autorización no se ha verificado.
- **WEB-003:** no hay timeout explícito. Un control puede quedar pendiente durante indisponibilidad parcial; el remedio no debe reintentar POST automáticamente.
- Eventos 403 (`clinic:forbidden`) muestran aviso descartable sin bloquear todo el portal (`AppRouter.tsx:62-90`). Una denegación de operación no convierte rutas permitidas en inaccesibles. No se cambió este diseño.

## Autorización y datos clínicos

`roleAccess.ts` y `AppRouter.tsx` reservan Usuarios, Caja, Reportes, Servicios y Auditoría para doctora; Pacientes, Historial en lectura y Actividades en lectura para doctora/asistente; Agenda/Citas solo doctora; paciente público no entra al portal. Esto coincide con los grupos de middleware consultados en `backend-api/routes/api.php`. El historial comprueba además que la respuesta tenga el `paciente_id` solicitado (`ClinicalHistorySection.tsx:52-58`). La autorización real no depende de estos controles cliente.

`ProtectedPhoto.tsx` **no** inyecta directamente el URL entregado por Laravel como `<img src>`: extrae el ID de una ruta `/usuarios/{id}/foto`, pide Blob por Axios Bearer y usa `blob:` local. Revoca el Object URL al desmontar o al completarse una carga ya descartada (`ProtectedPhoto.tsx:19-29`). Laravel limita el GET a dueño o staff consultando paciente vinculado, devuelve `Cache-Control: private, no-store` y `X-Content-Type-Options: nosniff` (`UsuarioController::verFotoPerfil`). No se halló fuga de Object URL, pero WEB-012 documenta descargas duplicadas. El MIME/bytes recibidos no se validan del lado cliente; Laravel es responsable del tipo servido y se requiere revisar el despliegue antes de afirmar explotación.

No se encontró `dangerouslySetInnerHTML`, `eval`, escritura HTML dinámica ni almacenamiento de datos clínicos en navegador fuera de estados React/sessionStorage del token. El texto de respuestas aparece en nodos React, que lo escapan. No se realizó fuzzing de esquemas, URLs o archivos, así que el resultado es evidencia negativa limitada, no prueba de imposibilidad de XSS.

## Errores y confidencialidad

Varios módulos presentan el `message` de 403/404/409/422 que devuelve Laravel; en historial se filtran cadenas con indicios de excepciones/tokens/SQLSTATE. En otros componentes la política es menos uniforme, por ejemplo `PatientAccountsSection.tsx:12-19` y `DashboardPage.tsx:31-40`. No se observó en el código una respuesta Laravel que exponga secretos, pero una excepción mal configurada del servidor podría llegar al usuario si se copiara como `message`. Recomendar prueba con 500/HTML malformado y política consistente de mensajes, sin ocultar errores útiles de validación. Esto es una **precaución**, no un hallazgo de fuga confirmado.

Los parámetros de búsquedas (`buscar`, `codigo_paciente`) viajan por URL de GET hacia el API confirmado. Eso puede aparecer en logs/telemetría de infraestructura, según configuración no inspeccionada. No se documentan valores reales ni se atribuye fuga al frontend sin examinar acceso y retención de esos logs. El tránsito debe verificarse con TLS o transporte protegido en despliegue; no se declaró el HTTP de desarrollo como exposición pública demostrada.

## Dependencias

`npm audit --json` informa **una** alerta alta en `source-map-js@1.2.1`, transitiva vía Vite/PostCSS, Tailwind y jsdom, en el árbol de herramientas de desarrollo. El [aviso primario GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) describe bloqueo de event loop al procesar offsets enormes en mapas de fuente *indexed* controlados por atacante; versión corregida `1.2.2`. `npm audit --omit=dev --json` devuelve cero alertas en dependencias de producción. No hay ruta demostrada para que un paciente suministre source maps a un proceso vulnerable de esta instalación. Por tanto WEB-018 es mantenimiento de cadena de construcción con explotación **condicional**, no una vulnerabilidad explotable del portal clínico confirmada. Actualizar con prueba de compatibilidad en una fase de corrección, sin `audit fix --force`.

## Verificaciones de seguridad pendientes

1. Prueba aislada de carreras de token A/B y 401 tardío; GET `/user` con 401 frente a desconexión (WEB-001/002).
2. E2E autorizado de roles sobre URLs directas y acciones, contrastado con HTTP 403 real; no basta inspección de botones.
3. Comprobación de CSP, TLS, CORS, cabeceras, cookies y logs **en el despliegue real**. Estos controles no se pueden inferir del bundle Vite.
4. Subida de imagen con tamaños/MIME límite y error/reintento; verificación de revocación Blob y aislamiento de caché después de logout.
5. Prueba de respuesta de error malformada o HTML 500 para confirmar que nunca se muestra traza ni token; revisión Laravel de excepciones si surge evidencia.
6. Si se introduce caché de consultas, usar partición por identidad y limpieza al cambiar sesión; ninguna persistencia clínica por defecto.
