import { Alert, Platform } from 'react-native';

export function confirmAction(title: string, message: string, label: string, action: () => void, destructive = false) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) action();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Volver', style: 'cancel' },
    { text: label, style: destructive ? 'destructive' : 'default', onPress: action },
  ]);
}
