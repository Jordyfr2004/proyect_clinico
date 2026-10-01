# Frontend web — Clínica Dental

SPA web para la gestión clínica y administrativa. El contrato de autenticación reconoce los roles doctora, asistente y paciente; el frontend solo aplica las restricciones confirmadas por el backend. Está construida con React, TypeScript, Vite, React Router, Axios, Tailwind CSS, React Hook Form, Zod y Lucide React.

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

El frontend no contiene datos simulados ni contratos de API inventados. El código integra login, registro público de pacientes, sesión, gestión de la única cuenta de asistente, listado, detalle y registro administrativo de pacientes para doctora/asistente, y consulta del perfil propio para paciente. `POST /pacientes` usa el contrato `nombres` alineado en Request, Controller y Model de `origin/backend`; tras un 201 vuelve a consultar el listado. Los contratos se inspeccionaron en backend y tienen pruebas automatizadas; la prueba extremo a extremo autenticada sigue pendiente de una sesión real. La edición de pacientes, recuperación de contraseña, datos clínicos, agenda y reportes continúan pendientes.

## Contexto para desarrollo

Antes de implementar funcionalidades, revisa [el contexto operativo](docs/frontend-context.md) y [las decisiones del frontend](docs/frontend-decisions.md). El código no debe adelantarse a contratos reales del backend ni rellenarse con datos simulados.
