<?php

namespace App\PracticaIndividual\RegistroPaciente;

use App\Models\Paciente;

/** Contrato académico de la respuesta 201 de POST /api/pacientes. */
final readonly class RegistroPacienteSalidaDto
{
    public function __construct(
        public string $id,
        public string $codigoPaciente,
        public string $nombres,
        public string $cedula,
        public ?string $telefono,
        public ?string $direccion,
        public ?string $fechaNacimiento,
        public string $createdAt,
        public string $updatedAt,
    ) {
    }

    public static function fromPaciente(Paciente $paciente): self
    {
        // Eloquent aplica los mismos casts de fecha que usa la respuesta real.
        $datos = $paciente->toArray();

        return new self(
            id: $datos['id'],
            codigoPaciente: $datos['codigo_paciente'],
            nombres: $datos['nombres'],
            cedula: $datos['cedula'],
            telefono: $datos['telefono'],
            direccion: $datos['direccion'],
            fechaNacimiento: $datos['fecha_nacimiento'],
            createdAt: $datos['created_at'],
            updatedAt: $datos['updated_at'],
        );
    }

    /** @return array{message: string, data: array<string, string|null>} */
    public function toArray(): array
    {
        return [
            'message' => 'Paciente registrado correctamente.',
            'data' => [
                'id' => $this->id,
                'codigo_paciente' => $this->codigoPaciente,
                'nombres' => $this->nombres,
                'cedula' => $this->cedula,
                'telefono' => $this->telefono,
                'direccion' => $this->direccion,
                'fecha_nacimiento' => $this->fechaNacimiento,
                'created_at' => $this->createdAt,
                'updated_at' => $this->updatedAt,
            ],
        ];
    }
}
