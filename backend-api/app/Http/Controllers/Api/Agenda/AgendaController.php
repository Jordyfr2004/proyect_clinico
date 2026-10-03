<?php

namespace App\Http\Controllers\Api\Agenda;

use App\Http\Controllers\Controller;
use App\Models\Agenda;
use App\Models\Paciente;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgendaController extends Controller
{
    private function horarioOcupado(
        string $fecha,
        string $horaInicio,
        string $horaFin,
        ?string $excluirId = null
    ): bool {
        return Agenda::whereDate('fecha', $fecha)
            ->whereTime(
                'hora_inicio',
                '<',
                substr($horaFin, 0, 5) . ':00'
            )
            ->whereTime(
                'hora_fin',
                '>',
                substr($horaInicio, 0, 5) . ':00'
            )
            ->where(function ($query) {
                $query->where('tipo', 'personal')
                    ->orWhere(function ($q) {
                        $q->where('tipo', 'cita_medica')
                            ->whereIn(
                                'estado',
                                ['programada', 'completada']
                            );
                    });
            })
            ->when(
                $excluirId,
                function ($query) use ($excluirId) {
                    $query->where(
                        'id',
                        '!=',
                        $excluirId
                    );
                }
            )
            ->exists();
    }

    public function index(Request $request): JsonResponse
    {
        $query = Agenda::query()
            ->with('paciente')
            ->orderBy('fecha')
            ->orderBy('hora_inicio');

        if ($request->filled('fecha')) {
            $query->whereDate(
                'fecha',
                $request->fecha
            );
        }

        if (
            $request->filled('mes') &&
            $request->filled('anio')
        ) {
            $query->whereMonth(
                'fecha',
                $request->mes
            )
                ->whereYear(
                    'fecha',
                    $request->anio
                );
        }

        if ($request->filled('tipo')) {
            $query->where(
                'tipo',
                $request->tipo
            );
        }

        if ($request->filled('estado')) {
            $query->where(
                'estado',
                $request->estado
            );
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $registro = Agenda::with('paciente')
            ->find($id);

        if (!$registro) {
            return response()->json([
                'message' => 'Registro de agenda no encontrado.',
            ], 404);
        }

        return response()->json([
            'data' => $registro,
        ]);
    }

    public function crearPersonal(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'fecha' => [
                'required',
                'date',
            ],
            'hora_inicio' => [
                'required',
                'date_format:H:i',
            ],
            'hora_fin' => [
                'required',
                'date_format:H:i',
                'after:hora_inicio',
            ],
            'descripcion' => [
                'required',
                'string',
            ],
        ]);

        if (
            $this->horarioOcupado(
                $datos['fecha'],
                $datos['hora_inicio'],
                $datos['hora_fin']
            )
        ) {
            return response()->json([
                'message' => 'Ese horario ya se encuentra ocupado.',
            ], 409);
        }

        $registro = Agenda::create([
            'paciente_id' => null,
            'fecha' => $datos['fecha'],
            'hora_inicio' => $datos['hora_inicio'],
            'hora_fin' => $datos['hora_fin'],
            'tipo' => 'personal',
            'descripcion' => $datos['descripcion'],
            'estado' => null,
        ]);

        AuditoriaService::registrarAccion(
            $request->user(),
            'agenda',
            'crear',
            'Registraste una actividad personal en la agenda.'
        );

        return response()->json([
            'message' => 'Actividad personal registrada correctamente.',
            'data' => $registro,
        ], 201);
    }

    public function crearCitaMedica(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'codigo_paciente' => [
                'required',
                'string',
                'exists:pacientes,codigo_paciente',
            ],
            'fecha' => [
                'required',
                'date',
            ],
            'hora_inicio' => [
                'required',
                'date_format:H:i',
            ],
            'hora_fin' => [
                'required',
                'date_format:H:i',
                'after:hora_inicio',
            ],
            'descripcion' => [
                'nullable',
                'string',
            ],
        ]);

        $paciente = Paciente::where(
            'codigo_paciente',
            $datos['codigo_paciente']
        )->firstOrFail();

        if (
            $this->horarioOcupado(
                $datos['fecha'],
                $datos['hora_inicio'],
                $datos['hora_fin']
            )
        ) {
            return response()->json([
                'message' => 'Ese horario ya se encuentra ocupado.',
            ], 409);
        }

        $registro = Agenda::create([
            'paciente_id' => $paciente->id,
            'fecha' => $datos['fecha'],
            'hora_inicio' => $datos['hora_inicio'],
            'hora_fin' => $datos['hora_fin'],
            'tipo' => 'cita_medica',
            'descripcion' => $datos['descripcion'] ?? null,
            'estado' => 'programada',
        ]);

        AuditoriaService::registrarAccion(
            $request->user(),
            'agenda',
            'crear_cita',
            "Programaste una cita médica para el paciente {$paciente->codigo_paciente}."
        );

        return response()->json([
            'message' => 'Cita médica registrada correctamente.',
            'data' => $registro->load('paciente'),
        ], 201);
    }

    public function solicitarCita(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        if (!$user->paciente_id) {
            return response()->json([
                'message' => 'El usuario no está vinculado a un paciente.',
            ], 422);
        }

        $pendiente = Agenda::where(
            'paciente_id',
            $user->paciente_id
        )
            ->where(
                'tipo',
                'cita_medica'
            )
            ->where(
                'estado',
                'pendiente'
            )
            ->exists();

        if ($pendiente) {
            return response()->json([
                'message' => 'Ya tienes una solicitud de cita pendiente.',
            ], 409);
        }

        $registro = Agenda::create([
            'paciente_id' => $user->paciente_id,
            'fecha' => null,
            'hora_inicio' => null,
            'hora_fin' => null,
            'tipo' => 'cita_medica',
            'descripcion' => null,
            'estado' => 'pendiente',
        ]);

        return response()->json([
            'message' => 'Solicitud de cita enviada correctamente.',
            'data' => $registro,
        ], 201);
    }

    public function programarSolicitud(
        Request $request,
        string $id
    ): JsonResponse {
        $registro = Agenda::find($id);

        if (!$registro) {
            return response()->json([
                'message' => 'Solicitud no encontrada.',
            ], 404);
        }

        if (
            $registro->tipo !== 'cita_medica' ||
            $registro->estado !== 'pendiente'
        ) {
            return response()->json([
                'message' => 'El registro no corresponde a una solicitud pendiente.',
            ], 409);
        }

        $datos = $request->validate([
            'fecha' => [
                'required',
                'date',
            ],
            'hora_inicio' => [
                'required',
                'date_format:H:i',
            ],
            'hora_fin' => [
                'required',
                'date_format:H:i',
                'after:hora_inicio',
            ],
        ]);

        if (
            $this->horarioOcupado(
                $datos['fecha'],
                $datos['hora_inicio'],
                $datos['hora_fin']
            )
        ) {
            return response()->json([
                'message' => 'Ese horario ya se encuentra ocupado.',
            ], 409);
        }

        $registro->update([
            'fecha' => $datos['fecha'],
            'hora_inicio' => $datos['hora_inicio'],
            'hora_fin' => $datos['hora_fin'],
            'estado' => 'programada',
        ]);

        $registro->load('paciente');

        AuditoriaService::registrarAccion(
            $request->user(),
            'agenda',
            'programar_cita',
            "Programaste una solicitud de cita del paciente {$registro->paciente->codigo_paciente}."
        );

        return response()->json([
            'message' => 'Solicitud programada correctamente.',
            'data' => $registro,
        ]);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
        $registro = Agenda::find($id);

        if (!$registro) {
            return response()->json([
                'message' => 'Registro de agenda no encontrado.',
            ], 404);
        }

        $datos = $request->validate([
            'fecha' => [
                'sometimes',
                'required',
                'date',
            ],
            'hora_inicio' => [
                'sometimes',
                'required',
                'date_format:H:i',
            ],
            'hora_fin' => [
                'sometimes',
                'required',
                'date_format:H:i',
            ],
            'descripcion' => [
                'sometimes',
                'nullable',
                'string',
            ],
        ]);

        $cambiaHorario =
            array_key_exists('fecha', $datos) ||
            array_key_exists('hora_inicio', $datos) ||
            array_key_exists('hora_fin', $datos);

        if (
            $cambiaHorario &&
            $registro->estado === 'pendiente'
        ) {
            return response()->json([
                'message' => 'Programa la solicitud pendiente desde su ruta específica.',
            ], 409);
        }

        $fecha = $datos['fecha']
            ?? $registro->fecha?->toDateString();

        $horaInicio = $datos['hora_inicio']
            ?? $registro->hora_inicio;

        $horaFin = $datos['hora_fin']
            ?? $registro->hora_fin;

        if (
            $cambiaHorario &&
            (!$fecha || !$horaInicio || !$horaFin)
        ) {
            return response()->json([
                'message' => 'La fecha y ambas horas son obligatorias para editar el horario.',
            ], 422);
        }

        if (
            $cambiaHorario &&
            substr($horaFin, 0, 5)
                <= substr($horaInicio, 0, 5)
        ) {
            return response()->json([
                'message' => 'La hora final debe ser posterior a la hora de inicio.',
            ], 422);
        }

        if (
            $cambiaHorario &&
            $registro->estado !== 'cancelada' &&
            $this->horarioOcupado(
                $fecha,
                $horaInicio,
                $horaFin,
                $registro->id
            )
        ) {
            return response()->json([
                'message' => 'Ese horario ya se encuentra ocupado.',
            ], 409);
        }

        $registro->update($datos);

        $registro->load('paciente');

        if ($registro->tipo === 'personal') {
            $detalle = 'Actualizaste una actividad personal de la agenda.';
        } else {
            $detalle = "Actualizaste una cita médica del paciente {$registro->paciente->codigo_paciente}.";
        }

        AuditoriaService::registrarAccion(
            $request->user(),
            'agenda',
            'actualizar',
            $detalle
        );

        return response()->json([
            'message' => 'Registro actualizado correctamente.',
            'data' => $registro,
        ]);
    }

    public function registrarDatosClinicos(
        Request $request,
        string $id
    ): JsonResponse {
        $registro = Agenda::find($id);

        if (!$registro) {
            return response()->json([
                'message' => 'Cita no encontrada.',
            ], 404);
        }

        if ($registro->tipo !== 'cita_medica') {
            return response()->json([
                'message' => 'El registro no corresponde a una cita médica.',
            ], 409);
        }

        if ($registro->estado === 'pendiente') {
            return response()->json([
                'message' => 'La cita todavía no ha sido programada.',
            ], 409);
        }

        if ($registro->estado === 'cancelada') {
            return response()->json([
                'message' => 'No se pueden registrar datos clínicos en una cita cancelada.',
            ], 409);
        }

        $datos = $request->validate([
            'diagnostico' => [
                'required',
                'string',
            ],
            'tratamiento' => [
                'required',
                'string',
            ],
            'observacion' => [
                'nullable',
                'string',
            ],
        ]);

        $registro->update([
            'diagnostico' => $datos['diagnostico'],
            'tratamiento' => $datos['tratamiento'],
            'observacion' => $datos['observacion'] ?? null,
        ]);

        $registro->load('paciente');

        AuditoriaService::registrarAccion(
            $request->user(),
            'agenda',
            'datos_clinicos',
            "Registraste datos clínicos de la cita del paciente {$registro->paciente->codigo_paciente}."
        );

        return response()->json([
            'message' => 'Datos clínicos registrados correctamente.',
            'data' => $registro,
        ]);
    }

    public function cancelarCita(
        Request $request,
        string $id
    ): JsonResponse {
        $registro = Agenda::find($id);

        if (!$registro) {
            return response()->json([
                'message' => 'Cita no encontrada.',
            ], 404);
        }

        if ($registro->tipo !== 'cita_medica') {
            return response()->json([
                'message' => 'El registro no corresponde a una cita médica.',
            ], 409);
        }

        if ($registro->estado === 'cancelada') {
            return response()->json([
                'message' => 'La cita ya se encuentra cancelada.',
            ], 409);
        }

        if ($registro->estado === 'completada') {
            return response()->json([
                'message' => 'Una cita completada no puede cancelarse.',
            ], 409);
        }

        $registro->update([
            'estado' => 'cancelada',
        ]);

        $registro->load('paciente');

        AuditoriaService::registrarAccion(
            $request->user(),
            'agenda',
            'cancelar_cita',
            "Cancelaste una cita médica del paciente {$registro->paciente->codigo_paciente}."
        );

        return response()->json([
            'message' => 'Cita cancelada correctamente.',
            'data' => $registro,
        ]);
    }

    public function completarCita(
        Request $request,
        string $id
    ): JsonResponse {
        $registro = Agenda::find($id);

        if (!$registro) {
            return response()->json([
                'message' => 'Cita no encontrada.',
            ], 404);
        }

        if (
            $registro->tipo !== 'cita_medica' ||
            $registro->estado !== 'programada'
        ) {
            return response()->json([
                'message' => 'La cita no se encuentra programada.',
            ], 409);
        }

        if (
            !$registro->diagnostico ||
            !$registro->tratamiento
        ) {
            return response()->json([
                'message' => 'Debes registrar el diagnóstico y tratamiento antes de completar la cita.',
            ], 409);
        }

        $registro->update([
            'estado' => 'completada',
        ]);

        $registro->load('paciente');

        AuditoriaService::registrarAccion(
            $request->user(),
            'agenda',
            'completar_cita',
            "Marcaste como completada la cita médica del paciente {$registro->paciente->codigo_paciente}."
        );

        return response()->json([
            'message' => 'Cita marcada como completada.',
            'data' => $registro,
        ]);
    }

    public function misCitas(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        if (!$user->paciente_id) {
            return response()->json([
                'message' => 'El usuario no está vinculado a un paciente.',
            ], 422);
        }

        $citas = Agenda::where(
            'paciente_id',
            $user->paciente_id
        )
            ->where(
                'tipo',
                'cita_medica'
            )
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get();

        return response()->json([
            'data' => $citas,
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        $registro = Agenda::with('paciente')
            ->find($id);

        if (!$registro) {
            return response()->json([
                'message' => 'Registro de agenda no encontrado.',
            ], 404);
        }

        if ($registro->tipo === 'personal') {
            $detalle = 'Eliminaste una actividad personal de la agenda.';
        } else {
            $codigoPaciente = $registro->paciente?->codigo_paciente;

            $detalle = "Eliminaste una cita médica del paciente {$codigoPaciente}.";
        }

        $registro->delete();

        AuditoriaService::registrarAccion(
            $request->user(),
            'agenda',
            'eliminar',
            $detalle
        );

        return response()->json([
            'message' => 'Registro eliminado correctamente.',
        ]);
    }
}