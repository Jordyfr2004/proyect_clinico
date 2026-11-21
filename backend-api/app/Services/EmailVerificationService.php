<?php

namespace App\Services;

use App\Models\EmailVerificationCode;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class EmailVerificationService
{
    public function __construct(
        private BrevoEmailService $brevoEmailService
    ) {
    }

    public function enviarCodigo(User $user): void
    {
        if ($user->email_verified_at) {
            throw ValidationException::withMessages([
                'email' => [
                    'La cuenta ya se encuentra verificada.',
                ],
            ]);
        }

        $ultimoCodigo = EmailVerificationCode::where(
            'user_id',
            $user->id
        )
            ->latest()
            ->first();

        if (
            $ultimoCodigo &&
            $ultimoCodigo->created_at &&
            $ultimoCodigo->created_at->gt(
                now()->subMinute()
            )
        ) {
            throw ValidationException::withMessages([
                'email' => [
                    'Debes esperar antes de solicitar otro código.',
                ],
            ]);
        }

        $codigo = (string) random_int(
            100000,
            999999
        );

        $this->brevoEmailService
            ->ensureConfigured();

        EmailVerificationCode::where(
            'user_id',
            $user->id
        )->delete();

        $registro = EmailVerificationCode::create([
            'user_id' => $user->id,
            'code_hash' => Hash::make($codigo),
            'expires_at' => now()->addMinutes(5),
            'used_at' => null,
            'attempts' => 0,
        ]);

        try {
            $this->brevoEmailService
                ->sendVerificationCode(
                    $user->email,
                    $codigo
                );
        } catch (\Throwable $e) {
            $registro->delete();

            throw ValidationException::withMessages([
                'email' => [
                    'No se pudo enviar el código de verificación.',
                ],
            ]);
        }
    }

    public function verificar(
        string $email,
        string $codigo
    ): User {
        $user = User::where(
            'email',
            $email
        )->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => [
                    'No se pudo verificar la cuenta.',
                ],
            ]);
        }

        if ($user->email_verified_at) {
            throw ValidationException::withMessages([
                'email' => [
                    'La cuenta ya se encuentra verificada.',
                ],
            ]);
        }

        $registro = EmailVerificationCode::where(
            'user_id',
            $user->id
        )
            ->whereNull('used_at')
            ->latest()
            ->first();

        if (!$registro) {
            throw ValidationException::withMessages([
                'code' => [
                    'El código de verificación no es válido.',
                ],
            ]);
        }

        if ($registro->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => [
                    'El código de verificación ha expirado.',
                ],
            ]);
        }

        if ($registro->attempts >= 5) {
            throw ValidationException::withMessages([
                'code' => [
                    'Has superado el número máximo de intentos.',
                ],
            ]);
        }

        if (
            !Hash::check(
                $codigo,
                $registro->code_hash
            )
        ) {
            $registro->increment('attempts');

            throw ValidationException::withMessages([
                'code' => [
                    'El código de verificación no es correcto.',
                ],
            ]);
        }

        return DB::transaction(
            function () use (
                $user,
                $registro
            ) {
                $user->forceFill([
                    'email_verified_at' => now(),
                ])->save();

                $registro->update([
                    'used_at' => now(),
                ]);

                return $user->fresh();
            }
        );
    }

    public function reenviarCodigo(
        string $email
    ): void {
        $user = User::where(
            'email',
            $email
        )->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'email' => [
                    'No se pudo enviar el código de verificación.',
                ],
            ]);
        }

        $this->enviarCodigo($user);
    }
}