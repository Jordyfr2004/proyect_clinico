<?php

namespace App\Http\Controllers\Api\Clinica;

use App\Http\Controllers\Controller;
use App\Models\EvidenciaClinica;
use App\Models\Paciente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EvidenciaClinicaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = EvidenciaClinica::query()
            ->with('paciente')
            ->orderBy('fecha', 'desc');

        if ($request->filled('paciente_id')) {
            $query->where(
                'paciente_id',
                $request->paciente_id
            );
        }

        if ($request->filled('tipo')) {
            $query->where(
                'tipo',
                $request->tipo
            );
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function porPaciente(
        string $pacienteId
    ): JsonResponse {
        $paciente = Paciente::find($pacienteId);

        if (!$paciente) {
            return response()->json([
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        $evidencias = EvidenciaClinica::where(
            'paciente_id',
            $pacienteId
        )
            ->orderBy('fecha', 'desc')
            ->get();

        return response()->json([
            'paciente' => [
                'id' => $paciente->id,
                'codigo_paciente' => $paciente->codigo_paciente,
                'nombres' => $paciente->nombres,
            ],
            'data' => $evidencias,
        ]);
    }

    public function show(
        string $id
    ): JsonResponse {
        $evidencia = EvidenciaClinica::with('paciente')
            ->find($id);

        if (!$evidencia) {
            return response()->json([
                'message' => 'Evidencia clínica no encontrada.',
            ], 404);
        }

        return response()->json([
            'data' => $evidencia,
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'paciente_id' => [
                'required',
                'uuid',
                'exists:pacientes,id',
            ],
            'tipo' => [
                'required',
                'in:caso_clinico,rx',
            ],
            'nombre_archivo' => [
                'required',
                'string',
                'max:255',
            ],
            'ruta_archivo' => [
                'required',
                'string',
                'max:2048',
            ],
            'mime_type' => [
                'required',
                'string',
                'max:100',
            ],
            'tamano' => [
                'required',
                'integer',
                'min:0',
            ],
            'descripcion' => [
                'nullable',
                'string',
            ],
            'fecha' => [
                'required',
                'date',
            ],
        ]);

        $evidencia = EvidenciaClinica::create([
            'paciente_id' => $datos['paciente_id'],
            'tipo' => $datos['tipo'],
            'nombre_archivo' => $datos['nombre_archivo'],
            'ruta_archivo' => $datos['ruta_archivo'],
            'mime_type' => $datos['mime_type'],
            'tamano' => $datos['tamano'],
            'descripcion' => $datos['descripcion'] ?? null,
            'fecha' => $datos['fecha'],
        ]);

        return response()->json([
            'message' => 'Evidencia clínica registrada correctamente.',
            'data' => $evidencia,
        ], 201);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
        $evidencia = EvidenciaClinica::find($id);

        if (!$evidencia) {
            return response()->json([
                'message' => 'Evidencia clínica no encontrada.',
            ], 404);
        }

        $datos = $request->validate([
            'tipo' => [
                'sometimes',
                'required',
                'in:caso_clinico,rx',
            ],
            'descripcion' => [
                'sometimes',
                'nullable',
                'string',
            ],
            'fecha' => [
                'sometimes',
                'required',
                'date',
            ],
        ]);

        $evidencia->update($datos);

        return response()->json([
            'message' => 'Evidencia clínica actualizada correctamente.',
            'data' => $evidencia,
        ]);
    }

    public function destroy(
        string $id
    ): JsonResponse {
        $evidencia = EvidenciaClinica::find($id);

        if (!$evidencia) {
            return response()->json([
                'message' => 'Evidencia clínica no encontrada.',
            ], 404);
        }

        $evidencia->delete();

        return response()->json([
            'message' => 'Evidencia clínica eliminada correctamente.',
        ]);
    }
}