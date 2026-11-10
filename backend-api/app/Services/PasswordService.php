<?php

namespace App\Services;

use App\Models\PasswordResetCode;
use App\Models\User;
use Brevo\Exceptions\BrevoException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordService
{
    public function __construct(private BrevoEmailService $emailService) {}

    public function enviarCodigoRecuperacion(string $email): void
    {
        $this->emailService->ensureConfigured();

        try {
            DB::transaction(function () use ($email): void {
                // Issuance and redemption serialize on the same user row.
                $user = User::where('email', $email)->lockForUpdate()->first();
                if (! $user || ! $user->activo) {
                    return;
                }

                $previous = PasswordResetCode::where('email', $user->email)->latest('id')->first();
                if ($previous && $previous->created_at->gt(now()->subMinute())) {
                    return;
                }

                $codigo = (string) random_int(100000, 999999);
                PasswordResetCode::where('email', $user->email)->delete();
                PasswordResetCode::create([
                    'email' => $user->email,
                    'code_hash' => Hash::make($codigo),
                    'expires_at' => now()->addMinutes(5),
                ]);

                // API failure rolls back issuance, preserving the previous code.
                $this->emailService->sendRecoveryCode($user->email, $codigo);
            });
        } catch (BrevoException) {
            abort(503, 'No se pudo enviar el código. Inténtalo nuevamente más tarde.');
        }
    }

    public function restablecerPassword(array $datos): void
    {
        $changed = DB::transaction(function () use ($datos): bool {
            $user = User::where('email', $datos['email'])->lockForUpdate()->first();
            if (! $user || ! $user->activo) {
                return false;
            }

            $registro = PasswordResetCode::where('email', $user->email)
                ->latest('id')->lockForUpdate()->first();
            if (! $registro || $registro->used_at !== null
                || $registro->expires_at->lte(now()) || $registro->attempts >= 5) {
                return false;
            }

            if (! Hash::check($datos['code'], $registro->code_hash)) {
                $registro->increment('attempts');

                return false;
            }

            $user->forceFill([
                'password' => $datos['password'],
                'remember_token' => Str::random(60),
            ])->save();
            $registro->update(['used_at' => now()]);
            $user->tokens()->delete();

            return true;
        });

        // Throw after commit so an incorrect attempt is not rolled back.
        if (! $changed) {
            throw ValidationException::withMessages([
                'code' => ['El código no es válido o ha expirado. Solicita uno nuevo.'],
            ]);
        }
    }
}
