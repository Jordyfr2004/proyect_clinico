import { router } from "expo-router";
import { useCallback } from "react";
import {
  AppHeader,
  Button,
  EmptyState,
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
  const initialLoading = loading && data === null;
  const unavailable = Boolean(error) && data === null;
  return (
    <Screen variant="tab">
      <AppHeader
        title="Historia clínica"
        subtitle="Información registrada por el personal autorizado."
        onBack={() => router.back()}
      />
      {initialLoading ? (
        <LoadingState />
      ) : (
        <>
          {error ? <Notice tone="error">{error}</Notice> : null}
          {unavailable ? null : data ? (
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
                <InfoRow label="Cirugías" value={data.surgeries} last />
              </Section>
              <Section title="Tratamiento actual" icon="pill">
                <InfoRow label="Medicación" value={data.currentMedication} last />
              </Section>
            </>
          ) : (
            <EmptyState
              icon="file-document-outline"
              title="Sin historial clínico"
              detail="El personal autorizado todavía no ha registrado un historial para tu cuenta."
            />
          )}
          <Button
            title={unavailable ? "Reintentar" : "Actualizar historial"}
            icon="refresh"
            variant="ghost"
            onPress={() => void reload()}
          />
        </>
      )}
    </Screen>
  );
}
