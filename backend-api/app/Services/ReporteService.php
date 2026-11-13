<?php

namespace App\Services;

use App\Models\Actividad;
use App\Models\Agenda;
use App\Models\Egreso;
use App\Models\HistorialClinico;
use App\Models\Paciente;
use Carbon\Carbon;

class ReporteService
{
    public function clinicos(): array
    {
        $actividadesFrecuentes = Actividad::query()
            ->selectRaw('actividad, COUNT(*) as cantidad')
            ->groupBy('actividad')
            ->orderByDesc('cantidad')
            ->limit(5)
            ->get();

        return [
            'total_pacientes' => Paciente::count(),

            'historiales_clinicos' => HistorialClinico::count(),

            'citas' => [
                'pendientes' => Agenda::where('tipo', 'cita_medica')
                    ->where('estado', 'pendiente')
                    ->count(),

                'programadas' => Agenda::where('tipo', 'cita_medica')
                    ->where('estado', 'programada')
                    ->count(),

                'completadas' => Agenda::where('tipo', 'cita_medica')
                    ->where('estado', 'completada')
                    ->count(),

                'canceladas' => Agenda::where('tipo', 'cita_medica')
                    ->where('estado', 'cancelada')
                    ->count(),
            ],

            'total_actividades' => Actividad::count(),

            'actividades_frecuentes' => $actividadesFrecuentes,
        ];
    }

    public function economicos(): array
    {
        $ingresos = (float) Actividad::sum('precio');
        $egresos = (float) Egreso::sum('monto');

        return [
            'ingresos' => number_format(
                $ingresos,
                2,
                '.',
                ''
            ),

            'egresos' => number_format(
                $egresos,
                2,
                '.',
                ''
            ),

            'saldo' => number_format(
                $ingresos - $egresos,
                2,
                '.',
                ''
            ),
        ];
    }

    public function financieros(
        int $anio
    ): array {
        $meses = [];

        for ($mes = 1; $mes <= 12; $mes++) {
            $ingresos = (float) Actividad::query()
                ->whereYear('fecha', $anio)
                ->whereMonth('fecha', $mes)
                ->sum('precio');

            $egresos = (float) Egreso::query()
                ->whereYear('fecha', $anio)
                ->whereMonth('fecha', $mes)
                ->sum('monto');

            $meses[] = [
                'mes' => $mes,

                'ingresos' => number_format(
                    $ingresos,
                    2,
                    '.',
                    ''
                ),

                'egresos' => number_format(
                    $egresos,
                    2,
                    '.',
                    ''
                ),

                'saldo' => number_format(
                    $ingresos - $egresos,
                    2,
                    '.',
                    ''
                ),
            ];
        }

        return [
            'anio' => $anio,
            'meses' => $meses,
        ];
    }

    public function ingresos(): array
    {
        $total = (float) Actividad::sum('precio');

        $porActividad = Actividad::query()
            ->selectRaw(
                'actividad, COUNT(*) as cantidad, SUM(precio) as total'
            )
            ->groupBy('actividad')
            ->orderByDesc('total')
            ->get()
            ->map(function ($actividad) {
                return [
                    'actividad' => $actividad->actividad,
                    'cantidad' => (int) $actividad->cantidad,
                    'total' => number_format(
                        (float) $actividad->total,
                        2,
                        '.',
                        ''
                    ),
                ];
            });

        return [
            'total_ingresos' => number_format(
                $total,
                2,
                '.',
                ''
            ),

            'por_actividad' => $porActividad,
        ];
    }

