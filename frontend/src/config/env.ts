export const getApiBaseUrl = (value = process.env.EXPO_PUBLIC_API_URL): string => {
  const candidate = value?.trim();
  if (!candidate) {
    throw new Error('Configura EXPO_PUBLIC_API_URL antes de iniciar la aplicación.');
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL debe ser una dirección HTTP(S) válida.');
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('EXPO_PUBLIC_API_URL debe ser una dirección HTTP(S) válida.');
  }

  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/$/, '');
};
