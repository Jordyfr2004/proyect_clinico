# Pruebas

## Resumen de migraciones de protección

Ejecutar los comandos de este documento desde `backend-api`, con la conexión
configurada hacia la base de datos que se desea actualizar.

| Migración | Protección |
| --- | --- |
| `2026_10_13_000001_add_no_overlap_constraint_to_agenda_table.php` | Restricción de PostgreSQL que impide cruces de horarios en la agenda. |
| `2026_10_14_000001_add_unique_pending_request_to_agenda_table.php` | Índice único parcial de PostgreSQL que impide solicitudes pendientes duplicadas por paciente. |
| `2026_10_13_230949_create_password_reset_codes_table.php` | Crea la tabla de códigos de recuperación de contraseña. |
| `2026_10_14_000002_add_attempts_to_password_reset_codes_table.php` | Agrega el contador de intentos incorrectos de recuperación. |

Para comprobar cuáles están aplicadas:

```powershell
php artisan migrate:status
```

Los comandos individuales aparecen en las secciones siguientes. Artisan omite
las migraciones que ya figuran como ejecutadas. Las dos protecciones de agenda
requieren resolver los cruces o duplicados existentes antes de poder aplicarse;
no eliminan esos datos automáticamente.

## Ejecutar pruebas

La suite habitual usa SQLite en memoria:

```powershell
php artisan test --compact
```

Las pruebas de exclusión y concurrencia de agenda necesitan PostgreSQL y las
extensiones PHP `pdo_pgsql` y `pgsql`. Usa una base de pruebas con permiso para
crear esquemas. Cada caso crea y elimina su propio esquema `agenda_test_*`;
no ejecuta migraciones sobre las tablas existentes.

```powershell
$env:AGENDA_TEST_PGSQL_URL = 'postgresql://usuario:password@127.0.0.1:5432/clinico_test'
php artisan test --compact
```

Sin esta variable, `AgendaConcurrenciaTest` se omite explícitamente. La prueba de
concurrencia usa dos conexiones reales y comprueba tanto la confirmación como
el rollback de la primera reserva.

# Activar la protección de agenda

En la base PostgreSQL de la aplicación, aplica la migración nueva:

```powershell
php artisan migrate --path=database/migrations/2026_10_13_000001_add_no_overlap_constraint_to_agenda_table.php
```

La restricción `agenda_sin_solapamientos` rechaza los cruces entre actividades
personales y citas programadas o completadas. Permite horarios contiguos y
excluye citas canceladas y solicitudes pendientes. No requiere extensiones
adicionales de PostgreSQL.

Si ya existen cruces, PostgreSQL rechaza la migración sin modificar las
reservas. Deben revisarse esos registros antes de volver a aplicarla. La
protección de concurrencia solo queda activa al aplicar esta migración.

## Una solicitud pendiente por paciente

Aplica también la migración del índice único parcial:

```powershell
php artisan migrate --path=database/migrations/2026_10_14_000001_add_unique_pending_request_to_agenda_table.php
```

El índice `agenda_paciente_pendiente_unico` permite una sola cita médica
pendiente por paciente. Al programarla o cancelarla, se permite otra solicitud.
Si dos peticiones compiten, una se guarda y la otra recibe HTTP 409.

Si ya existen solicitudes pendientes duplicadas, la migración falla sin
eliminarlas ni cambiarlas. Puedes detectarlas antes de aplicar la migración:

```sql
SELECT paciente_id, COUNT(*) AS cantidad
FROM agenda
WHERE tipo = 'cita_medica' AND estado = 'pendiente'
  AND paciente_id IS NOT NULL
GROUP BY paciente_id
HAVING COUNT(*) > 1;
```

Las pruebas de `AgendaConcurrenciaTest` verifican el conflicto HTTP, la
restricción con dos conexiones, commit y rollback, cambios de estado y rechazo
de duplicados preexistentes. La protección requiere aplicar la migración;
el cambio del servicio por sí solo no impide solicitudes simultáneas.

## Migraciones de recuperación de contraseña

Son independientes de las protecciones de agenda y se aplican en este orden:

```powershell
php artisan migrate --path=database/migrations/2026_10_13_230949_create_password_reset_codes_table.php
php artisan migrate --path=database/migrations/2026_10_14_000002_add_attempts_to_password_reset_codes_table.php
```

La primera crea la tabla de códigos; la segunda agrega el contador necesario
para limitar los intentos incorrectos. La configuración del envío mediante Brevo
está documentada en [Recuperación de contraseña](../docs/password-recovery.md).

## Esquemas y trazabilidad (PostgreSQL)

`EsquemasTrazabilidadTest` ejecuta todas las migraciones en una base vacía y comprueba:
- que cada tabla quedó en su esquema (`seguridad`, `clinica`, `citas`, ...);
- que los triggers de `auditoria.registro_cambios` registran el usuario, la IP y los valores anterior y nuevo;
- que no se guardan contraseñas;
- que el historial no se puede borrar.

**La base se borra en cada prueba**, por eso su nombre debe terminar en `_test`:

```powershell
$env:CLINICA_TEST_PGSQL_URL = 'postgresql://usuario:password@127.0.0.1:5432/proyect_clinico_test'
php artisan test --compact
```

