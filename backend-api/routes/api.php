<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\Auth\PasswordController;

use App\Http\Controllers\Api\Usuario\UsuarioController;
use App\Http\Controllers\Api\Usuario\RolController;

use App\Http\Controllers\Api\Paciente\PacienteController;

use App\Http\Controllers\Api\Cita\CitaController;
use App\Http\Controllers\Api\Cita\HorarioController;
use App\Http\Controllers\Api\Cita\ListaEsperaController;

use App\Http\Controllers\Api\Clinica\HistorialClinicoController;
use App\Http\Controllers\Api\Clinica\DiagnosticoController;
use App\Http\Controllers\Api\Clinica\TratamientoController;
use App\Http\Controllers\Api\Clinica\OdontogramaController;
use App\Http\Controllers\Api\Clinica\RadiografiaController;

use App\Http\Controllers\Api\Inventario\InsumoController;
use App\Http\Controllers\Api\Inventario\MovimientoInventarioController;

use App\Http\Controllers\Api\Reporte\ReporteController;
use App\Http\Controllers\Api\Notificacion\NotificacionController;


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
        Route::get('/asistente',[UsuarioController::class, 'verAsistente']);
        Route::get('/{id}', [UsuarioController::class, 'show']);
        Route::put('/{id}', [UsuarioController::class, 'update']);
        Route::delete('/asistente', [UsuarioController::class, 'eliminarAsistente']);
        Route::delete('/{id}', [UsuarioController::class, 'destroy']);
        Route::post('/asistente', [UsuarioController::class, 'crearAsistente']);
        Route::post('/asistente/desactivar', [UsuarioController::class, 'desactivarAsistente']);
        Route::post('/asistente/activar', [UsuarioController::class, 'activarAsistente']);
        Route::post('asistente/password',[UsuarioController::class, 'cambiarPasswordAsistente']);
        Route::get('/{id}', [UsuarioController::class, 'show']);
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

// Citas
Route::middleware('auth:sanctum')->prefix('citas')->group(function () {

    Route::get('/', [CitaController::class, 'index']);
    Route::get('/{id}', [CitaController::class, 'show']);
    Route::post('/', [CitaController::class, 'store']);

    Route::put('/{id}/reprogramar', [CitaController::class, 'reprogramar']);
    Route::put('/{id}/cancelar', [CitaController::class, 'cancelar']);
    Route::put('/{id}/confirmar', [CitaController::class, 'confirmar']);
});

// Horarios y disponibilidad
Route::middleware('auth:sanctum')->prefix('horarios')->group(function () {

    Route::get('/', [HorarioController::class, 'index']);
    Route::get('/disponibilidad', [HorarioController::class, 'disponibilidad']);

});


// Lista de espera
Route::middleware('auth:sanctum')->prefix('lista-espera')->group(function () {

    Route::get('/', [ListaEsperaController::class, 'index']);
    Route::post('/', [ListaEsperaController::class, 'store']);
    Route::delete('/{id}', [ListaEsperaController::class, 'destroy']);

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
