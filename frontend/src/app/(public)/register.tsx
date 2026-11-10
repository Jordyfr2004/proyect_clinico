import { useState } from "react";
import { router } from "expo-router";
import {
  AppHeader,
  Button,
  Field,
  Notice,
  PasswordField,
  Screen,
  Section,
} from "@/components/ui/patient-ui";
import { DateField } from "@/components/ui/date-field";
import { useAuth } from "@/features/auth/auth-context";
import type { RegisterPatientInput } from "@/features/auth/types";
import { validateRegistration } from "@/features/auth/validation";
const empty: RegisterPatientInput = {
  nombres: "",
  cedula: "",
  email: "",
  telefono: "",
  direccion: "",
  fecha_nacimiento: "",
  password: "",
  password_confirmation: "",
};

export default function Register() {
  const { signUp } = useAuth();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const field = (key: keyof RegisterPatientInput) => (value: string) =>
    setForm((old) => ({ ...old, [key]: value }));
  const submit = async () => {
    const validationError = validateRegistration(form);
    if (validationError) return setError(validationError);
    setBusy(true);
    setError("");
    try {
      await signUp({ ...form, email: form.email.trim().toLowerCase() });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo completar el registro.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen variant="auth">
      <AppHeader
        title="Crear cuenta"
        subtitle="Completa tus datos para registrarte como paciente."
        onBack={() => router.back()}
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Section title="Datos personales" icon="account-outline">
        <Field
          label="Nombres completos"
          icon="account-outline"
          value={form.nombres}
          onChangeText={field("nombres")}
          autoComplete="name"
        />
        <Field
          label="Cédula"
          icon="card-account-details-outline"
          keyboardType="number-pad"
          value={form.cedula}
          onChangeText={field("cedula")}
        />
        <DateField
          label="Fecha de nacimiento"
          value={form.fecha_nacimiento}
          onChange={field("fecha_nacimiento")}
        />
      </Section>
      <Section title="Contacto" icon="phone-outline">
        <Field
          label="Correo"
          icon="email-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={form.email}
          onChangeText={field("email")}
        />
        <Field
          label="Teléfono"
          icon="phone-outline"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={form.telefono}
          onChangeText={field("telefono")}
        />
        <Field
          label="Dirección"
          icon="map-marker-outline"
          value={form.direccion}
          onChangeText={field("direccion")}
        />
      </Section>
      <Section title="Seguridad" icon="shield-lock-outline">
        <PasswordField
          label="Contraseña"
          value={form.password}
          onChangeText={field("password")}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirmar contraseña"
          value={form.password_confirmation}
          onChangeText={field("password_confirmation")}
          autoComplete="new-password"
        />
      </Section>
      <Button
        title="Registrarme"
        icon="account-check-outline"
        loading={busy}
        onPress={() => void submit()}
      />
    </Screen>
  );
}
