<?php

namespace App\Services;

use Brevo\Brevo;
use Brevo\Exceptions\BrevoApiException;
use Brevo\Exceptions\BrevoException;
use Brevo\TransactionalEmails\Requests\SendTransacEmailRequest;
use Brevo\TransactionalEmails\Types\SendTransacEmailRequestSender;
use Brevo\TransactionalEmails\Types\SendTransacEmailRequestToItem;
use Illuminate\Support\Facades\Log;

class BrevoEmailService
{
    public function __construct(private Brevo $client) {}

    public function ensureConfigured(): void
    {
        if (
            ! filled(config('services.brevo.api_key'))
            || ! filter_var(config('mail.from.address'), FILTER_VALIDATE_EMAIL)
            || ! filled(config('mail.from.name'))
        ) {
            Log::error('brevo_mail_failed', [
                'reason' => 'missing_brevo_configuration',
            ]);

            abort(
                503,
                'El servicio de correo no está disponible temporalmente.'
            );
        }
    }

    public function sendRecoveryCode(
        string $email,
        string $code
    ): void {
        try {
            $response = $this
                ->client
                ->transactionalEmails
                ->sendTransacEmail(
                    new SendTransacEmailRequest([
                        'sender' => new SendTransacEmailRequestSender([
                            'email' => config('mail.from.address'),
                            'name' => config('mail.from.name'),
                        ]),
                        'to' => [
                            new SendTransacEmailRequestToItem([
                                'email' => $email,
                            ]),
                        ],
                        'subject' => 'Código de recuperación de contraseña',
                        'htmlContent' => view(
                            'emails.password-recovery',
                            [
                                'code' => $code,
                                'senderName' => config('mail.from.name'),
                            ]
                        )->render(),
                        'textContent' =>
                            "Tu código de recuperación es: {$code}\n\n"
                            ."Este código expira en 5 minutos. No lo compartas con nadie.\n\n"
                            .'Si no solicitaste este cambio, ignora este correo.',
                    ])
                );

            if (! filled($response?->messageId)) {
                throw new BrevoException(
                    'Missing message ID'
                );
            }
        } catch (BrevoException $e) {
            $status = $e instanceof BrevoApiException
                ? $e->getCode()
                : null;

            Log::error('password_reset_mail_failed', [
                'provider' => 'brevo_api',
                'http_status' => $status,
                'reason' => match ($status) {
                    400, 422 => 'invalid_request_or_sender',
                    401 => 'invalid_api_key',
                    403 => 'account_or_ip_not_authorized',
                    429 => 'provider_rate_limit',
                    null => 'connection_or_invalid_response',
                    default => 'provider_error',
                },
            ]);

            throw $e;
        }
    }

    public function sendVerificationCode(
        string $email,
        string $code
    ): void {
        try {
            $response = $this
                ->client
                ->transactionalEmails
                ->sendTransacEmail(
                    new SendTransacEmailRequest([
                        'sender' => new SendTransacEmailRequestSender([
                            'email' => config('mail.from.address'),
                            'name' => config('mail.from.name'),
                        ]),
                        'to' => [
                            new SendTransacEmailRequestToItem([
                                'email' => $email,
                            ]),
                        ],
                        'subject' => 'Código de verificación de cuenta',
                        'htmlContent' => view(
                            'emails.email-verification',
                            [
                                'code' => $code,
                                'senderName' => config('mail.from.name'),
                            ]
                        )->render(),
                        'textContent' =>
                            "Tu código de verificación es: {$code}\n\n"
                            ."Este código expira en 5 minutos. No lo compartas con nadie.\n\n"
                            .'Si no creaste esta cuenta, ignora este correo.',
                    ])
                );

            if (! filled($response?->messageId)) {
                throw new BrevoException(
                    'Missing message ID'
                );
            }
        } catch (BrevoException $e) {
            $status = $e instanceof BrevoApiException
                ? $e->getCode()
                : null;

            Log::error('email_verification_mail_failed', [
                'provider' => 'brevo_api',
                'http_status' => $status,
                'reason' => match ($status) {
                    400, 422 => 'invalid_request_or_sender',
                    401 => 'invalid_api_key',
                    403 => 'account_or_ip_not_authorized',
                    429 => 'provider_rate_limit',
                    null => 'connection_or_invalid_response',
                    default => 'provider_error',
                },
            ]);

            throw $e;
        }
    }
}