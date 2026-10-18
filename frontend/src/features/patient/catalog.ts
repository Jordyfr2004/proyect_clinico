import { apiRequest } from "@/api/client";
import {
  asArray,
  asOptionalString,
  asRecord,
  asString,
  parseEnvelope,
} from "@/validation/primitives";

export type ServiceCategory = {
  id: string;
  name: string;
};
export type ClinicService = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: string;
  durationMinutes: number;
  image: string | null;
  category: { id: string; name: string };
};
const category = (value: unknown): ServiceCategory => {
  const r = asRecord(value, "La categoría");
  return {
    id: asString(r, "id"),
    name: asString(r, "nombre"),
  };
};
const service = (value: unknown): ClinicService => {
  const r = asRecord(value, "El servicio");
  const c = asRecord(r.categoria, "La categoría del servicio");
  const duration = r.duracion_minutos;
  if (typeof duration !== "number")
    throw new Error("duracion_minutos no tiene un formato válido");
  return {
    id: asString(r, "id"),
    categoryId: asString(r, "categoria_id"),
    name: asString(r, "nombre"),
    description: asOptionalString(r, "descripcion"),
    price: asString(r, "precio"),
    durationMinutes: duration,
    image: asOptionalString(r, "imagen"),
    category: { id: asString(c, "id"), name: asString(c, "nombre") },
  };
};
export const parseCategories = (value: unknown) =>
  parseEnvelope(value, (data) => asArray({ data }, "data").map(category));
export const parseServices = (value: unknown) =>
  parseEnvelope(value, (data) => asArray({ data }, "data").map(service));
export const getCategories = async () =>
  parseCategories(await apiRequest("/categorias-servicios/activas"));
export const getServices = async () =>
  parseServices(await apiRequest("/servicios-consultorio/activos"));
