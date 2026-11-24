# Integración móvil con Laravel — 24/11/2026

La referencia oficial es `origin/backend` en `7ea26c5181f8881d6487513ef1e883c31431bf30`. La base móvil es `a9a2c1af92e032bda28c3b835a87c727e47ed389`. Se ejecutó `git fetch origin` y no se encontraron revisiones posteriores. Se consultaron rutas, controladores, servicios, modelos, middleware y validaciones mediante `git show`, sin cambiar de rama ni modificar Laravel.

## Configuración y seguridad

Configurar `EXPO_PUBLIC_API_URL` en `.env.local`, incluyendo `/api`, con el servidor/balanceador oficial accesible desde el dispositivo. El ejemplo HTTPS del repositorio es una referencia de configuración, **no evidencia de un despliegue operativo**. El 24/11/2026 ese host devolvió 404 en `/api/health` y `/api/user`. Confirmar con el responsable del backend la dirección de integración vigente antes de distribuir una compilación.

Producción rechaza HTTP; desarrollo admite HTTP para la red local autorizada. No incluir contraseñas, tokens ni datos clínicos en variables públicas. El cliente restringe las rutas autenticadas al origen y prefijo configurados, rechaza escapes y redirecciones y aplica timeout. La fotografía oficial también se descarga mediante el cliente autenticado, incluso en Web, donde los headers de `<Image>` no son fiables.

El token Sanctum se guarda en SecureStore nativo. Web lo conserva solo en memoria: recargar exige iniciar sesión de nuevo. No se persisten perfiles ni historiales. Se descartan respuestas de sesiones anteriores, incluido un 401 antiguo, y una autenticación tardía no reactiva una sesión cerrada. Las operaciones sobre SecureStore están serializadas. Ante falta de red, 429 o 5xx al restaurar se conserva el token sin mostrar rutas privadas y se ofrece reintentar o cerrar la sesión local. Una identidad no paciente, inactiva, sin vínculo o sin verificar se rechaza y activa la limpieza coordinada.

Los errores conservan `status`, `fieldErrors`, `Retry-After` y la señal de verificación de Laravel. Los formularios muestran las validaciones específicas y conservan sus entradas ante errores recuperables. Se controlan 401, 403, 404, 409, 422, 429, 5xx, respuestas inválidas, desconexión y timeout. No hay renovación de tokens inventada.

## Matriz de contratos

Las rutas siguientes son relativas a `/api`. **P** = Sanctum y `role:paciente`; **S** = Sanctum. El cliente exige además paciente activo, vinculado y verificado. La autorización definitiva y la pertenencia de cada registro corresponden a Laravel. `data` significa el sobre JSON del servidor; ninguna ausencia de red se convierte en una lista vacía exitosa.

