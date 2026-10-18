import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { authenticatedImageSource } from "@/api/client";
import {
  AppHeader,
  Button,
  InfoRow,
  LoadingState,
  Notice,
  Screen,
  Section,
} from "@/components/ui/patient-ui";
import {
  elevation,
  palette,
  space,
  type as typography,
} from "@/constants/theme";
import { useAuth } from "@/features/auth/auth-context";
import {
  deleteProfilePhoto,
  getProfile,
  uploadProfilePhoto,
} from "@/features/patient/profile";
import { useRemote } from "@/hooks/use-remote";

const supportedPhotoMime = new Set(["image/jpeg", "image/png", "image/webp"]);
const photoMimeByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const resolvePhotoMime = (asset: ImagePicker.ImagePickerAsset) => {
  if (asset.mimeType) {
    const mime =
      asset.mimeType.toLowerCase() === "image/jpg"
        ? "image/jpeg"
        : asset.mimeType.toLowerCase();
    return supportedPhotoMime.has(mime) ? mime : null;
  }
  const name = asset.fileName ?? asset.uri;
  const extension = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(name)?.[1].toLowerCase();
  return extension ? (photoMimeByExtension[extension] ?? null) : null;
};

export default function Profile() {
  const { signOut } = useAuth();
  const loader = useCallback(() => getProfile(), []);
  const { data, loading, error, reload } = useRemote(loader);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const initialLoading = loading && data === null;
  const unavailable = Boolean(error) && data === null;
  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return setFeedback("Se necesita permiso para seleccionar una foto.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const mimeType = resolvePhotoMime(asset);
    if (!mimeType) return setFeedback("La foto debe ser JPG, PNG o WebP.");
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024)
      return setFeedback("La foto no puede superar 5 MB.");
    setBusy(true);
    setFeedback("");
    try {
      await uploadProfilePhoto(asset.uri, mimeType);
      setFeedback("Foto actualizada.");
      await reload();
    } catch (reason) {
      setFeedback(
        reason instanceof Error ? reason.message : "No se pudo subir la foto.",
      );
    } finally {
      setBusy(false);
    }
  };
  const removePhoto = () =>
    Alert.alert("Eliminar foto", "¿Deseas eliminar tu foto de perfil?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () =>
          void (async () => {
            setBusy(true);
            try {
              await deleteProfilePhoto();
              setFeedback("Foto eliminada.");
              await reload();
            } catch (reason) {
              setFeedback(
                reason instanceof Error
                  ? reason.message
                  : "No se pudo eliminar la foto.",
              );
            } finally {
              setBusy(false);
            }
          })(),
      },
    ]);
  let source;
  try {
    source = data?.photoUrl
      ? authenticatedImageSource(data.photoUrl)
      : undefined;
  } catch {
    source = undefined;
  }
  return (
    <Screen variant="tab">
      <AppHeader
        title="Mi perfil"
        subtitle="Administra tu identidad y sesión."
      />
      {!initialLoading && error ? <Notice tone="error">{error}</Notice> : null}
      {feedback ? (
        <Notice
          tone={
            feedback.includes("actualizada") || feedback.includes("eliminada")
              ? "success"
              : "info"
          }
        >
          {feedback}
        </Notice>
      ) : null}
      {initialLoading ? (
        <LoadingState />
      ) : data ? (
        <>
          <View style={styles.identity}>
            <View style={styles.avatarWrap}>
              {source ? (
                <Image
                  source={source}
                  style={styles.photo}
                  accessibilityLabel="Foto de perfil"
                />
              ) : (
                <View style={[styles.photo, styles.placeholder]}>
                  <Text style={styles.initial}>
                    {data.names.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cambiar foto"
                disabled={busy}
                onPress={() => void choosePhoto()}
                style={styles.camera}
              >
                <MaterialCommunityIcons
                  name="camera-outline"
                  size={20}
                  color={palette.white}
                />
              </Pressable>
            </View>
            <Text style={styles.name}>{data.names}</Text>
            <Text style={styles.code}>{data.code}</Text>
          </View>
          <Section title="Datos del paciente" icon="account-outline">
            <InfoRow
              label="Cédula"
              value={data.nationalId}
              icon="card-account-details-outline"
            />
            <InfoRow label="Teléfono" value={data.phone} icon="phone-outline" />
            <InfoRow
              label="Dirección"
              value={data.address}
              icon="map-marker-outline"
            />
            <InfoRow
              label="Fecha de nacimiento"
              value={data.birthdate}
              icon="calendar-outline"
              last
            />
          </Section>
          <Button
            title="Cambiar foto"
            icon="camera-outline"
            variant="secondary"
            loading={busy}
            onPress={() => void choosePhoto()}
          />
          {data.photoUrl ? (
            <Button
              title="Eliminar foto"
              icon="delete-outline"
              variant="danger"
              disabled={busy}
              onPress={removePhoto}
            />
          ) : null}
        </>
      ) : unavailable ? (
        <Button
          title="Reintentar"
          icon="refresh"
          variant="ghost"
          onPress={() => void reload()}
        />
      ) : null}
      <Button
        title="Cerrar sesión"
        icon="logout"
        variant="ghost"
        onPress={() => void signOut()}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  identity: {
    alignItems: "center",
    gap: space.xs,
    paddingVertical: space.sm,
  },
  avatarWrap: { width: 116, height: 116, position: "relative" },
  photo: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 4,
    borderColor: palette.surface,
    ...elevation,
  },
  placeholder: {
    backgroundColor: palette.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  initial: { color: palette.primary, fontSize: 42, fontWeight: "800" },
  camera: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primary,
    borderWidth: 3,
    borderColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: palette.navy, marginTop: space.xs, ...typography.title },
  code: { color: palette.textMuted, ...typography.body },
});
