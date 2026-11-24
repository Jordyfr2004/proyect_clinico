import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { subscribeAppointments } from '@/features/patient/appointment-events';

/** Each screen owns its data; mutations invalidate both mounted screens. */
export function useAppointmentRefresh(reload: (force?: boolean) => Promise<unknown>) {
  const first = useRef(true);
  useFocusEffect(useCallback(() => {
    if (first.current) first.current = false;
    else void reload();
  }, [reload]));
  useEffect(() => subscribeAppointments(event => {
    if (event.type === 'changed') void reload(true);
  }), [reload]);
}
