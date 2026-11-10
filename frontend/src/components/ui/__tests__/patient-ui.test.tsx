import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button, getScreenBottomPadding } from '../patient-ui';

describe('Clínica Premium UI primitives', () => {
  test('a disabled action announces its state and cannot be submitted', () => {
    const onPress = jest.fn();
    render(<Button title="Registrarme" disabled onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Registrarme' });
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: false });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('stack screens own the Android bottom inset while tab screens do not duplicate it', () => {
    expect(getScreenBottomPadding('stack', 24)).toBe(40);
    expect(getScreenBottomPadding('auth', 24)).toBe(40);
    expect(getScreenBottomPadding('tab', 24)).toBe(16);
  });
});
