<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\PasswordController;

use App\Http\Controllers\Api\Usuario\UsuarioController;
use App\Http\Controllers\Api\Usuario\RolController;

use App\Http\Controllers\Api\Paciente\PacienteController;

use App\Http\Controllers\Api\Clinica\HistorialClinicoController;
use App\Http\Controllers\Api\Clinica\DiagnosticoController;
use App\Http\Controllers\Api\Clinica\TratamientoController;
use App\Http\Controllers\Api\Clinica\OdontogramaController;
use App\Http\Controllers\Api\Clinica\RadiografiaController;

use App\Http\Controllers\Api\Inventario\InsumoController;
use App\Http\Controllers\Api\Inventario\MovimientoInventarioController;

use App\Http\Controllers\Api\Reporte\ReporteController;
use App\Http\Controllers\Api\Notificacion\NotificacionController;

use App\Http\Controllers\Api\Actividad\ActividadController;

use App\Http\Controllers\Api\Agenda\AgendaController;

use App\Http\Controllers\Api\Clinica\EvidenciaClinicaController;

use App\Http\Controllers\Api\Reporte\EgresoController;

use App\Http\Controllers\Api\Configuracion\AuditoriaController;

use App\Http\Controllers\Api\Servicio\CategoriaServicioController;
use App\Http\Controllers\Api\Servicio\ServicioConsultorioController;



Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


// Autenticación

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])
        ->middleware('throttle:auth-login');

    Route::post('/register-paciente', [AuthController::class, 'registerPaciente'])
        ->middleware('throttle:auth-register');

    Route::post('/forgot-password', [PasswordController::class, 'forgotPassword'])
        ->middleware('throttle:password-forgot');

    Route::post('/reset-password', [PasswordController::class, 'resetPassword'])
        ->middleware('throttle:password-reset');


    Route::post('/logout', [AuthController::class, 'logout'])
        ->middleware('auth:sanctum');
        
});

// Usuarios
Route::middleware('auth:sanctum', 'role:doctora')->prefix('usuarios')->group(function () {
    // Lista de cuentas
    Route::get('/', [UsuarioController::class, 'index']);

    // Gestión de asistentes
    Route::get('/asistentes', [UsuarioController::class, 'listarAsistentes']);

    Route::post('/asistentes', [UsuarioController::class, 'crearAsistente']);

    Route::get('/asistentes/{id}', [UsuarioController::class, 'verAsistente']);

    Route::put('/asistentes/{id}/desactivar', [UsuarioController::class, 'desactivarAsistente']);

    Route::put('/asistentes/{id}/activar', [UsuarioController::class, 'activarAsistente']);

    Route::put('/asistentes/{id}/password', [UsuarioController::class, 'cambiarPasswordAsistente']);

    Route::delete('/asistentes/{id}', [UsuarioController::class, 'eliminarAsistente']);

    // Gestión general de cuentas
    Route::put('/{id}/desactivar', [UsuarioController::class, 'desactivarUsuario']);

    Route::put('/{id}/activar', [UsuarioController::class, 'activarUsuario']);

    Route::put('/{id}/desvincular-paciente', [UsuarioController::class, 'desvincularPaciente']);

    // Ver una cuenta específica
    Route::get('/{id}', [UsuarioController::class, 'show']);
});

// Foto de perfil del usuario autenticado
Route::get('/usuarios/{usuario}/foto', [UsuarioController::class, 'verFotoPerfil'])
    ->middleware('auth:sanctum')
    ->name('usuarios.foto');

Route::middleware('auth:sanctum')->prefix('perfil')->group(function () {
    Route::post('/foto', [UsuarioController::class, 'actualizarFotoPerfil']);
    Route::delete('/foto', [UsuarioController::class, 'eliminarFotoPerfil']);
});

// Pacientes
Route::middleware('auth:sanctum','role:doctora,asistente')->prefix('pacientes')->group(function () {
    Route::get('/', [PacienteController::class, 'index']);
    Route::get('/{id}', [PacienteController::class, 'show']);
    Route::post('/', [PacienteController::class, 'store']);
    Route::put('/{id}', [PacienteController::class, 'update']);
});

// Perfil del paciente
Route::middleware('auth:sanctum','role:paciente')->prefix('paciente')->group(function () {

    Route::get('/mi-perfil', [PacienteController::class, 'miPerfil']);

});

