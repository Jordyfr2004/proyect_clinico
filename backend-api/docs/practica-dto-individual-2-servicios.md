# Práctica individual 2 — DTO y contratos JSON de servicios

## Proceso e intercambio

La doctora registra un servicio del consultorio mediante `POST /api/servicios-consultorio`. La ruta existente exige `auth:sanctum` y `role:doctora`. El cliente envía JSON; Laravel valida los campos, el servicio comprueba que la categoría exista y esté activa, guarda el servicio y una acción de auditoría en una transacción, y devuelve JSON con HTTP 201. No se cambió la implementación original.

El módulo académico está en `app/Academic/ServiciosConsultorio`: `RegistroServicioEntradaDto` deserializa un JSON válido y serializa sus seis campos para la petición; `RegistroServicioSalidaDto` deserializa el cuerpo HTTP 201 completo (`message` y `data`) y lo serializa sin perder campos. Los DTO se usan en `tests/Feature/Academico/RegistroServicioContratoTest.php`; el controlador sigue aplicando sus validaciones existentes. Para P2 y P3, la prueba altera deliberadamente el arreglo producido por el DTO de entrada, porque una solicitud inválida no puede representarse como un DTO válido fuertemente tipado.

## Contrato de solicitud

| Campo | Tipo JSON | Obligatorio | Significado y validación existente |
| --- | --- | --- | --- |
| `categoria_id` | string | Sí | UUID de la categoría. `required`, `uuid`. La categoría debe existir y estar activa, comprobación posterior en el servicio. |
| `nombre` | string | Sí | Nombre del servicio. `required`, `string`, `max:255`. |
| `descripcion` | string | Sí | Descripción del servicio. `required`, `string`. |
| `imagen` | string o null | No | Ruta o referencia textual de imagen; no es un archivo enviado. `nullable`, `string`, `max:500`. |
| `precio` | number o null | No | Precio no negativo. `nullable`, `numeric`, `min:0`; Laravel también admite una cadena numérica. |
| `duracion_minutos` | integer o null | No | Duración estimada. `nullable`, `integer`, `min:1`. |

El DTO académico siempre serializa las seis claves, con `null` para las tres opcionales si no se proporcionan. El endpoint original también acepta que se omitan.

## Contrato de respuesta

En el caso válido: HTTP **201**, objeto JSON con `message` (string, `Servicio creado correctamente.`) y `data` (objeto).

| Campo en `data` | Tipo JSON | Presencia en 201 | Significado y origen |
| --- | --- | --- | --- |
| `categoria_id` | string UUID | Siempre | Categoría recibida. |
| `nombre` | string | Siempre | Nombre recibido. |
| `descripcion` | string | Siempre | Descripción recibida. |
| `imagen` | string o null | Siempre | Referencia recibida, o `null`. |
| `precio` | string decimal de dos posiciones o null | Siempre | Precio recibido, serializado por el cast `decimal:2` del modelo. |
| `duracion_minutos` | integer o null | Siempre | Duración recibida. |
| `activo` | boolean | Siempre | Lo fija el servidor en `true`. |
| `id` | string UUID | Siempre | Lo genera el servidor. |
| `updated_at` | string fecha y hora UTC | Siempre | Marca de tiempo de Eloquent. |
| `created_at` | string fecha y hora UTC | Siempre | Marca de tiempo de Eloquent. |
| `categoria` | object | Siempre | Categoría relacionada cargada por el servicio. |

`data.categoria` contiene `id` (string UUID), `nombre` (string), `activo` (boolean), `created_at` y `updated_at` (strings de fecha y hora). El DTO de salida conserva ese objeto completo. No se envían atributos inventados ni se toma `precio` como número en la respuesta.

Para errores de validación, HTTP **422** devuelve `message` y `errors` por campo. Un `categoria_id` con forma de UUID pero inexistente produce **404**; una categoría inactiva produce **409**. El rol incorrecto produce **403**. Los textos de validación dependen del idioma configurado, por eso las pruebas comprueban la clave de `errors`, no una traducción concreta.

## Pruebas y comparación con el contrato

