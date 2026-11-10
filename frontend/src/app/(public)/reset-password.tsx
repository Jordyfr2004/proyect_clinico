import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  AppHeader,
  Button,
  Card,
  Field,
  Notice,
  PasswordField,
  Screen,
} from "@/components/ui/patient-ui";
import { resetPassword } from "@/features/auth/service";
import { validateResetPassword } from "@/features/auth/validation";
export default function ResetPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const validationError = validateResetPassword(
      email,
      code,
      password,
      confirmation,
    );
    if (validationError) return setError(validationError);
    setBusy(true);
    setError("");
    try {
      setMessage(
        await resetPassword({
          email: email.trim().toLowerCase(),
          code,
          password,
          password_confirmation: confirmation,
        }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo cambiar la contraseña.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen variant="auth">
      <AppHeader
        title="Restablecer contraseña"
        subtitle="Ingresa el código recibido y elige una contraseña nueva."
        onBack={() => router.back()}
      />
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Card>
        <Field
          label="Correo electrónico"
          icon="email-outline"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Código de 6 dígitos"
          icon="shield-key-outline"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        <PasswordField
          label="Nueva contraseña"
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirmar contraseña"
          value={confirmation}
          onChangeText={setConfirmation}
          autoComplete="new-password"
        />
        <Button
          title="Cambiar contraseña"
          icon="lock-check-outline"
          loading={busy}
          onPress={() => void submit()}
        />
      </Card>
    </Screen>
  );
}
