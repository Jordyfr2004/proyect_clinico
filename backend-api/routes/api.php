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

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


// Autenticación

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);

    Route::post('/register-paciente', [AuthController::class, 'registerPaciente']);

    Route::post('/forgot-password', [PasswordController::class, 'forgotPassword']);

    Route::post('/reset-password', [PasswordController::class, 'resetPassword']);


    Route::post('/logout', [AuthController::class, 'logout'])
        ->middleware('auth:sanctum');
        
});



// Usuarios
Route::middleware('auth:sanctum', 'role:doctora')->group(function () { 

    Route::prefix('usuarios')->group(function () { 

        Route::get('/', [UsuarioController::class, 'index']); 

        Route::get('/asistente', [UsuarioController::class, 'verAsistente']); 

        Route::post('/asistente', [UsuarioController::class, 'crearAsistente']); 

        Route::put('/asistente/desactivar', [UsuarioController::class, 'desactivarAsistente']); 

        Route::put('/asistente/activar', [UsuarioController::class, 'activarAsistente']); 

        Route::put('/asistente/password', [UsuarioController::class, 'cambiarPasswordAsistente']); 

        Route::delete('/asistente', [UsuarioController::class, 'eliminarAsistente']); 

        Route::get('/{id}', [UsuarioController::class, 'show']); 

        Route::put('/{id}', [UsuarioController::class, 'update']); 

        Route::delete('/{id}', [UsuarioController::class, 'destroy']); 

    }); 

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


// Historial clínico - doctora y asistente pueden consultar
Route::middleware('auth:sanctum','role:doctora,asistente')->prefix('historiales-clinicos')->group(function () { 
 
    Route::get('/', [HistorialClinicoController::class, 'index']); 
    Route::get('/paciente/{pacienteId}', [HistorialClinicoController::class, 'porPaciente']); 
    Route::get('/{id}', [HistorialClinicoController::class, 'show']); 
 
}); 


// Historial clínico - solo doctora puede crear y actualizar
Route::middleware('auth:sanctum','role:doctora')->prefix('historiales-clinicos')->group(function () { 
 
    Route::post('/', [HistorialClinicoController::class, 'store']); 
    Route::put('/{id}', [HistorialClinicoController::class, 'update']); 
 
}); 


// Historial clínico propio del paciente
Route::middleware('auth:sanctum','role:paciente')->prefix('paciente')->group(function () { 
 
    Route::get('/mi-historial', [HistorialClinicoController::class, 'miHistorial']); 
 
}); 

// Diagnósticos
Route::middleware('auth:sanctum')->prefix('diagnosticos')->group(function () {

    Route::get('/', [DiagnosticoController::class, 'index']);
    Route::get('/paciente/{pacienteId}', [DiagnosticoController::class, 'porPaciente']);
    Route::get('/{id}', [DiagnosticoController::class, 'show']);
    Route::post('/', [DiagnosticoController::class, 'store']);
    Route::put('/{id}', [DiagnosticoController::class, 'update']);

});


// Tratamientos
Route::middleware('auth:sanctum')->prefix('tratamientos')->group(function () {

    Route::get('/', [TratamientoController::class, 'index']);
    Route::get('/paciente/{pacienteId}', [TratamientoController::class, 'porPaciente']);
    Route::get('/{id}', [TratamientoController::class, 'show']);
    Route::post('/', [TratamientoController::class, 'store']);
    Route::put('/{id}', [TratamientoController::class, 'update']);

});



// Odontograma
Route::middleware('auth:sanctum')->prefix('odontogramas')->group(function () {

    Route::get('/paciente/{pacienteId}', [OdontogramaController::class, 'porPaciente']);
    Route::get('/{id}', [OdontogramaController::class, 'show']);
    Route::post('/', [OdontogramaController::class, 'store']);
    Route::put('/{id}', [OdontogramaController::class, 'update']);

});


// Radiografías
Route::middleware('auth:sanctum')->prefix('radiografias')->group(function () {

    Route::get('/paciente/{pacienteId}', [RadiografiaController::class, 'porPaciente']);
    Route::get('/{id}', [RadiografiaController::class, 'show']);
    Route::post('/', [RadiografiaController::class, 'store']);
    Route::delete('/{id}', [RadiografiaController::class, 'destroy']);

});





// Reportes
Route::middleware('auth:sanctum')->prefix('reportes')->group(function () {

    Route::get('/clinicos', [ReporteController::class, 'clinicos']);
    Route::get('/economicos', [ReporteController::class, 'economicos']);
    Route::get('/financieros', [ReporteController::class, 'financieros']);
    Route::get('/ingresos', [ReporteController::class, 'ingresos']);
    Route::get('/dashboard', [ReporteController::class, 'dashboard']);

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

    // Doctora
    Route::middleware('auth:sanctum', 'role:doctora')->group(function () {

        Route::get('/', [AgendaController::class, 'index']);

        Route::get('/{id}', [AgendaController::class, 'show']);

        Route::post('/personal', [AgendaController::class, 'crearPersonal']);

        Route::post('/cita-medica', [AgendaController::class, 'crearCitaMedica']);

        Route::put('/solicitud/{id}/programar', [AgendaController::class, 'programarSolicitud']);

        Route::put('/{id}', [AgendaController::class, 'update']);

        Route::put('/{id}/cancelar', [AgendaController::class, 'cancelarCita']);

        Route::put('/{id}/completar', [AgendaController::class, 'completarCita']);

        Route::delete('/{id}', [AgendaController::class, 'destroy']);

    });


    // Paciente
    Route::middleware('auth:sanctum', 'role:paciente')->group(function () {

        Route::get('/mis-citas', [AgendaController::class, 'misCitas']);

        Route::post('/solicitar-cita', [AgendaController::class, 'solicitarCita']);

    });

});