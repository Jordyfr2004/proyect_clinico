import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'clinic.patient.access-token';

export const saveAccessToken = (token: string): Promise<void> =>
  SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);

export const loadAccessToken = (): Promise<string | null> =>
  SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

export const clearAccessToken = (): Promise<void> => SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
