import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'clinic.patient.access-token';

export const saveAccessToken = (token: string): Promise<void> => SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);

export const loadAccessToken = async (): Promise<string | null> =>
  (await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)) || null;

export const clearAccessToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, '');
  }
};
