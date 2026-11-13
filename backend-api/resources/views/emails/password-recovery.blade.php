<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de recuperación de contraseña</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#243746;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
            <td align="center" style="padding:24px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
                    <tr>
                        <td style="padding:0 0 20px;font-size:18px;font-weight:bold;color:#006b93;">{{ $senderName }}</td>
                    </tr>
                    <tr>
                        <td align="center" style="padding:28px 16px;background-color:#f0f4fa;border-radius:12px;">
                            <p style="margin:0 0 18px;font-size:16px;line-height:24px;">Tu código para restablecer la contraseña</p>
                            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:38px;line-height:52px;font-weight:bold;letter-spacing:6px;color:#123c56;white-space:nowrap;">{{ $code }}</p>
                            <p style="margin:18px 0 0;font-size:14px;line-height:22px;">Este código expira en <strong>5 minutos</strong>.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 0 0;font-size:14px;line-height:22px;color:#526575;">
                            <p style="margin:0 0 8px;">No compartas este código con nadie.</p>
                            <p style="margin:0;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