// Historiales clínicos
Route::middleware('auth:sanctum')->prefix('historiales-clinicos')->group(function () {

    Route::middleware('role:doctora,asistente')->group(function () {

        Route::get('/', [HistorialClinicoController::class, 'index']);

        Route::get('/paciente/{pacienteId}', [HistorialClinicoController::class, 'porPaciente']);

        Route::get('/{id}', [HistorialClinicoController::class, 'show']);

    });

    Route::middleware('role:doctora')->group(function () {

        Route::post('/', [HistorialClinicoController::class, 'store']);

        Route::put('/{id}', [HistorialClinicoController::class, 'update']);

    });

});

Route::middleware('auth:sanctum', 'role:paciente')->prefix('paciente')->group(function () {

    Route::get('/mi-historial', [HistorialClinicoController::class, 'miHistorial']);

});


// Odontograma
Route::prefix('odontogramas')->group(function () {

    // Doctora y asistente pueden consultar
    Route::middleware('auth:sanctum', 'role:doctora,asistente')->group(function () {

        Route::get('/paciente/{pacienteId}', [OdontogramaController::class, 'porPaciente']);

    });


    // Solo doctora puede guardar, actualizar o eliminar
    Route::middleware('auth:sanctum', 'role:doctora')->group(function () {

        Route::put('/paciente/{pacienteId}', [OdontogramaController::class, 'guardar']);

        Route::delete('/paciente/{pacienteId}', [OdontogramaController::class, 'eliminarDatos']);

    });

});


// Fotografías y Radiografías
Route::prefix('evidencias-clinicas')->group(function () {

    // Paciente
    Route::middleware('auth:sanctum', 'role:paciente')->group(function () {

        Route::get('/mis', [EvidenciaClinicaController::class, 'mis']);

        Route::post('/mis', [EvidenciaClinicaController::class, 'storePaciente']);

        Route::get('/mis/{id}', [EvidenciaClinicaController::class, 'verPropia']);

        Route::get('/mis/{id}/archivo', [EvidenciaClinicaController::class, 'archivo']);

    });


    // Doctora y asistente pueden consultar
    Route::middleware('auth:sanctum', 'role:doctora,asistente')->group(function () {

        Route::get('/', [EvidenciaClinicaController::class, 'index']);

        Route::get('/paciente/{pacienteId}', [EvidenciaClinicaController::class, 'porPaciente']);

        Route::get('/{id}/archivo', [EvidenciaClinicaController::class, 'archivo']);

        Route::get('/{id}', [EvidenciaClinicaController::class, 'show']);

    });


    // Solo doctora puede registrar, editar y eliminar
    Route::middleware('auth:sanctum', 'role:doctora')->group(function () {

        Route::post('/', [EvidenciaClinicaController::class, 'store']);

        Route::put('/{id}', [EvidenciaClinicaController::class, 'update']);

        Route::delete('/{id}', [EvidenciaClinicaController::class, 'destroy']);

    });

});



// Reportes
Route::middleware('auth:sanctum', 'role:doctora')->prefix('reportes')->group(function () {

    Route::get('/clinicos', [ReporteController::class, 'clinicos']);

    Route::get('/economicos', [ReporteController::class, 'economicos']);

    Route::get('/financieros', [ReporteController::class, 'financieros']);

    Route::get('/ingresos', [ReporteController::class, 'ingresos']);

    Route::get('/caja', [ReporteController::class, 'resumenCaja']);

    Route::get('/dashboard', [ReporteController::class, 'dashboard']);

});

// Categorías de servicios
Route::prefix('categorias-servicios')->group(function () {

    // Consulta para pacientes
    Route::middleware('auth:sanctum', 'role:paciente')->group(function () {

        Route::get('/activas', [CategoriaServicioController::class, 'activas']);

    });

    // Gestión para doctora
    Route::middleware('auth:sanctum', 'role:doctora')->group(function () {

        Route::get('/', [CategoriaServicioController::class, 'index']);

        Route::get('/{id}', [CategoriaServicioController::class, 'show']);

        Route::post('/', [CategoriaServicioController::class, 'store']);

        Route::put('/{id}', [CategoriaServicioController::class, 'update']);

        Route::put('/{id}/desactivar', [CategoriaServicioController::class, 'desactivar']);

        Route::put('/{id}/activar', [CategoriaServicioController::class, 'activar']);

        Route::delete('/{id}', [CategoriaServicioController::class, 'destroy']);

    });

});


