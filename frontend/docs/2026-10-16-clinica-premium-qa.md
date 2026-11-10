# QA del rediseño Clínica Premium

## Alcance visual

Se rediseñaron login, registro, recuperación, restablecimiento, inicio, citas, historial, perfil, fotografía, catálogo y navegación inferior. Los conceptos de referencia se generaron como tableros de pantallas públicas y privadas; no se incorporaron como assets de runtime.

## Comparación de fidelidad

| Punto        | Concepto                              | Implementación                                          |
| ------------ | ------------------------------------- | ------------------------------------------------------- |
| Paleta       | Azul marino, azul clínico, fondo frío | Tokens únicos en `src/constants/theme.ts`               |
| Jerarquía    | Encabezados compactos, CTA de 50 dp   | `AuthHeader`, `AppHeader` y `Button` compartidos        |
| Formularios  | Secciones, iconos, fecha nativa       | Registro agrupado y `DateField` con límite hasta hoy    |
| Contenedores | Tarjetas sobrias, listas abiertas     | `Card`, `Section`, `InfoRow` y estados comunes          |
| Navegación   | Tabs claras y safe area Android       | Altura calculada con `useSafeAreaInsets()`              |
| Contenido    | Solo operaciones reales               | Sin métricas, tratamientos, pagos ni endpoints añadidos |

El tablero público generado contenía texto y campos no autorizados; se usó solo como referencia de composición. La implementación conserva todos los campos exactos del registro Laravel y elimina el contenido inventado.

## Insets y teclado

- Pantallas auth/stack suman el inset inferior real una sola vez.
- Pantallas tab no lo duplican; el tab bar es quien consume el inset del sistema.
- Los formularios permanecen en `ScrollView` con persistencia de taps, cierre de teclado y `KeyboardAvoidingView`.
- El CTA de registro forma parte del contenido desplazable y dispone de padding inferior dinámico.

## Verificación visual disponible

Se intentó render móvil de 360 × 800 mediante Expo Web y Playwright. El shell se detuvo antes de renderizar la UI porque `expo-secure-store` SDK 57 no implementa en web `deleteValueWithKeyAsync`. No se añadió un fallback web porque el producto es móvil y eso modificaría una frontera de seguridad fuera de alcance. Por tanto, no existe una captura válida de implementación ni se declara validación visual Android.

## Verificación manual requerida en Android

1. Registro en pantalla pequeña con navegación de tres botones y teclado abierto.
2. Selector nativo de fecha: aceptar, cancelar, rotar y volver a abrir.
3. Insets de tabs en navegación por gestos y por tres botones.
4. Scroll hasta el último CTA en registro y restablecimiento.
5. Contraste y tamaño de botones disabled/loading bajo brillo bajo.
6. Carga, reemplazo y eliminación de fotografía con permisos aceptados y denegados.
7. Datos reales largos: nombre, dirección, descripción de servicio e historial.

ISO/IEC 25010 se utilizó como referencia de usabilidad, accesibilidad, compatibilidad y mantenibilidad; este documento no afirma certificación.

## Resultado de las comprobaciones

- `npx expo install --check`: dependencias compatibles con Expo SDK 57.
- `npx expo-doctor`: 21/21 comprobaciones superadas.
- `npx tsc --noEmit`: sin errores.
- `npm run lint`: sin errores ni advertencias.
- `npm test`: 10 suites y 40 pruebas superadas.
- `npx expo export --platform android --output-dir dist`: bundle Android generado correctamente con Hermes (1.302 módulos).
- `git diff --check`: sin errores de espacios en blanco.
- ADB no está disponible en este entorno; no se ejecutó la aplicación en un teléfono o emulador Android.

## Vulnerabilidades pendientes

`npm audit` informa 62 vulnerabilidades en dependencias de producción (16 moderadas y 46 altas) y 66 al incluir desarrollo (16 moderadas y 50 altas). Son principalmente cadenas transitivas de Expo, Metro, React Native y Jest. Las correcciones sugeridas requieren cambios de versión mayor o versiones incompatibles con Expo SDK 57; no se ejecutó `npm audit fix --force`.
