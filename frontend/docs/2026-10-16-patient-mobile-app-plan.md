# Patient Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recuperar Expo SDK 57 y entregar una aplicación móvil real, segura y mantenible para pacientes de la clínica.

**Architecture:** Expo Router organiza rutas públicas, tabs privadas y pantallas secundarias. Un cliente HTTP central, parsers runtime y un proveedor de sesión segura aíslan Laravel de la UI; cada dominio conserva servicios y tipos propios sin persistir datos clínicos.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19.2.3, TypeScript, Expo Router, SecureStore, ImagePicker, Jest y React Native Testing Library compatibles con SDK 57.

**Spec:** `frontend/docs/2026-10-16-patient-mobile-app-design.md`

## Global Constraints

- Trabajar solo en `frontend/`, rama `frontend`, sin commit, push ni merge.
- Seguir `origin/backend` en `e676dec44e503d58ec3e22933a048779265fd9c0`.
- Mantener Expo SDK 57; no instalar Expo 58 ni degradar a Expo 44.
- No usar datos ficticios en runtime ni almacenamiento local como base de datos.
- No incrustar credenciales, tokens, IPs ni direcciones Tailscale.
- La app admite únicamente el rol `paciente`.
- Los mocks existen únicamente en pruebas.

## Review Focus

- API URL ausente o inválida: debe bloquear llamadas con un mensaje de configuración, sin enviar tokens a otro origen.
- Respuesta 200 con forma inválida: debe fallar como contrato inválido, no renderizar datos parciales.
- 401 durante restauración o uso: debe borrar el token y cerrar rutas privadas sin mostrar contenido médico.
- Doble toque en solicitud o formularios: debe producir una sola petición mientras esté en curso.
- Foto demasiado grande o MIME no permitido: debe rechazarse antes del upload y conservar la imagen actual.

---

### Task 1: Recuperación reproducible de Expo 57

**Files:**
- Modify: `frontend/package.json`
- Regenerate: `frontend/package-lock.json`
- Modify: `frontend/app.json`

**Interfaces:**
- Consumes: manifiesto limpio de `origin/frontend` y documentación Expo 57.
- Produces: árbol de dependencias consistente y CLI local operativa.

- [ ] Restaurar en `package.json` las versiones de `origin/frontend` que `npm audit fix --force` cambió.
- [ ] Eliminar únicamente `frontend/node_modules` si existe y reinstalar con npm desde el manifiesto recuperado.
- [ ] Ejecutar `npx expo install --fix` y revisar cada cambio de versión antes de conservarlo.
- [ ] Ejecutar `npx expo-doctor`, `npx tsc --noEmit` y `npm audit --omit=dev`; registrar resultados de base.
- [ ] Probar `npx expo start --offline --non-interactive` con timeout controlado y confirmar que Metro inicia mediante la CLI local.

