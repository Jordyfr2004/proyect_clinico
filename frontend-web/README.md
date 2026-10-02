# Frontend web — Clínica Dental

SPA web para la gestión clínica y administrativa. El portal web es administrativo para doctora y asistente. El rol paciente se reconoce en autenticación, pero no entra al shell administrativo; su cuenta, identidad y perfil pertenecen al flujo móvil. Está construida con React, TypeScript, Vite, React Router, Axios, Tailwind CSS, React Hook Form, Zod y Lucide React.

## Desarrollo

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Configura `VITE_API_BASE_URL` localmente en `.env.local` con la base de la API confirmada por backend. `.env` y `.env.local` no se versionan. La autenticación actual es real: Axios usa un token Bearer de Laravel Sanctum, restaura el usuario con `GET /user` y distingue respuestas 401/403.

## Comandos

```bash
npm test
npm run lint
npm run build
```

## Arquitectura

- `src/app`: routing y protección de rutas.
- `src/layouts`: shell público y área administrativa responsive.
- `src/features`: módulos funcionales por dominio.
- `src/components`: controles y estados reutilizables.
- `src/services`: cliente HTTP y futuros servicios por recurso.

El frontend no contiene datos simulados en runtime ni contratos de API inventados. Integra login/sesión reales, la cuenta única de asistente (consulta, creación, activación, desactivación, cambio de contraseña y eliminación con confirmación) y pacientes administrativos para doctora/asistente (GET listado, GET detalle y POST). La búsqueda filtra únicamente el listado recibido por nombre, cédula o código; el resumen muestra los seis campos confirmados. `POST /pacientes` usa `nombres`, `cedula`, `telefono`, `direccion` y `fecha_nacimiento`; tras un 201 vuelve a consultar el listado. PUT paciente continúa pendiente porque el controlador no implementa `update()`.

Historial clínico está integrado en el expediente web: doctora/asistente consultan por paciente y solo doctora registra y actualiza los cinco campos confirmados. El historial propio del paciente pertenece al móvil. Recuperación de contraseña, agenda/citas, horarios, lista de espera, diagnósticos, tratamientos, odontograma, radiografías y reportes/dashboard continúan pendientes de backend; Dashboard no afirma que no existan registros en secciones sin integración. El web no expone registro ni perfil de paciente.

Las pruebas automatizadas y el QA de navegador con respuestas aisladas de prueba no equivalen a E2E contra Laravel. No hay una prueba E2E autenticada documentada para estas integraciones; la eliminación real de asistente y los cambios reales del historial requieren prueba manual autorizada. Antes de integrar, volver a inspeccionar `origin/backend` actualizado; no asumir que un SHA histórico representa el contrato actual.

## Contexto para desarrollo

Antes de implementar funcionalidades, revisa [el contexto operativo](docs/frontend-context.md) y [las decisiones del frontend](docs/frontend-decisions.md). El código no debe adelantarse a contratos reales del backend ni rellenarse con datos simulados.
