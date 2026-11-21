import type { Appointment } from "../appointments";
import { appointmentStart, planReminders } from "../reminder-plan";

const base: Appointment = {
  id: "a1",
  patientId: "p1",
  date: "2099-10-20",
  startTime: "10:00:00",
  endTime: "11:00:00",
  type: "cita_medica",
  description: null,
  status: "programada",
  createdAt: "",
  updatedAt: "",
};

const now = new Date("2099-10-10T08:00:00");

describe("appointmentStart", () => {
  test("combina fecha y hora locales", () => {
    expect(appointmentStart(base)?.getTime()).toBe(
      new Date("2099-10-20T10:00:00").getTime(),
    );
  });

  test("acepta fecha en formato ISO largo", () => {
    const iso = { ...base, date: "2099-10-20T00:00:00.000000Z" };
    expect(appointmentStart(iso)?.getTime()).toBe(
      new Date("2099-10-20T10:00:00").getTime(),
    );
  });

  test("devuelve null si no hay fecha u hora", () => {
    expect(appointmentStart({ ...base, date: null })).toBeNull();
    expect(appointmentStart({ ...base, startTime: null })).toBeNull();
  });
});

describe("planReminders", () => {
  test("programa un aviso 24 h y otro 2 h antes", () => {
    const plan = planReminders([base], now);
    expect(plan.map((p) => p.identifier)).toEqual(["cita-a1-24h", "cita-a1-2h"]);
    expect(plan[0].fireAt.getTime()).toBe(new Date("2099-10-19T10:00:00").getTime());
    expect(plan[1].fireAt.getTime()).toBe(new Date("2099-10-20T08:00:00").getTime());
    expect(plan[0].body).toContain("10:00");
  });

  test("ignora citas pendientes, canceladas o completadas", () => {
    const others = ["pendiente", "cancelada", "completada"].map((status, i) => ({
      ...base,
      id: `x${i}`,
      status,
    }));
    expect(planReminders(others, now)).toEqual([]);
  });

  test("omite avisos cuyo momento ya pasó", () => {
    // Faltan 5 h para la cita: el aviso de 24 h ya pasó, el de 2 h no.
    const near = new Date("2099-10-20T05:00:00");
    const plan = planReminders([base], near);
    expect(plan.map((p) => p.identifier)).toEqual(["cita-a1-2h"]);
  });

  test("no programa nada para citas pasadas o sin horario", () => {
    const past = { ...base, date: "2020-01-01" };
    const noTime = { ...base, id: "a2", startTime: null };
    expect(planReminders([past, noTime], now)).toEqual([]);
  });

  test("ordena por hora y respeta el límite de 60", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      ...base,
      id: `m${i}`,
      date: `2099-11-${String((i % 28) + 1).padStart(2, "0")}`,
    }));
    const plan = planReminders(many, now);
    expect(plan.length).toBe(60);
    const times = plan.map((p) => p.fireAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});