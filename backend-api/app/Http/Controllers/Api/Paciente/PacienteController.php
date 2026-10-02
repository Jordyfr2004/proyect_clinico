<?php

namespace App\Http\Controllers\Api\Paciente;

use App\Http\Controllers\Controller;
use App\Http\Requests\Paciente\StorePacienteRequest;
use App\Http\Requests\Paciente\UpdatePacienteRequest;
use App\Models\Paciente;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;


class PacienteController extends Controller
{
    public function index(): JsonResponse
    {
        $pacientes = Paciente::orderBy('created_at', 'desc')->get();

        return response()->json([
            'data' => $pacientes,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $paciente = Paciente::findOrFail($id);

        return response()->json([
            'data' => $paciente,
        ]);
    }

    public function store(StorePacienteRequest $request): JsonResponse
    {
        $numero = DB::scalar(
            "SELECT nextval('codigo_paciente_seq')"
        );

        $codigoPaciente = str_pad(
            (string) $numero,
            3,
            '0',
            STR_PAD_LEFT
        );

        $paciente = Paciente::create([
            'codigo_paciente' => $codigoPaciente,
            'nombres' => $request->nombres,
            'cedula' => $request->cedula,
            'telefono' => $request->telefono,
            'direccion' => $request->direccion,
            'fecha_nacimiento' => $request->fecha_nacimiento,
        ]);

        return response()->json([
            'message' => 'Paciente registrado correctamente.',
            'data' => $paciente,
        ], 201);
    }

    public function update(UpdatePacienteRequest $request, string $id): JsonResponse
    {
        $paciente = Paciente::findOrFail($id);
        $paciente->update($request->validated());

        return response()->json([
            'message' => 'Paciente actualizado correctamente.',
            'data' => $paciente->fresh(),
        ]);
    }

    public function miPerfil(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user->paciente_id) {
            return response()->json([
                'message' => 'La cuenta no está vinculada a un paciente.',
            ], 404);
        }

        $paciente = Paciente::find($user->paciente_id);

        if (!$paciente) {
            return response()->json([
                'message' => 'No se encontró el expediente del paciente.',
            ], 404);
        }

        return response()->json([
            'data' => [
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

