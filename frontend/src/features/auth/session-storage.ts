import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'clinic.patient.access-token';
let webToken: string | null = null;

export const saveAccessToken = async (token: string): Promise<void> => {
  if (Platform.OS === 'web') { webToken = token; return; }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
};

export const loadAccessToken = async (): Promise<string | null> =>
  Platform.OS === 'web' ? webToken : (await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)) || null;

export const clearAccessToken = async (): Promise<void> => {
  if (Platform.OS === 'web') { webToken = null; return; }
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, '');
  }
};
