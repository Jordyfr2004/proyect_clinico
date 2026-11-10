export type JsonRecord = Record<string, unknown>;

export type LaravelEnvelope<T> = {
  data: T;
};
