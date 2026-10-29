<?php

namespace App\Http\Controllers\Api\Clinica;

use App\Http\Controllers\Controller;
use App\Services\EvidenciaClinicaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EvidenciaClinicaController extends Controller
{
    public function __construct(
        private EvidenciaClinicaService $evidenciaClinicaService
    ) {
    }

    public function index(
        Request $request
    ): JsonResponse {
        $evidencias = $this
            ->evidenciaClinicaService
            ->listar(
                $request->only([
                    'paciente_id',
                    'tipo',
                ])
            );

        return response()->json([
            'data' => $evidencias,
        ]);
    }

    public function porPaciente(
        string $pacienteId
    ): JsonResponse {
        $resultado = $this
            ->evidenciaClinicaService
            ->obtenerPorPaciente($pacienteId);

        if (!$resultado['paciente']) {
            return response()->json([
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        return response()->json([
            'paciente' => [
                'id' => $resultado['paciente']->id,
                'codigo_paciente' =>
                    $resultado['paciente']->codigo_paciente,
                'nombres' =>
                    $resultado['paciente']->nombres,
            ],
            'data' => $resultado['evidencias'],
        ]);
    }

    public function show(
        string $id
    ): JsonResponse {
        $evidencia = $this
            ->evidenciaClinicaService
            ->obtenerPorId($id);

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
            'archivo' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp,pdf',
                'max:10240',
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

        $evidencia = $this
            ->evidenciaClinicaService
            ->crear(
                $datos,
                $request->file('archivo'),
                $request->user()
            );

        return response()->json([
            'message' => 'Evidencia clínica registrada correctamente.',
            'data' => $evidencia,
        ], 201);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
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

        $evidencia = $this
            ->evidenciaClinicaService
            ->actualizar(
                $id,
                $datos,
                $request->user()
            );

        if (!$evidencia) {
            return response()->json([
                'message' => 'Evidencia clínica no encontrada.',
            ], 404);
        }

        return response()->json([
            'message' => 'Evidencia clínica actualizada correctamente.',
            'data' => $evidencia,
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        $eliminada = $this
            ->evidenciaClinicaService
            ->eliminar(
                $id,
                $request->user()
            );

        if (!$eliminada) {
            return response()->json([
                'message' => 'Evidencia clínica no encontrada.',
            ], 404);
        }

        return response()->json([
            'message' => 'Evidencia clínica eliminada correctamente.',
        ]);
    }
    public function storePaciente(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        if (!$user->paciente_id) {
            return response()->json([
                'message' => 'La cuenta no está vinculada a un paciente.',
            ], 409);
        }

        $datos = $request->validate([
            'tipo' => [
                'required',
                'in:caso_clinico,rx',
            ],
            'archivo' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp,pdf',
                'max:10240',
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

        $datos['paciente_id'] = $user->paciente_id;

        $evidencia = $this
            ->evidenciaClinicaService
            ->crear(
                $datos,
                $request->file('archivo'),
                $user
            );

        return response()->json([
            'message' => 'Evidencia clínica registrada correctamente.',
            'data' => $evidencia,
        ], 201);
    }

    public function mis(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        if (!$user->paciente_id) {
            return response()->json([
                'message' => 'La cuenta no está vinculada a un paciente.',
            ], 409);
        }

        $evidencias = $this
            ->evidenciaClinicaService
            ->obtenerPropias($user);

        return response()->json([
            'data' => $evidencias,
        ]);
    }
}