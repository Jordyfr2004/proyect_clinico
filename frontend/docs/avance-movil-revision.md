# Avance de la aplicación móvil para revisión universitaria

## 1. Objetivo

El Portal del Paciente permite que una persona registrada consulte información autorizada por la clínica odontológica desde una aplicación móvil. El alcance actual incluye acceso y recuperación de cuenta, consulta de citas, solicitud de una cita, historial clínico de solo lectura, catálogo de servicios y perfil con fotografía.

La aplicación no inventa información cuando Laravel no está disponible. Los fallos de red, respuestas HTTP y errores de formato se presentan como errores; los datos simulados se usan únicamente en pruebas automatizadas.

## 2. Arquitectura y tecnologías

- Expo SDK 57, React Native y TypeScript.
- Expo Router con grupos de rutas públicas y privadas.
- Contexto de autenticación para restaurar, aceptar y cerrar sesiones.
- Expo SecureStore para persistir únicamente el bearer token.
- Cliente HTTP centralizado con URL base validada, timeout, JSON, FormData, Authorization y errores tipados.
- Servicios por dominio para autenticación, citas, historial, catálogo y perfil.
- `useRemote` para carga remota, conservación temporal de datos confirmados y actualización segura.
- Jest y React Native Testing Library para pruebas automatizadas.

La interfaz conserva el sistema visual Clínica Premium, los componentes compartidos, safe areas, scroll vertical, adaptación al teclado y navegación inferior con insets dinámicos.

## 3. Funcionalidades implementadas y evidencia

| Funcionalidad | Contrato Laravel | Estado en código | Evidencia automatizada | Pendiente real |
| --- | --- | --- | --- | --- |
| Inicio y restauración de sesión | `POST /auth/login`, `GET /user` | Implementado | Parser, contrato HTTP, restauración y guardas | Probar con cuenta activa |
| Registro de pacientes | `POST /auth/register-paciente` | Implementado | Payload, validaciones y selector de fecha | Registrar un paciente real |
| Recuperación de contraseña | `POST /auth/forgot-password`, `POST /auth/reset-password` | Implementado | Payload, código y validaciones | Verificar correo y código reales |
| Cierre de sesión | `POST /auth/logout` | Implementado | Limpieza local incluso ante fallo remoto | Confirmar revocación con Sanctum |
| Consulta de citas | `GET /agenda/mis-citas` | Implementado | Contrato, carga, error, vacío y datos | Consultar registros reales |
| Solicitud de cita | `POST /agenda/solicitar-cita` | Implementado | Doble envío, estado pendiente, HTTP 409 y refresco fallido | Probar concurrencia contra Laravel |
| Historial clínico | `GET /paciente/mi-historial` | Implementado, solo lectura | Contrato, datos, error y ausencia HTTP 404 | Probar historial existente y ausente |
| Categorías y servicios | `GET /categorias-servicios/activas`, `GET /servicios-consultorio/activos` | Implementado | Contratos, filtros, error y vacío | Consultar catálogo publicado |
| Perfil del paciente | `GET /paciente/mi-perfil` | Implementado, datos de solo lectura | Contrato, carga, conservación y reintento | Consultar perfil real |
| Fotografía de perfil | `POST /perfil/foto`, `DELETE /perfil/foto` | Implementado | MIME, tamaño, permisos y URL autenticada | Subir y eliminar archivos reales |

Los endpoints se contrastaron con `origin/backend` en el commit `e676dec44e503d58ec3e22933a048779265fd9c0`. No se añadieron rutas ni campos fuera de esos contratos.

## 4. Organización de pantallas

Las rutas públicas contienen Login, Registro, Recuperación y Restablecimiento de contraseña. Mientras se restaura una sesión no se muestran formularios públicos.

Las rutas privadas contienen Inicio, Mis citas, Servicios y Perfil en la navegación inferior. Historia clínica se abre desde Inicio como pantalla privada adicional. La guarda privada redirige al login cuando no existe una sesión autenticada.

La revisión estática comprobó encabezados, retroceso, botones compartidos, áreas táctiles, SafeAreaView, KeyboardAvoidingView, ScrollView e insets de la barra inferior. No se realizó una inspección visual en un teléfono durante esta preparación.

## 5. Seguridad de sesión y aislamiento de datos

