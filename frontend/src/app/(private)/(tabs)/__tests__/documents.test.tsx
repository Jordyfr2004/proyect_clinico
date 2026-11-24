import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Documents from '../documents';
import { useRemote } from '@/hooks/use-remote';
import { uploadDocument, downloadDocument } from '@/features/patient/documents';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: jest.fn() }));
jest.mock('@/hooks/use-remote', () => ({ useRemote: jest.fn() }));
jest.mock('@/features/patient/documents', () => ({ ...jest.requireActual('@/features/patient/documents'), getDocuments: jest.fn(), uploadDocument: jest.fn(), downloadDocument: jest.fn() }));
jest.mock('@/features/patient/file-cache', () => ({ fileSession: () => () => true, releasePickedFile: jest.fn().mockResolvedValue(undefined), exportClinicalFile: jest.fn(), temporaryClinicalFile: jest.fn() }));
const renderScreen = () => render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 360, height: 720 }, insets: { top: 24, left: 0, right: 0, bottom: 24 } }}><Documents /></SafeAreaProvider>);
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRemote).mockReturnValue({ data: [], loading: false, error: '', reload: jest.fn().mockResolvedValue({ ok: true, data: [] }) } as never);
});
test('a failed document list offers retry without claiming there are no files', () => {
  jest.mocked(useRemote).mockReturnValue({ data: null, loading: false, error: 'Sin conexión', reload: jest.fn() } as never);
  renderScreen();
  expect(screen.getByText('Sin conexión')).toBeTruthy();
  expect(screen.queryByText('Aún no tienes archivos')).toBeNull();
  expect(screen.getByRole('button', { name: 'Actualizar archivos' })).toBeTruthy();
});
test('selects a PDF, retains its description and never repeats a confirmed upload after a failed refresh', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ name: 'test.pdf', uri: 'file:///cache/test.pdf', mimeType: 'application/pdf', size: 100, lastModified: 0 }] });
  jest.mocked(uploadDocument).mockResolvedValue('Archivo subido correctamente.');
  const reload = jest.fn().mockResolvedValue({ ok: false });
  jest.mocked(useRemote).mockReturnValue({ data: [], loading: false, error: '', reload } as never);
  renderScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar PDF o imagen' }));
  await screen.findByText('test.pdf');
  fireEvent.changeText(screen.getByLabelText('Descripción (opcional)'), 'Documento de prueba');
  fireEvent.press(screen.getByRole('button', { name: 'Subir archivo' }));
  await screen.findByText('Archivo subido correctamente.');
  expect(uploadDocument).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'application/pdf', size: 100 }), 'documento', 'Documento de prueba');
  expect(reload).toHaveBeenCalledWith(true);
  expect(screen.queryByRole('button', { name: 'Subir archivo' })).toBeNull();
  expect(screen.getByText(/El archivo fue subido/)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Actualizar archivos' }));
  expect(uploadDocument).toHaveBeenCalledTimes(1);
});
test('rejects files larger than 20 MB before displaying an upload action', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: false, assets: [{ name: 'large.pdf', uri: 'file:///cache/test.pdf', mimeType: 'application/pdf', size: 21 * 1024 * 1024, lastModified: 0 }] });
  renderScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar PDF o imagen' }));
  await screen.findByText('El archivo no puede superar 20 MB.');
  expect(screen.queryByRole('button', { name: 'Subir archivo' })).toBeNull();
});
test('camera permission denial is recoverable', async () => {
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue({ granted: false } as never);
  renderScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Fotografiar documento' }));
  await screen.findByText('Se necesita permiso para usar la cámara.');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Seleccionar PDF o imagen' })).toBeEnabled());
});
test('opening a PDF downloads through the private document service', async () => {
  jest.mocked(useRemote).mockReturnValue({ data: [{ id: 'e1', fileName: 'test.pdf', mimeType: 'application/pdf', type: 'documento', date: '2026-11-24', size: 100, uploadedByPatient: null }], loading: false, error: '', reload: jest.fn() } as never);
  jest.mocked(downloadDocument).mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
  renderScreen();
  fireEvent.press(screen.getByRole('button', { name: 'Abrir o guardar PDF' }));
  await waitFor(() => expect(downloadDocument).toHaveBeenCalledWith('e1'));
  expect(screen.getByText('Autor no registrado')).toBeTruthy();
});
