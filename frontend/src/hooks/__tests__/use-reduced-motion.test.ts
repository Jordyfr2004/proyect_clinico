import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotionPreference } from '../use-reduced-motion';

test('respects the initial reduced motion preference and subsequent native changes', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  let changed!: (value: boolean) => void;
  const remove = jest.fn();
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_name, handler) => { changed = handler as typeof changed; return { remove }; });
  const view = renderHook(() => useReducedMotionPreference());
  await waitFor(() => expect(view.result.current).toBe(true));
  act(() => changed(false));
  expect(view.result.current).toBe(false);
  view.unmount();
  expect(remove).toHaveBeenCalled();
  jest.restoreAllMocks();
});
