<?php

namespace App\DTO\Agenda;

use App\Http\Requests\Agenda\CrearCitaMedicaRequest;

/**
 * DTO de entrada del contrato "Registrar cita médica" (POST /api/agenda/cita-medica).
 *
 * Deserialización: convierte el JSON ya validado del cliente (web o móvil)
 * en un objeto inmutable y tipado que viaja hacia la capa de servicio.
 * Así el servicio no depende de nombres de campos sueltos ni de la petición HTTP.
 *
 * Práctica 2.2 – William Cabrera.
 */
final readonly class CitaMedicaRequestDTO
{
    public function __construct(
        public ?string $codigoPaciente,
        public ?string $nombreReserva,
        public string $fecha,
        public string $horaInicio,
        public string $horaFin,
        public ?string $descripcion,
    ) {
    }

    /**
     * Construye el DTO a partir de la petición validada (FormRequest).
     */
    public static function fromRequest(CrearCitaMedicaRequest $request): self
    {
        return self::fromArray($request->validated());
    }

    /**
     * Deserializa un arreglo con las claves del contrato JSON (snake_case).
     *
     * @param  array<string, mixed>  $datos
     */
    public static function fromArray(array $datos): self
    {
        return new self(
            codigoPaciente: self::textoOpcional($datos['codigo_paciente'] ?? null),
            nombreReserva: self::textoOpcional($datos['nombre_reserva'] ?? null),
            fecha: (string) $datos['fecha'],
            horaInicio: (string) $datos['hora_inicio'],
            horaFin: (string) $datos['hora_fin'],
            descripcion: self::textoOpcional($datos['descripcion'] ?? null),
        );
    }

    /**
     * Serializa el DTO de vuelta al formato del contrato que consume AgendaService.
     *
     * @return array<string, string|null>
     */
    public function toArray(): array
    {
        return [
            'codigo_paciente' => $this->codigoPaciente,
            'nombre_reserva' => $this->nombreReserva,
            'fecha' => $this->fecha,
            'hora_inicio' => $this->horaInicio,
            'hora_fin' => $this->horaFin,
            'descripcion' => $this->descripcion,
        ];
    }

    public function esPacienteRegistrado(): bool
    {
        return $this->codigoPaciente !== null;
    }

    private static function textoOpcional(mixed $valor): ?string
    {
        if ($valor === null) {
            return null;
        }

        $texto = trim((string) $valor);

        return $texto === '' ? null : $texto;
    }
}
