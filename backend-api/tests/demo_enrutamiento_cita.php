<?php

/**
 * Demostración local: php tests/demo_enrutamiento_cita.php <caso>
 * Usa el router, filtro y consumidores reales; captura sus logs en memoria.
 */

use App\Events\CitaCambioEstado;
use App\Routing\EnrutadorCitaPorContenido;
use Illuminate\Contracts\Console\Kernel;
use Monolog\Handler\TestHandler;
use Monolog\Logger as MonologLogger;

const CASOS = ['solicitada', 'programada', 'cancelada', 'desconocido', 'actualizada', 'sin_cita_id'];

$caso = $argv[1] ?? null;
if (! in_array($caso, CASOS, true) || count($argv) !== 2) {
    fwrite(STDERR, 'Uso: php tests/demo_enrutamiento_cita.php <'.implode('|', CASOS).">\n");
    exit(2);
}

// El script no despacha el evento ni consulta la base de datos.
// Estos valores aíslan cualquier eventual resolución de configuración local.
foreach ([
    'APP_ENV' => 'testing',
    'DB_CONNECTION' => 'sqlite',
    'DB_DATABASE' => ':memory:',
    'BROADCAST_CONNECTION' => 'null',
    'QUEUE_CONNECTION' => 'sync',
] as $nombre => $valor) {
    $_ENV[$nombre] = $valor;
    $_SERVER[$nombre] = $valor;
}

require dirname(__DIR__).'/vendor/autoload.php';
$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$captura = new TestHandler();
$logs = $app->make('log');
config(['logging.channels.evidencia_local' => ['driver' => 'evidencia_local']]);
$logs->extend('evidencia_local', fn () => new MonologLogger('evidencia_local', [$captura]));
$logs->setDefaultDriver('evidencia_local');

$tipo = $caso === 'sin_cita_id' ? 'actualizada' : $caso;
$estado = match ($tipo) {
    'solicitada' => 'pendiente',
    'cancelada' => 'cancelada',
    default => 'programada',
};

$evento = new CitaCambioEstado(
    eventoId: 'evento-demo-1',
    tipo: $tipo,
    citaId: 'cita-demo-1',
    pacienteId: 'paciente-demo-1',
    pacienteNombre: 'Paciente de prueba',
    estado: $estado,
    fecha: null,
    horaInicio: null,
    instancia: 'demo-local',
    ocurridoEn: '2026-11-21T10:00:00-05:00',
);

$entrada = $evento->aArreglo();
$router = $app->make(EnrutadorCitaPorContenido::class);
if ($caso === 'sin_cita_id') {
    unset($entrada['cita_id']);
    $router->enrutar($entrada);
} else {
    $router->handle($evento);
}

$trazas = array_map(static function ($registro): array {
    $contexto = array_intersect_key($registro->context, array_flip([
        'evento_id', 'cita_id', 'tipo', 'motivo', 'campos',
    ]));

    return [
        'nivel' => strtolower($registro->level->name),
        'mensaje' => $registro->message,
        'contexto' => $contexto,
    ];
}, $captura->getRecords());

$esperado = match ($caso) {
    'solicitada' => ['info', 'enrutamiento_cita.solicitada', ['evento_id' => 'evento-demo-1', 'cita_id' => 'cita-demo-1']],
    'programada' => ['info', 'enrutamiento_cita.programada', ['evento_id' => 'evento-demo-1', 'cita_id' => 'cita-demo-1']],
    'cancelada' => ['info', 'enrutamiento_cita.cancelada', ['evento_id' => 'evento-demo-1', 'cita_id' => 'cita-demo-1']],
    'desconocido' => ['warning', 'enrutamiento_cita.no_enrutables', ['evento_id' => 'evento-demo-1', 'tipo' => 'desconocido', 'motivo' => 'tipo_desconocido']],
    'actualizada' => ['notice', 'enrutamiento_cita.filtrado', ['evento_id' => 'evento-demo-1', 'tipo' => 'actualizada', 'motivo' => 'tipo_actualizada']],
    'sin_cita_id' => ['warning', 'enrutamiento_cita.rechazado', ['evento_id' => 'evento-demo-1', 'motivo' => 'contrato_invalido', 'campos' => ['cita_id']]],
};

$correcto = count($trazas) === 1
    && [$trazas[0]['nivel'], $trazas[0]['mensaje'], $trazas[0]['contexto']] === $esperado;

$consumidor = match ($trazas[0]['mensaje'] ?? null) {
    'enrutamiento_cita.solicitada' => 'AtenderSolicitudCita',
    'enrutamiento_cita.programada' => 'AtenderProgramacionCita',
    'enrutamiento_cita.cancelada' => 'AtenderCancelacionCita',
    default => null,
};
$registro = $trazas[0]['mensaje'] ?? null;

$salida = [
    'caso' => $caso,
    'entrada' => $entrada,
    'tipo' => $entrada['tipo'],
    'validacion' => $registro === 'enrutamiento_cita.rechazado' ? 'rechazada: contrato_invalido' : 'aprobada',
    'filtro' => match ($registro) {
        'enrutamiento_cita.rechazado' => 'no_ejecutado',
        'enrutamiento_cita.filtrado' => 'filtrado: tipo_actualizada',
        default => 'permitido',
    },
    'consumidor' => $consumidor,
    'motivo_rechazo' => $trazas[0]['contexto']['motivo'] ?? null,
    'trazas' => $trazas,
    'verificacion' => $correcto ? 'correcta' : 'fallida',
];

echo json_encode($salida, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), "\n";
exit($correcto ? 0 : 1);
