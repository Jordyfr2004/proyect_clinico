import { useState } from "react";
import { router, type Href } from "expo-router";
import {
  AuthHeader,
  Button,
  Card,
  Field,
  Notice,
  PasswordField,
  Screen,
  TextLink,
} from "@/components/ui/patient-ui";
import { useAuth } from "@/features/auth/auth-context";

export default function Login() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!username.trim() || !password)
      return setError("Ingresa tu cédula y contraseña.");
    setBusy(true);
    setError("");
    try {
      await signIn(username.trim(), password);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo iniciar sesión.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen variant="auth">
      <AuthHeader
        title="Portal del paciente"
        subtitle="Accede de forma segura a tu información y servicios de la clínica."
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Card>
        <Field
          label="Cédula"
          icon="account-outline"
          value={username}
          onChangeText={setUsername}
          keyboardType="number-pad"
          autoComplete="username"
          returnKeyType="next"
        />
        <PasswordField
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        <Button
          title="Ingresar"
          icon="login"
          loading={busy}
          onPress={() => void submit()}
        />
      </Card>
      <Card>
        <TextLink
          title="Crear cuenta de paciente"
          icon="account-plus-outline"
          onPress={() => router.push("/(public)/register" as Href)}
        />
        <TextLink
          title="Olvidé mi contraseña"
          icon="lock-question"
          onPress={() => router.push("/(public)/forgot-password" as Href)}
        />
      </Card>
    </Screen>
  );
}
