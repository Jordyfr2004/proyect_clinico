import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader, Button, Card, EmptyState, Field, LoadingState, Notice, Screen } from '@/components/ui/patient-ui';
import { palette, radius, space, type as typography } from '@/constants/theme';
import { documentTypeLabels, downloadDocument, formatFileSize, getDocuments, uploadDocument, type PatientDocument } from '@/features/patient/documents';
import { CLINICAL_MIME_TYPES, prepareUpload, resolveFileMime, type UploadFile } from '@/features/patient/file-upload';
import { exportClinicalFile, fileSession, releasePickedFile, temporaryClinicalFile } from '@/features/patient/file-cache';
import { useRemote } from '@/hooks/use-remote';

export default function Documents() {
  const loader = useCallback(() => getDocuments(), []);
  const { data, loading, error, reload } = useRemote(loader);
  const [draft, setDraft] = useState<{ file: UploadFile; type: 'rx' | 'documento' } | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [refreshWarning, setRefreshWarning] = useState('');
  const [preview, setPreview] = useState<{ uri: string; release: () => void; name: string } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (draft) void releasePickedFile(draft.file.uri).catch(() => undefined); }, [draft]);
  useEffect(() => () => { preview?.release(); }, [preview]);

  const pick = async (source: 'gallery' | 'camera' | 'document') => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setSubmitError(''); setMessage('');
    const current = fileSession();
    let pickedUri: string | undefined;
    try {
      let file: UploadFile;
      if (source === 'document') {
        const result = await DocumentPicker.getDocumentAsync({ type: CLINICAL_MIME_TYPES, copyToCacheDirectory: true, multiple: false, base64: false });
        if (result.canceled) return;
        const asset = result.assets[0];
        pickedUri = asset.uri;
        const mime = resolveFileMime(asset.mimeType, asset.name);
        if (!mime) throw new Error('El archivo debe ser JPG, PNG, WebP o PDF.');
        file = { uri: asset.uri, mimeType: mime, fileName: asset.name, size: asset.size, file: asset.file };
      } else {
        const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) throw new Error(source === 'camera' ? 'Se necesita permiso para usar la cámara.' : 'Se necesita permiso para seleccionar una imagen.');
        if (!current() || !mounted.current) return;
        const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
        const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
        if (result.canceled) return;
        const asset = result.assets[0];
        pickedUri = asset.uri;
        const mime = resolveFileMime(asset.mimeType, asset.fileName ?? asset.uri);
        if (!mime || mime === 'application/pdf') throw new Error('La imagen debe ser JPG, PNG o WebP.');
        file = { uri: asset.uri, mimeType: mime, fileName: asset.fileName, size: asset.fileSize, file: asset.file };
      }
      await prepareUpload(file);
      if (!current() || !mounted.current) return;
      setDraft({ file, type: source === 'gallery' ? 'rx' : 'documento' });
      setDescription('');
      pickedUri = undefined;
    } catch (failure) {
      if (mounted.current && current()) setSubmitError(failure instanceof Error ? failure.message : 'No se pudo seleccionar el archivo.');
    } finally {
      if (pickedUri) void releasePickedFile(pickedUri).catch(() => undefined);
      lock.current = false; if (mounted.current) setBusy(false);
    }
  };
  const upload = async () => {
    if (lock.current || !draft) return;
    lock.current = true; setBusy(true); setMessage(''); setSubmitError('');
    const current = fileSession();
    try {
      const confirmation = await uploadDocument(draft.file, draft.type, description);
      if (!current() || !mounted.current) return;
      setMessage(confirmation); setDraft(null); setDescription('');
      const result = await reload(true);
      if (!result.ok && mounted.current) setRefreshWarning('El archivo fue subido. No se pudo actualizar el listado; reintenta solo la consulta.');
    } catch (failure) {
      if (mounted.current && current()) setSubmitError(failure instanceof Error ? failure.message : 'No se pudo subir el archivo.');
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const open = async (item: PatientDocument, exportFile: boolean) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setSubmitError('');
    const current = fileSession();
    try {
      const bytes = await downloadDocument(item.id);
      if (!current() || !mounted.current) return;
      if (exportFile || item.mimeType === 'application/pdf') await exportClinicalFile(bytes, item.mimeType, item.fileName, current);
      else setPreview({ ...temporaryClinicalFile(bytes, item.mimeType, current), name: item.fileName });
    } catch (failure) {
      if (mounted.current && current()) setSubmitError(failure instanceof Error ? failure.message : 'No se pudo abrir el archivo.');
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const refresh = async () => { const result = await reload(); if (result.ok) setRefreshWarning(''); };
  return <Screen variant="tab" onRefresh={() => void refresh()} refreshing={loading && data !== null}>
    <AppHeader title="Mis archivos" subtitle="Radiografías y documentos de tu expediente." onBack={() => router.back()} />
    {message ? <Notice tone="success">{message}</Notice> : null}
    {submitError || refreshWarning || error ? <Notice tone="error">{submitError || refreshWarning || error}</Notice> : null}
    <Card>
      <Text style={styles.title}>Subir al expediente</Text>
      <Text style={styles.muted}>JPG, PNG, WebP o PDF · máximo 20 MB. El consultorio podrá consultar tus archivos.</Text>
      <Button title="Seleccionar radiografía" icon="image-plus" disabled={busy} onPress={() => void pick('gallery')} />
      <Button title="Fotografiar documento" icon="camera-outline" variant="secondary" disabled={busy} onPress={() => void pick('camera')} />
      <Button title="Seleccionar PDF o imagen" icon="file-plus-outline" variant="secondary" disabled={busy} onPress={() => void pick('document')} />
      {draft ? <>
        <Text style={styles.title}>{draft.file.fileName || 'Archivo seleccionado'}</Text>
        {draft.file.mimeType.startsWith('image/') ? <Image source={{ uri: draft.file.uri }} style={styles.draftPreview} accessibilityLabel="Imagen seleccionada" resizeMode="contain" /> : null}
        <Text style={styles.caption}>{documentTypeLabels[draft.type]}</Text>
        <Field label="Descripción (opcional)" value={description} onChangeText={setDescription} maxLength={1000} multiline editable={!busy} />
        <Button title="Subir archivo" loading={busy} onPress={() => void upload()} />
        <Button title="Descartar selección" variant="ghost" disabled={busy} onPress={() => setDraft(null)} />
      </> : null}
      {busy && !draft ? <LoadingState label="Procesando archivo…" /> : null}
    </Card>
    {loading && data === null ? <LoadingState /> : data?.length ? <View style={styles.list}>{data.map(item => <Card key={item.id}>
      <View style={styles.row}>
        <View style={styles.fileIcon}><MaterialCommunityIcons name={item.mimeType === 'application/pdf' ? 'file-pdf-box' : 'file-image-outline'} size={30} color={palette.primary} /></View>
        <View style={styles.copy}>
          <Text style={styles.title}>{item.fileName}</Text>
          <Text style={styles.muted}>{documentTypeLabels[item.type]} · {item.date} · {formatFileSize(item.size)}</Text>
          <Text style={styles.caption}>{item.uploadedByPatient === null ? 'Autor no registrado' : item.uploadedByPatient ? 'Subido por ti' : 'Subido por el consultorio'}</Text>
          {item.description ? <Text style={styles.muted}>{item.description}</Text> : null}
        </View>
      </View>
      <Button title={item.mimeType === 'application/pdf' ? 'Abrir o guardar PDF' : 'Ver imagen'} variant="secondary" disabled={busy} onPress={() => void open(item, false)} />
      {item.mimeType !== 'application/pdf' ? <Button title="Guardar o compartir" icon="export-variant" variant="ghost" disabled={busy} onPress={() => void open(item, true)} /> : null}
    </Card>)}</View> : !error ? <EmptyState icon="file-image-outline" title="Aún no tienes archivos" detail="Tus radiografías y documentos aparecerán aquí." /> : null}
    <Button title="Actualizar archivos" icon="refresh" variant="ghost" disabled={loading} onPress={() => void refresh()} />
    <Modal visible={Boolean(preview)} transparent animationType="none" onRequestClose={() => setPreview(null)}>
      <View style={styles.backdrop}><View accessibilityViewIsModal style={styles.modal}><ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.title}>{preview?.name}</Text>
        {preview ? <Image source={{ uri: preview.uri }} style={styles.largePreview} resizeMode="contain" accessibilityLabel={`Vista previa de ${preview.name}`} /> : null}
        <Button title="Cerrar vista previa" onPress={() => setPreview(null)} />
      </ScrollView></View></View>
    </Modal>
  </Screen>;
}
const styles = StyleSheet.create({
  list: { gap: space.md }, row: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  fileIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 }, title: { color: palette.navy, ...typography.label }, muted: { color: palette.textMuted, ...typography.body }, caption: { color: palette.textMuted, ...typography.caption },
  draftPreview: { width: '100%', height: 180, borderRadius: radius.md }, largePreview: { width: '100%', height: 360 },
  backdrop: { flex: 1, padding: space.lg, backgroundColor: palette.scrim, justifyContent: 'center', alignItems: 'center' },
  modal: { width: '100%', maxWidth: 720, maxHeight: '90%', padding: space.lg, borderRadius: radius.lg, backgroundColor: palette.surface },
});
