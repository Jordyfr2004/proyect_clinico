# Contrato JSON – Registrar cita médica (Práctica 2.2 · William Cabrera)

`POST /api/agenda/cita-medica` · `Authorization: Bearer <token doctora>` · `Content-Type: application/json`

| Código | Cuándo | Cuerpo |
|---|---|---|
| 201 | Cita registrada | `{ message, data }` (respuesta.schema.json) |
| 401 / 403 | Sin token / rol distinto de doctora | `{ message }` |
| 409 | Horario ocupado | `{ message }` |
| 422 | Falla el contrato (falta campo, tipo o formato) | `{ message, errors: { campo: [..] } }` |

Componentes: `CrearCitaMedicaRequest` (validación) → `CitaMedicaRequestDTO` (deserialización) →
`AgendaService::crearCitaMedica` → `CitaMedicaResource` (serialización).

Pruebas: `php artisan test --filter=CitaMedicaContratoTest`
