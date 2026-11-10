import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import {
  AppHeader,
  Button,
  Card,
  EmptyState,
  LoadingState,
  Notice,
  Screen,
} from "@/components/ui/patient-ui";
import { palette, radius, space, type as typography } from "@/constants/theme";
import {
  documentImageSource,
  documentTypeLabels,
  formatFileSize,
  getDocuments,
  uploadDocument,
  type PatientDocument,
} from "@/features/patient/documents";
import { useRemote } from "@/hooks/use-remote";
const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 20 * 1024 * 1024;
const imageSource = (id: string) => {
  try {
    return documentImageSource(id);
  } catch {
    return null;
  }
};
function Preview({ item }: { item: PatientDocument }) {
  const [failed, setFailed] = useState(false);
  const source = item.mimeType.startsWith("image/") ? imageSource(item.id) : null;
  if (!source || failed)
    return (
      <View style={styles.fileIcon}>
        <MaterialCommunityIcons
          name={item.mimeType === "application/pdf" ? "file-pdf-box" : "file-outline"}
          size={30}
          color={palette.primary}
        />
      </View>
    );
  return (
    <Image
      accessibilityLabel={`Vista previa de ${item.fileName}`}
      onError={() => setFailed(true)}
      source={source}
      style={styles.preview}
    />
  );
}
export default function Documents() {
  const loader = useCallback(() => getDocuments(), []);
  const { data, loading, error, reload } = useRemote(loader);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const pick = async (type: "rx" | "documento", camera: boolean) => {
    if (busy) return;
    setMessage("");
    setSubmitError("");
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return setSubmitError(
        camera
          ? "Se necesita permiso para usar la cámara."
          : "Se necesita permiso para seleccionar una imagen.",
      );
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.9,
    };
    const result = camera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    if (!allowed.has(mimeType))
      return setSubmitError("La imagen debe ser JPG, PNG o WebP.");
    if (asset.fileSize && asset.fileSize > maxBytes)
      return setSubmitError("La imagen no puede superar 20 MB.");
    setBusy(true);
    try {
      setMessage(
        await uploadDocument(
          { uri: asset.uri, mimeType, fileName: asset.fileName },
          type,
        ),
      );
      await reload();
    } catch (reason) {
      setSubmitError(
        reason instanceof Error ? reason.message : "No se pudo subir el archivo.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen variant="tab">
      <AppHeader
        title="Mis archivos"
        subtitle="Radiografías y documentos de tu expediente."
        onBack={() => router.back()}
      />
      {message ? <Notice tone="success">{message}</Notice> : null}
      {submitError || error ? (
        <Notice tone="error">{submitError || error}</Notice>
      ) : null}
      <Card>
        <Text style={styles.title}>Subir al expediente</Text>
        <Text style={styles.muted}>
          El consultorio podrá ver lo que subas desde aquí.
        </Text>
        <Button
          title="Subir radiografía"
          icon="image-plus"
          loading={busy}
          onPress={() => void pick("rx", false)}
        />
        <Button
          title="Fotografiar documento"
          icon="camera-outline"
          variant="secondary"
          disabled={busy}
          onPress={() => void pick("documento", true)}
        />
      </Card>
      {loading ? (
        <LoadingState />
      ) : data?.length ? (
        <View style={styles.list}>
          {data.map((item) => (
            <Card key={item.id}>
              <View style={styles.row}>
                <Preview item={item} />
                <View style={styles.copy}>
                  <Text numberOfLines={2} style={styles.title}>
                    {item.fileName}
                  </Text>
                  <Text style={styles.muted}>
                    {documentTypeLabels[item.type]} · {item.date} ·{" "}
                    {formatFileSize(item.size)}
                  </Text>
                  <Text style={styles.caption}>
                    {item.uploadedByPatient
                      ? "Subido por ti"
                      : "Subido por el consultorio"}
                  </Text>
                  {item.description ? (
                    <Text style={styles.muted}>{item.description}</Text>
                  ) : null}
                </View>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="file-image-outline"
          title="Aún no tienes archivos"
          detail="Tus radiografías y documentos aparecerán aquí."
        />
      )}
      <Button
        title="Actualizar archivos"
        icon="refresh"
        variant="ghost"
        onPress={() => void reload()}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { gap: space.md },
  row: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  preview: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: palette.primarySoft,
  },
  fileIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  title: { color: palette.navy, ...typography.label },
  muted: { color: palette.textMuted, ...typography.body },
  caption: { color: palette.textMuted, ...typography.caption },
});
