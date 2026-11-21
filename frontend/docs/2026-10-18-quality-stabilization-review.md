# Revisión de calidad y estabilización móvil

## Resumen ejecutivo

La aplicación conserva Expo SDK 57 y su arquitectura actual. La revisión encontró dos incompatibilidades de contrato que impedían consumir citas y filtrar servicios con respuestas reales de Laravel, además de fallos acotados en cierre de sesión, historial vacío y permisos nativos. Todos los problemas corregibles únicamente desde `frontend/` se solucionaron con pruebas de regresión; no se modificaron endpoints ni se añadieron dependencias.

No se identificaron vulnerabilidades críticas propias del código móvil. Continúan alertas transitivas de npm sin una actualización compatible dentro de Expo SDK 57. La integración real con Laravel y la inspección visual en Android siguen pendientes por ausencia de backend, ADB y dispositivo en este entorno.

## Hallazgos corregidos

### QF-01 — Alta — Contrato de citas incompatible

El parser esperaba `fecha_cita` y `tipo_cita`, pero `origin/backend` serializa el modelo `Agenda` con `fecha` y `tipo`. El listado real habría terminado en error de formato aunque el test anterior pasaba con un fixture incorrecto.

- Corrección: `src/features/patient/appointments.ts:28` y `:31`.
- Regresión: el fixture reproduce los campos completos del modelo Laravel en `src/features/patient/__tests__/contracts.test.ts`.

### QF-02 — Alta — Contrato de catálogo incompatible

El parser esperaba `categoria_servicio_id`; Laravel devuelve `categoria_id`. Los servicios reales no podían parsearse ni filtrarse por categoría.

- Corrección: `src/features/patient/catalog.ts:39`.
- También se eliminó `description` de la categoría, campo que el modelo Laravel no expone.
- Regresión: `src/features/patient/__tests__/contracts.test.ts` usa ahora la forma real de categoría y servicio.

### QS-01 — Alta — La sesión podía permanecer visible ante fallos de limpieza

Un 401 con cuerpo no JSON fallaba antes de ejecutar el cierre de sesión. Además, un error de borrado de SecureStore podía dejar el estado autenticado en memoria; si también fallaba el logout remoto, el token persistente podía reaparecer al reiniciar.

- El 401 se procesa por estado HTTP antes de interpretar su cuerpo: `src/api/client.ts:120`.
- El estado privado se elimina de memoria antes de acceder al almacén: `src/features/auth/auth-context.tsx:35-43`.
- Si SecureStore no puede eliminar la clave, se intenta sobrescribirla con un valor vacío que la restauración trata como ausente: `src/features/auth/session-storage.ts:8-15`.
- Regresiones: `src/api/__tests__/client.test.ts`, `src/features/auth/__tests__/auth-context.test.tsx` y `src/features/auth/__tests__/auth.test.ts`.

### QF-03 — Media — Ausencia de historial presentada como error o pantalla vacía

Laravel usa 404 para indicar que el paciente todavía no tiene historial. El frontend lo presentaba como error y también mostraba alergias, antecedentes familiares y notas, campos que no existen en el modelo confirmado.

- El servicio convierte únicamente ese 404 en ausencia autorizada: `src/features/patient/history.ts:32-36`.
- La pantalla muestra un estado vacío explícito y solo los cinco campos reales: `src/app/(private)/(tabs)/history.tsx:39-52`.

### QS-02 — Media — Permisos nativos innecesarios

La configuración por defecto de Expo ImagePicker incorporaba permiso de micrófono aunque la app solo selecciona imágenes. También declaraba textos de cámara que esta interfaz no utiliza.

- Se bloquearon cámara y micrófono y se añadió una explicación específica para fotos: `app.json:38-42`.
- La lista de permisos de aplicación que expone la configuración de Expo conserva únicamente Internet y acceso legado a almacenamiento; el manifiesto introspectado marca `CAMERA` y `RECORD_AUDIO` con `tools:node="remove"`.

### QF-04 — Media — Solicitud de cita duplicada desde la UI

Laravel ya protege la operación mediante consulta y restricción única, pero la pantalla permitía enviar otra solicitud cuando el listado mostraba una pendiente.

- El CTA queda deshabilitado mientras exista una cita `pendiente`: `src/app/(private)/(tabs)/appointments.tsx:30` y `:60-63`.
- El servidor continúa siendo la autoridad contra condiciones de carrera.

### QF-05 — Media — Restauración de sesión exponía formularios públicos

