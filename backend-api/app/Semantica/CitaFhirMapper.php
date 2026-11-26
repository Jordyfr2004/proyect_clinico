<?php

namespace App\Semantica;

use App\DTO\Agenda\CitaMedicaRequestDTO;
use App\Models\Agenda;
use App\Models\Paciente;
use Carbon\CarbonImmutable;
use Throwable;

/**
 * Capa de intercambio semántico de la cita médica.
 *
 *  - aFhir():     modelo interno (Agenda)      -> recurso FHIR Appointment
 *  - desdeFhir(): recurso FHIR Appointment     -> CitaMedicaRequestDTO (Práctica 2.2)
 *
 * La traducción no cambia solo nombres de campos: resuelve el significado
 * (códigos de estado, categoría del servicio, identidad del paciente según
 * el sistema que la emitió y el instante exacto con zona horaria).
 */
final class CitaFhirMapper
{
    private const PATRON_INSTANTE = '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/';

    /**
     * @return array<string, mixed>
     */
    public function aFhir(Agenda $cita): array
    {
        $fecha = $cita->fecha?->format('Y-m-d');

        return array_filter([
            'resourceType' => 'Appointment',
            'id' => (string) $cita->id,
            'meta' => ['profile' => ['http://hl7.org/fhir/StructureDefinition/Appointment']],
            'identifier' => [[
                'system' => VocabularioClinico::SISTEMA_AGENDA,
                'value' => (string) $cita->id,
            ]],
            'status' => VocabularioClinico::estadoFhir($cita->estado),
            'serviceCategory' => [[
                'coding' => [['system' => VocabularioClinico::SISTEMA_CATEGORIA_SERVICIO, ...VocabularioClinico::CATEGORIA_DENTAL]],
            ]],
            'appointmentType' => [
                'coding' => [['system' => VocabularioClinico::SISTEMA_TIPO_CITA, ...VocabularioClinico::TIPO_CITA_RUTINA]],
            ],
            'description' => $cita->descripcion,
            'start' => self::instante($fecha, $cita->hora_inicio),
            'end' => self::instante($fecha, $cita->hora_fin),
            'created' => $cita->created_at?->toIso8601String(),
            'participant' => [[
                'actor' => self::actorPaciente($cita),
                'required' => 'required',
                'status' => 'accepted',
            ]],
        ], fn ($valor) => $valor !== null);
    }

    /**
     * Interpreta un Appointment recibido de otro sistema y lo deja en el
     * contrato interno de la cita médica. Reúne todos los problemas antes
     * de rechazar, para que el emisor los corrija de una vez.
     *
     * @param  array<string, mixed>  $recurso
     *
     * @throws ErrorSemantico
     */
    public function desdeFhir(array $recurso): CitaMedicaRequestDTO
    {
        $problemas = [];
        $falla = function (string $code, string $expression, string $diagnostics) use (&$problemas): void {
            $problemas[] = compact('code', 'expression', 'diagnostics');
        };

        if (($recurso['resourceType'] ?? null) !== 'Appointment') {
            // Sin el tipo correcto no tiene sentido seguir interpretando.
            throw ErrorSemantico::uno('invalid', 'resourceType', 'Se esperaba un recurso de tipo Appointment.');
        }

        $status = $recurso['status'] ?? null;
        if (! is_string($status) || $status === '') {
            $falla('required', 'Appointment.status', 'El estado (status) es obligatorio.');
        } elseif (VocabularioClinico::estadoInterno($status) === null) {
            $falla('code-invalid', 'Appointment.status', "El estado '{$status}' no tiene equivalente en la agenda del consultorio.");
        } elseif (! in_array($status, VocabularioClinico::ESTADOS_IMPORTABLES, true)) {
            $falla('not-supported', 'Appointment.status', "Solo se importan citas confirmadas (booked); se recibió '{$status}'.");
        }

        $this->validarCategoria($recurso['serviceCategory'] ?? null, $falla);

        $inicio = $this->leerInstante($recurso['start'] ?? null, 'Appointment.start', $falla);
        $fin = $this->leerInstante($recurso['end'] ?? null, 'Appointment.end', $falla);

        if ($inicio && $fin) {
            if ($inicio->format('Y-m-d') !== $fin->format('Y-m-d')) {
                $falla('business-rule', 'Appointment.end', 'La cita debe empezar y terminar el mismo día en la hora local del consultorio ('.VocabularioClinico::ZONA_HORARIA.').');
            } elseif ($fin <= $inicio) {
                $falla('business-rule', 'Appointment.end', 'El fin de la cita debe ser posterior al inicio.');
            }
        }

        $descripcion = $recurso['description'] ?? null;
        if ($descripcion !== null && (! is_string($descripcion) || mb_strlen($descripcion) > 1000)) {
            $falla('value', 'Appointment.description', 'La descripción debe ser texto de hasta 1000 caracteres.');
        }

        [$codigoPaciente, $nombreReserva] = $this->leerPaciente($recurso['participant'] ?? null, $falla);

        if ($problemas !== []) {
            throw new ErrorSemantico($problemas);
        }

        return CitaMedicaRequestDTO::fromArray([
            'codigo_paciente' => $codigoPaciente,
            'nombre_reserva' => $nombreReserva,
            'fecha' => $inicio->format('Y-m-d'),
            'hora_inicio' => $inicio->format('H:i'),
            'hora_fin' => $fin->format('H:i'),
            'descripcion' => $descripcion,
        ]);
    }

