<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verificación de cuenta</title>
</head>

<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#243746;">

    <table
        role="presentation"
        width="100%"
        cellspacing="0"
        cellpadding="0"
        border="0"
    >
        <tr>
            <td align="center" style="padding:30px 16px;">

                <table
                    role="presentation"
                    width="100%"
                    cellspacing="0"
                    cellpadding="0"
                    border="0"
                    style="
                        max-width:560px;
                        background-color:#ffffff;
                        border-radius:12px;
                        padding:30px;
                    "
                >

                    <tr>
                        <td
                            style="
                                font-size:20px;
                                font-weight:bold;
                                color:#006b93;
                                padding-bottom:20px;
                            "
                        >
                            {{ $senderName }}
                        </td>
                    </tr>

                    <tr>
                        <td
                            style="
                                font-size:18px;
                                font-weight:bold;
                                padding-bottom:12px;
                            "
                        >
                            Verifica tu cuenta
                        </td>
                    </tr>

                    <tr>
                        <td
                            style="
                                font-size:15px;
                                line-height:24px;
                                padding-bottom:24px;
                            "
                        >
                            Usa el siguiente código para verificar tu correo electrónico y activar tu cuenta.
                        </td>
                    </tr>

                    <tr>
                        <td
                            align="center"
                            style="
                                background-color:#f0f4fa;
                                border-radius:10px;
                                padding:24px;
                            "
                        >

                            <div
                                style="
                                    font-size:38px;
                                    font-weight:bold;
                                    letter-spacing:8px;
                                    color:#123c56;
                                "
                            >
                                {{ $code }}
                            </div>

                        </td>
                    </tr>

                    <tr>
                        <td
                            style="
                                font-size:14px;
                                line-height:22px;
                                padding-top:24px;
                                color:#526575;
                            "
                        >
                            Este código expira en
                            <strong>5 minutos</strong>.
                        </td>
                    </tr>

                    <tr>
                        <td
                            style="
                                font-size:14px;
                                line-height:22px;
                                padding-top:8px;
                                color:#526575;
                            "
                        >
                            No compartas este código con nadie.
                        </td>
                    </tr>

                    <tr>
                        <td
                            style="
                                font-size:13px;
                                line-height:20px;
                                padding-top:20px;
                                color:#7a8a99;
                            "
                        >
                            Si no creaste esta cuenta, puedes ignorar este correo.
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>