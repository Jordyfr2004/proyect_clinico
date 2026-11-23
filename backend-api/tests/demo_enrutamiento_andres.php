<?php

/** Ejecución local: php tests/demo_enrutamiento_andres.php <caso>. */
use App\Events\CitaCambioEstado;
use App\Routing\EnrutadorSeguimientoAndres;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Monolog\Handler\TestHandler;
use Monolog\Logger as MonologLogger;

$casos = ['reprogramacion_solicitada', 'reprogramada', 'completada', 'desconocido', 'creada', 'sin_cita_id'];
$caso = $argv[1] ?? null;
if (count($argv) !== 2 || ! in_array($caso, $casos, true)) {
    fwrite(STDERR, 'Uso: php tests/demo_enrutamiento_andres.php <'.implode('|', $casos).">\n");
    exit(2);
}

// Aislar la demostración de servicios externos. No consulta la base de datos.
foreach ([
    'APP_ENV' => 'testing', 'DB_CONNECTION' => 'sqlite',
    'DB_DATABASE' => ':memory:', 'BROADCAST_CONNECTION' => 'null',
    'QUEUE_CONNECTION' => 'sync',
] as $nombre => $valor) {
    $_ENV[$nombre] = $valor;
    $_SERVER[$nombre] = $valor;
    putenv($nombre.'='.$valor);
}

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$captura = new TestHandler();
$logs = $app->make('log');
$logs->extend('demo_andres', fn () => new MonologLogger('demo_andres', [$captura]));
config(['logging.channels.demo_andres' => ['driver' => 'demo_andres']]);
$logs->setDefaultDriver('demo_andres');
// El listener de bitácora existente se encola sin escribir archivos ni usar servicios externos.
Queue::fake();

$tipo = $caso === 'sin_cita_id' ? 'creada' : $caso;
$evento = new CitaCambioEstado(
    eventoId: 'evento-andres-demo', tipo: $tipo,
    citaId: 'cita-andres-demo', pacienteId: 'paciente-demo',
    pacienteNombre: 'Paciente de prueba', estado: 'programada',
    fecha: null, horaInicio: null, instancia: 'demo-andres',
    ocurridoEn: '2026-11-22T12:00:00-05:00',
);
$mensaje = $evento->aArreglo();
if ($caso === 'sin_cita_id') {
    unset($mensaje['cita_id']);
    // Un evento tipado siempre trae cita_id; el contrato incompleto entra como arreglo.
    $app->make(EnrutadorSeguimientoAndres::class)->enrutar($mensaje);
} else {
    Event::dispatch($evento);
}

$trazas = array_map(static fn ($item): array => [
    'nivel' => strtolower($item->level->name),
    'mensaje' => $item->message,
    'contexto' => array_intersect_key($item->context, array_flip(['evento_id','cita_id','tipo','motivo','campos'])),
], $captura->getRecords());

$esperados = [
    'reprogramacion_solicitada' => ['info', 'enrutamiento_andres.reprogramacion_solicitada', ['evento_id' => 'evento-andres-demo', 'cita_id' => 'cita-andres-demo']],
    'reprogramada' => ['info', 'enrutamiento_andres.reprogramada', ['evento_id' => 'evento-andres-demo', 'cita_id' => 'cita-andres-demo']],
    'completada' => ['info', 'enrutamiento_andres.completada', ['evento_id' => 'evento-andres-demo', 'cita_id' => 'cita-andres-demo']],
    'desconocido' => ['warning', 'enrutamiento_andres.no_enrutables', ['evento_id' => 'evento-andres-demo', 'tipo' => 'desconocido', 'motivo' => 'tipo_desconocido']],
    'creada' => ['notice', 'enrutamiento_andres.filtrado', ['evento_id' => 'evento-andres-demo', 'tipo' => 'creada', 'motivo' => 'tipo_creada_excluido']],
    'sin_cita_id' => ['warning', 'enrutamiento_andres.rechazado', ['evento_id' => 'evento-andres-demo', 'motivo' => 'contrato_invalido', 'campos' => ['cita_id']]],
];
$correcto = count($trazas) === 1 && [
    $trazas[0]['nivel'], $trazas[0]['mensaje'], $trazas[0]['contexto'],
] === $esperados[$caso];
$consumidoresPorTraza = [
    'enrutamiento_andres.reprogramacion_solicitada' => 'AtenderSolicitudReprogramacionAndres',
    'enrutamiento_andres.reprogramada' => 'AtenderCitaReprogramadaAndres',
    'enrutamiento_andres.completada' => 'AtenderCitaCompletadaAndres',
];
$traza = count($trazas) === 1 ? $trazas[0] : null;
$mensajeTraza = $traza['mensaje'] ?? null;
$validacion = match ($mensajeTraza) {
    'enrutamiento_andres.rechazado' => 'rechazada: contrato_invalido',
    null => 'sin_verificar',
    default => 'aprobada',
};
$filtro = match ($mensajeTraza) {
    'enrutamiento_andres.rechazado' => 'no_ejecutado',
    'enrutamiento_andres.filtrado' => 'filtrado: tipo_creada_excluido',
    null => 'sin_verificar',
    default => 'permitido',
};

$salida = [
    'caso' => $caso,
    'entrada' => $mensaje,
    'validacion' => $validacion,
    'filtro' => $filtro,
    'consumidor' => $consumidoresPorTraza[$mensajeTraza] ?? null,
    'motivo' => $traza['contexto']['motivo'] ?? null,
    'trazas' => $trazas,
    'verificacion' => $correcto ? 'correcta' : 'fallida',
];
echo json_encode($salida, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), "\n";
exit($correcto ? 0 : 1);
