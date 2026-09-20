# Frontend web — Clínica Dental

SPA administrativa para la doctora y el personal asistencial. Está construida con React, TypeScript, Vite, React Router, Axios, Tailwind CSS, React Hook Form, Zod y Lucide React.

## Desarrollo

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Configura `VITE_API_BASE_URL` en `.env.local` cuando el backend Laravel publique su URL y sus contratos HTTP. El cliente Axios ya utiliza cookies mediante `withCredentials`, cabeceras JSON y eventos diferenciados para respuestas 401/403.

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

El frontend no contiene datos simulados ni contratos de API inventados. Los módulos dependientes del backend muestran estados vacíos o de integración pendiente hasta disponer de endpoints verificables.
