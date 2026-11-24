import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { confirmAction } from "@/components/ui/confirm-action";
import { usePrivatePhoto } from "@/hooks/use-private-photo";
import { fileSession, releasePickedFile } from "@/features/patient/file-cache";
import {
  AppHeader,
  Button,
  InfoRow,
  LoadingState,
  Notice,
  Screen,
  Section,
} from "@/components/ui/patient-ui";
import { formatDateForDisplay } from "@/components/ui/date-field";
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
  const { signOut, user } = useAuth();
  const loader = useCallback(() => getProfile(), []);
  const { data, loading, error, reload } = useRemote(loader);
  const lock = useRef(false);
  const [photoRevision, setPhotoRevision] = useState(0);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [mutationBlocked, setMutationBlocked] = useState(false);
  const { source, error: photoError } = usePrivatePhoto(data?.photoUrl, photoRevision);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const initialLoading = loading && data === null;
  const unavailable = Boolean(error) && data === null;
  const refreshProfile = async (confirmed = false) => {
    const result = await reload(confirmed);
    if (result.ok) { setMutationBlocked(false); setPhotoFailed(false); setPhotoRevision(v => v + 1); }
    else if (confirmed) { setMutationBlocked(true); setFeedback(old => `${old} El cambio fue realizado; reintenta solo la consulta del perfil.`); }
  };
  const choosePhoto = async () => {
    if (lock.current || mutationBlocked) return;
    lock.current = true; setBusy(true); setFeedback("");
    const current = fileSession();
    let uri: string | undefined;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setFeedback("Se necesita permiso para seleccionar una foto."); return; }
      if (!current()) return;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0]; uri = asset.uri;
      const mimeType = resolvePhotoMime(asset);
      if (!mimeType) { setFeedback("La foto debe ser JPG, PNG o WebP."); return; }
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) { setFeedback("La foto no puede superar 5 MB."); return; }
      if (!current()) return;
      const confirmation = await uploadProfilePhoto(asset.uri, mimeType, asset.fileSize, asset.file);
      if (!current()) return;
      setFeedback(confirmation); await refreshProfile(true);
    } catch (reason) { if (current()) setFeedback(reason instanceof Error ? reason.message : "No se pudo subir la foto."); }
    finally { if (uri) void releasePickedFile(uri).catch(() => undefined); lock.current = false; setBusy(false); }
  };
  const removePhoto = () => confirmAction("Eliminar foto", "Confirma que deseas eliminar tu foto de perfil.", "Eliminar", () => {
    if (lock.current || mutationBlocked) return;
    lock.current = true; setBusy(true);
    const current = fileSession();
    void (async () => {
      try {
        const confirmation = await deleteProfilePhoto();
        if (!current()) return;
        setFeedback(confirmation); await refreshProfile(true);
      } catch (reason) { if (current()) setFeedback(reason instanceof Error ? reason.message : "No se pudo eliminar la foto."); }
      finally { lock.current = false; setBusy(false); }
    })();
  }, true);
  return (
    <Screen variant="tab" onRefresh={() => void refreshProfile()} refreshing={loading && data !== null}>
      <AppHeader
        title="Mi perfil"
        subtitle="Administra tu identidad y sesión."
      />
      {!initialLoading && error ? <Notice tone="error">{error}</Notice> : null}
      {data?.photoUrl && (photoError || photoFailed) ? <>
        <Notice tone="error">{photoError || 'No se pudo mostrar la foto de perfil.'}</Notice>
        <Button title="Reintentar foto" variant="ghost" onPress={() => { setPhotoFailed(false); setPhotoRevision(value => value + 1); }} />
      </> : null}
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
              {source && !photoFailed ? (
                <Image
                  source={source}
                  onError={() => setPhotoFailed(true)}
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
                disabled={busy || mutationBlocked}
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
            {user?.email ? (
              <InfoRow label="Correo" value={user.email} icon="email-outline" />
            ) : null}
            <InfoRow
              label="Dirección"
              value={data.address}
              icon="map-marker-outline"
            />
            <InfoRow
              label="Fecha de nacimiento"
              value={data.birthdate ? formatDateForDisplay(data.birthdate) : null}
              icon="calendar-outline"
              last
            />
          </Section>
          <Button
            title="Cambiar foto"
            icon="camera-outline"
            variant="secondary"
            loading={busy}
            disabled={mutationBlocked}
            onPress={() => void choosePhoto()}
          />
          {data.photoUrl ? (
            <Button
              title="Eliminar foto"
              icon="delete-outline"
              variant="danger"
              disabled={busy || mutationBlocked}
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
      {mutationBlocked ? <Button title="Actualizar perfil" icon="refresh" onPress={() => void refreshProfile()} /> : null}
      <Button
        title="Cerrar sesión"
        icon="logout"
        variant="ghost"
        onPress={() => confirmAction("Cerrar sesi\u00f3n", "Confirma que deseas salir de tu cuenta.", "Salir", () => void signOut())}
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