| Método y endpoint | Permiso | Entrada y validación oficial | Respuesta oficial y errores relevantes | Integración móvil |
| --- | --- | --- | --- | --- |
| POST `/auth/login` | Público; throttle | `username`, `password`, strings requeridos | `message`, `token_type`, `access_token`, `user`; 422 por credenciales/inactivo/sin verificar, 429 | Cédula como username; sesión paciente validada; redirección a verificación usando el email devuelto |
| POST `/auth/register-paciente` | Público; throttle | `nombres` ≤255, `cedula` ≤20, `email` único ≤255, `telefono` ≤20, `direccion` ≤255, fecha no futura; password ≥8 y confirmación | 201, `requires_verification:true`, `email`, `user`; 422 duplicados/validación | Registro sin sesión hasta verificar; validación de calendario y longitudes; evita doble envío |
| POST `/auth/verify-email` | Público | `email` válido; `code` string de 6 caracteres | Bearer y `user`; 422 inválido/expirado/intentos | Código de seis dígitos; aceptación de identidad validada |
| POST `/auth/resend-verification-code` | Público | `email` válido | `message`; 422 si no puede enviarse o debe esperar | Reenvío con exclusión mutua respecto a verificar; conserva mensaje real |
| POST `/auth/forgot-password` | Público; throttle | `email` requerido válido ≤254 | Mensaje genérico sin revelar existencia de cuenta; 422/429 | Solicitud y acceso al formulario de restablecimiento |
| POST `/auth/reset-password` | Público; throttle | `email` ≤254, `code` seis dígitos, password 8–72 caracteres y ≤72 bytes; confirmación | `message`; 422 código/validación, 429 | Validación previa, bloqueo tras confirmar y acceso a login |
| POST `/auth/logout` | S | Sin body | `message`; revoca token actual | Revocación local inmediata aunque falle la llamada remota; limpia archivos y recordatorios propios |
| GET `/user` | S | Bearer | Usuario directo: id, nombre, username, email, role, activo, paciente_id, email_verified_at, foto_perfil_url; 401 | Restaura y valida identidad; error transitorio separado de sesión inválida |
| GET `/agenda/mis-citas` | P | Sin parámetros | `data:Agenda[]`; 422 sin vínculo | Inicio, lista y recordatorios; foco y gesto; publicación protegida frente a consultas anteriores a una mutación |
| POST `/agenda/solicitar-cita` | P | Sin fecha/horas ni body | 201 `message,data`; 409 solicitud pendiente; 422 sin vínculo | Bloquea duplicados; confirma la escritura antes de recargar |
| PUT `/agenda/mis-citas/{id}/cancelar` | P; registro propio | ID; pendiente/programada que no empezó | `message,data`; 404 no propia/inexistente; 409 cancelada/completada/iniciada; 422 sin vínculo | Confirmación nativa/Web; acciones según fecha válida; bloquea repetir escritura confirmada |
| PUT `/agenda/mis-citas/{id}/reprogramar` | P; registro propio | `motivo` opcional ≤255; únicamente programada futura y sin otra solicitud pendiente | `message,data`; fecha/horas quedan null y estado pendiente; 404/409/422 | Motivo en modal; no selector de nueva fecha; la doctora reasigna |
| GET `/categorias-servicios/activas` | P | Sin parámetros | `data:CategoriaServicio[]` | Categorías reales, filtros y reintento |
| GET `/servicios-consultorio/activos` | P | Sin parámetros | `data:ServicioConsultorio[]`, categoría, descripción, imagen, precio decimal y duración | Diseño de Jordy conservado; búsqueda por nombre/descripción; modal, imágenes, gesto; «Consultar precio» cuando falta |
| GET `/paciente/mi-historial` | P | Sin parámetros | `data` con id, paciente_id, sexo, lugar_nacimiento, antecedentes_enfermedades, cirugias, medicacion_actual; 404 sin historial o sin vínculo con mensajes distintos | Solo lectura; comprueba paciente_id; solo el 404 oficial de ausencia de historial es estado vacío; acceso a archivos |
| GET `/paciente/mis-evidencias` | P | Sin parámetros | `data:EvidenciaClinica[]`; 422 sin vínculo | Tipos rx/documento/caso_clinico; nombre, tipo, MIME, tamaño, fecha, descripción y autor cuando conste |
| POST `/paciente/mis-evidencias` | P | Multipart `tipo`: rx/documento; `archivo`: JPG/JPEG/PNG/WebP/PDF ≤20480 KB; descripción opcional ≤1000 | 201 `message,data`; 422, 401, errores de almacenamiento | Galería, cámara, selector de PDF/imágenes, revisión antes de subir, descripción y tamaño; multipart nativo/Web; impide subir con una sesión posterior |
| GET `/paciente/mis-evidencias/{id}/archivo` | P; registro propio | ID; Bearer por header | Binario con MIME/nombre; 404 si no pertenece o no existe | Descarga autenticada; vista previa de imágenes; abrir/exportar PDF mediante hoja de compartir nativa o descarga Blob Web; sin URLs públicas ni tokens en enlaces |
| GET `/paciente/mi-perfil` | P | Sin parámetros | `data`: foto_perfil_url, codigo_paciente, nombres, cedula, telefono, direccion, fecha_nacimiento; 404 sin vínculo/expediente | Datos solo lectura; correo de `user.email`; fecha española conservada |
| POST `/perfil/foto` | S | Multipart `foto`, imagen JPG/JPEG/PNG/WebP ≤5120 KB | `message,data` con URL y metadatos; 422 | Galería con validación de MIME/tamaño; mensaje real; nueva consulta obligatoria tras guardar |
| DELETE `/perfil/foto` | S | Sin body | `message,data` con foto null | Confirmación multiplataforma; mensaje real y refresco sin repetir escritura |
| GET `/usuarios/{usuario}/foto` | S; propia para paciente | URL oficial devuelta por Laravel | Binario; 403 si no autorizada, 404 sin foto; private/no-store | Fetch autenticado, límite de 5 MB, URL temporal, eliminación al desmontar/cerrar sesión; nunca URL con bearer |

