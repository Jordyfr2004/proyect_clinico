<?php

namespace App\Http\Resources\Agenda;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialización del contrato de respuesta "Cita médica".
 *
 * Define de forma explícita qué campos ve el cliente y con qué formato,
 * en lugar de exponer el modelo Eloquent completo. Así web y móvil reciben
 * siempre la misma estructura, con fechas y horas normalizadas.
 *
 * Contrato: docs/contratos/cita-medica/respuesta.schema.json
 * Práctica 2.2 – William Cabrera.
 *
 * @mixin \App\Models\Agenda
 */
class CitaMedicaResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'tipo' => $this->tipo,
            'estado' => $this->estado,
            'paciente_id' => $this->paciente_id,
            'paciente' => $this->paciente ? [
                'codigo_paciente' => $this->paciente->codigo_paciente,
                'nombres' => $this->paciente->nombres,
            ] : null,
            'nombre_reserva' => $this->nombre_reserva,
            'fecha' => $this->fecha?->format('Y-m-d'),
            'hora_inicio' => self::hora($this->hora_inicio),
            'hora_fin' => self::hora($this->hora_fin),
            'descripcion' => $this->descripcion,
            'creado_en' => $this->created_at?->toIso8601String(),
        ];
    }

    /**
     * PostgreSQL devuelve las columnas time como "HH:MM:SS";
     * el contrato expone siempre "HH:MM".
     */
    private static function hora(?string $valor): ?string
    {
        return $valor === null ? null : substr($valor, 0, 5);
    }
}
