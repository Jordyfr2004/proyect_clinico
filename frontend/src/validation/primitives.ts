import type { JsonRecord } from '@/types/api';

const invalid = (label: string): never => {
  throw new Error(`${label} no tiene un formato válido`);
};

export const asRecord = (value: unknown, label: string): JsonRecord => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalid(label);
  }

  return value as JsonRecord;
};

export const asString = (record: JsonRecord, key: string): string => {
  const value = record[key];
  return typeof value === 'string' ? value : invalid(key);
};

export const asOptionalString = (record: JsonRecord, key: string): string | null => {
  const value = record[key];
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : invalid(key);
};

export const asBoolean = (record: JsonRecord, key: string): boolean => {
  const value = record[key];
  return typeof value === 'boolean' ? value : invalid(key);
};

export const asArray = (record: JsonRecord, key: string): unknown[] => {
  const value = record[key];
  return Array.isArray(value) ? value : invalid(key);
};

export const parseEnvelope = <T>(value: unknown, parser: (data: unknown) => T): T => {
  const record = asRecord(value, 'La respuesta del servidor');
  if (!Object.prototype.hasOwnProperty.call(record, 'data')) {
    throw new Error('La respuesta del servidor no tiene el formato esperado');
  }
  return parser(record.data);
};
