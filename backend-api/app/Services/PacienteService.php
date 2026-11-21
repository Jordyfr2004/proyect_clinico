<?php

namespace App\Services;

use App\Models\Paciente;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use App\Models\Agenda;

class PacienteService
{
    public function listar(
        string $buscar = '',
        bool $agenda = false
    )
    {
        $buscar = trim($buscar);

        $patron = '%'
            . str_replace(
                ['!', '%', '_'],
                ['!!', '!%', '!_'],
                mb_strtolower($buscar)
            )
            . '%';

        if (!$agenda) {
            return Paciente::query()
                ->with('usuario:id,paciente_id,foto_perfil_ruta')
                ->when(
                    $buscar !== '',
                    function ($query) use ($patron) {
                        $query->where(
                            function ($query) use ($patron) {
                                $query
                                    ->whereRaw(
                                        "LOWER(nombres) LIKE ? ESCAPE '!'",
                                        [$patron]
                                    )
                                    ->orWhereRaw(
                                        "LOWER(cedula) LIKE ? ESCAPE '!'",
                                        [$patron]
                                    )
                                    ->orWhereRaw(
                                        "LOWER(codigo_paciente) LIKE ? ESCAPE '!'",
                                        [$patron]
                                    );
                            }
                        );
                    }
                )
                ->orderBy('created_at', 'desc')
                ->orderBy('id', 'desc')
                ->paginate(20)
                ->through(
                    fn (Paciente $paciente) =>
                        $paciente->append('foto_perfil_url')
                )
                ->appends(
                    $buscar !== ''
                        ? ['buscar' => $buscar]
                        : []
                );
        }

        $pacientes = Paciente::query()
            ->when(
                $buscar !== '',
                function ($query) use ($patron) {
                    $query->where(
                        function ($query) use ($patron) {
                            $query
                                ->whereRaw(
                                    "LOWER(nombres) LIKE ? ESCAPE '!'",
                                    [$patron]
                                )
                                ->orWhereRaw(
                                    "LOWER(cedula) LIKE ? ESCAPE '!'",
                                    [$patron]
                                )
                                ->orWhereRaw(
                                    "LOWER(codigo_paciente) LIKE ? ESCAPE '!'",
                                    [$patron]
                                );
                        }
                    );
                }
            )
            ->orderBy('nombres')
            ->limit(20)
            ->get([
                'id',
                'codigo_paciente',
                'nombres',
                'cedula',
            ])
            ->map(function (Paciente $paciente) {
                return [
                    'id' => $paciente->id,
                    'codigo_paciente' => $paciente->codigo_paciente,
                    'cedula' => $paciente->cedula,
                    'nombres' => $paciente->nombres,
                    'registrado' => true,
                ];
            });

        $reservas = Agenda::query()
            ->whereNotNull('nombre_reserva')
            ->where('nombre_reserva', '!=', '')
            ->when(
                $buscar !== '',
                function ($query) use ($patron) {
                    $query->whereRaw(
                        "LOWER(nombre_reserva) LIKE ? ESCAPE '!'",
                        [$patron]
                    );
                }
            )
            ->select('nombre_reserva')
            ->distinct()
            ->orderBy('nombre_reserva')
            ->limit(20)
            ->get()
            ->map(function (Agenda $agenda) {
                return [
                    'id' => null,
                    'codigo_paciente' => null,
                    'cedula' => null,
                    'nombre_reserva' => $agenda->nombre_reserva,
                    'registrado' => false,
                ];
            });

        $nombresPacientes = $pacientes
            ->pluck('nombres')
            ->map(
                fn ($nombre) =>
                    mb_strtolower(trim($nombre))
            );

        $reservas = $reservas
            ->reject(function ($reserva) use ($nombresPacientes) {
                return $nombresPacientes->contains(
                    mb_strtolower(
                        trim($reserva['nombre_reserva'])
                    )
                );
            });

        return [
            'data' => $pacientes
                ->concat($reservas)
                ->values(),
        ];
    }

    public function obtenerPorId(string $id): Paciente
    {
        return Paciente::with('usuario:id,paciente_id,foto_perfil_ruta')
            ->findOrFail($id)->append('foto_perfil_url');
    }

    public function crear(
        array $datos,
        User $user
    ): Paciente {
        return DB::transaction(function () use ($datos, $user) {
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
                'telefono' => $datos['telefono'] ?? null,
                'direccion' => $datos['direccion'] ?? null,
                'fecha_nacimiento' => $datos['fecha_nacimiento'] ?? null,
            ]);

            $detalle = $user->role === 'doctora'
                ? "Registraste al paciente {$paciente->codigo_paciente}."
                : "Asistente registró al paciente {$paciente->codigo_paciente}.";

            AuditoriaService::registrarAccion(
                $user,
                'pacientes',
                'crear',
                $detalle
            );

            return $paciente;
        });
    }

    public function actualizar(
        string $id,
        array $datos,
        User $user
    ): Paciente {
        return DB::transaction(function () use ($id, $datos, $user) {
            $paciente = Paciente::findOrFail($id);

            $paciente->update($datos);

            $paciente = $paciente->fresh();

            $detalle = $user->role === 'doctora'
                ? "Actualizaste los datos del paciente {$paciente->codigo_paciente}."
                : "Asistente actualizó los datos del paciente {$paciente->codigo_paciente}.";

            AuditoriaService::registrarAccion(
                $user,
                'pacientes',
                'actualizar',
                $detalle
            );

            return $paciente;
        });
    }

    public function obtenerPerfil(User $user): ?Paciente
    {
        if (!$user->paciente_id) {
            return null;
        }

        return Paciente::find($user->paciente_id);
    }
}