    private static function instante(?string $fecha, ?string $hora): ?string
    {
        if ($fecha === null || $hora === null) {
            return null;
        }

        return CarbonImmutable::createFromFormat('Y-m-d H:i', $fecha.' '.substr($hora, 0, 5), VocabularioClinico::ZONA_HORARIA)
            ->startOfMinute()
            ->toIso8601String();
    }

    /**
     * @return array<string, mixed>
     */
    private static function actorPaciente(Agenda $cita): array
    {
        if ($cita->paciente) {
            return [
                'type' => 'Patient',
                'identifier' => [
                    'system' => VocabularioClinico::SISTEMA_CODIGO_PACIENTE,
                    'value' => $cita->paciente->codigo_paciente,
                ],
                'display' => $cita->paciente->nombres,
            ];
        }

        return ['type' => 'Patient', 'display' => $cita->nombre_reserva];
    }

    private function validarCategoria(mixed $categorias, callable $falla): void
    {
        if ($categorias === null) {
            return; // Opcional: si no viene, se asume la única categoría del consultorio.
        }

        if (! is_array($categorias) || ! array_is_list($categorias)) {
            $falla('value', 'Appointment.serviceCategory', 'serviceCategory debe ser una lista de CodeableConcept.');

            return;
        }

        foreach ($categorias as $categoria) {
            foreach ((array) ($categoria['coding'] ?? []) as $coding) {
                if (($coding['system'] ?? null) === VocabularioClinico::SISTEMA_CATEGORIA_SERVICIO
                    && (string) ($coding['code'] ?? '') === VocabularioClinico::CATEGORIA_DENTAL['code']) {
                    return;
                }
            }
        }

        $falla('code-invalid', 'Appointment.serviceCategory', 'El consultorio solo atiende la categoría '.VocabularioClinico::SISTEMA_CATEGORIA_SERVICIO.'|10 (Dental).');
    }

    private function leerInstante(mixed $valor, string $ruta, callable $falla): ?CarbonImmutable
    {
        if (! is_string($valor) || $valor === '') {
            $falla('required', $ruta, 'Es obligatorio un instante ISO 8601 con zona horaria, por ejemplo 2026-11-20T10:00:00-05:00.');

            return null;
        }

        if (! preg_match(self::PATRON_INSTANTE, $valor)) {
            $falla('value', $ruta, "'{$valor}' no es un instante FHIR válido: debe incluir segundos y zona horaria (Z o ±hh:mm).");

            return null;
        }

        try {
            $instante = CarbonImmutable::parse($valor)->setTimezone(VocabularioClinico::ZONA_HORARIA);
        } catch (Throwable) {
            $falla('value', $ruta, "'{$valor}' no es una fecha real.");

            return null;
        }

        if ($instante->second !== 0 || $instante->microsecond !== 0) {
            $falla('value', $ruta, 'La agenda trabaja en minutos exactos; los segundos deben ser 00.');

            return null;
        }

        return $instante;
    }

    /**
     * Identifica al paciente según el sistema que lo nombra:
     *  - código interno del consultorio -> se usa tal cual;
     *  - cédula ecuatoriana             -> se busca el paciente que la tiene;
     *  - solo nombre (display)          -> reserva de persona no registrada.
     *
     * @return array{0: ?string, 1: ?string} [codigo_paciente, nombre_reserva]
     */
    private function leerPaciente(mixed $participantes, callable $falla): array
    {
        $ruta = 'Appointment.participant';

        if (! is_array($participantes) || ! array_is_list($participantes) || $participantes === []) {
            $falla('required', $ruta, 'Debe venir al menos un participante con el paciente.');

            return [null, null];
        }

        $pacientes = array_values(array_filter($participantes, function ($p) {
            $actor = is_array($p) ? ($p['actor'] ?? null) : null;

            return is_array($actor)
                && (($actor['type'] ?? null) === 'Patient' || str_starts_with((string) ($actor['reference'] ?? ''), 'Patient/'));
        }));

        if (count($pacientes) !== 1) {
            $falla('business-rule', $ruta, 'Debe haber exactamente un participante de tipo Patient; se encontraron '.count($pacientes).'.');

            return [null, null];
        }

        $actor = $pacientes[0]['actor'];
        $ruta .= '.actor';
        $identificador = $actor['identifier'] ?? null;

        if (is_array($identificador)) {
            $sistema = $identificador['system'] ?? null;
            $valor = trim((string) ($identificador['value'] ?? ''));

            if ($valor === '') {
                $falla('required', "{$ruta}.identifier.value", 'El identificador del paciente no tiene valor.');

                return [null, null];
            }

            $paciente = match ($sistema) {
                VocabularioClinico::SISTEMA_CODIGO_PACIENTE => Paciente::where('codigo_paciente', $valor)->first(),
                VocabularioClinico::SISTEMA_CEDULA => Paciente::where('cedula', $valor)->first(),
                default => false,
            };

            if ($paciente === false) {
                $falla('code-invalid', "{$ruta}.identifier.system", "Sistema de identificación desconocido: '".((string) $sistema)."'.");

                return [null, null];
            }

            if ($paciente === null) {
                $falla('not-found', "{$ruta}.identifier", "No existe un paciente con {$sistema}|{$valor}.");

                return [null, null];
            }

            return [$paciente->codigo_paciente, null];
        }

        $nombre = is_string($actor['display'] ?? null) ? trim($actor['display']) : '';

        if ($nombre === '') {
            $falla('required', $ruta, 'El paciente necesita un identifier o, si no está registrado, su nombre en display.');

            return [null, null];
        }

        if (mb_strlen($nombre) > 255) {
            $falla('value', "{$ruta}.display", 'El nombre no debe superar 255 caracteres.');

            return [null, null];
        }

        return [null, $nombre];
    }
}
