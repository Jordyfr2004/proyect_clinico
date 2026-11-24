import { Button, LoadingState, Notice, Screen } from '@/components/ui/patient-ui';
import { useAuth } from '@/features/auth/auth-context';

export function SessionRestoration() {
  const { restoreError, retryRestore, signOut } = useAuth();
  return <Screen scroll={false}>
    {restoreError ? <>
      <Notice tone="error">{restoreError}</Notice>
      <Button title="Reintentar conexión" onPress={retryRestore} />
      <Button title="Cerrar sesión local" variant="ghost" onPress={() => void signOut()} />
    </> : <LoadingState />}
  </Screen>;
}
