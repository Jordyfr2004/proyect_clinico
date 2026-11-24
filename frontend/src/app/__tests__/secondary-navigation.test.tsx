import { Text } from 'react-native';
import { router, Stack, type Href } from 'expo-router';
import { act, renderRouter, waitFor } from 'expo-router/testing-library';
import TabsLayout from '../(private)/(tabs)/_layout';

test('secondary clinical routes remain reachable while only four tabs are visible', async () => {
  const view = await renderRouter({
    _layout: () => <Stack />,
    '(private)/_layout': () => <Stack />,
    '(private)/(tabs)/_layout': TabsLayout,
    '(private)/(tabs)/index': () => <Text>Inicio</Text>,
    '(private)/(tabs)/appointments': () => <Text>Citas</Text>,
    '(private)/(tabs)/services': () => <Text>Servicios</Text>,
    '(private)/(tabs)/profile': () => <Text>Perfil</Text>,
    '(private)/(tabs)/history': () => <Text>Historial autorizado</Text>,
    '(private)/(tabs)/documents': () => <Text>Archivos autorizados</Text>,
  });
  await act(async () => router.push('/(private)/(tabs)/documents' as Href));
  await waitFor(() => expect(view.getPathname()).toBe('/documents'));
  expect(view.getByText('Archivos autorizados')).toBeTruthy();
  expect(view.getAllByLabelText(/, tab, \d of \d/)).toHaveLength(4);
  await act(async () => router.push('/(private)/(tabs)/history'));
  await waitFor(() => expect(view.getPathname()).toBe('/history'));
  expect(view.getByText('Historial autorizado')).toBeTruthy();
});
