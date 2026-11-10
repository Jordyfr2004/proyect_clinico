<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

class UserSeeder extends Seeder
{
    /**
     * Crea la cuenta inicial de la doctora. La contraseña se toma de
     * DOCTORA_PASSWORD para no dejar una contraseña conocida en el código.
     */
    public function run(): void
    {
        $password = (string) env('DOCTORA_PASSWORD', '');

        if (strlen($password) < 8) {
            throw new RuntimeException('Define DOCTORA_PASSWORD (mínimo 8 caracteres) antes de ejecutar el seeder.');
        }

        User::firstOrCreate(
            ['username' => env('DOCTORA_USERNAME', 'doctora')],
            [
                'name' => env('DOCTORA_NOMBRE', 'Doctora'),
                'email' => env('DOCTORA_EMAIL', 'doctora@clinica.com'),
                'password' => $password,
                'role' => 'doctora',
                'paciente_id' => null,
            ]
        );
    }
}
