<?php

namespace App\Http\Controllers\Api\Paciente;

use App\Http\Controllers\Controller;
use App\Http\Requests\Paciente\StorePacienteRequest;
use App\Models\Paciente;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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
            'nombre' => $request->nombre,
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
}



