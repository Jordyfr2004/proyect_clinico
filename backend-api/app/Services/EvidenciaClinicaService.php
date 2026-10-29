<?php

namespace App\Services;

use App\Models\EvidenciaClinica;
use App\Models\Paciente;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EvidenciaClinicaService
{
    public function listar(array $filtros)
    {
        $query = EvidenciaClinica::query()
            ->with('paciente')
            ->orderBy('fecha', 'desc');

        if (!empty($filtros['paciente_id'])) {
            $query->where(
                'paciente_id',
                $filtros['paciente_id']
            );
        }

        if (!empty($filtros['tipo'])) {
            $query->where(
                'tipo',
                $filtros['tipo']
            );
        }

        return $query->get();
    }

    public function obtenerPorPaciente(
        string $pacienteId
    ): array {
        $paciente = Paciente::find($pacienteId);

        if (!$paciente) {
            return [
                'paciente' => null,
                'evidencias' => [],
            ];
        }

        $evidencias = EvidenciaClinica::where(
            'paciente_id',
            $pacienteId
        )
            ->orderBy('fecha', 'desc')
            ->get();

        return [
            'paciente' => $paciente,
            'evidencias' => $evidencias,
        ];
    }

    public function obtenerPorId(
        string $id
    ): ?EvidenciaClinica {
        return EvidenciaClinica::with('paciente')
            ->find($id);
    }

    public function crear(
        array $datos,
        UploadedFile $archivo,
        User $user
    ): EvidenciaClinica {
        $paciente = Paciente::findOrFail(
            $datos['paciente_id']
        );

        $carpetaTipo = $datos['tipo'] === 'rx'
            ? 'rx'
            : 'casos_clinicos';

        $extension = $archivo->extension();

        $nombreArchivo = Str::uuid().'.'.$extension;

        $directorio =
            "clinica/pacientes/{$paciente->id}/evidencias/{$carpetaTipo}";

        $rutaArchivo =
            "{$directorio}/{$nombreArchivo}";

        Storage::disk('ftp')->put(
            $rutaArchivo,
            fopen($archivo->getRealPath(), 'r')
        );

        try {
            return DB::transaction(function () use (
                $datos,
                $archivo,
                $user,
                $paciente,
                $nombreArchivo,
                $rutaArchivo
            ) {
                $evidencia = EvidenciaClinica::create([
                    'paciente_id' => $paciente->id,
                    'tipo' => $datos['tipo'],
                    'nombre_archivo' => $nombreArchivo,
                    'ruta_archivo' => $rutaArchivo,
                    'mime_type' => $archivo->getMimeType(),
                    'tamano' => $archivo->getSize(),
                    'descripcion' => $datos['descripcion'] ?? null,
                    'fecha' => $datos['fecha'],
                ]);

                /*
                 * Solo registramos la acción cuando
                 * quien sube la evidencia es la doctora.
                 */
                if ($user->role === 'doctora') {
                    $tipoTexto = $evidencia->tipo === 'rx'
                        ? 'una radiografía'
                        : 'un caso clínico';

                    AuditoriaService::registrarAccion(
                        $user,
                        'evidencias_clinicas',
                        'crear',
                        "Registraste {$tipoTexto} para el paciente {$paciente->codigo_paciente}."
                    );
                }

                return $evidencia->fresh();
            });
        } catch (\Throwable $e) {
            /*
             * Si PostgreSQL falla después de subir
             * el archivo al FTP, eliminamos el archivo.
             */
            if (
                Storage::disk('ftp')->exists(
                    $rutaArchivo
                )
            ) {
                Storage::disk('ftp')->delete(
                    $rutaArchivo
                );
            }

            throw $e;
        }
    }

    public function actualizar(
        string $id,
        array $datos,
        User $user
    ): ?EvidenciaClinica {
        return DB::transaction(function () use (
            $id,
            $datos,
            $user
        ) {
            $evidencia = EvidenciaClinica::find($id);

            if (!$evidencia) {
                return null;
            }

            $evidencia->update($datos);

            $paciente = Paciente::findOrFail(
                $evidencia->paciente_id
            );

            if ($user->role === 'doctora') {
                $tipoTexto = $evidencia->tipo === 'rx'
                    ? 'una radiografía'
                    : 'un caso clínico';

                AuditoriaService::registrarAccion(
                    $user,
                    'evidencias_clinicas',
                    'actualizar',
                    "Actualizaste {$tipoTexto} del paciente {$paciente->codigo_paciente}."
                );
            }

            return $evidencia->fresh();
        });
    }

    public function eliminar(
        string $id,
        User $user
    ): bool {
        $evidencia = EvidenciaClinica::find($id);

        if (!$evidencia) {
            return false;
        }

        $rutaArchivo = $evidencia->ruta_archivo;

        DB::transaction(function () use (
            $evidencia,
            $user
        ) {
            $paciente = Paciente::findOrFail(
                $evidencia->paciente_id
            );

            $tipoTexto = $evidencia->tipo === 'rx'
                ? 'una radiografía'
                : 'un caso clínico';

            $codigoPaciente = $paciente->codigo_paciente;

            $evidencia->delete();

            if ($user->role === 'doctora') {
                AuditoriaService::registrarAccion(
                    $user,
                    'evidencias_clinicas',
                    'eliminar',
                    "Eliminaste {$tipoTexto} del paciente {$codigoPaciente}."
                );
            }
        });

        /*
         * Después de eliminar el registro correctamente,
         * eliminamos el archivo físico del FTP.
         */
        if ($rutaArchivo) {
            try {
                if (
                    Storage::disk('ftp')->exists(
                        $rutaArchivo
                    )
                ) {
                    Storage::disk('ftp')->delete(
                        $rutaArchivo
                    );
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return true;
    }
    public function obtenerPropias(
        User $user
    )
    {
        if (!$user->paciente_id) {
            return collect();
        }

        return EvidenciaClinica::where(
            'paciente_id',
            $user->paciente_id
        )
            ->orderBy('fecha', 'desc')
            ->get();
    }

    public function obtenerArchivo(
        EvidenciaClinica $evidencia
    ): string {
        return Storage::disk('ftp')->get(
            $evidencia->ruta_archivo
        );
    }
    
    public function obtenerPropiaPorId(
        string $id,
        User $user
    ): ?EvidenciaClinica {
        if (!$user->paciente_id) {
            return null;
        }

        return EvidenciaClinica::where(
            'id',
            $id
        )
            ->where(
                'paciente_id',
                $user->paciente_id
            )
            ->first();
    }
}
