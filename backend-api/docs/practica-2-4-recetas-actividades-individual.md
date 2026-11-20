# Práctica individual 2.4 — Seguridad de la información en tránsito

**Proyecto:** sistema odontológico, backend Laravel del repositorio `Jordyfr2004/proyect_clinico`<br>
**Rama local propuesta:** `practica-2-4-recetas-actividades-individual`<br>
**Estudiante:** completar con el nombre real del compañero<br>
**Fecha:** completar con la fecha real de ejecución

## 1. Selección de endpoints reales

Se eligieron dos módulos distintos del sistema odontológico: recetas médicas y actividades clínicas. La consulta de recetas utiliza `GET /api/recetas`, mientras que el registro de una actividad se realiza con `POST /api/actividades`. Las dos rutas ya existen en `backend-api/routes/api.php`.

### Matriz de acceso (resultado esperado según middleware)

| Endpoint y método | Doctora | Asistente | Paciente | No autenticado |
|---|---|---|---|---|
| GET `/api/recetas` | 200 | 200 | 403 | 401 |
| POST `/api/actividades` con datos válidos | 201 | 403 | 403 | 401 |

La consulta complementaria `GET /api/paciente/mis-recetas` permite que cada paciente autenticado consulte sus propias recetas; el servicio filtra por `paciente_id` del usuario conectado. Debe comprobarse en las pruebas.

## 2. Controles implementados y verificados

Las rutas existentes usan `auth:sanctum` para autenticar y `RoleMiddleware` para comprobar roles. Esta práctica **no crea un sistema de autenticación nuevo ni modifica las rutas compartidas**. Añade un archivo de pruebas individual que verifica ambos controles, un token Bearer real generado en el entorno de prueba y la consulta por propietario.

## 3. Configuración y credenciales

Se utiliza una base SQLite temporal (`:memory:`), configurada desde el archivo de pruebas. Se cargan solo las migraciones necesarias para los módulos seleccionados, pues algunas migraciones generales dependen de PostgreSQL. Los datos de pacientes y usuarios son ficticios.

Comprobar que `.env` no está rastreado por Git, que las credenciales no están escritas directamente en el código y que no se imprimen tokens en los errores o evidencias.

**Variables pertinentes (solo nombres):** `APP_ENV`, `APP_KEY`, `APP_DEBUG`, `APP_URL`, `DB_CONNECTION`, `DB_DATABASE`, `DB_URL`, `SESSION_SECURE_COOKIE`, `TRUSTED_PROXIES`, `CORS_ALLOWED_ORIGINS`.

La revisión P4 verifica el ignorado de `.env` y busca algunos tipos evidentes de claves privadas. **No equivale a una auditoría exhaustiva de todos los secretos ni del historial de Git.**

## 4. Protección de información en tránsito

En un despliegue real, el cliente debe conectarse mediante HTTPS y TLS con un certificado válido. Si TLS termina en un proxy, el tramo hacia Laravel también debe protegerse según la arquitectura. Hay que configurar correctamente proxies de confianza y cookies `Secure` cuando correspondan. Sanctum y los controles por roles **no cifran** el tráfico por sí mismos. Las peticiones simuladas por PHPUnit y HTTP en localhost no demuestran cifrado TLS.

## 5. Pruebas mínimas P1–P4

Ejecutar desde `backend-api`:

```powershell
php artisan test tests/Feature/SeguridadRecetasActividadesIndividualTest.php
```

| Caso | Qué se comprueba | Esperado | Resultado observado |
|---|---|---|---|
| P1 | Doctora y asistente consultan recetas | 200 | Completar después de ejecutar |
| P1 | Doctora registra actividad con datos ficticios | 201 | Completar después de ejecutar |
| P1 adicional | Token Bearer de Sanctum | 200 | Completar después de ejecutar |
| P2 | GET recetas y POST actividades sin token | 401 | Completar después de ejecutar |
| P3 | Asistente/paciente sin permisos | 403 | Completar después de ejecutar |
| Propietario | Paciente solo accede a sus recetas | 200 y 404 para ajena | Completar después de ejecutar |
| P4 | `.env` ignorado y revisión básica de secretos | Aprobado | Completar después de ejecutar |

**Importante:** no se consignan resultados «aprobados» hasta ver la ejecución real en la computadora del estudiante.

## 6. Evidencias que se deben capturar

1. PHPUnit con el comando de prueba y el resumen final.
2. `php artisan route:list --path=api/recetas -v`.
3. `php artisan route:list --path=api/actividades -v`.
4. Métodos de consulta y creación en los controladores reales y verificación de `paciente_id` para recetas propias.
5. `git check-ignore -v .env` y `git ls-files -- .env` sin mostrar el contenido de `.env`.
6. `git branch --show-current` y `git status --short`, mostrando solo archivos de la práctica.

## 7. Reflexión individual (completar con experiencia real)

**¿Qué problema de integración resolví?** Explicar la necesidad de controlar quién consulta recetas y quién registra actividades en el sistema odontológico.

**¿Qué decisión técnica tomé y por qué?** Explicar por qué se conservaron Sanctum y los roles existentes y se realizaron pruebas independientes con SQLite.

**¿Cómo verifiqué que funciona?** Indicar los resultados HTTP obtenidos y las comprobaciones de `.env` cuando se hayan ejecutado.

## 8. Referencias

- Carrera de Software. (2026). *Guía de práctica individual: Tema 2.4, seguridad de la información en tránsito*. Universidad Laica Eloy Alfaro de Manabí.
- Repositorio del sistema clínico: https://github.com/Jordyfr2004/proyect_clinico