- Solo el token se almacena en SecureStore; citas, historial y perfil no se persisten localmente.
- El token restaurado se valida mediante `GET /user` antes de mostrar rutas privadas.
- Un HTTP 401 elimina el acceso en memoria antes de intentar limpiar SecureStore.
- El cierre de sesión elimina siempre el estado local aunque falle el logout remoto.
- El rol, estado activo y vínculo con un paciente se validan antes de aceptar la sesión.
- Las fotografías remotas deben pertenecer al mismo origen de la API y se solicitan con Authorization.
- `useRemote` invalida solicitudes al cambiar de ámbito o desmontar la pantalla. Una respuesta antigua no puede reemplazar datos de una consulta más reciente.
- Al cambiar el cargador —por ejemplo, al cambiar de ámbito de usuario— los datos anteriores dejan de exponerse antes de recibir la nueva respuesta.

No existe caché clínica persistente ni modo sin conexión.

## 6. Comunicación preparada con Laravel

`EXPO_PUBLIC_API_URL` es obligatoria y debe contener una URL HTTP(S) válida sin credenciales. La aplicación rechaza rutas base vacías, protocolos no HTTP y URLs con usuario o contraseña.

Para configurar el entorno:

1. Copiar `.env.example` como `.env.local`.
2. Asignar la base real del API, incluyendo `/api`, por ejemplo la URL accesible del servidor de desarrollo.
3. En un teléfono físico no usar `localhost`, porque apunta al propio teléfono.
4. Usar HTTPS en producción.

La configuración no incluye IP, token ni credencial predeterminada.

## 7. Estabilidad de las peticiones

La revisión encontró que dos solicitudes podían terminar en orden inverso y la más antigua podía sobrescribir la respuesta nueva. Además, varias pulsaciones de actualización podían repetir innecesariamente el mismo endpoint.

La corrección aplicada establece estas reglas:

- Cada operación recibe una generación creciente y solo la generación vigente puede actualizar la pantalla.
- Dos actualizaciones manuales simultáneas comparten la misma promesa y una sola petición.
- La carga inicial puede ser reemplazada por una actualización posterior sin recuperar después información obsoleta.
- Los errores obsoletos tampoco sustituyen un resultado nuevo.
- Al desmontar o cambiar de ámbito se invalidan las operaciones anteriores.
- Una actualización fallida mantiene los datos confirmados del mismo ámbito y muestra el error.

Perfil ahora conserva los datos confirmados mientras se actualiza y ofrece una acción de reintento cuando su carga inicial falla.

## 8. Pruebas y compilación

Resultados obtenidos en este entorno:

- `npx expo-doctor`: 21 de 21 comprobaciones aprobadas.
- `npx expo install --check`: dependencias compatibles con Expo SDK 57.
- `npx tsc --noEmit`: sin errores.
- `npm run lint`: sin errores ni advertencias.
- `npm test`: 13 suites, 72 pruebas y 0 fallos.
- Exportación Android: bundle Hermes generado correctamente con 1.302 módulos; archivo principal aproximado de 3 MB.

Las pruebas cubren contratos Laravel, autenticación y SecureStore, navegación protegida, validaciones, campos de fecha, cliente HTTP, estados visuales, citas, fotografía y concurrencia de `useRemote`.

## 9. Limitaciones actuales

- Laravel no estaba ejecutándose y `EXPO_PUBLIC_API_URL` no estaba configurada durante esta revisión.
- No se realizaron pruebas E2E, envíos reales de correo ni operaciones contra PostgreSQL.
- ADB no está disponible en el entorno, por lo que no se ejecutó la aplicación en un teléfono o emulador Android.
- La exportación Android verifica que Metro y Hermes pueden producir el bundle, pero no sustituye una prueba instalada en un dispositivo.
- La aplicación depende de que Laravel permita el origen, sea alcanzable desde el teléfono y tenga una cuenta real de paciente activa.

## 10. Guía breve para la prueba manual

1. Encender Laravel y confirmar su URL accesible desde la misma red del teléfono.
2. Crear `.env.local` con `EXPO_PUBLIC_API_URL=https://servidor/api` o la dirección HTTP de desarrollo autorizada.
3. Ejecutar `npm install` si todavía no están instaladas las dependencias.
4. Ejecutar `npx expo start --clear` y abrir el proyecto con un cliente compatible con Expo SDK 57, o usar `npx expo start --android` con un entorno Android configurado.
5. Verificar login, restauración, logout y respuesta 401.
6. Verificar registro y recuperación de contraseña con correo operativo.
7. Comprobar citas vacías, existentes, pendientes, solicitud duplicada y respuesta 409.
8. Comprobar historial existente y ausencia HTTP 404.
9. Comprobar catálogo vacío y con servicios activos.
10. Probar perfil y foto JPG, PNG o WebP, permisos denegados, archivo mayor de 5 MB y eliminación.
11. Revisar teclado, scroll, botón físico atrás, navegación por gestos y por tres botones en un teléfono pequeño.

La integración con Laravel y la experiencia visual en Android deben registrarse como verificadas únicamente después de completar esta guía con infraestructura real.