Una navegación directa a una ruta pública podía renderizar el formulario mientras SecureStore y `GET /user` todavía se estaban validando, permitiendo una carrera entre restauración e inicio de sesión.

- El layout público muestra carga hasta resolver el estado: `src/app/(public)/_layout.tsx:6-10`.
- Regresión: `src/app/__tests__/route-guards.test.tsx`.

### QA-01 — Baja — Semántica y accesibilidad de controles

- Los estados programada, pendiente, cancelada y completada tienen tonos diferenciados: `src/components/ui/patient-ui.tsx:413-446`.
- Chips de filtro y cámara cumplen al menos 44 dp: `src/components/ui/patient-ui.tsx:697` y `src/app/(private)/(tabs)/profile.tsx:243`.
- `cita_medica` se presenta como “Cita médica” sin exponer nombres internos: `src/app/(private)/(tabs)/appointments.tsx:21`.
- Una imagen sin MIME ya no se declara JPEG automáticamente; se admite solo una extensión JPG/JPEG/PNG/WebP comprobable: `src/app/(private)/(tabs)/profile.tsx:36-74`.

## Dependencias pendientes

`npm audit --omit=dev` informa 62 entradas: 16 moderadas, 46 altas y ninguna crítica. Los avisos raíz observados son `decode-uri-component`, `node-forge`, `braces`, `sprintf-js` y `uuid`.

- `decode-uri-component` entra por `expo-router -> query-string` y puede ser alcanzable al procesar entradas URI/deep-link malformadas. Riesgo residual: medio.
- `node-forge` pertenece a Expo CLI y certificados de firma; `braces`, `sprintf-js` y `uuid` aparecen principalmente en Metro, Jest, configuración o herramientas nativas. No se encontraron llamadas directas desde el bundle de la aplicación.
- npm propone cambios mayores o incompatibles, incluidos Expo 44, Expo Router 58 y React Native 0.88. No se aplicó `npm audit fix --force` ni overrides no soportados.

La mitigación correcta es actualizar cuando Expo publique una matriz SDK 57 corregida o planificar una migración completa y probada de SDK; no degradar paquetes aislados.

## Controles sin hallazgos

- No hay credenciales, tokens, hosts reales ni secretos incrustados.
- El bearer token es el único dato persistente y usa Expo SecureStore.
- No se persisten citas, perfil ni información clínica.
- Las fotografías conservan Authorization en cabecera y su URL debe pertenecer al mismo origen configurado.
- No se usan WebView, HTML remoto, `eval`, almacenamiento web ni datos simulados en runtime.
- Rol, cuenta activa y vínculo de paciente se validan antes de aceptar una sesión.
- Laravel conserva la autorización e aislamiento efectivo mediante Sanctum y middleware de rol; la protección de rutas del frontend es una barrera de experiencia, no el control de acceso principal.

## Verificación ejecutada

- `npx expo-doctor`: 21/21 comprobaciones superadas.
- `npx expo install --check`: dependencias compatibles con Expo SDK 57.
- `npx tsc --noEmit`: sin errores.
- `npm run lint`: sin errores ni advertencias.
- `npm test`: 12 suites, 54 pruebas y 0 fallos.
- Metro: `/status` respondió HTTP 200 con `packager-status:running`; el proceso de prueba se cerró después.
- `npx expo export --platform android --output-dir dist`: bundle Hermes generado, 1.302 módulos y archivo principal de aproximadamente 3 MB.
- Configuración nativa introspectada: Android sin `CAMERA` ni `RECORD_AUDIO`; iOS sin descripciones de cámara o micrófono.
- `npm audit --omit=dev`: 62 entradas (16 moderadas, 46 altas, 0 críticas).
- No existe `.env`/`.env.local`, `EXPO_PUBLIC_API_URL` no está configurada, ADB no está disponible y no hay Laravel escuchando en los puertos locales habituales; no se realizaron pruebas E2E ni en dispositivo.

## Pruebas manuales pendientes

1. Login, restauración, 401 y logout con Laravel real.
2. Listado de citas y servicios usando registros reales del backend.
3. Solicitud concurrente de cita y respuesta 409.
4. Historial existente y ausencia 404.
5. Foto JPG/PNG/WebP real, archivo mayor de 5 MB, permisos denegados y actualización de caché.
6. Botón atrás físico, navegación por gestos y tres botones.
7. Registro con teclado abierto y pantalla Android pequeña.
8. Deep links malformados mientras permanezca la dependencia vulnerable de Expo Router.