// Servicios del consultorio
Route::prefix('servicios-consultorio')->group(function () {

    // Consulta para pacientes
    Route::middleware('auth:sanctum', 'role:paciente')->group(function () {

        Route::get('/activos', [ServicioConsultorioController::class, 'activos']);

    });

    // Gestión para doctora
    Route::middleware('auth:sanctum', 'role:doctora')->group(function () {

        Route::get('/', [ServicioConsultorioController::class, 'index']);

        Route::get('/{id}', [ServicioConsultorioController::class, 'show']);

        Route::post('/', [ServicioConsultorioController::class, 'store']);

        Route::put('/{id}', [ServicioConsultorioController::class, 'update']);

        Route::put('/{id}/desactivar', [ServicioConsultorioController::class, 'desactivar']);

        Route::put('/{id}/activar', [ServicioConsultorioController::class, 'activar']);

        Route::delete('/{id}', [ServicioConsultorioController::class, 'destroy']);

    });

});



Route::prefix('actividades')->group(function () {

    // Doctora y asistente pueden consultar
    Route::middleware('auth:sanctum', 'role:doctora,asistente')->group(function () {

        Route::get('/', [ActividadController::class, 'index']);

        Route::get('/paciente/codigo/{codigo}', [ActividadController::class, 'buscarPacientePorCodigo']);

        Route::get('/resumen', [ActividadController::class, 'resumen']);

        Route::get('/{id}', [ActividadController::class, 'show']);

    });

    // Solo doctora puede crear, editar y eliminar
    Route::middleware('auth:sanctum', 'role:doctora')->group(function () {

        Route::post('/', [ActividadController::class, 'store']);

        Route::put('/{id}', [ActividadController::class, 'update']);

        Route::delete('/{id}', [ActividadController::class, 'destroy']);

    });

});

// Agenda
Route::prefix('agenda')->group(function () {

    // Paciente
    Route::middleware('auth:sanctum', 'role:paciente')->group(function () {

        Route::get('/mis-citas', [AgendaController::class, 'misCitas']);

        Route::post('/solicitar-cita', [AgendaController::class, 'solicitarCita']);

    });


    // Doctora
    Route::middleware('auth:sanctum', 'role:doctora')->group(function () {

        Route::get('/', [AgendaController::class, 'index']);

        Route::post('/personal', [AgendaController::class, 'crearPersonal']);

        Route::post('/cita-medica', [AgendaController::class, 'crearCitaMedica']);

        Route::put('/solicitud/{id}/programar', [AgendaController::class, 'programarSolicitud']);

        Route::put('/{id}/datos-clinicos', [AgendaController::class, 'registrarDatosClinicos']);

        Route::put('/{id}/cancelar', [AgendaController::class, 'cancelarCita']);

        Route::put('/{id}/completar', [AgendaController::class, 'completarCita']);

        Route::get('/{id}', [AgendaController::class, 'show']);

        Route::put('/{id}', [AgendaController::class, 'update']);

        Route::delete('/{id}', [AgendaController::class, 'destroy']);

    });

});

//Caja
Route::prefix('egresos')->group(function () {

    Route::middleware('auth:sanctum', 'role:doctora')->group(function () {

        Route::get('/', [EgresoController::class, 'index']);

        Route::get('/resumen', [EgresoController::class, 'resumen']);

        Route::get('/{id}', [EgresoController::class, 'show']);

        Route::post('/', [EgresoController::class, 'store']);

        Route::put('/{id}', [EgresoController::class, 'update']);

        Route::delete('/{id}', [EgresoController::class, 'destroy']);

    });

});

//acciones y sesiones
Route::middleware('auth:sanctum', 'role:doctora')->prefix('configuracion')->group(function () {

    Route::get('/acciones', [AuditoriaController::class, 'acciones']);

    Route::delete('/acciones/{id}', [AuditoriaController::class, 'ocultarAccion']);

    Route::get('/sesiones', [AuditoriaController::class, 'sesiones']);

});
