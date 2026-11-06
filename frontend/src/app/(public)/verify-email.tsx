import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { AppHeader, Button, Card, Field, Notice, Screen, TextLink } from '@/components/ui/patient-ui';
import { useAuth } from '@/features/auth/auth-context';
import { resendVerificationCode } from '@/features/auth/service';

export default function VerifyEmail() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = typeof emailParam === 'string' ? emailParam : '';
  const { verifyEmail } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email) return setError('No se encontró el correo de la cuenta. Vuelve a iniciar sesión.');
    if (!/^\d{6}$/.test(code)) return setError('Ingresa el código de 6 dígitos.');
    setBusy(true);
    setError('');
    try {
      await verifyEmail(email, code);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo verificar el correo.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!email || busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setMessage(await resendVerificationCode(email));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo reenviar el código.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen variant="auth">
      <AppHeader title="Verificar correo" subtitle={`Ingresa el código enviado a ${email || 'tu correo'}.`} onBack={() => router.back()} />
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Card>
        <Field
          label="Código de 6 dígitos"
          icon="shield-key-outline"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          autoComplete="one-time-code"
        />
        <Button title="Verificar correo" icon="email-check-outline" loading={busy} onPress={() => void submit()} />
        <TextLink title="Reenviar código" icon="email-fast-outline" onPress={() => void resend()} />
      </Card>
    </Screen>
  );
}
