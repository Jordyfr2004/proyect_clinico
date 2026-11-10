import { applyDateSelection, formatDateForApi } from '../date-field';

describe('native birthdate field', () => {
  test('formats the selected local calendar date for Laravel', () => {
    expect(formatDateForApi(new Date(1994, 2, 7))).toBe('1994-03-07');
  });

  test('keeps the current value when the Android picker is dismissed', () => {
    expect(applyDateSelection('1994-03-07', 'dismissed', undefined)).toBe('1994-03-07');
  });
});
