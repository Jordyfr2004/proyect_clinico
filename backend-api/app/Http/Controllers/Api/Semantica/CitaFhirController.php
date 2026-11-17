<?php

namespace App\Http\Controllers\Api\Semantica;

use App\Http\Controllers\Controller;
use App\Models\Agenda;
use App\Semantica\CitaFhirMapper;
use App\Semantica\ErrorSemantico;
use App\Semantica\VocabularioClinico;
use App\Services\AgendaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Capa de intercambio de información semántica de la agenda.
 *
 * Publica y recibe citas médicas como recursos HL7 FHIR R4 Appointment,
 * para que otro sistema de salud las entienda sin conocer nuestro modelo.
 * La regla de negocio sigue siendo la misma de la Práctica 2.2:
 * Appointment -> CitaMedicaRequestDTO -> AgendaService::crearCitaMedica.
 *
 * Práctica: capa de intercambio de información semántica · William Cabrera.
 */
class CitaFhirController extends Controller
{
    public function __construct(
        private readonly CitaFhirMapper $mapper,
        private readonly AgendaService $agendaService,
    ) {}

    /** GET /api/semantica/vocabulario */
    public function vocabulario(): JsonResponse
    {
        return response()->json(VocabularioClinico::comoTabla(), 200, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /** GET /api/semantica/fhir/Appointment?date=YYYY-MM-DD */
    public function buscar(Request $request): JsonResponse
    {
        $fecha = $request->query('date');

        if (! is_string($fecha) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || ! strtotime($fecha)) {
            return ErrorSemantico::uno('required', 'date', 'Indique el día a consultar con ?date=AAAA-MM-DD.')->respuesta();
        }

        $citas = Agenda::with('paciente')
            ->where('tipo', 'cita_medica')
            ->whereDate('fecha', $fecha)
            ->orderBy('hora_inicio')
            ->get();

        return $this->fhir([
            'resourceType' => 'Bundle',
            'type' => 'searchset',
            'total' => $citas->count(),
            'entry' => $citas->map(fn (Agenda $cita) => [
                'fullUrl' => url('/api/semantica/fhir/Appointment/'.$cita->id),
                'resource' => $this->mapper->aFhir($cita),
                'search' => ['mode' => 'match'],
            ])->all(),
        ]);
    }

    /** GET /api/semantica/fhir/Appointment/{id} */
    public function mostrar(string $id): JsonResponse
    {
        $cita = Str::isUuid($id)
            ? Agenda::with('paciente')->where('tipo', 'cita_medica')->find($id)
            : null;

        if (! $cita) {
            // Las entradas personales de la doctora tampoco se exponen.
            return ErrorSemantico::uno('not-found', 'Appointment.id', "No existe la cita médica {$id}.", 404)->respuesta();
        }

        return $this->fhir($this->mapper->aFhir($cita));
    }

    /** POST /api/semantica/fhir/Appointment */
    public function importar(Request $request): JsonResponse
    {
        try {
            $dto = $this->mapper->desdeFhir($request->json()->all());
        } catch (ErrorSemantico $error) {
            return $error->respuesta();
        }

        $resultado = $this->agendaService->crearCitaMedica($dto->toArray(), $request->user());

        if ($resultado['estado'] === 'horario_ocupado') {
            return ErrorSemantico::uno('conflict', 'Appointment.start', 'Ese horario ya se encuentra ocupado.', 409)->respuesta();
        }

        $cita = $resultado['registro'];

        return $this->fhir($this->mapper->aFhir($cita), 201)
            ->header('Location', url('/api/semantica/fhir/Appointment/'.$cita->id));
    }

    /**
     * @param  array<string, mixed>  $recurso
     */
    private function fhir(array $recurso, int $status = 200): JsonResponse
    {
        return response()
            ->json($recurso, $status, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            ->header('Content-Type', VocabularioClinico::CONTENT_TYPE);
    }
}
