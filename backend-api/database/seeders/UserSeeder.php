<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['username' => 'doctora'],
            [
                'name' => 'Doctora',
                'email' => 'doctora@clinica.com',
                'password' => '12345678',
                'role' => 'doctora',
                'paciente_id' => null,
            ]
        );

        User::firstOrCreate(
            ['username' => 'asistente'],
            [
                'name' => 'Asistente',
                'email' => 'asistente@clinica.com',
                'password' => '12345678',
                'role' => 'asistente',
                'paciente_id' => null,
            ]
        );
    }
}
