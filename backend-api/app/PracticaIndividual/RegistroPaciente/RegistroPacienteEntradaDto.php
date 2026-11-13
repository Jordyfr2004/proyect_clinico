<?php

namespace App\PracticaIndividual\RegistroPaciente;

/** Representación académica de los datos ya validados por StorePacienteRequest. */
final readonly class RegistroPacienteEntradaDto
{
    public function __construct(
        public string $nombres,
        public string $cedula,
        public ?string $telefono,
        public ?string $direccion,
        public ?string $fechaNacimiento,
    ) {
    }

    /** @param array<string, mixed> $datos Resultado de StorePacienteRequest::validated(). */
    public static function fromValidated(array $datos): self
    {
        return new self(
            nombres: $datos['nombres'],
            cedula: $datos['cedula'],
            telefono: $datos['telefono'] ?? null,
            direccion: $datos['direccion'] ?? null,
            fechaNacimiento: $datos['fecha_nacimiento'] ?? null,
        );
    }

    /** @return array<string, string|null> */
    public function toArray(): array
    {
        return [
            'nombres' => $this->nombres,
            'cedula' => $this->cedula,
            'telefono' => $this->telefono,
            'direccion' => $this->direccion,
            'fecha_nacimiento' => $this->fechaNacimiento,
        ];
    }
}
