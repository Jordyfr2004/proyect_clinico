# Revisión final de contratos pendientes

Referencia inspeccionada: `origin/backend` (`bf2f0f76a3538633922187111ef61edcdd8c9abf`). Estas observaciones no implican cambios en Laravel.

- **Archivos de evidencias:** `backend-api/routes/api.php` declara `GET /evidencias-clinicas/{id}/archivo` y `GET /evidencias-clinicas/mis/{id}/archivo`, ambos dirigidos a `EvidenciaClinicaController::archivo`. Ese método no existe en `backend-api/app/Http/Controllers/Api/Clinica/EvidenciaClinicaController.php`. La web mantiene visibles solo los metadatos; no ofrece descarga, visualización ni enlaces al FTP.
- **Clasificación de evidencias:** `backend-api/app/Services/EvidenciaClinicaService.php` selecciona la carpeta `rx` o `casos_clinicos` al crear el archivo. En `actualizar()` cambia los metadatos mediante `$evidencia->update($datos)` y no mueve el archivo cuando cambia `tipo`. Por ello, el tipo almacenado y la carpeta física pueden diferir. El frontend conserva el cambio de tipo admitido por `PUT /evidencias-clinicas/{id}`; Laravel debe definir si debe mover el archivo o impedir ese cambio.
- **Eliminación de categorías:** `CategoriaServicioService::eliminar()` llama `$categoria->servicios()->exists()`, pero `backend-api/app/Models/CategoriaServicio.php` no define `servicios()`. La web no ofrece la eliminación de categorías hasta que Laravel resuelva esa relación.
- **Odontograma:** `OdontogramaController::guardar()` valida `datos` únicamente como `array`, y el modelo solo lo convierte a arreglo. Falta definir dientes, superficies, estados y versión del esquema para una representación fiable. La sección gráfica permanece pendiente.

Las integraciones automatizadas usan pruebas con respuestas simuladas; falta comprobar estos flujos contra una instancia de Laravel de pruebas con datos ficticios.
