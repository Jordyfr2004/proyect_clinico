<?php

namespace App\Http\Controllers\Api\Paciente;

use App\Http\Controllers\Controller;
use App\Http\Requests\Paciente\StorePacienteRequest;
use App\Http\Requests\Paciente\UpdatePacienteRequest;
use App\Services\PacienteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PacienteController extends Controller
{
    public function __construct(
        private PacienteService $pacienteService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'buscar' => ['nullable', 'string', 'max:255'],
        ]);
        $pacientes = $this->pacienteService->listar($datos['buscar'] ?? '');

        return response()->json($pacientes);
    }

    public function show(string $id): JsonResponse
    {
        $paciente = $this->pacienteService->obtenerPorId($id);

        return response()->json([
            'data' => $paciente,
        ]);
    }

    public function store(
        StorePacienteRequest $request
    ): JsonResponse {
        $paciente = $this->pacienteService->crear(
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'Paciente registrado correctamente.',
            'data' => $paciente,
        ], 201);
    }

    public function update(
        UpdatePacienteRequest $request,
        string $id
    ): JsonResponse {
        $paciente = $this->pacienteService->actualizar(
            $id,
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'Paciente actualizado correctamente.',
            'data' => $paciente,
        ]);
    }

    public function miPerfil(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        if (!$user->paciente_id) {
            return response()->json([
                'message' => 'La cuenta no está vinculada a un paciente.',
            ], 404);
        }

        $paciente = $this->pacienteService->obtenerPerfil(
            $user
        );

        if (!$paciente) {
            return response()->json([
                'message' => 'No se encontró el expediente del paciente.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'foto_perfil_url' => $user->foto_perfil_url,
                'codigo_paciente' => $paciente->codigo_paciente,
                'nombres' => $paciente->nombres,
                'cedula' => $paciente->cedula,
                'telefono' => $paciente->telefono,
                'direccion' => $paciente->direccion,
                'fecha_nacimiento' => $paciente->fecha_nacimiento,
            ],
        ]);
    }
}
