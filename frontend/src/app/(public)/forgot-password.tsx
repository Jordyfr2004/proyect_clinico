import { useState } from "react";
import { router, type Href } from "expo-router";
import {
  AppHeader,
  Button,
  Card,
  Field,
  Notice,
  Screen,
} from "@/components/ui/patient-ui";
import { requestPasswordReset } from "@/features/auth/service";
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!email.trim()) return setError("Ingresa tu correo.");
    setBusy(true);
    setError("");
    try {
      setMessage(await requestPasswordReset(email.trim().toLowerCase()));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo enviar la solicitud.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen variant="auth">
      <AppHeader
        title="Recuperar acceso"
        subtitle="Si la cuenta existe, recibirás un código en el correo registrado."
        onBack={() => router.back()}
      />
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Card>
        <Field
          label="Correo electrónico"
          icon="email-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <Button
          title="Solicitar código"
          icon="email-fast-outline"
          loading={busy}
          onPress={() => void submit()}
        />
        <Button
          title="Ya tengo un código"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/(public)/reset-password",
              params: { email },
            } as unknown as Href)
          }
        />
      </Card>
    </Screen>
  );
}