    public function dashboard(): array
    {
        $hoy = Carbon::today();

        $inicioMes = $hoy
            ->copy()
            ->startOfMonth();

        $finMes = $hoy
            ->copy()
            ->endOfMonth();

        $ingresosMes = (float) Actividad::query()
            ->whereBetween(
                'fecha',
                [$inicioMes, $finMes]
            )
            ->sum('precio');

        $egresosMes = (float) Egreso::query()
            ->whereBetween(
                'fecha',
                [$inicioMes, $finMes]
            )
            ->sum('monto');

        return [
            'pacientes' => [
                'total' => Paciente::count(),
            ],

            'citas' => [
                'hoy' => Agenda::query()
                    ->where('tipo', 'cita_medica')
                    ->whereDate('fecha', $hoy)
                    ->where('estado', 'programada')
                    ->count(),

                'solicitudes_pendientes' => Agenda::query()
                    ->where('tipo', 'cita_medica')
                    ->where('estado', 'pendiente')
                    ->count(),
            ],

            'mes_actual' => [
                'ingresos' => number_format(
                    $ingresosMes,
                    2,
                    '.',
                    ''
                ),

                'egresos' => number_format(
                    $egresosMes,
                    2,
                    '.',
                    ''
                ),

                'saldo' => number_format(
                    $ingresosMes - $egresosMes,
                    2,
                    '.',
                    ''
                ),
            ],
        ];
    }

    public function resumenCaja(array $datos): array
    {
        $ingresosQuery = Actividad::query();
        $egresosQuery = Egreso::query();

        if ($datos['periodo'] === 'dia') {
            $ingresosQuery->whereDate(
                'fecha',
                $datos['fecha']
            );

            $egresosQuery->whereDate(
                'fecha',
                $datos['fecha']
            );
        }

        if ($datos['periodo'] === 'semana') {
            $fecha = Carbon::parse(
                $datos['fecha']
            );

            $inicio = $fecha
                ->copy()
                ->startOfWeek();

            $fin = $fecha
                ->copy()
                ->endOfWeek();

            $ingresosQuery->whereBetween(
                'fecha',
                [$inicio, $fin]
            );

            $egresosQuery->whereBetween(
                'fecha',
                [$inicio, $fin]
            );
        }

        if ($datos['periodo'] === 'mes') {
            $ingresosQuery
                ->whereMonth(
                    'fecha',
                    $datos['mes']
                )
                ->whereYear(
                    'fecha',
                    $datos['anio']
                );

            $egresosQuery
                ->whereMonth(
                    'fecha',
                    $datos['mes']
                )
                ->whereYear(
                    'fecha',
                    $datos['anio']
                );
        }

        if ($datos['periodo'] === 'anio') {
            $ingresosQuery->whereYear(
                'fecha',
                $datos['anio']
            );

            $egresosQuery->whereYear(
                'fecha',
                $datos['anio']
            );
        }

        $movimientos = $ingresosQuery->with('paciente')->get()->map(fn ($actividad) => [
            'id' => $actividad->id,
            'tipo' => 'ingreso',
            'fecha' => $actividad->fecha->toDateString(),
            'concepto' => $actividad->actividad,
            'ingreso' => $actividad->precio,
            'egreso' => '0.00',
            'agenda_id' => $actividad->agenda_id,
            'codigo_paciente' => $actividad->paciente?->codigo_paciente,
            'nombres' => $actividad->paciente?->nombres,
        ])->concat($egresosQuery->get()->map(fn ($egreso) => [
            'id' => $egreso->id,
            'tipo' => 'egreso',
            'fecha' => $egreso->fecha->toDateString(),
            'concepto' => $egreso->concepto,
            'ingreso' => '0.00',
            'egreso' => $egreso->monto,
            'agenda_id' => null,
            'codigo_paciente' => null,
            'nombres' => null,
        ]))->sortBy([['fecha', 'desc'], ['tipo', 'asc'], ['id', 'asc']])->values();

        $ingresos = (float) $ingresosQuery
            ->sum('precio');

        $egresos = (float) $egresosQuery
            ->sum('monto');

        $saldo = $ingresos - $egresos;

        return [
            'periodo' => $datos['periodo'],
            'movimientos' => $movimientos,

            'ingresos' => number_format(
                $ingresos,
                2,
                '.',
                ''
            ),

            'egresos' => number_format(
                $egresos,
                2,
                '.',
                ''
            ),

            'saldo' => number_format(
                $saldo,
                2,
                '.',
                ''
            ),
        ];
    }
}