import {
  applyDateSelection,
  formatDateForApi,
  formatDateForDisplay,
} from '../date-field';

describe('native birthdate field', () => {
  test('formats the selected local calendar date for Laravel', () => {
    expect(formatDateForApi(new Date(1994, 2, 7))).toBe('1994-03-07');
  });

  test('keeps the current value when the Android picker is dismissed', () => {
    expect(applyDateSelection('1994-03-07', 'dismissed', undefined)).toBe('1994-03-07');
  });

  test('shows birthdates in a Spanish day-month-year format', () => {
    expect(formatDateForDisplay('1990-10-08')).toBe('08 de octubre de 1990');
  });

  test('formats Laravel ISO datetimes without showing the time', () => {
    expect(formatDateForDisplay('2004-01-08T00:00:00.000000Z')).toBe(
      '08 de enero de 2004',
    );
  });
});
