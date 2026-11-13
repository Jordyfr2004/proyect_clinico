<?php

namespace App\Services;

use App\Models\Paciente;
use App\Models\PlantillaReceta;
use App\Models\Receta;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class RecetaService
{
    public function listar(array $filtros)
    {
        return Receta::query()
            ->with(['paciente', 'emitidaPor'])
            ->when(
                $filtros['paciente_id'] ?? null,
                fn ($query, $pacienteId) => $query->where('paciente_id', $pacienteId)
            )
            ->orderBy('fecha', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function obtenerPorId(
        string $id
    ): ?Receta {
        return Receta::with(['paciente', 'emitidaPor'])
            ->find($id);
    }

    public function crear(
        array $datos,
        User $user
    ): Receta {
        return DB::transaction(function () use ($datos, $user) {
            $receta = Receta::create([
                'paciente_id' => $datos['paciente_id'],
                'agenda_id' => $datos['agenda_id'] ?? null,
                'emitida_por_id' => $user->id,
                'fecha' => $datos['fecha'] ?? now()->toDateString(),
                'diagnostico' => $datos['diagnostico'] ?? null,
                'medicamentos' => $datos['medicamentos'],
                'indicaciones' => $datos['indicaciones'] ?? null,
            ]);

            $paciente = Paciente::findOrFail($receta->paciente_id);

            AuditoriaService::registrarAccion(
                $user,
                'recetas',
                'crear',
                "Emitiste una receta para el paciente {$paciente->codigo_paciente}."
            );

            return $receta->load(['paciente', 'emitidaPor']);
        });
    }

    public function actualizar(
        string $id,
        array $datos,
        User $user
    ): ?Receta {
        return DB::transaction(function () use ($id, $datos, $user) {
            $receta = Receta::find($id);

            if (!$receta) {
                return null;
            }

            $receta->update($datos);

            $paciente = Paciente::findOrFail($receta->paciente_id);

            AuditoriaService::registrarAccion(
                $user,
                'recetas',
                'actualizar',
                "Actualizaste una receta del paciente {$paciente->codigo_paciente}."
            );

            return $receta->fresh(['paciente', 'emitidaPor']);
        });
    }

    public function eliminar(
        string $id,
        User $user
    ): bool {
        return DB::transaction(function () use ($id, $user) {
            $receta = Receta::find($id);

            if (!$receta) {
                return false;
            }

            $paciente = Paciente::findOrFail($receta->paciente_id);

            $receta->delete();

            AuditoriaService::registrarAccion(
                $user,
                'recetas',
                'eliminar',
                "Eliminaste una receta del paciente {$paciente->codigo_paciente}."
            );

            return true;
        });
    }

    public function listarDelPaciente(
        User $user
    ) {
        return Receta::where('paciente_id', $user->paciente_id)
            ->with('emitidaPor')
            ->orderBy('fecha', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();
    }

    public function obtenerDelPaciente(
        string $id,
        User $user
    ): ?Receta {
        return Receta::where('id', $id)
            ->where('paciente_id', $user->paciente_id)
            ->with(['paciente', 'emitidaPor'])
            ->first();
    }

    public function listarPlantillas(
        bool $soloActivas = false
    ) {
        return PlantillaReceta::query()
            ->when($soloActivas, fn ($query) => $query->where('activo', true))
            ->orderBy('nombre')
            ->get();
    }

    public function crearPlantilla(
        array $datos,
        User $user
    ): PlantillaReceta {
        return DB::transaction(function () use ($datos, $user) {
            $plantilla = PlantillaReceta::create($datos);

            AuditoriaService::registrarAccion(
                $user,
                'recetas',
                'crear_plantilla',
                "Creaste la plantilla de receta {$plantilla->nombre}."
            );

            return $plantilla;
        });
    }

    public function actualizarPlantilla(
        string $id,
        array $datos,
        User $user
    ): ?PlantillaReceta {
        return DB::transaction(function () use ($id, $datos, $user) {
            $plantilla = PlantillaReceta::find($id);

            if (!$plantilla) {
                return null;
            }

            $plantilla->update($datos);

            AuditoriaService::registrarAccion(
                $user,
                'recetas',
                'actualizar_plantilla',
                "Actualizaste la plantilla de receta {$plantilla->nombre}."
            );

            return $plantilla->fresh();
        });
    }

    public function eliminarPlantilla(
        string $id,
        User $user
    ): bool {
        return DB::transaction(function () use ($id, $user) {
            $plantilla = PlantillaReceta::find($id);

            if (!$plantilla) {
                return false;
            }

            $nombre = $plantilla->nombre;

            $plantilla->delete();

            AuditoriaService::registrarAccion(
                $user,
                'recetas',
                'eliminar_plantilla',
                "Eliminaste la plantilla de receta {$nombre}."
            );

            return true;
        });
    }
}
