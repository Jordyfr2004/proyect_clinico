# Práctica Individual 2.4 — Seguridad de la información en tránsito

**Autor:** Hache
**Proyecto:** backend Laravel en `backend-api`
**Rama de trabajo:** `practica-2-4-seguridad-hache`
**Fecha de comprobación:** 20 de noviembre de 2026

## Alcance e implementación

Se comprobó el acceso a los tres endpoints reales de historiales clínicos. Las rutas usan `auth:sanctum` y el alias `role` registrado en `bootstrap/app.php`. `RoleMiddleware` devuelve 403 a un usuario autenticado cuyo rol no está permitido. Una petición sin autenticar recibe 401 por el middleware de Sanctum, antes de llegar al control de rol.

La consulta `miHistorial` obtiene el `paciente_id` del usuario autenticado y el servicio busca el historial por ese identificador. El cliente no envía un identificador de paciente en esta ruta. Se agregó únicamente `tests/Feature/SeguridadInformacionTransitoHacheTest.php`; no se alteraron rutas, middleware, controladores, servicios ni modelos.

## Matriz de acceso comprobada

| Endpoint | Método | Doctora | Asistente | Paciente autenticado | Sin autenticación |
|---|---|---:|---:|---:|---:|
| `/api/historiales-clinicos` | GET | 200 | 200 | 403 | 401 |
| `/api/historiales-clinicos` | POST, datos válidos | 201 | 403 | 403 | 401 |
| `/api/paciente/mi-historial` | GET, historial existente | 403 | 403 | 200, solo propio | 401 |

Para `GET /api/paciente/mi-historial`, una cuenta de paciente sin vínculo o sin historial recibe 404. El POST con datos inválidos, después de superar autenticación y rol, puede recibir 422.

## Entorno y protección de secretos

Variables relevantes, **solo por nombre**: `APP_ENV`, `APP_DEBUG`, `APP_URL`, `APP_KEY`, `DB_CONNECTION`, `DB_DATABASE`, `DB_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_SECURE_COOKIE`, `TRUSTED_PROXIES`, `CORS_ALLOWED_ORIGINS`, `CORS_ALLOWED_ORIGINS_PATTERNS`.

La prueba P4 consulta los archivos versionados por Git: rechaza archivos `.env` distintos del ejemplo, archivos de claves privadas por extensión y algunos formatos reconocibles de claves o tokens dentro de archivos versionados. Comprueba además que Git ignore `backend-api/.env`. La revisión por patrones no sustituye un detector integral de secretos ni prueba que un secreto no exista en el historial previo de Git. No se abre ni se imprime el archivo `.env` local.

## HTTPS/TLS

Sanctum autentica y los roles autorizan solicitudes; **ninguno cifra por sí mismo el transporte**. En un despliegue, el cliente debe conectarse por HTTPS con TLS y un certificado válido; el proxy o servidor que termina TLS debe estar configurado correctamente. Si TLS termina en un proxy, hay que proteger también el tramo entre ese proxy y Laravel según la red de despliegue y configurar los proxies de confianza para interpretar el esquema de origen. Las cookies de sesión usadas sobre HTTPS deben emplear el atributo `Secure`. La prueba local de Laravel usa peticiones HTTP simuladas dentro del proceso: no demuestra negociación TLS. Un servidor `localhost` por HTTP tampoco está cifrado.

## Ejecución reproducible y aislamiento

Antes de ejecutar, confirmar la rama y el estado:

```powershell
git branch --show-current
git status --short --branch
cd backend-api
php -m | Select-String 'pdo_sqlite|sqlite3'
php artisan test tests/Feature/SeguridadInformacionTransitoHacheTest.php
```

`phpunit.xml` define SQLite en memoria para pruebas. Además, el archivo de prueba fija explícitamente el driver SQLite, la base `:memory:` y anula la URL de conexión antes de crear tablas. Carga solo las migraciones necesarias, previamente revisadas como compatibles con SQLite. Las migraciones completas incluyen sentencias exclusivas de PostgreSQL y no se ejecutan aquí. La prueba no inicia servicios externos ni accede a una base de datos persistente. La autenticación se comprueba también con un token Bearer real de Sanctum creado dentro de SQLite en memoria.

## Resultados reales

Ejecutado desde `backend-api` el 20 de noviembre de 2026 con el comando anterior: **7 pruebas aprobadas, 1 926 aserciones, 0 fallos**. Salidas HTTP observadas mediante aserciones de respuesta:

| Prueba | Solicitud y contexto | HTTP observado |
|---|---|---:|
| P1 | GET historiales, doctora y asistente | 200, 200 |
| P1 | POST historial válido, doctora | 201 |
| P1 | GET historiales, token Bearer Sanctum | 200 |
| P2 | GET historiales, POST historiales y GET mi historial, anónimo | 401, 401, 401 |
| P3 | GET y POST historiales, paciente; POST historiales y GET mi historial, asistente | 403, 403, 403, 403 |
| Propiedad | GET mi historial, dos cuentas de paciente distintas | 200, 200; cada una recibe su propio ID |
| P4 | Revisión de archivos versionados e ignorado de `.env` | Aprobada; no aplica HTTP |

### Espacio para evidencias del informe

- **Captura 1 — Rama y estado inicial:** terminal con `git branch --show-current` y `git status --short --branch`, mostrando la rama exigida antes de modificar.
- **Captura 2 — Pruebas:** terminal con el comando `php artisan test tests/Feature/SeguridadInformacionTransitoHacheTest.php` y el resumen completo `7 passed`, sin mostrar variables de entorno ni tokens.
- **Captura 3 — Controles de ruta:** editor con las tres rutas y sus middleware en `routes/api.php`.
- **Captura 4 — Propiedad:** editor con `miHistorial` en el controlador y `obtenerMiHistorial` en el servicio; mostrar el filtro por `paciente_id` del usuario.
- **Captura 5 — Protección de `.env`:** terminal con `git check-ignore backend-api/.env` y la parte correspondiente de `.gitignore`; no abrir el archivo `.env`.
- **Captura 6 — Estado final:** terminal con `git diff --check`, `git diff --stat` y `git status --short --branch`.

**Archivos de capturas:** pendiente de adjuntar por la persona que prepara el informe.
**Observaciones adicionales:** pendiente de registrar si se repite la ejecución en otro equipo.

Vera Mero Jereny Jhonnayker

## Reflexión individual

**¿Qué problema de integración resolví?** Resolví la incompatibilidad entre las migraciones completas, que incluyen SQL exclusivo de PostgreSQL, y la ejecución aislada de las pruebas con SQLite en memoria. Para ello utilicé solo las migraciones necesarias para los endpoints de historiales clínicos.

**¿Qué decisión técnica tomé y por qué?** Decidí conservar las rutas y los controles existentes de Sanctum y roles, y añadir una prueba independiente. Así pude verificar el acceso y la propiedad del historial sin alterar el comportamiento del sistema clínico.

**¿Cómo verifiqué el funcionamiento?** Ejecuté las siete pruebas de la práctica: comprobé respuestas 200 y 201 para accesos autorizados, 401 sin autenticación y 403 sin permiso; también verifiqué el aislamiento entre pacientes y la protección de `.env`. Las siete pruebas finalizaron sin fallos.
