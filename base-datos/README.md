# Laptop 4 · Base de datos (PostgreSQL)

Responsable: **Luis-M25** (Windows), IP Tailscale `100.104.9.95`. Base: `proyect_clinico`.

## Instalación (Windows)

1. Instala PostgreSQL 16 o superior con el instalador oficial (https://www.postgresql.org/download/windows/).
2. Copia la red: `Copy-Item infraestructura\red.tailscale.env.example infraestructura\red.env`
3. En PowerShell **como administrador**, desde la carpeta `base-datos`:
   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\instalar.ps1
   ```
   Pide la contraseña del superusuario `postgres` y una contraseña nueva para `clinica_app`. Esta última es el `DB_PASSWORD` que usa el backend; pásasela a Jordy por un medio privado, nunca por Git.

El instalador hace lo siguiente y se puede ejecutar varias veces:
- Crea el usuario `clinica_app` (sin privilegios de superusuario) y lo hace dueño de `proyect_clinico`.
- Configura PostgreSQL para escuchar en la red y registrar conexiones y consultas lentas.
- Agrega a `pg_hba.conf` una regla que **solo permite al backend** (`100.92.238.94`).
- Reinicia el servicio y abre en el firewall el puerto `BD_PORT` de `red.env` (5433) solo para el backend.

Para permitir también el mantenimiento desde otro equipo: `.\instalar.ps1 -AdminIP 100.102.99.114`.

**Las tablas no se crean aquí.** Las crean las migraciones de Laravel desde la Laptop 3 (`php artisan migrate`).

## Esquemas

| Esquema | Tablas |
|---|---|
| `seguridad` | users, personal_access_tokens, password_reset_codes, password_reset_tokens, sessions |
| `clinica` | pacientes, historiales_clinicos, odontogramas, evidencias_clinicas, recetas, plantillas_receta |
| `citas` | agenda |
| `finanzas` | actividades, egresos |
| `catalogo` | categorias_servicios, servicios_consultorio |
| `auditoria` | acciones_registradas, sesiones_registradas, **registro_cambios** |
| `public` | tablas internas de Laravel (migrations, cache, jobs) |

### Trazabilidad
Hay triggers en las tablas principales que guardan en `auditoria.registro_cambios` cada inserción, modificación y borrado:
- qué cambió, con el valor anterior y el nuevo;
- quién lo hizo, desde qué IP y en qué instancia del backend.

Las contraseñas nunca se guardan y el historial no se puede modificar ni borrar. La doctora lo consulta en `GET /api/configuracion/cambios`.

```sql
SELECT fecha, tabla, operacion, campos_modificados, usuario_id, ip
FROM auditoria.registro_cambios ORDER BY id DESC LIMIT 20;
```

## Copias de seguridad

```powershell
.\respaldo.ps1                                         # crea C:\RespaldosClinica\proyect_clinico_<fecha>.dump
.\respaldo.ps1 -Restaurar C:\RespaldosClinica\archivo.dump
```

## Prueba de fallo
```powershell
Get-Service postgresql* | Stop-Service     # el backend responde 503 "base de datos no disponible"
Get-Service postgresql* | Start-Service
```

En Linux están `instalar.sh` y `respaldo.sh`, que hacen lo mismo.
