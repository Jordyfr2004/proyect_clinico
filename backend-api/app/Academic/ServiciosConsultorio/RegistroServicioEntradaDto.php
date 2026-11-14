<?php

namespace App\Academic\ServiciosConsultorio;

final readonly class RegistroServicioEntradaDto
{
    public function __construct(
        public string $categoriaId,
        public string $nombre,
        public string $descripcion,
        public ?string $imagen,
        public int|float|null $precio,
        public ?int $duracionMinutos,
    ) {
    }

    public static function fromJson(string $json): self
    {
        $datos = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

        return new self(
            categoriaId: $datos['categoria_id'],
            nombre: $datos['nombre'],
            descripcion: $datos['descripcion'],
            imagen: $datos['imagen'] ?? null,
            precio: $datos['precio'] ?? null,
            duracionMinutos: $datos['duracion_minutos'] ?? null,
        );
    }

    public function toArray(): array
    {
        return [
            'categoria_id' => $this->categoriaId,
            'nombre' => $this->nombre,
            'descripcion' => $this->descripcion,
            'imagen' => $this->imagen,
            'precio' => $this->precio,
            'duracion_minutos' => $this->duracionMinutos,
        ];
    }
}
