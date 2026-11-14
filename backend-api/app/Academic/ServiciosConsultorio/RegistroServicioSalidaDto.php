<?php

namespace App\Academic\ServiciosConsultorio;

final readonly class RegistroServicioSalidaDto
{
    public function __construct(
        public string $message,
        public string $categoriaId,
        public string $nombre,
        public string $descripcion,
        public ?string $imagen,
        public ?string $precio,
        public ?int $duracionMinutos,
        public bool $activo,
        public string $id,
        public string $createdAt,
        public string $updatedAt,
        public array $categoria,
    ) {
    }

    public static function fromJson(string $json): self
    {
        $respuesta = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        $datos = $respuesta['data'];

        return new self(
            message: $respuesta['message'],
            categoriaId: $datos['categoria_id'],
            nombre: $datos['nombre'],
            descripcion: $datos['descripcion'],
            imagen: $datos['imagen'],
            precio: $datos['precio'],
            duracionMinutos: $datos['duracion_minutos'],
            activo: $datos['activo'],
            id: $datos['id'],
            createdAt: $datos['created_at'],
            updatedAt: $datos['updated_at'],
            categoria: $datos['categoria'],
        );
    }

    public function toArray(): array
    {
        return [
            'message' => $this->message,
            'data' => [
                'categoria_id' => $this->categoriaId,
                'nombre' => $this->nombre,
                'descripcion' => $this->descripcion,
                'imagen' => $this->imagen,
                'precio' => $this->precio,
                'duracion_minutos' => $this->duracionMinutos,
                'activo' => $this->activo,
                'id' => $this->id,
                'updated_at' => $this->updatedAt,
                'created_at' => $this->createdAt,
                'categoria' => $this->categoria,
            ],
        ];
    }
}
