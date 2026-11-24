import { act, render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { DateField } from '../date-field';

test('Expo Web selects a birthdate through a supported HTML date input', () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  try {
    const onChange = jest.fn();
    const view = render(<DateField label="Fecha" value="1990-01-01" onChange={onChange} />);
    const input = view.UNSAFE_getByType('input' as never);
    expect(input.props.type).toBe('date');
    act(() => input.props.onChange({ currentTarget: { value: '2000-02-29' } }));
    expect(onChange).toHaveBeenCalledWith('2000-02-29');
  } finally { Object.defineProperty(Platform, 'OS', { configurable: true, value: original }); }
});