Fuentes principales: `backend-api/routes/api.php`; `AuthController`, `PasswordController`, `AgendaController`, `PacienteController`, `HistorialClinicoController`, `EvidenciaClinicaController`, `UsuarioController`, controladores de catálogo; sus servicios y modelos; `RegisterPacienteRequest` y `RoleMiddleware` de la revisión indicada.

## Comportamiento por módulo

- **Inicio:** conserva tarjetas, accesos y panel de recordatorios de Jordy. Próxima cita real, estados pendiente/programada y errores separados. Mis archivos queda visible; Perfil sigue accesible en cabecera y pestaña inferior. Vuelve a consultar en foco y tras mutaciones.
- **Citas:** detalle completo con scroll, teclado, estado, descripción, fecha, horario y acciones; cancelar pendiente o programada futura; reprogramar solo programada futura. Se rechazan fechas inválidas. La zona del consultorio es `America/Guayaquil` (UTC−05), como en `backend-api/.env.example`. Un cambio de APP_TIMEZONE requiere actualizar esta política explícita.
- **Mutaciones:** se muestra la confirmación de Laravel por separado de un fallo de lectura posterior. Solo se reintenta la consulta; se invalidan las lecturas anteriores a la escritura. Un 409 bloquea la acción obsoleta hasta una consulta aceptada. Una solicitud que la clínica ya programó deja de bloquear al recibir datos nuevos.
- **Servicios:** catálogo real y solo lectura; filtros, búsqueda, detalles y estados vacíos/errores. No hay precios, imágenes ni especialidades inventadas.
- **Historial:** todos los campos que expone el contrato actual, solo lectura y sin inventar diagnósticos. Valores null se muestran como no registrados.
- **Archivos:** borrador con descripción antes de subir, vista previa local, validación de formato y tamaño comprobable; no se presupone JPEG ante formato desconocido. Los copiados por los selectores se liberan al descartar, sustituir, subir o salir. Las descargas usan el directorio de caché exclusivo de la app o Blob Web; se liberan al cerrar la vista/compartir y al cerrar sesión. Únicamente una exportación explícita deja una copia elegida por el paciente fuera de la app. No se agregaron edición ni borrado remoto.
- **Perfil:** conserva correo y fecha de nacimiento aportados por Andriww. Foto con confirmaciones, validación y protección entre cuentas; refresco forzado tras escritura. Los datos demográficos siguen de solo lectura.
- **Recordatorios:** locales, 24 y 2 horas, sin push remoto ni WebSockets. Inicio de sesión, apertura, primer plano, lectura de citas y mutaciones sincronizan una cola con generación. Cerrar sesión invalida trabajos tardíos y borra solo identificadores `cita-`. Cancelar/reprogramar una cita retira esa cita y preserva otras confirmadas aunque falle la consulta posterior; crear una pendiente no borra recordatorios existentes.
- **Autenticación:** registro, verificación, reenvío, recuperación/restablecimiento, login y logout mantienen Sanctum. Formularios con bloqueo síncrono de envío y mensajes específicos. Expo Web usa un input de fecha soportado; Android/iOS mantienen el selector nativo.
- **Navegación:** pestañas Inicio/Citas/Servicios/Perfil, con espacio suficiente para etiquetas y texto accesible. Historial y archivos son secundarios accesibles. En SDK 58, `href:null` redirige y bloquea esas pantallas: se oculta exclusivamente su botón mediante `tabBarButton` y `tabBarItemStyle`, manteniendo la ruta autorizada. La navegación completa tiene una prueba con Expo Router real. Recetas y plantillas retiradas del backend no tienen servicios ni rutas móviles activas.

