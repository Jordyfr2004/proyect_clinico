const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const months = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Laravel APP_TIMEZONE=America/Guayaquil (UTC-05; no DST). */
export const clinicAppointmentStart = (date: string | null, time: string | null): Date | null => {
  if (!date || !/^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?Z)?$/.test(date)) return null;
  const day = date?.slice(0, 10) ?? null;
  if (!formatScheduledAppointment(day, time)) return null;
  const clock = time!.length === 5 ? `${time}:00` : time!;
  const result = new Date(`${day}T${clock}-05:00`);
  return Number.isFinite(result.getTime()) ? result : null;
};

export const formatScheduledAppointment = (
  date: string | null,
  startTime: string | null,
): string | null => {
  if (!date || !startTime) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(startTime);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) return null;

  return `${weekdays[calendarDate.getUTCDay()]} ${day} de ${months[month - 1]}, ${timeMatch[1]}:${timeMatch[2]}`;
};
