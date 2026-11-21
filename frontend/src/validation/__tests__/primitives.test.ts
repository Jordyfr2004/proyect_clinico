import {
  asArray,
  asBoolean,
  asOptionalString,
  asRecord,
  asString,
  parseEnvelope,
} from '../primitives';

describe('API validation primitives', () => {
  test('rejects arrays and null where an object is required', () => {
    expect(() => asRecord([], 'usuario')).toThrow('usuario no tiene un formato válido');
    expect(() => asRecord(null, 'usuario')).toThrow('usuario no tiene un formato válido');
  });

  test('reads required and optional string fields without coercing values', () => {
    const record = { name: 'Ana', phone: null, id: 7 };

    expect(asString(record, 'name')).toBe('Ana');
    expect(asOptionalString(record, 'phone')).toBeNull();
    expect(() => asString(record, 'id')).toThrow('id no tiene un formato válido');
  });

  test('reads booleans and arrays without accepting lookalikes', () => {
    expect(asBoolean({ active: true }, 'active')).toBe(true);
    expect(asArray({ data: [1, 2] }, 'data')).toEqual([1, 2]);
    expect(() => asBoolean({ active: 1 }, 'active')).toThrow('active no tiene un formato válido');
  });

  test('parses the data member of a Laravel envelope with the supplied parser', () => {
    const result = parseEnvelope({ data: { id: 'abc' } }, (value) =>
      asString(asRecord(value, 'registro'), 'id'),
    );

    expect(result).toBe('abc');
    expect(() => parseEnvelope({ result: {} }, () => 'unused')).toThrow(
      'La respuesta del servidor no tiene el formato esperado',
    );
  });
});
