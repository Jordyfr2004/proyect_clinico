# Diseño de la aplicación móvil de pacientes

## Objetivo

Recuperar el proyecto Expo SDK 57 y convertir la plantilla actual en la aplicación móvil real de la clínica para usuarios con rol `paciente`. La aplicación consumirá únicamente los contratos presentes en `origin/backend` en el commit `e676dec44e503d58ec3e22933a048779265fd9c0`, sin datos simulados en runtime ni funciones administrativas.

## Límites

- Todos los cambios quedan dentro de `frontend/` y en la rama `frontend`.
- No se modifica Laravel, `frontend-web/`, PostgreSQL ni FTP.
- No se crean endpoints ni se implementan operaciones sin autorización del backend.
- No se realizan commits, push, merge, limpieza destructiva ni descartes de cambios desconocidos.
- El token Bearer es el único dato de sesión persistente y se guarda con `expo-secure-store`.
- `EXPO_PUBLIC_API_URL` contiene solo la base pública de la API; nunca secretos.

## Recuperación del entorno

Los únicos cambios iniciales detectados son `frontend/package.json` y `frontend/package-lock.json`. El diff sustituye la combinación correcta de Expo 57 / React Native 0.86 por Expo 44 / React Native 0.72 / Expo Router 58, coincidiendo con el efecto descrito de `npm audit fix --force`. La recuperación restaura primero el manifiesto de `origin/frontend`, reinstala desde una resolución limpia compatible y usa la CLI local mediante `npx expo`. Luego `npx expo install --fix` ajusta paquetes al SDK 57 sin migrar a SDK 58.

## Arquitectura

Expo Router separará rutas públicas y privadas mediante grupos. Un proveedor de autenticación restaura el token seguro, valida `GET /user`, comprueba que el rol sea exactamente `paciente` y no renderiza contenido privado durante esa comprobación. Las secciones principales viven en tabs: Inicio, Mis citas, Servicios y Mi perfil; Registro, Recuperación, Solicitar cita e Historial son pantallas de stack.

La capa de datos tendrá un único cliente `fetch` tipado con URL base validada, timeout con `AbortController`, Bearer Token, decodificación segura de JSON y una jerarquía de errores por estado HTTP. Las respuestas externas se validan con funciones de parsing explícitas antes de entrar a la UI. Un 401 limpia la sesión y redirige al acceso; 403, 404, 409, 422, 429 y 500/503 conservan su semántica. Un fallo de red nunca se convierte en una colección vacía.

Cada dominio tendrá tipos, parser y servicio enfocados: autenticación, citas, historial, perfil/fotografía y catálogo. La UI compartirá componentes pequeños para pantalla, tarjeta, botón, campo, error, carga y estado vacío. No se persistirán citas, historial ni perfil.

## Flujos funcionales

- Login: `POST /auth/login`; se acepta solamente `user.role === "paciente"` y cuenta activa.
- Registro: `POST /auth/register-paciente` con las reglas exactas de Laravel; el backend vincula o crea el paciente.
- Recuperación: solicitud genérica por email y restablecimiento con código de seis dígitos; la confirmación no afirma entrega.
- Sesión: SecureStore, restauración, `GET /user`, `POST /auth/logout` y limpieza local incluso cuando el logout remoto no puede completarse.
- Inicio: saludo real y resumen derivado de `GET /agenda/mis-citas`, sin métricas inventadas.
- Citas: listado de estados reales y solicitud sin fecha ni horario; el bloqueo 409 se presenta como solicitud ya existente.
- Historial: lectura exclusiva de los cinco campos reales; 404 es un estado informativo, no un error falso.
- Perfil: lectura de datos reales, iniciales sin foto, lectura autenticada del binario, carga multipart de JPG/PNG/WebP hasta 5 MB y eliminación. La imagen anterior se conserva visualmente si falla una actualización.
- Servicios: categorías y servicios activos, agrupados con campos opcionales reales. Las imágenes solo se muestran si su URL pasa una validación segura HTTP(S).

## Diseño visual

La identidad usa azul marino, azul eléctrico, blanco y gris azulado suave. La jerarquía prioriza títulos claros, tarjetas compactas, radios consistentes y controles de al menos 44 puntos. Todas las pantallas respetan safe areas; los formularios usan `KeyboardAvoidingView` y scroll; no hay scroll horizontal ni contenido decorativo clínico inventado.

## Seguridad y privacidad

El cliente solo adjunta Authorization a URLs construidas desde la base configurada. No registra tokens, contraseñas, códigos ni respuestas médicas. No usa almacenamiento web/local para sesión, no cachea datos clínicos y no renderiza HTML remoto. Las fotos se limitan en cliente por tipo/tamaño para UX, manteniendo la validación Laravel como autoridad. La autorización del frontend es solo una barrera UX complementaria a los middlewares reales del backend.

## Pruebas y verificación

Las pruebas unitarias cubren parsers, validaciones, errores HTTP, sesión, roles y servicios; las pruebas de componentes cubren formularios, estados y acciones principales con mocks únicamente dentro de tests. La verificación final ejecuta Expo Doctor, TypeScript, lint, tests, audit de producción, `git diff --check`, arranque de Metro y, si existe dispositivo/emulador, Android real. Cualquier ausencia de credenciales o servidor se documenta sin afirmar E2E.

## Funciones bloqueadas

No se implementan edición de historial o datos personales, odontograma, radiografías, recetas, presupuestos, pagos, chat, notificaciones push, cancelación/reprogramación de citas ni elección de horarios, porque los contratos del paciente no existen en el backend verificado.
