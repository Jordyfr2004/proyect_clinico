# SDD ledger — plan: frontend/docs/2026-10-16-patient-mobile-app-plan.md

Pre-flight: Task 2 parsers → Tasks 4, 7, 8, 9, 10 domain parsers: compatible; all consume shared record/primitive guards.
Pre-flight: Task 3 HTTP client → Tasks 4, 7, 8, 9, 10 services: compatible; services consume `apiRequest<T>` and retain domain parsing.
Pre-flight: Task 4 auth context → Tasks 6 and private routing: compatible; public forms consume actions and private layouts consume session state.
Pre-flight: Task 5 UI primitives → Tasks 6–10 screens: compatible; shared loading, error, empty, input and button states cover downstream needs.
Pre-flight: Task 7 appointments → home and request flow: compatible; one service owns list invalidation/refetch behavior.
Ruling: work in the current checkout — the user requires the existing `frontend` branch and all writes under `frontend/`; creating a worktree/branch or `.superpowers` workspace would violate that scope — cost if wrong: less isolation from unrelated local changes, mitigated by status checks before every destructive or final operation.
Ruling: no commits or task-start/task-done commit ranges — explicit user prohibition overrides the execution skill's commit workflow; verification commands and results are recorded here — cost if wrong: no per-task Git recovery points, mitigated by small patches and continuous tests.
Ruling: configuration recovery is not test-first — manifests and generated lockfiles are configuration artifacts covered by the TDD exception; Expo Doctor, TypeScript and Metro are the behavioral checks — cost if wrong: dependency drift, mitigated by exact SDK checks and lockfile review.
Task 1: Ruling: use `npm dedupe` instead of deleting `node_modules` — the environment policy blocked the validated recursive deletion; the duplicate was stale peer resolution and dedupe proved a single Expo-compatible 4.26.2 tree — cost if wrong: hidden stale modules, mitigated by Expo Doctor 21/21 and `npm ls`.
Task 1: RED TypeScript — `npx tsc --noEmit` failed because the Expo starter imports CSS without declarations under TypeScript 6.
Task 1: GREEN TypeScript — `src/types/styles.d.ts` added; `npx tsc --noEmit` passed.
Task 1: complete (no commits by instruction; `npx expo-doctor` → 21/21, `npx tsc --noEmit` → pass, local Metro `/status` → `packager-status:running`).
Task 2: RED primitives — four behavior tests failed with `Not implemented` after the module skeleton made Jest load successfully.
Task 2: GREEN primitives — 4/4 tests passed; TypeScript initially exposed missing Jest globals, then passed after loading Jest types in setup.
Task 2: RED lint — Expo configured ESLint, then the suite exposed the starter web hydration hook's synchronous state update.
Task 2: GREEN lint — hydration detection now uses `useSyncExternalStore`; test suite 4/4, TypeScript and lint passed.
Task 2: complete (no commits by instruction; 4 tests passed, TypeScript pass, lint pass).
Task 3: RED HTTP client — 13 tests failed against the unimplemented client for URL validation, auth header, status semantics, 401 cleanup, network, malformed JSON and timeout.
Task 3: GREEN HTTP client — 13/13 client tests and 17/17 full suite passed; TypeScript and lint passed.
Task 3: complete (no commits by instruction; 17 tests passed, TypeScript pass, lint pass).
Task 4: RED/GREEN — los parsers, servicios y almacenamiento seguro se probaron antes del proveedor; la incompatibilidad de `@testing-library/react-native` 14 con React 19.2.3 se corrigió usando 13.3.3 y `react-test-renderer` 19.2.3. Restauración, rechazo de sesión inválida y logout local: 3/3.
Tasks 5–10: implementados sin datos simulados de runtime. Navegación pública/privada, formularios, citas, historial de solo lectura, perfil/foto y catálogo consumen únicamente contratos confirmados en `origin/backend`. Parsers de paciente: 3/3; validación auth: 3/3.
Task 11: verificación local — Expo dependency check actualizado; Doctor 21/21; TypeScript y lint sin errores; Jest 34/34; export Android completado (1.284 módulos). Metro respondió `packager-status:running`. `adb` no está instalado y `http://localhost/api/user` no es accesible, por lo que no hubo prueba en dispositivo ni integración real con Laravel.
Security audit: `npm audit --omit=dev` informa 61 vulnerabilidades transitivas (16 moderadas, 45 altas, 0 críticas). Las correcciones propuestas cambian a Expo 44, Expo Router 58 o RN 0.88 y rompen el contrato SDK 57; no se aplicó `npm audit fix --force`.
