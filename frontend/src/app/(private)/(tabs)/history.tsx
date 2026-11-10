import { router } from "expo-router";
import { useCallback } from "react";
import {
  AppHeader,
  Button,
  InfoRow,
  LoadingState,
  Notice,
  Screen,
  Section,
} from "@/components/ui/patient-ui";
import { getMedicalHistory } from "@/features/patient/history";
import { useRemote } from "@/hooks/use-remote";
export default function History() {
  const loader = useCallback(() => getMedicalHistory(), []);
  const { data, loading, error, reload } = useRemote(loader);
  return (
    <Screen variant="tab">
      <AppHeader
        title="Historia clínica"
        subtitle="Información registrada por el personal autorizado."
        onBack={() => router.back()}
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {loading ? (
        <LoadingState />
      ) : data ? (
        <>
          <Section title="Datos generales" icon="account-heart-outline">
            <InfoRow label="Sexo" value={data.sex} icon="account-outline" />
            <InfoRow
              label="Lugar de nacimiento"
              value={data.birthplace}
              icon="map-marker-outline"
              last
            />
          </Section>
          <Section title="Antecedentes" icon="file-document-outline">
            <InfoRow label="Enfermedades" value={data.illnesses} />
            <InfoRow label="Cirugías" value={data.surgeries} />
            <InfoRow label="Alergias" value={data.allergies} />
            <InfoRow
              label="Antecedentes familiares"
              value={data.familyHistory}
              last
            />
          </Section>
          <Section title="Tratamiento actual" icon="pill">
            <InfoRow label="Medicación" value={data.currentMedication} last />
          </Section>
          <Section title="Notas" icon="note-text-outline">
            <InfoRow label="Notas adicionales" value={data.notes} last />
          </Section>
        </>
      ) : null}
      <Button
        title="Actualizar historial"
        icon="refresh"
        variant="ghost"
        onPress={() => void reload()}
      />
    </Screen>
  );
}
