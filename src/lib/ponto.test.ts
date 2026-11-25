import { describe, it, expect } from "vitest";
import {
  calculateWorkedMinutes,
  formatMinutes,
  determineJourneyStatus,
  getNextPunchAction,
  detectInconsistencies,
  type TimeEntry,
} from "./ponto-store";

describe("ponto-store logic tests", () => {
  it("calculates worked minutes correctly when full journey is finished", () => {
    // Entrada: 09:00, Almoço: 12:00 às 13:00, Saída: 18:00
    // Total trabalhado esperado = (12 - 9)h + (18 - 13)h = 3h + 5h = 8h = 480 minutos
    const entry = "2026-11-25T09:00:00.000Z";
    const lStart = "2026-11-25T12:00:00.000Z";
    const lEnd = "2026-11-25T13:00:00.000Z";
    const exit = "2026-11-25T18:00:00.000Z";

    const minutes = calculateWorkedMinutes(entry, lStart, lEnd, exit);
    expect(minutes).toBe(480);
    expect(formatMinutes(minutes)).toBe("8h 00m");
  });

  it("does not count lunch break minutes as worked hours", () => {
    // Entrada 08:00, Almoço 12:00, agora 12:30 (em almoço)
    const entry = "2026-11-25T08:00:00.000Z";
    const lStart = "2026-11-25T12:00:00.000Z";
    const lEnd = null;
    const exit = null;
    const now = new Date("2026-11-25T12:30:00.000Z");

    const minutes = calculateWorkedMinutes(entry, lStart, lEnd, exit, now);
    // Deve ser exatamente 4h = 240 minutos
    expect(minutes).toBe(240);
  });

  it("determines correct next punch action sequentially", () => {
    // 1. Not started
    let action = getNextPunchAction(null);
    expect(action.type).toBe("entry_time");
    expect(action.label).toBe("Iniciar jornada");

    // 2. Started, needs lunch
    const entryMock: Partial<TimeEntry> = {
      entry_time: "2026-11-25T09:00:00.000Z",
      lunch_start: null,
      lunch_end: null,
      exit_time: null,
    };
    action = getNextPunchAction(entryMock as TimeEntry);
    expect(action.type).toBe("lunch_start");
    expect(action.label).toBe("Iniciar intervalo");

    // 3. In lunch, needs return
    entryMock.lunch_start = "2026-11-25T12:00:00.000Z";
    action = getNextPunchAction(entryMock as TimeEntry);
    expect(action.type).toBe("lunch_end");
    expect(action.label).toBe("Retornar do intervalo");

    // 4. Returned from lunch, needs exit
    entryMock.lunch_end = "2026-11-25T13:00:00.000Z";
    action = getNextPunchAction(entryMock as TimeEntry);
    expect(action.type).toBe("exit_time");
    expect(action.label).toBe("Finalizar jornada");

    // 5. Finished
    entryMock.exit_time = "2026-11-25T18:00:00.000Z";
    action = getNextPunchAction(entryMock as TimeEntry);
    expect(action.type).toBe(null);
    expect(action.isComplete).toBe(true);
  });

  it("detects inconsistencies for incomplete past days", () => {
    const pastEntry: TimeEntry = {
      id: "test-past",
      employee_id: "emp-1",
      date: "2026-11-01",
      entry_time: "2026-11-01T09:00:00.000Z",
      lunch_start: "2026-11-01T12:00:00.000Z",
      lunch_end: null,
      exit_time: null,
      total_worked_minutes: 180,
      status: "in_progress",
      inconsistency_type: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const inconsistency = detectInconsistencies(pastEntry);
    expect(inconsistency).toBe("Falta retorno do almoço e saída");
  });
});
