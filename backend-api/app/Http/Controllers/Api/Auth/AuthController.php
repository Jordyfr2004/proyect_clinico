<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterPacienteRequest;
use App\Models\Paciente;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('username', $datos['username'])->first();

        if (!$user || !Hash::check($datos['password'], $user->password)) {
            throw ValidationException::withMessages([
                'username' => [
                    'El usuario o la contraseña son incorrectos.',
                ],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Inicio de sesión correcto.',
            'token_type' => 'Bearer',
            'access_token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'role' => $user->role,
                'paciente_id' => $user->paciente_id,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    public function registerPaciente(
        RegisterPacienteRequest $request
    ): JsonResponse {
        $datos = $request->validated();

        if (User::where('username', $datos['cedula'])->exists()) {
            throw ValidationException::withMessages([
                'cedula' => [
                    'Ya existe una cuenta registrada con esta cédula.',
                ],
            ]);
        }

        $resultado = DB::transaction(function () use ($datos) {
            $paciente = Paciente::where(
                'cedula',
                $datos['cedula']
            )->first();

            if ($paciente) {
                if (
                    User::where(
                        'paciente_id',
                        $paciente->id
                    )->exists()
                ) {
                    throw ValidationException::withMessages([
                        'cedula' => [
                            'Este paciente ya tiene una cuenta vinculada.',
                        ],
                    ]);
                }
            } else {
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
                    'nombres' => $datos['nombres'],
                    'cedula' => $datos['cedula'],
                    'telefono' => $datos['telefono'],
                    'direccion' => $datos['direccion'],
                    'fecha_nacimiento' => $datos['fecha_nacimiento'],
                ]);
            }

            $user = User::create([
                'name' => $paciente->nombres,
                'email' => null,
                'username' => $paciente->cedula,
                'password' => $datos['password'],
                'role' => 'paciente',
                'paciente_id' => $paciente->id,
            ]);

            $token = $user
                ->createToken('auth_token')
                ->plainTextToken;

            return [
                'paciente' => $paciente,
                'user' => $user,
                'token' => $token,
            ];
        });

        return response()->json([
            'message' => 'Cuenta de paciente creada correctamente.',
            'token_type' => 'Bearer',
            'access_token' => $resultado['token'],
            'user' => [
                'id' => $resultado['user']->id,
                'name' => $resultado['user']->name,
                'username' => $resultado['user']->username,
                'role' => $resultado['user']->role,
                'paciente_id' => $resultado['paciente']->id,
                'codigo_paciente' =>
                    $resultado['paciente']->codigo_paciente,
            ],
        ], 201);
    }
}