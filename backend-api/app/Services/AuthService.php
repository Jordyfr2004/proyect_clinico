<?php

namespace App\Services;

use App\Models\Paciente;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function login(
        string $username,
        string $password
    ): array {
        return DB::transaction(function () use ($username, $password) {
            $user = User::where(
                'username',
                $username
            )->first();

            if (
                !$user ||
                !Hash::check($password, $user->password)
            ) {
                throw ValidationException::withMessages([
                    'username' => [
                        'El usuario o la contraseña son incorrectos.',
                    ],
                ]);
            }

            if (!$user->activo) {
                throw ValidationException::withMessages([
                    'username' => [
                        'Esta cuenta se encuentra desactivada.',
                    ],
                ]);
            }

            if (!$user->email_verified_at) {
                throw ValidationException::withMessages([
                    'username' => [
                        'Debes verificar tu correo antes de iniciar sesión.',
                    ],
                    'requires_verification' => [
                        true,
                    ],
                    'email' => [
                        $user->email,
                    ],
                ]);
            }

            $token = $user
                ->createToken('auth_token')
                ->plainTextToken;

            if (
                in_array(
                    $user->role,
                    ['doctora', 'asistente']
                )
            ) {
                AuditoriaService::registrarSesion(
                    $user,
                    'inicio_sesion'
                );
            }

            return [
                'user' => $user,
                'token' => $token,
            ];
        });
    }

    public function logout(User $user): void
    {
        DB::transaction(function () use ($user) {
            if (
                in_array(
                    $user->role,
                    ['doctora', 'asistente']
                )
            ) {
                AuditoriaService::registrarSesion(
                    $user,
                    'cierre_sesion'
                );
            }

            $user->currentAccessToken()->delete();
        });
    }

    public function registrarPaciente(
        array $datos
    ): array {
        if (
            User::where(
                'username',
                $datos['cedula']
            )->exists()
        ) {
            throw ValidationException::withMessages([
                'cedula' => [
                    'Ya existe una cuenta registrada con esta cédula.',
                ],
            ]);
        }

        return DB::transaction(
            function () use ($datos) {
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
                        'codigo_paciente' =>
                            $codigoPaciente,
                        'nombres' =>
                            $datos['nombres'],
                        'cedula' =>
                            $datos['cedula'],
                        'telefono' =>
                            $datos['telefono'],
                        'direccion' =>
                            $datos['direccion'],
                        'fecha_nacimiento' =>
                            $datos['fecha_nacimiento'],
                    ]);
                }

                $user = User::create([
                    'name' => $paciente->nombres,
                    'email' => $datos['email'],
                    'username' => $paciente->cedula,
                    'password' => $datos['password'],
                    'role' => 'paciente',
                    'paciente_id' => $paciente->id,
                    'activo' => true,
                    'email_verified_at' => null,
                ]);

                return [
                    'paciente' => $paciente,
                    'user' => $user,
                ];
            }
        );
    }
}
