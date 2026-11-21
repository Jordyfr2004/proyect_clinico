# Consultas, actividades y Caja

## Activación

Desde `backend-api`, aplicar antes de utilizar el nuevo cierre:

```sh
php artisan migrate --path=database/migrations/2026_10_29_000001_add_agenda_id_to_actividades_table.php
```

No se crean cobros retrospectivos para citas ya completadas. Las actividades manuales existentes siguen funcionando. No hay cambios de frontend.

## Completar consulta

Doctora autenticada: `PUT /api/agenda/{id}/completar`

```json
{"actividad": "Consulta y revisión de exámenes", "precio": "35.50"}
```

- `precio`: obligatorio, entre 0 y 99999999.99, con hasta dos decimales y punto decimal. Se aceptan enteros. Los importes se devuelven como cadenas con dos decimales.
- `actividad`: opcional, máximo 255 caracteres. Si se omite, se utiliza “Consulta médica”.
- La cita debe estar programada y tener diagnóstico y tratamiento, como antes.
- Paciente y fecha se toman de la cita. El ingreso corresponde a la fecha de atención, no al momento de enviar la petición. Se considera pagada.
- La respuesta conserva `data` con la cita y agrega `data.actividad` (incluye `agenda_id`, `paciente_id`, `fecha`, `actividad`, `precio`).
- Cita, actividad y ambas auditorías se guardan en una transacción. Un cierre repetido devuelve 409 sin otro ingreso. El bloqueo de fila y el vínculo único protegen frente a cierres simultáneos.
- Respuestas: 200 éxito, 404 inexistente, 409 estado o datos clínicos incompatibles, 422 entrada inválida.

## Actividades y correcciones

`GET /api/actividades` conserva `data` con los registros y la relación `paciente` (nombres y código). Incluye `agenda_id` nullable. Conserva filtros de fecha, semana, mes/año, año y código de paciente.

`PUT /api/actividades/{id}` permite corregir descripción o precio. En actividades vinculadas no se permite cambiar paciente o fecha independientemente. Corregir la fecha mediante `PUT /api/agenda/{id}` actualiza la actividad y mueve el ingreso al período correspondiente. La descripción de agenda y el servicio realizado son campos distintos.

Se conserva la eliminación manual de actividades, que elimina el ingreso de los reportes. Eliminar una cita conserva su actividad y deja `agenda_id` en null. Eliminar físicamente un paciente mantiene la eliminación en cascada existente de sus actividades.

## Caja

Doctora autenticada:

```text
GET /api/reportes/caja?periodo=dia&fecha=2026-10-29
GET /api/reportes/caja?periodo=mes&mes=10&anio=2026
GET /api/reportes/caja?periodo=anio&anio=2026
```

También se conserva `periodo=semana&fecha=...`.

```json
{
  "periodo": "dia",
  "ingresos": "35.50",
  "egresos": "10.25",
  "saldo": "25.25",
  "movimientos": [
    {
      "id": "uuid-egreso", "tipo": "egreso", "fecha": "2026-10-29",
      "concepto": "Materiales", "ingreso": "0.00", "egreso": "10.25",
      "agenda_id": null, "codigo_paciente": null, "nombres": null
    },
    {
      "id": "uuid-actividad", "tipo": "ingreso", "fecha": "2026-10-29",
      "concepto": "Consulta médica", "ingreso": "35.50", "egreso": "0.00",
      "agenda_id": "uuid-cita", "codigo_paciente": "001", "nombres": "Paciente"
    }
  ]
}
```

Cada ingreso y egreso tiene su propio registro. Orden: fecha descendente, tipo e ID ascendentes. Los endpoints existentes de egresos admiten hasta dos decimales. El saldo puede ser negativo. Sin movimientos, la lista está vacía y los tres totales son “0.00”. No se arrastra el saldo anterior ni se borran registros. Mes y año acumulan únicamente los movimientos de su período.

## Pruebas

```sh
php artisan test --filter="ConsultaCajaTest|AgendaHorariosTest|AuditoriaTransaccionesTest"
```
