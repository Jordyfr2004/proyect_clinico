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
use App\Http\Controllers\Api\Clinica\RecetaController;
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
    Route::post('/login')
})