## Dependencias y limpieza

Se añadieron módulos oficiales compatibles con SDK 58: `expo-document-picker` (selector de PDF), `expo-file-system` (tamaño y caché temporal privada), `expo-sharing` (abrir/exportar en Android e iOS). Se habilitó el permiso de cámara, antes configurado como false.

Expo Doctor inicial falló 2/20 comprobaciones: `expo-modules-core` directo no permitido y 16 versiones desalineadas. Se retiró la dependencia directa y se aplicó `expo install --fix` dentro de SDK 58 / RN 0.88: Expo 58.0.21 → 58.0.26, React Native 0.88.0 → 0.88.1 y paquetes compatibles según lockfile. React se mantiene en 19.3.0. No se migró de SDK ni de versión menor de React Native.

La herramienta de pruebas existente `@testing-library/react-native@13.3.3` contradice un peer **opcional** de Expo Router (`>=14`). Se conserva su API y se instala con `npm ci --legacy-peer-deps`; no usar `--force`. Expo Doctor y las exportaciones verifican la compatibilidad de producción. Una migración de Testing Library 14 requiere adaptar sus APIs de prueba y queda fuera de este cierre.

Se actualizó `zod` transitivo de las herramientas ESLint de 3.25.76 a 4.6.7 dentro de sus rangos permitidos, eliminando el aviso de severidad alta GHSA-mrhx-c7xc-m3w5. La auditoría de dependencias todavía informa avisos moderados; se registra su alcance en el informe de resultados. No se ejecutó `npm audit fix --force`.

Se retiraron el servicio/pantalla de recetas y su entrada en tabs, más los dos componentes `app-tabs` de la plantilla sin consumidores. Se corrigieron una propiedad de estilo duplicada y tipos de ColorScheme/ColorValue previos que impedían TypeScript. Los mocks de las pruebas se conservan; no se añadieron datos simulados a la aplicación.

## Validación, límites y entrega

Los resultados finales, inventario de archivos, revisión independiente y evidencia de publicación se registran en [mobile-closure-results.md](mobile-closure-results.md). La exportación de bundles Android/iOS es una comprobación de empaquetado, no una prueba en dispositivo ni una compilación firmada APK/IPA.

Se requieren para la aceptación en un entorno real: API Laravel accesible y configurada, CORS para Expo Web, correo de verificación/recuperación operativo, almacenamiento FTP y límites PHP/NGINX de 20 MB, cuenta de prueba activa y base aislada. No se realizaron escrituras contra datos clínicos reales.

El backend no expone al paciente escritura demográfica, CRUD de servicios, edición/borrado de evidencias ni lectura autorizada de odontograma y datos clínicos de la cita mediante sus endpoints de agenda. No se añadieron esas funciones. El acceso de evidencias usa exclusivamente `/paciente/mis-evidencias`, no la ruta alternativa con límite y tipos diferentes.

Limitación de servidor detectada: el middleware de rol solo comprueba `role`; la desactivación/vinculación se valida al autenticar/restaurar. La revocación continua de tokens al desactivar una cuenta debe garantizarla Laravel; la aplicación no puede sustituir esa autorización. También `GET /user` no demuestra por sí solo que el expediente siga existiendo: los endpoints de perfil/agenda informan la ausencia y no habilitan acciones con datos faltantes.
