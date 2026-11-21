<?php

namespace App\Http\Controllers\Api\Agenda;

use App\Http\Controllers\Controller;
use App\Services\AgendaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AgendaController extends Controller
{
    public function __construct(
        private AgendaService $agendaService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $registros = $this->agendaService->listar(
            $request->only([
                'fecha',
                'mes',
                'anio',
                'tipo',
                'estado',
            ])
        );

        return response()->json([
            'data' => $registros,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $registro = $this
            ->agendaService
            ->obtenerPorId($id);

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

        $resultado = $this
            ->agendaService
            ->crearPersonal(
                $datos,
                $request->user()
            );

        if ($resultado['estado'] === 'horario_ocupado') {
            return response()->json([
                'message' => 'Ese horario ya se encuentra ocupado.',
            ], 409);
        }

        return response()->json([
            'message' => 'Actividad personal registrada correctamente.',
            'data' => $resultado['registro'],
        ], 201);
    }

    public function crearCitaMedica(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'codigo_paciente' => [
                'nullable',
                'string',
                'exists:pacientes,codigo_paciente',
                'required_without:nombre_reserva',
                'prohibits:nombre_reserva',
            ],
            'nombre_reserva' => [
                'nullable',
                'string',
                'max:255',
                'required_without:codigo_paciente',
                'prohibits:codigo_paciente',
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

        $resultado = $this
            ->agendaService
            ->crearCitaMedica(
                $datos,
                $request->user()
            );

        if ($resultado['estado'] === 'horario_ocupado') {
            return response()->json([
                'message' => 'Ese horario ya se encuentra ocupado.',
            ], 409);
        }

        return response()->json([
            'message' => 'Cita médica registrada correctamente.',
            'data' => $resultado['registro'],
        ], 201);
    }

    public function solicitarCita(
        Request $request
    ): JsonResponse {
        $resultado = $this
            ->agendaService
            ->solicitarCita(
                $request->user()
            );

        if ($resultado['estado'] === 'sin_paciente') {
            return response()->json([
                'message' => 'El usuario no está vinculado a un paciente.',
            ], 422);
        }

        if ($resultado['estado'] === 'solicitud_existente') {
            return response()->json([
                'message' => 'Ya tienes una solicitud de cita pendiente.',
            ], 409);
        }

        return response()->json([
            'message' => 'Solicitud de cita enviada correctamente.',
            'data' => $resultado['registro'],
        ], 201);
    }

    public function programarSolicitud(
        Request $request,
        string $id
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
        ]);

        $resultado = $this
            ->agendaService
            ->programarSolicitud(
                $id,
                $datos,
                $request->user()
            );

        if ($resultado['estado'] === 'no_encontrado') {
            return response()->json([
                'message' => 'Solicitud no encontrada.',
            ], 404);
        }

        if ($resultado['estado'] === 'no_pendiente') {
            return response()->json([
                'message' => 'El registro no corresponde a una solicitud pendiente.',
            ], 409);
        }

        if ($resultado['estado'] === 'horario_ocupado') {
            return response()->json([
                'message' => 'Ese horario ya se encuentra ocupado.',
            ], 409);
        }

        return response()->json([
            'message' => 'Solicitud programada correctamente.',
            'data' => $resultado['registro'],
        ]);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
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

        $resultado = $this
            ->agendaService
            ->actualizar(
                $id,
                $datos,
                $request->user()
            );

        if ($resultado['estado'] === 'no_encontrado') {
            return response()->json([
                'message' => 'Registro de agenda no encontrado.',
            ], 404);
        }

        if ($resultado['estado'] === 'solicitud_pendiente') {
            return response()->json([
                'message' => 'Programa la solicitud pendiente desde su ruta específica.',
            ], 409);
        }

        if ($resultado['estado'] === 'horario_incompleto') {
            return response()->json([
                'message' => 'La fecha y ambas horas son obligatorias para editar el horario.',
            ], 422);
        }

        if ($resultado['estado'] === 'hora_invalida') {
            return response()->json([
                'message' => 'La hora final debe ser posterior a la hora de inicio.',
            ], 422);
        }

        if ($resultado['estado'] === 'horario_ocupado') {
            return response()->json([
                'message' => 'Ese horario ya se encuentra ocupado.',
            ], 409);
        }

        return response()->json([
            'message' => 'Registro actualizado correctamente.',
            'data' => $resultado['registro'],
        ]);
    }

    public function registrarDatosClinicos(
        Request $request,
        string $id
    ): JsonResponse {
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

        $resultado = $this
            ->agendaService
            ->registrarDatosClinicos(
                $id,
                $datos,
                $request->user()
            );

        if ($resultado['estado'] === 'no_encontrado') {
            return response()->json([
                'message' => 'Cita no encontrada.',
            ], 404);
        }

        if ($resultado['estado'] === 'no_es_cita') {
            return response()->json([
                'message' => 'El registro no corresponde a una cita médica.',
            ], 409);
        }

        if ($resultado['estado'] === 'sin_paciente_registrado') {
            return response()->json([
                'message' => 'No se pueden registrar datos clínicos en una reserva sin paciente registrado.',
            ], 409);
        }

        if ($resultado['estado'] === 'pendiente') {
            return response()->json([
                'message' => 'La cita todavía no ha sido programada.',
            ], 409);
        }

        if ($resultado['estado'] === 'cancelada') {
            return response()->json([
                'message' => 'No se pueden registrar datos clínicos en una cita cancelada.',
            ], 409);
        }

        return response()->json([
            'message' => 'Datos clínicos registrados correctamente.',
            'data' => $resultado['registro'],
        ]);
    }

    public function cancelarCita(
        Request $request,
        string $id
    ): JsonResponse {
        $resultado = $this
            ->agendaService
            ->cancelarCita(
                $id,
                $request->user()
            );

        if ($resultado['estado'] === 'no_encontrado') {
            return response()->json([
                'message' => 'Cita no encontrada.',
            ], 404);
        }

        if ($resultado['estado'] === 'no_es_cita') {
            return response()->json([
                'message' => 'El registro no corresponde a una cita médica.',
            ], 409);
        }

        if ($resultado['estado'] === 'ya_cancelada') {
            return response()->json([
                'message' => 'La cita ya se encuentra cancelada.',
            ], 409);
        }

        if ($resultado['estado'] === 'completada') {
            return response()->json([
                'message' => 'Una cita completada no puede cancelarse.',
            ], 409);
        }

        return response()->json([
            'message' => 'Cita cancelada correctamente.',
            'data' => $resultado['registro'],
        ]);
    }

    public function completarCita(
        Request $request,
        string $id
    ): JsonResponse {
        $datos = $request->validate([
            'actividad' => ['sometimes', 'required', 'string', 'max:255'],
            'precio' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:99999999.99'],
        ]);

        $resultado = $this
            ->agendaService
            ->completarCita(
                $id,
                $request->user(),
                $datos
            );

        if ($resultado['estado'] === 'no_encontrado') {
            return response()->json([
                'message' => 'Cita no encontrada.',
            ], 404);
        }

        if ($resultado['estado'] === 'no_programada') {
            return response()->json([
                'message' => 'La cita no se encuentra programada.',
            ], 409);
        }

        if ($resultado['estado'] === 'sin_datos_clinicos') {
            return response()->json([
                'message' => 'Debes registrar el diagnóstico y tratamiento antes de completar la cita.',
            ], 409);
        }

        return response()->json([
            'message' => 'Cita marcada como completada.',
            'data' => $resultado['registro'],
        ]);
    }

    public function misCitas(
        Request $request
    ): JsonResponse {
        $resultado = $this
            ->agendaService
            ->misCitas(
                $request->user()
            );

        if ($resultado['estado'] === 'sin_paciente') {
            return response()->json([
                'message' => 'El usuario no está vinculado a un paciente.',
            ], 422);
        }

        return response()->json([
            'data' => $resultado['citas'],
        ]);
    }

    public function cancelarMiCita(
        Request $request,
        string $id
    ): JsonResponse {
        $resultado = $this
            ->agendaService
            ->cancelarMiCita(
                $id,
                $request->user()
            );

        return match ($resultado['estado']) {
            'sin_paciente' => response()->json([
                'message' => 'El usuario no está vinculado a un paciente.',
            ], 422),
            'no_encontrado' => response()->json([
                'message' => 'Cita no encontrada.',
            ], 404),
            'ya_cancelada' => response()->json([
                'message' => 'La cita ya se encuentra cancelada.',
            ], 409),
            'completada' => response()->json([
                'message' => 'Una cita completada no puede cancelarse.',
            ], 409),
            'ya_inicio' => response()->json([
                'message' => 'La cita ya comenzó o ya pasó; comunícate con el consultorio.',
            ], 409),
            default => response()->json([
                'message' => 'Cita cancelada correctamente.',
                'data' => $resultado['registro'],
            ]),
        };
    }

    public function reprogramarMiCita(
        Request $request,
        string $id
    ): JsonResponse {
        $datos = $request->validate([
            'motivo' => [
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        $resultado = $this
            ->agendaService
            ->reprogramarMiCita(
                $id,
                $request->user(),
                $datos['motivo'] ?? null
            );

        return match ($resultado['estado']) {
            'sin_paciente' => response()->json([
                'message' => 'El usuario no está vinculado a un paciente.',
            ], 422),
            'no_encontrado' => response()->json([
                'message' => 'Cita no encontrada.',
            ], 404),
            'no_programada' => response()->json([
                'message' => 'Solo se pueden reprogramar citas programadas.',
            ], 409),
            'ya_inicio' => response()->json([
                'message' => 'La cita ya comenzó o ya pasó; comunícate con el consultorio.',
            ], 409),
            'solicitud_existente' => response()->json([
                'message' => 'Ya tienes una solicitud de cita pendiente.',
            ], 409),
            default => response()->json([
                'message' => 'Solicitud de reprogramación enviada. El consultorio te asignará una nueva fecha.',
                'data' => $resultado['registro'],
            ]),
        };
    }

    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        $eliminado = $this
            ->agendaService
            ->eliminar(
                $id,
                $request->user()
            );

        if (!$eliminado) {
            return response()->json([
                'message' => 'Registro de agenda no encontrado.',
            ], 404);
        }

        return response()->json([
            'message' => 'Registro eliminado correctamente.',
        ]);
    }
}
