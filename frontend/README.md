# Portal móvil del paciente

Aplicación React Native / Expo 58 para pacientes de la clínica. Incluye autenticación con verificación de correo, recuperación de acceso, citas, catálogo, historial, archivos clínicos y perfil. Conserva los diseños de Inicio y Servicios y los aportes de los colaboradores.

## Desarrollo

1. Desde `frontend/`, ejecutar `npm ci --legacy-peer-deps`. El flag conserva Testing Library 13 frente al peer opcional de Expo Router; ver la documentación de integración.
2. Crear `.env.local` con `EXPO_PUBLIC_API_URL` apuntando al balanceador/API Laravel real, incluyendo `/api`. Confirmar la dirección vigente con el equipo. El host del ejemplo no respondió como API en la revisión del 24/11/2026.
3. Ejecutar `npx expo start` y abrir una compilación de desarrollo compatible con los módulos nativos de SDK 58. Para Web: `npm run web`.

En dispositivos físicos, localhost apunta al teléfono. Si se utiliza la red privada del equipo, el teléfono debe tener acceso a esa red (por ejemplo, Tailscale). HTTP se permite solo en desarrollo; las exportaciones de producción requieren HTTPS.

## Verificación

```text
npm run lint
npm test
npx tsc --noEmit
npx expo-doctor
npx expo export --platform all --max-workers 2
git diff --check
```

Las exportaciones Android/iOS no reemplazan probar cámara, archivos, notificaciones y permisos en dispositivos. Web conserva el token solo en memoria y requiere login tras recargar. No hay modo sin conexión ni datos clínicos de demostración.

[Matriz de contratos, reglas y límites](docs/mobile-integration.md) · [Resultados del cierre](docs/mobile-closure-results.md)