### Task 2: Harness de pruebas y contratos compartidos

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/jest.config.js`
- Create: `frontend/src/test/setup.ts`
- Create: `frontend/src/types/api.ts`
- Create: `frontend/src/validation/primitives.ts`
- Test: `frontend/src/validation/__tests__/primitives.test.ts`

**Interfaces:**
- Produces: `JsonRecord`, guards primitivos y `parseEnvelope<T>()` para todos los parsers de dominio.

- [ ] Instalar con versiones compatibles `jest-expo`, `@testing-library/react-native` y tipos necesarios.
- [ ] Escribir tests fallidos para objetos, strings, booleanos, arrays, campos opcionales y envelopes.
- [ ] Ejecutar el archivo y confirmar fallos por funciones ausentes.
- [ ] Implementar guards mínimos con errores de contrato sin incluir valores sensibles.
- [ ] Ejecutar tests, TypeScript y lint hasta que pasen.

### Task 3: Cliente HTTP seguro y configuración

**Files:**
- Create: `frontend/src/config/env.ts`
- Create: `frontend/src/api/errors.ts`
- Create: `frontend/src/api/client.ts`
- Test: `frontend/src/api/__tests__/client.test.ts`

**Interfaces:**
- Produces: `apiRequest<T>(path, options): Promise<T>`, `setAccessTokenProvider`, `setUnauthorizedHandler`, `ApiError` y `NetworkError`.

- [ ] Escribir tests para base ausente, combinación de URL, timeout, Bearer, JSON, 204, red, 401/403/404/409/422/429/500/503 y cuerpo inválido.
- [ ] Ejecutar tests y comprobar que fallan.
- [ ] Implementar URL base normalizada desde `EXPO_PUBLIC_API_URL`, timeout con abort y headers centralizados.
- [ ] Implementar mapeo de errores preservando `message`, `errors` y `Retry-After` sin filtrar cuerpos sensibles.
- [ ] Ejecutar tests, TypeScript y lint.

### Task 4: Autenticación, persistencia y protección de rutas

**Files:**
- Create: `frontend/src/features/auth/types.ts`
- Create: `frontend/src/features/auth/parsers.ts`
- Create: `frontend/src/features/auth/service.ts`
- Create: `frontend/src/features/auth/session-storage.ts`
- Create: `frontend/src/features/auth/auth-context.tsx`
- Modify: `frontend/src/app/_layout.tsx`
- Create: `frontend/src/app/(public)/_layout.tsx`
- Create: `frontend/src/app/(private)/_layout.tsx`
- Tests: `frontend/src/features/auth/__tests__/*.test.tsx`

**Interfaces:**
- Produces: `useAuth()`, `login`, `register`, `logout`, `restoreSession`, `status` y usuario paciente validado.

- [ ] Escribir tests de parsers y flujo para login válido, rol ajeno, cuenta inactiva, token seguro, restauración con `GET /user`, 401 y logout.
- [ ] Confirmar fallos iniciales.
- [ ] Instalar `expo-secure-store` con `npx expo install` y configurar su plugin.
- [ ] Implementar servicios y almacenamiento exclusivo del token.
- [ ] Implementar proveedor que mantenga splash/estado de carga hasta validar la sesión y grupos que redirijan según estado.
- [ ] Ejecutar tests, TypeScript y lint.

### Task 5: Sistema visual y componentes accesibles

**Files:**
- Replace: `frontend/src/constants/theme.ts`
- Create: `frontend/src/components/ui/{screen,card,button,text-field,feedback,avatar}.tsx`
- Create: `frontend/src/components/ui/__tests__/button.test.tsx`
- Modify: `frontend/app.json`

**Interfaces:**
- Produces: tokens de color/espaciado/tipografía y componentes compartidos con estados disabled/loading/error.

- [ ] Escribir pruebas de botón para bloqueo durante carga, etiqueta accesible y área táctil.
- [ ] Implementar la paleta azul marino/eléctrico, superficies blancas/gris azuladas y radios uniformes.
- [ ] Implementar componentes con safe-area, teclado, scroll vertical y tamaños táctiles accesibles.
- [ ] Actualizar nombre, scheme, splash y permisos descriptivos sin añadir imágenes clínicas ficticias.
- [ ] Ejecutar tests, TypeScript y lint.

### Task 6: Login, registro y recuperación

**Files:**
- Create: `frontend/src/app/(public)/login.tsx`
- Create: `frontend/src/app/(public)/register.tsx`
- Create: `frontend/src/app/(public)/forgot-password.tsx`
- Create: `frontend/src/app/(public)/reset-password.tsx`
- Create: `frontend/src/features/auth/validation.ts`
- Tests: `frontend/src/features/auth/__tests__/forms.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `apiRequest`, UI compartida.
- Produces: cuatro formularios públicos con errores Laravel por campo.

- [ ] Escribir tests para obligatorios, email, fecha no futura, confirmaciones, contraseña mínima, código de seis dígitos, 422/429/503 y bloqueo de doble submit.
- [ ] Implementar validación cliente equivalente sin sustituir la validación del servidor.
- [ ] Implementar login y registro; conservar exclusivamente respuestas reales.
- [ ] Implementar recuperación con texto que indique procesamiento, no entrega garantizada.
- [ ] Ejecutar tests, TypeScript y lint.

### Task 7: Navegación privada y citas

**Files:**
- Create: `frontend/src/app/(private)/(tabs)/_layout.tsx`
- Create: `frontend/src/app/(private)/(tabs)/index.tsx`
- Create: `frontend/src/app/(private)/(tabs)/appointments.tsx`
- Create: `frontend/src/app/(private)/request-appointment.tsx`
- Create: `frontend/src/features/appointments/{types,parsers,service}.ts`
- Tests: `frontend/src/features/appointments/__tests__/*`

**Interfaces:**
- Produces: `getMyAppointments()` y `requestAppointment()` con estados `pendiente|programada|cancelada|completada`.

- [ ] Escribir tests de parser para campos nulos, estados permitidos y envelope inválido.
- [ ] Escribir tests de UI para carga, error, vacío, listado, 409 duplicado y refresco tras crear.
- [ ] Implementar tabs con iconos consistentes desde el set ya incluido por Expo.
- [ ] Implementar inicio derivado de citas reales y listado sin fechas/horas sustitutas.
- [ ] Implementar solicitud sin body clínico y bloqueo mientras se procesa.
- [ ] Ejecutar tests, TypeScript y lint.

### Task 8: Historial clínico de solo lectura

**Files:**
- Create: `frontend/src/app/(private)/medical-history.tsx`
- Create: `frontend/src/features/history/{types,parsers,service}.ts`
- Tests: `frontend/src/features/history/__tests__/*`

**Interfaces:**
- Produces: `getMyMedicalHistory()` y estado `not-found` específico para 404.

- [ ] Escribir tests de los cinco campos permitidos, valores nulos, contrato inválido y 404.
- [ ] Implementar parser/servicio sin diagnósticos, tratamientos ni endpoints administrativos.
- [ ] Implementar pantalla de lectura, carga, error y ausencia informativa sin formularios.
- [ ] Ejecutar tests, TypeScript y lint.

### Task 9: Perfil y fotografía autenticada

**Files:**
- Create: `frontend/src/app/(private)/(tabs)/profile.tsx`
- Create: `frontend/src/features/profile/{types,parsers,service,use-profile-photo}.ts`
- Tests: `frontend/src/features/profile/__tests__/*`

**Interfaces:**
- Produces: perfil real, URI local temporal de foto autenticada, `uploadProfilePhoto(asset)` y `deleteProfilePhoto()`.

- [ ] Escribir tests de perfil, iniciales, fetch binario autenticado, MIME/tamaño, multipart, fallo que conserva foto y eliminación.
- [ ] Instalar `expo-image-picker` con `npx expo install` y configurar solo permiso de fotos, sin audio.
- [ ] Implementar lectura protegida del binario sin token en query string y limpiar cualquier object URL/archivo temporal.
- [ ] Implementar upload de `foto` con JPG/JPEG/PNG/WebP y límite cliente de 5 MB.
- [ ] Implementar UI de perfil de solo lectura y logout funcional.
- [ ] Ejecutar tests, TypeScript y lint.

### Task 10: Catálogo activo

**Files:**
- Create: `frontend/src/app/(private)/(tabs)/services.tsx`
- Create: `frontend/src/features/services/{types,parsers,service}.ts`
- Tests: `frontend/src/features/services/__tests__/*`

**Interfaces:**
- Produces: `getActiveCategories()` y `getActiveServices()` con campos opcionales reales.

- [ ] Escribir tests para categorías, servicios, precio decimal, duración, categoría anidada, imagen nula/URL insegura y estados vacíos.
- [ ] Implementar parsers y carga paralela manteniendo errores visibles.
- [ ] Implementar filtro/agrupar por categorías reales sin crear promociones, pagos o reservas.
- [ ] Mostrar imagen solo para URL HTTP(S) válida y segura; usar icono neutro cuando no exista.
- [ ] Ejecutar tests, TypeScript y lint.

### Task 11: Integración, documentación y QA final

**Files:**
- Replace: `frontend/README.md`
- Create: `frontend/.env.example`
- Modify/delete: contenido de plantilla Expo únicamente dentro de `frontend/src/` y assets de ejemplo ya no usados.

**Interfaces:**
- Consumes: todos los módulos anteriores.
- Produces: app documentada y evidencia de verificación reproducible.

- [ ] Añadir pruebas integradas de redirección, sesión expirada, navegación atrás, carga/vacío/error y doble acción.
- [ ] Eliminar imports y pantallas de ejemplo sin usar `reset-project`; verificar que no queden datos ficticios ni rutas administrativas.
- [ ] Documentar Node, Expo, instalación, API URL, Android, endpoints, rol, pruebas, bloqueos y auditoría.
- [ ] Ejecutar suite completa, `npx expo-doctor`, `npx tsc --noEmit`, `npm run lint`, `npm audit --omit=dev` y `git diff --check`.
- [ ] Iniciar Metro con CLI local y probar Android solo si existe dispositivo/emulador accesible; registrar exactamente lo comprobado.
- [ ] Ejecutar revisión final de Git y confirmar que todos los cambios están bajo `frontend/`, sin credenciales, commit ni push.

## Self-review

La cobertura recorre todas las fases de la misión: entorno, arquitectura, visual, autenticación, rutas, inicio, citas, historial, perfil/foto, catálogo, seguridad, pruebas, documentación y Git. Las funciones bloqueadas se mantienen fuera del plan. Las interfaces usan nombres consistentes y cada tarea termina en una verificación autónoma; los cinco riesgos de revisión tienen una prueba asignada en las tareas 3, 4, 7 y 9.
