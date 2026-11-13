# Práctica individual: contrato JSON del registro de pacientes

Este módulo académico representa el contrato de `POST /api/pacientes` sin intervenir en su ejecución. La ruta real exige autenticación Sanctum y rol `doctora` o `asistente`. El controlador y el servicio existentes siguen usando el arreglo de `StorePacienteRequest::validated()`; los DTO de esta práctica se ejercitan en la prueba y no sustituyen ese flujo.

**Proceso:** registro de pacientes. **Actores:** personal autorizado (`doctora` o `asistente`) desde un cliente web o móvil, y la API Laravel. **Endpoint:** `POST /api/pacientes`.

```text
Cliente web/móvil → API Laravel (ruta, autenticación y validación) → PacienteService::crear() → respuesta JSON al cliente
```

**Deserialización** significa que Laravel lee el cuerpo JSON de la solicitud y lo convierte en datos PHP; `StorePacienteRequest` los valida y entrega un arreglo con `validated()`. El DTO de entrada muestra cómo representar ese arreglo validado con campos tipados. **Serialización** significa convertir la respuesta PHP a JSON: el controlador real usa `response()->json()` y Laravel convierte el modelo `Paciente` incluido en `data`. El DTO de salida describe esa respuesta para la práctica, sin estar conectado directamente al endpoint.

## Solicitud

Enviar `Content-Type: application/json` y un cuerpo como este:

```json
{
  "nombres": "Ana Pérez",
  "cedula": "0912345678",
  "telefono": "0991234567",
  "direccion": "Quito",
  "fecha_nacimiento": "2000-04-15"
}
```

| Campo | Tipo JSON | Obligatorio | Significado y regla real |
| --- | --- | --- | --- |
| `nombres` | cadena | Sí | Nombre del paciente; máximo 255 caracteres. |
| `cedula` | cadena | Sí | Identificación única; máximo 20 caracteres. |
| `telefono` | cadena o `null` | No | Número de contacto; máximo 20 caracteres. Es cadena para conservar ceros iniciales. |
| `direccion` | cadena o `null` | No | Domicilio; máximo 255 caracteres. |
| `fecha_nacimiento` | cadena de fecha o `null` | No | Fecha de nacimiento válida, no posterior al día actual. |

Las reglas pertenecen exclusivamente a `app/Http/Requests/Paciente/StorePacienteRequest.php`. `RegistroPacienteEntradaDto::fromValidated()` recibe el arreglo **después** de esa validación y representa los cinco campos con tipos PHP. No contiene reglas duplicadas ni valida por sí mismo. Si falta un campo opcional, el DTO lo representa como `null`.

## Respuesta válida

El endpoint responde con HTTP `201` y `Content-Type: application/json`. La forma es:

```json
{
  "message": "Paciente registrado correctamente.",
  "data": {
    "id": "uuid-generado-por-el-servidor",
    "codigo_paciente": "001",
    "nombres": "Ana Pérez",
    "cedula": "0912345678",
    "telefono": "0991234567",
    "direccion": "Quito",
    "fecha_nacimiento": "2000-04-15T00:00:00.000000Z",
    "created_at": "fecha-y-hora-ISO-8601-UTC",
    "updated_at": "fecha-y-hora-ISO-8601-UTC"
  }
}
```

| Campo | Tipo JSON | Obligatorio en la respuesta 201 | Significado |
| --- | --- | --- | --- |
| `message` | cadena | Sí | Confirmación del registro. |
| `data` | objeto | Sí | Paciente creado. |
| `data.id` | cadena UUID | Sí | Identificador generado por Laravel. |
| `data.codigo_paciente` | cadena | Sí | Código correlativo generado por el servicio. |
| `data.nombres` | cadena | Sí | Nombre registrado. |
| `data.cedula` | cadena | Sí | Identificación registrada. |
| `data.telefono` | cadena o `null` | Sí; puede ser `null` | Número de contacto, si se proporcionó. |
| `data.direccion` | cadena o `null` | Sí; puede ser `null` | Domicilio, si se proporcionó. |
| `data.fecha_nacimiento` | cadena ISO 8601 UTC o `null` | Sí; puede ser `null` | Fecha convertida por el cast `date` del modelo. |
| `data.created_at` | cadena ISO 8601 UTC | Sí | Momento de creación registrado por Eloquent. |
| `data.updated_at` | cadena ISO 8601 UTC | Sí | Momento de actualización registrado por Eloquent. |

`RegistroPacienteSalidaDto::fromPaciente()` usa la representación serializada del modelo para conservar los casts existentes. `toArray()` describe explícitamente el objeto JSON de respuesta. El endpoint real serializa el modelo directamente dentro de `response()->json()`; el DTO académico permite comparar ambas representaciones sin alterar el controlador.

## Respuestas de validación

Si falta `nombres` o `telefono` es un número JSON (por ejemplo, `991234567` sin comillas), `StorePacienteRequest` rechaza la solicitud. Laravel responde con HTTP `422` y un objeto `errors` que contiene `nombres` o `telefono`, respectivamente. La validación ocurre antes de llamar al servicio, de modo que no se crea un paciente ni una acción de auditoría.

**Ejemplo esperado de respuesta HTTP 422 cuando falta `nombres`:**

```json
{
  "message": "Los nombres del paciente son obligatorios.",
  "errors": {
    "nombres": ["Los nombres del paciente son obligatorios."]
  }
}
```

**Ejemplo esperado de respuesta HTTP 422 cuando `telefono` es numérico:**

```json
{
  "message": "The telefono field must be a string.",
  "errors": {
    "telefono": ["The telefono field must be a string."]
  }
}
```

El texto del segundo mensaje corresponde al idioma predeterminado `en`; puede variar si se configura otro idioma. La estructura `message`/`errors` y el estado 422 son los elementos del contrato que verifican las pruebas.

## Ejecución de la prueba

Con las dependencias de Composer disponibles y `pdo_sqlite` habilitado:

```powershell
cd backend-api
php artisan test --filter=PracticaIndividualRegistroPacienteTest
```

La prueba usa una conexión SQLite `:memory:` y crea allí únicamente las tablas necesarias. Simula `nextval()` porque la generación real de `codigo_paciente` depende de PostgreSQL; todas las inserciones y comprobaciones de persistencia ocurren en esa base temporal. No usa la base de producción ni datos reales. Comprueba el registro válido (201), los dos errores (422) y que los errores no persisten registros.
