# Recuperación de contraseña y API de Brevo

Configurar estas variables en el entorno del servidor (no subir claves al repositorio):

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tu-dominio.example
BREVO_API_KEY="TU_CLAVE_API_DE_BREVO"
MAIL_FROM_ADDRESS="remitente@tu-dominio.example"
MAIL_FROM_NAME="Consultorio"
```

Usar una **clave API**, no una clave SMTP ni la contraseña de la cuenta.
Se utiliza el SDK getbrevo/brevo-php 6 y HTTPS hacia
https://api.brevo.com/v3/smtp/email (puerto 443), con validación TLS activada.
MAIL_MAILER, MAIL_HOST, MAIL_PORT y MAIL_SCHEME no intervienen en este flujo;
las variables SMTP existentes pueden conservarse para otros usos.
Verificar el remitente y autenticar el dominio en Brevo; revisar que el servicio de
correo transaccional esté activo y que la IP del servidor esté autorizada si se
usan restricciones de IP.

Referencias oficiales:
- https://developers.brevo.com/docs/send-a-transactional-email
- https://developers.brevo.com/docs/api-key-authentication

Aplicar las dos migraciones de recuperación, en este orden, desde backend-api:

```sh
php artisan migrate --path=database/migrations/2026_10_13_230949_create_password_reset_codes_table.php --force
php artisan migrate --path=database/migrations/2026_10_14_000002_add_attempts_to_password_reset_codes_table.php --force
php artisan config:cache
```

Usar PostgreSQL en producción para los bloqueos de filas. Mantener un almacén de
caché compartido y persistente (database o Redis) entre todos los procesos/servidores.
Los proxies deben configurarse para que Laravel obtenga la IP real del cliente.

## Contrato de la API

- POST /api/auth/forgot-password: JSON con email. Respuesta 200 genérica para
  cuentas activas, inexistentes o desactivadas. No garantiza entrega a la bandeja.
- Un reenvío por minuto y cinco por hora por correo; diez solicitudes por minuto
  por IP. Al limitar se devuelve 429 con Retry-After.
- POST /api/auth/reset-password: email, code (cadena de seis dígitos), password
  (mínimo 8 caracteres, máximo 72 bytes), password_confirmation. Respuesta 200 al cambiarla;
  422 para datos/código inválidos; 429 al superar límites.
- El código vence a los cinco minutos y queda bloqueado tras cinco fallos,
  incluso si cambia la IP o vence el límite temporal de solicitudes.
- Cada reenvío exitoso reemplaza el código anterior. El cambio revoca los tokens
  Sanctum existentes y rota remember_token. La aplicación usa autenticación por
  tokens; esto no añade una política para sesiones web de otros sistemas.
- Un fallo de API revierte el nuevo código y conserva el anterior. Devuelve 503 con
  un mensaje temporal; no expone la respuesta de Brevo. Una cuenta inexistente o
  inactiva sigue recibiendo 200 genérico. Durante una caída del proveedor, esa
  diferencia de estado puede revelar que se intentó enviar para una cuenta activa.
- Monitorizar password_reset_mail_failed: incluye proveedor, estado HTTP y motivo
  seguro, sin claves, destinatarios ni códigos. 401 indica clave rechazada;
  403, restricciones de cuenta/IP; 400/422, petición o remitente; 429, límite de Brevo;
  connection_or_invalid_response, fallo de conexión/TLS o respuesta no válida.
- La ausencia de clave API o remitente válido devuelve 503 antes de consultar cuentas.
  Un messageId confirma aceptación por Brevo, no entrega; revisar rebotes en su panel.
- El envío es síncrono, con timeout de 15 segundos (5 para conectar), sin reintentos
  automáticos para evitar duplicados, dentro de la transacción: no necesita worker.
  API y base de datos no comparten una transacción; si Brevo
  acepta un mensaje y la confirmación de base falla, ese código no será válido.

## Validación antes de abrir el servicio

```sh
php artisan test --compact --filter=PasswordRecoveryTest
```

Las pruebas usan SQLite en memoria y respuestas HTTP simuladas del SDK, sin enviar mensajes reales.
No prueban el bloqueo de filas de PostgreSQL ni la entrega real de Brevo.
Tras configurar el servidor, solicitar un código para una cuenta controlada,
confirmar recepción y entrega en Brevo, restablecer contraseña y comprobar
que el código y los tokens anteriores ya no funcionan. No registrar códigos ni claves.