Cada caso usa SQLite en memoria y prepara las cuatro tablas funcionales necesarias (`users`, `acciones_registradas`, `categorias_servicios`, `servicios_consultorio`), una doctora autenticada y una categoría activa. La migración original de `users` crea además `password_reset_tokens` y `sessions`. No se usan datos reales. Los tres métodos Feature imprimen el JSON enviado, el código HTTP, la respuesta JSON y el resultado de la comparación con el contrato. Las aserciones verifican los campos de la respuesta, la serialización del DTO de salida y el número de registros en servicios y auditoría.

| Caso | Solicitud | Estado y respuesta esperados | Persistencia esperada |
| --- | --- | --- | --- |
| P1 | Seis campos válidos. | 201; `message` y `data` completo, idéntico a la serialización del DTO de salida. | 1 servicio y 1 acción de auditoría. |
| P2 | Solicitud válida sin `nombre`. | 422; `errors.nombre`. | 0 servicios y 0 acciones. |
| P3 | `duracion_minutos` como arreglo JSON. | 422; `errors.duracion_minutos`. | 0 servicios y 0 acciones. |

### Evidencia de ejecución local

Los siguientes valores son respuestas reales de una ejecución local de las tres pruebas; los UUID y las marcas de tiempo cambian en cada ejecución. Las marcas de tiempo del JSON están en UTC.

**P1 — JSON enviado**

```json
{"categoria_id":"01a1d81c-d2dc-71a9-877b-b20dc242f817","nombre":"Limpieza dental","descripcion":"Profilaxis de prueba","imagen":"servicios/limpieza.png","precio":35.5,"duracion_minutos":45}
```

**P1 — HTTP 201 y JSON recibido**

```json
{"message":"Servicio creado correctamente.","data":{"categoria_id":"01a1d81c-d2dc-71a9-877b-b20dc242f817","nombre":"Limpieza dental","descripcion":"Profilaxis de prueba","imagen":"servicios/limpieza.png","precio":"35.50","duracion_minutos":45,"activo":true,"id":"01a1d81c-d2ff-701d-982f-f8e07eeaff64","updated_at":"2026-11-14T03:32:10.000000Z","created_at":"2026-11-14T03:32:10.000000Z","categoria":{"id":"01a1d81c-d2dc-71a9-877b-b20dc242f817","nombre":"Odontología de prueba","activo":true,"created_at":"2026-11-14T03:32:10.000000Z","updated_at":"2026-11-14T03:32:10.000000Z"}}}
```

Comparación: coinciden `message`, todos los campos de `data` y los tipos; 1 servicio y 1 auditoría.

**P2 — JSON enviado**

```json
{"categoria_id":"01a1d81c-d341-7311-a5a5-7975180e9589","descripcion":"Profilaxis de prueba","imagen":"servicios/limpieza.png","precio":35.5,"duracion_minutos":45}
```

**P2 — HTTP 422 y JSON recibido**

```json
{"message":"The nombre field is required.","errors":{"nombre":["The nombre field is required."]}}
```

Comparación: `errors.nombre` está presente; 0 servicios y 0 auditorías.

**P3 — JSON enviado**

```json
{"categoria_id":"01a1d81c-d35f-734f-ab05-c2e90afb3561","nombre":"Limpieza dental","descripcion":"Profilaxis de prueba","imagen":"servicios/limpieza.png","precio":35.5,"duracion_minutos":["cuarenta y cinco"]}
```

**P3 — HTTP 422 y JSON recibido**

```json
{"message":"The duracion minutos field must be an integer.","errors":{"duracion_minutos":["The duracion minutos field must be an integer."]}}
```

Comparación: `errors.duracion_minutos` está presente; 0 servicios y 0 auditorías.

Resultado observado: **3 pruebas aprobadas, 24 aserciones**.

## Reproducción

Desde `backend-api`, con PHP, SQLite y las dependencias del `composer.lock` disponibles:

```powershell
php artisan test --filter=RegistroServicioContratoTest --compact
```

El comando utiliza `phpunit.xml` y el propio test fuerza `sqlite` con `:memory:`. No requiere un servicio desplegado ni una base real. En un checkout sin `.env`, PHPUnit puede mostrar una advertencia de lectura de ese archivo, aunque las aserciones pasen; durante la verificación local se usó un `.env` vacío y temporal, eliminado al finalizar. Ese archivo no forma parte de la práctica.
