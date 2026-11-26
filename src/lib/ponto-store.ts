import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type PunchType = "entry_time" | "lunch_start" | "lunch_end" | "exit_time";
export type JourneyStatus = "not_started" | "in_progress" | "lunch" | "finished" | "inconsistent";
export type AdjustmentStatus = "pending" | "approved" | "rejected";
export type CalendarEventType = "holiday" | "corporate" | "day_off" | "vacation" | "absence";

export interface Employee {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  department: string;
  role: string;
  work_schedule: string;
  daily_hours: number;
  weekend_daily_hours?: number;
  status: "active" | "inactive";
  is_admin: boolean;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  entry_time: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  exit_time: string | null;
  total_worked_minutes: number;
  status: JourneyStatus;
  inconsistency_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeAdjustmentRequest {
  id: string;
  employee_id: string;
  entry_id: string | null;
  date: string;
  target_punch: PunchType | "full_day";
  requested_time: string | null;
  requested_time_str: string | null;
  reason: string;
  status: AdjustmentStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  original_data: Record<string, unknown> | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  employee_id: string | null;
  title: string;
  event_type: CalendarEventType;
  start_date: string;
  end_date: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

// Chaves de localStorage
const ACTIVE_EMP_KEY = "r6sm.ponto.active_employee_id";
const BACKUP_ENTRIES_KEY = "r6sm.ponto.entries_backup";
const BACKUP_EMPLOYEES_KEY = "r6sm.ponto.employees_backup";
const BACKUP_ADJUSTMENTS_KEY = "r6sm.ponto.adjustments_backup";
const BACKUP_EVENTS_KEY = "r6sm.ponto.events_backup";

// Colaboradores padrão iniciais
export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: "emp-1",
    name: "Ana Souza",
    email: "ana.souza@twins.com",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    department: "Recursos Humanos",
    role: "Gestora de RH / Admin",
    work_schedule: "09:00 - 18:00 (1h intervalo)",
    daily_hours: 8,
    weekend_daily_hours: 4,
    status: "active",
    is_admin: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "emp-2",
    name: "Pedro Santos",
    email: "pedro.santos@twins.com",
    avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    department: "Desenvolvimento",
    role: "Lead Game Developer",
    work_schedule: "09:00 - 18:00 (1h intervalo)",
    daily_hours: 8,
    weekend_daily_hours: 4,
    status: "active",
    is_admin: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "emp-3",
    name: "Lucas Silva",
    email: "lucas.silva@twins.com",
    avatar_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    department: "Arte & 3D",
    role: "Artista 3D / Modeler",
    work_schedule: "10:00 - 19:00 (1h intervalo)",
    daily_hours: 8,
    weekend_daily_hours: 4,
    status: "active",
    is_admin: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "emp-4",
    name: "Beatriz Lima",
    email: "beatriz.lima@twins.com",
    avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
    department: "VFX & Animação",
    role: "Animadora R6 / VFX Artist",
    work_schedule: "09:00 - 18:00 (1h intervalo)",
    daily_hours: 8,
    weekend_daily_hours: 4,
    status: "active",
    is_admin: false,
    created_at: new Date().toISOString(),
  },
];

// Eventos padrão iniciais
export const DEFAULT_EVENTS: CalendarEvent[] = [
  {
    id: "evt-1",
    employee_id: null,
    title: "Confraternização da Equipe Twins",
    event_type: "corporate",
    start_date: getFutureDateStr(6),
    end_date: getFutureDateStr(6),
    description: "Reunião de alinhamento e comemoração de metas atingidas",
    created_by: "RH",
    created_at: new Date().toISOString(),
  },
  {
    id: "evt-2",
    employee_id: null,
    title: "Feriado Nacional",
    event_type: "holiday",
    start_date: getFutureDateStr(14),
    end_date: getFutureDateStr(14),
    description: "Sem expediente corporativo",
    created_by: "RH",
    created_at: new Date().toISOString(),
  },
  {
    id: "evt-3",
    employee_id: "emp-3",
    title: "Folga Compensatória - Lucas",
    event_type: "day_off",
    start_date: getFutureDateStr(3),
    end_date: getFutureDateStr(3),
    description: "Folga por horas extras no lançamento",
    created_by: "Ana Souza",
    created_at: new Date().toISOString(),
  },
];

function getFutureDateStr(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0]!;
}

export function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0]!;
}

// Estado em Memória do Ponto
const listeners = new Set<() => void>();
let employees: Employee[] = [];
let timeEntries: TimeEntry[] = [];
let adjustmentRequests: TimeAdjustmentRequest[] = [];
let calendarEvents: CalendarEvent[] = [];
let activeEmployeeId: string | null = null;
let loaded = false;
let initialized = false;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// ----------------------------------------------------------------------------
// Funções de Cálculo de Jornada e Tempo
// ----------------------------------------------------------------------------

export function isWeekend(dateOrStr: string | Date): boolean {
  if (typeof dateOrStr === "string") {
    const raw = dateOrStr.split("T")[0]!;
    const parts = raw.split("-").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const day = d.getDay();
      return day === 0 || day === 6;
    }
  }
  const d = dateOrStr instanceof Date ? dateOrStr : new Date(dateOrStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function getDailyTargetHours(
  employee: Employee | null | undefined,
  dateOrStr: string | Date = new Date()
): number {
  if (isWeekend(dateOrStr)) {
    return employee?.weekend_daily_hours ?? 4;
  }
  return employee?.daily_hours ?? 8;
}

export function getDailyTargetMinutes(
  employee: Employee | null | undefined,
  dateOrStr: string | Date = new Date()
): number {
  return getDailyTargetHours(employee, dateOrStr) * 60;
}

export function calculateWorkedMinutes(
  entryTime: string | null,
  lunchStart: string | null,
  lunchEnd: string | null,
  exitTime: string | null,
  currentTime: Date = new Date()
): number {
  if (!entryTime) return 0;

  const entry = new Date(entryTime).getTime();
  const lStart = lunchStart ? new Date(lunchStart).getTime() : null;
  const lEnd = lunchEnd ? new Date(lunchEnd).getTime() : null;
  const exit = exitTime ? new Date(exitTime).getTime() : null;
  const now = currentTime.getTime();

  // Caso 1: Jornada completa finalizada
  if (exit) {
    if (lStart && lEnd) {
      const morning = Math.max(0, lStart - entry);
      const afternoon = Math.max(0, exit - lEnd);
      return Math.floor((morning + afternoon) / 60000);
    }
    // Sem intervalo registrado
    return Math.floor(Math.max(0, exit - entry) / 60000);
  }

  // Caso 2: Em intervalo de almoço
  if (lStart && !lEnd) {
    return Math.floor(Math.max(0, lStart - entry) / 60000);
  }

  // Caso 3: Retornou do almoço, mas ainda não saiu
  if (lStart && lEnd) {
    const morning = Math.max(0, lStart - entry);
    const afternoon = Math.max(0, now - lEnd);
    return Math.floor((morning + afternoon) / 60000);
  }

  // Caso 4: Iniciou e está no primeiro período (antes do almoço)
  return Math.floor(Math.max(0, now - entry) / 60000);
}

export function formatMinutes(minutes: number): string {
  const isNegative = minutes < 0;
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const str = `${h}h ${m.toString().padStart(2, "0")}m`;
  return isNegative ? `-${str}` : str;
}

export function formatTimeOnly(isoString: string | null | undefined): string {
  if (!isoString) return "--:--";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

export function determineJourneyStatus(entry: Partial<TimeEntry> | null): JourneyStatus {
  if (!entry || !entry.entry_time) return "not_started";
  if (entry.exit_time) return "finished";
  if (entry.lunch_start && !entry.lunch_end) return "lunch";
  return "in_progress";
}

export function getNextPunchAction(entry: TimeEntry | null): {
  type: PunchType | null;
  label: string;
  iconName: string;
  isComplete: boolean;
} {
  if (!entry || !entry.entry_time) {
    return {
      type: "entry_time",
      label: "Iniciar jornada",
      iconName: "Play",
      isComplete: false,
    };
  }
  if (!entry.lunch_start) {
    return {
      type: "lunch_start",
      label: "Iniciar intervalo",
      iconName: "Coffee",
      isComplete: false,
    };
  }
  if (!entry.lunch_end) {
    return {
      type: "lunch_end",
      label: "Retornar do intervalo",
      iconName: "RotateCcw",
      isComplete: false,
    };
  }
  if (!entry.exit_time) {
    return {
      type: "exit_time",
      label: "Finalizar jornada",
      iconName: "LogOut",
      isComplete: false,
    };
  }
  return {
    type: null,
    label: "Jornada finalizada",
    iconName: "CheckCircle",
    isComplete: true,
  };
}

export function detectInconsistencies(entry: TimeEntry): string | null {
  const isToday = entry.date === getTodayDateStr();

  // Para dias anteriores, se começou e não terminou, é inconsistente
  if (!isToday) {
    if (entry.entry_time && !entry.exit_time) {
      if (entry.lunch_start && !entry.lunch_end) {
        return "Falta retorno do almoço e saída";
      }
      return "Falta registro de saída";
    }
    if (entry.entry_time && entry.lunch_start && !entry.lunch_end) {
      return "Falta retorno do intervalo de almoço";
    }
  }

  // Registros anômalos
  if (entry.lunch_end && !entry.lunch_start) {
    return "Retorno sem saída de almoço";
  }
  if (entry.exit_time && !entry.entry_time) {
    return "Falta registro de entrada";
  }

  return null;
}

// ----------------------------------------------------------------------------
// Carregamento e Sincronização
// ----------------------------------------------------------------------------

function loadLocalBackups() {
  if (typeof window === "undefined") return;
  try {
    const rawEmp = localStorage.getItem(BACKUP_EMPLOYEES_KEY);
    if (rawEmp) employees = JSON.parse(rawEmp);
    else employees = DEFAULT_EMPLOYEES;

    const rawEntries = localStorage.getItem(BACKUP_ENTRIES_KEY);
    if (rawEntries) timeEntries = JSON.parse(rawEntries);

    const rawAdj = localStorage.getItem(BACKUP_ADJUSTMENTS_KEY);
    if (rawAdj) adjustmentRequests = JSON.parse(rawAdj);

    const rawEvt = localStorage.getItem(BACKUP_EVENTS_KEY);
    if (rawEvt) calendarEvents = JSON.parse(rawEvt);
    else calendarEvents = DEFAULT_EVENTS;

    const savedActiveId = localStorage.getItem(ACTIVE_EMP_KEY);
    activeEmployeeId = savedActiveId || (employees[0]?.id ?? null);
  } catch (e) {
    console.error("Falha ao carregar backup local de ponto", e);
    employees = DEFAULT_EMPLOYEES;
    calendarEvents = DEFAULT_EVENTS;
    activeEmployeeId = employees[0]?.id ?? null;
  }
}

function persistLocal() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BACKUP_EMPLOYEES_KEY, JSON.stringify(employees));
    localStorage.setItem(BACKUP_ENTRIES_KEY, JSON.stringify(timeEntries));
    localStorage.setItem(BACKUP_ADJUSTMENTS_KEY, JSON.stringify(adjustmentRequests));
    localStorage.setItem(BACKUP_EVENTS_KEY, JSON.stringify(calendarEvents));
    if (activeEmployeeId) localStorage.setItem(ACTIVE_EMP_KEY, activeEmployeeId);
  } catch (e) {
    console.error("Falha ao salvar cache de ponto", e);
  }
}

async function refreshFromSupabase() {
  try {
    // 1. Colaboradores
    const empRes = await supabase.from("employees").select("*").order("name");
    if (!empRes.error && empRes.data && empRes.data.length > 0) {
      employees = empRes.data.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        avatar_url: r.avatar_url,
        department: r.department,
        role: r.role,
        work_schedule: r.work_schedule,
        daily_hours: Number(r.daily_hours) || 8,
        weekend_daily_hours: Number((r as Record<string, unknown>).weekend_daily_hours) || 4,
        status: (r.status as "active" | "inactive") || "active",
        is_admin: Boolean(r.is_admin),
        created_at: r.created_at,
      }));
    } else if (empRes.data && empRes.data.length === 0) {
      // Se banco está vazio, insere os colaboradores padrão
      for (const e of DEFAULT_EMPLOYEES) {
        await supabase.from("employees").insert({
          id: e.id,
          name: e.name,
          email: e.email,
          avatar_url: e.avatar_url,
          department: e.department,
          role: e.role,
          work_schedule: e.work_schedule,
          daily_hours: e.daily_hours,
          status: e.status,
          is_admin: e.is_admin,
        });
      }
      employees = DEFAULT_EMPLOYEES;
    }

    // 2. Registros de ponto
    const entriesRes = await supabase.from("time_entries").select("*").order("date", { ascending: false });
    if (!entriesRes.error && entriesRes.data) {
      timeEntries = entriesRes.data.map((r) => ({
        id: r.id,
        employee_id: r.employee_id,
        date: r.date,
        entry_time: r.entry_time,
        lunch_start: r.lunch_start,
        lunch_end: r.lunch_end,
        exit_time: r.exit_time,
        total_worked_minutes: r.total_worked_minutes || 0,
        status: (r.status as JourneyStatus) || "not_started",
        inconsistency_type: r.inconsistency_type,
        notes: r.notes,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    }

    // 3. Ajustes de ponto
    const adjRes = await supabase.from("time_adjustment_requests").select("*").order("created_at", { ascending: false });
    if (!adjRes.error && adjRes.data) {
      adjustmentRequests = adjRes.data.map((r) => ({
        id: r.id,
        employee_id: r.employee_id,
        entry_id: r.entry_id,
        date: r.date,
        target_punch: r.target_punch as PunchType | "full_day",
        requested_time: r.requested_time,
        requested_time_str: r.requested_time_str,
        reason: r.reason,
        status: (r.status as AdjustmentStatus) || "pending",
        admin_notes: r.admin_notes,
        reviewed_by: r.reviewed_by,
        reviewed_at: r.reviewed_at,
        original_data: (r.original_data as Record<string, unknown>) || null,
        created_at: r.created_at,
      }));
    }

    // 4. Calendário
    const calRes = await supabase.from("calendar_events").select("*").order("start_date");
    if (!calRes.error && calRes.data && calRes.data.length > 0) {
      calendarEvents = calRes.data.map((r) => ({
        id: r.id,
        employee_id: r.employee_id,
        title: r.title,
        event_type: (r.event_type as CalendarEventType) || "corporate",
        start_date: r.start_date,
        end_date: r.end_date,
        description: r.description,
        created_by: r.created_by,
        created_at: r.created_at,
      }));
    } else if (calRes.data && calRes.data.length === 0) {
      for (const ev of DEFAULT_EVENTS) {
        await supabase.from("calendar_events").insert({
          id: ev.id,
          employee_id: ev.employee_id,
          title: ev.title,
          event_type: ev.event_type,
          start_date: ev.start_date,
          end_date: ev.end_date,
          description: ev.description,
          created_by: ev.created_by,
        });
      }
      calendarEvents = DEFAULT_EVENTS;
    }

    if (!activeEmployeeId && employees.length > 0) {
      activeEmployeeId = employees[0]?.id ?? null;
    }

    persistLocal();
  } catch (err) {
    console.error("Erro sincronizando ponto com Supabase:", err);
  } finally {
    loaded = true;
    emit();
  }
}

export function initPontoStore() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  loadLocalBackups();
  emit();
  refreshFromSupabase();

  // Inscrição em tempo real
  try {
    supabase
      .channel("ponto-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, () => refreshFromSupabase())
      .on("postgres_changes", { event: "*", schema: "public", table: "time_adjustment_requests" }, () => refreshFromSupabase())
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, () => refreshFromSupabase())
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => refreshFromSupabase())
      .subscribe();
  } catch {
    // fallback
  }
}

// ----------------------------------------------------------------------------
// Hooks de Consumo
// ----------------------------------------------------------------------------

export function usePontoLoaded() {
  useEffect(initPontoStore, []);
  return useSyncExternalStore(subscribe, () => loaded, () => false);
}

export function useEmployees() {
  useEffect(initPontoStore, []);
  return useSyncExternalStore(subscribe, () => employees, () => DEFAULT_EMPLOYEES);
}

export function useActiveEmployee(): Employee | null {
  useEffect(initPontoStore, []);
  return useSyncExternalStore(
    subscribe,
    () => employees.find((e) => e.id === activeEmployeeId) || employees[0] || null,
    () => DEFAULT_EMPLOYEES[0] || null
  );
}

export function useTimeEntries() {
  useEffect(initPontoStore, []);
  return useSyncExternalStore(subscribe, () => timeEntries, () => []);
}

export function useAdjustmentRequests() {
  useEffect(initPontoStore, []);
  return useSyncExternalStore(subscribe, () => adjustmentRequests, () => []);
}

export function useCalendarEvents() {
  useEffect(initPontoStore, []);
  return useSyncExternalStore(subscribe, () => calendarEvents, () => DEFAULT_EVENTS);
}

export function useTodayEntry(employeeId?: string | null): TimeEntry | null {
  useEffect(initPontoStore, []);
  const today = getTodayDateStr();
  return useSyncExternalStore(
    subscribe,
    () => {
      const targetId = employeeId || activeEmployeeId;
      if (!targetId) return null;
      return timeEntries.find((e) => e.employee_id === targetId && e.date === today) || null;
    },
    () => null
  );
}

// ----------------------------------------------------------------------------
// Ações de Registro de Ponto
// ----------------------------------------------------------------------------

export async function setActiveEmployee(id: string) {
  activeEmployeeId = id;
  if (typeof window !== "undefined") {
    localStorage.setItem(ACTIVE_EMP_KEY, id);
  }
  emit();
}

export async function registerPunch(
  employeeId: string,
  targetType?: PunchType
): Promise<{ success: boolean; message: string; entry: TimeEntry }> {
  const today = getTodayDateStr();
  const now = new Date();
  const nowIso = now.toISOString();

  let existing = timeEntries.find((e) => e.employee_id === employeeId && e.date === today);

  // Determina qual deve ser a próxima batida
  const next = getNextPunchAction(existing || null);
  const punchTypeToApply = targetType || next.type;

  if (!punchTypeToApply) {
    throw new Error("A jornada de hoje já foi totalmente concluída.");
  }

  // Validação estrita de sequência lógica
  if (punchTypeToApply === "lunch_start" && (!existing || !existing.entry_time)) {
    throw new Error("Não é possível iniciar o intervalo sem antes registrar a entrada.");
  }
  if (punchTypeToApply === "lunch_end" && (!existing || !existing.lunch_start)) {
    throw new Error("Não é possível retornar do intervalo sem ter registrado o início do almoço.");
  }
  if (punchTypeToApply === "exit_time" && (!existing || !existing.entry_time)) {
    throw new Error("Não é possível finalizar a jornada sem ter registrado a entrada.");
  }

  const updatedEntry: TimeEntry = existing
    ? {
        ...existing,
        [punchTypeToApply]: nowIso,
        updated_at: nowIso,
      }
    : {
        id: crypto.randomUUID(),
        employee_id: employeeId,
        date: today,
        entry_time: punchTypeToApply === "entry_time" ? nowIso : null,
        lunch_start: punchTypeToApply === "lunch_start" ? nowIso : null,
        lunch_end: punchTypeToApply === "lunch_end" ? nowIso : null,
        exit_time: punchTypeToApply === "exit_time" ? nowIso : null,
        total_worked_minutes: 0,
        status: "in_progress",
        inconsistency_type: null,
        notes: null,
        created_at: nowIso,
        updated_at: nowIso,
      };

  // Recalcula tempo trabalhado e status
  updatedEntry.status = determineJourneyStatus(updatedEntry);
  updatedEntry.total_worked_minutes = calculateWorkedMinutes(
    updatedEntry.entry_time,
    updatedEntry.lunch_start,
    updatedEntry.lunch_end,
    updatedEntry.exit_time,
    now
  );
  updatedEntry.inconsistency_type = detectInconsistencies(updatedEntry);

  // Atualização otimista
  timeEntries = [
    updatedEntry,
    ...timeEntries.filter((e) => !(e.employee_id === employeeId && e.date === today)),
  ];
  persistLocal();
  emit();

  // Persistência no Supabase
  try {
    const payload: TablesInsert<"time_entries"> = {
      id: updatedEntry.id,
      employee_id: updatedEntry.employee_id,
      date: updatedEntry.date,
      entry_time: updatedEntry.entry_time,
      lunch_start: updatedEntry.lunch_start,
      lunch_end: updatedEntry.lunch_end,
      exit_time: updatedEntry.exit_time,
      total_worked_minutes: updatedEntry.total_worked_minutes,
      status: updatedEntry.status,
      inconsistency_type: updatedEntry.inconsistency_type,
      notes: updatedEntry.notes,
    };
    await supabase.from("time_entries").upsert(payload);
  } catch (err) {
    console.error("Falha ao sincronizar registro de ponto com Supabase:", err);
  }

  const labels: Record<PunchType, string> = {
    entry_time: "Entrada registrada com sucesso!",
    lunch_start: "Saída para almoço registrada. Bom descanso!",
    lunch_end: "Retorno do almoço registrado. Bom trabalho!",
    exit_time: "Jornada finalizada com sucesso! Bom descanso.",
  };

  return {
    success: true,
    message: labels[punchTypeToApply] || "Ponto registrado!",
    entry: updatedEntry,
  };
}

// ----------------------------------------------------------------------------
// Ações de Solicitação e Aprovação de Ajustes
// ----------------------------------------------------------------------------

export async function requestTimeAdjustment(params: {
  employee_id: string;
  date: string;
  target_punch: PunchType | "full_day";
  requested_time_str: string; // Ex: "09:00" ou "18:00"
  reason: string;
}) {
  const existing = timeEntries.find(
    (e) => e.employee_id === params.employee_id && e.date === params.date
  );

  // Monta o timestamp com a data do dia selecionado
  let requested_time: string | null = null;
  if (params.requested_time_str) {
    const [h, m] = params.requested_time_str.split(":");
    const d = new Date(params.date + "T00:00:00");
    if (h && m) {
      d.setHours(Number(h), Number(m), 0, 0);
      requested_time = d.toISOString();
    }
  }

  const newRequest: TimeAdjustmentRequest = {
    id: crypto.randomUUID(),
    employee_id: params.employee_id,
    entry_id: existing?.id || null,
    date: params.date,
    target_punch: params.target_punch,
    requested_time,
    requested_time_str: params.requested_time_str,
    reason: params.reason,
    status: "pending",
    admin_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    original_data: existing ? { ...existing } : null,
    created_at: new Date().toISOString(),
  };

  adjustmentRequests = [newRequest, ...adjustmentRequests];
  persistLocal();
  emit();

  try {
    await supabase.from("time_adjustment_requests").insert({
      id: newRequest.id,
      employee_id: newRequest.employee_id,
      entry_id: newRequest.entry_id,
      date: newRequest.date,
      target_punch: newRequest.target_punch,
      requested_time: newRequest.requested_time,
      requested_time_str: newRequest.requested_time_str,
      reason: newRequest.reason,
      status: "pending",
      original_data: newRequest.original_data as unknown as Record<string, unknown>,
    });
  } catch (err) {
    console.error("Falha ao salvar ajuste no Supabase:", err);
  }

  return newRequest;
}

export async function reviewAdjustmentRequest(
  requestId: string,
  decision: "approved" | "rejected",
  adminNotes?: string,
  reviewedBy: string = "Gestor de RH"
) {
  const req = adjustmentRequests.find((r) => r.id === requestId);
  if (!req) throw new Error("Solicitação não encontrada.");

  const reviewedAt = new Date().toISOString();
  const updatedReq: TimeAdjustmentRequest = {
    ...req,
    status: decision,
    admin_notes: adminNotes || null,
    reviewed_by: reviewedBy,
    reviewed_at: reviewedAt,
  };

  // Se aprovado, aplica a correção preservando rastreabilidade
  if (decision === "approved" && req.requested_time) {
    let entry = timeEntries.find(
      (e) => e.employee_id === req.employee_id && e.date === req.date
    );

    const now = new Date();
    const updatedEntry: TimeEntry = entry
      ? {
          ...entry,
          ...(req.target_punch !== "full_day" ? { [req.target_punch]: req.requested_time } : {}),
          notes: `Ajuste aprovado por ${reviewedBy} em ${new Date().toLocaleDateString("pt-BR")}: ${req.reason}`,
          updated_at: now.toISOString(),
        }
      : {
          id: crypto.randomUUID(),
          employee_id: req.employee_id,
          date: req.date,
          entry_time: req.target_punch === "entry_time" ? req.requested_time : null,
          lunch_start: req.target_punch === "lunch_start" ? req.requested_time : null,
          lunch_end: req.target_punch === "lunch_end" ? req.requested_time : null,
          exit_time: req.target_punch === "exit_time" ? req.requested_time : null,
          total_worked_minutes: 0,
          status: "in_progress",
          inconsistency_type: null,
          notes: `Registro criado por ajuste de ${reviewedBy}: ${req.reason}`,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };

    updatedEntry.status = determineJourneyStatus(updatedEntry);
    updatedEntry.total_worked_minutes = calculateWorkedMinutes(
      updatedEntry.entry_time,
      updatedEntry.lunch_start,
      updatedEntry.lunch_end,
      updatedEntry.exit_time,
      now
    );
    updatedEntry.inconsistency_type = detectInconsistencies(updatedEntry);

    timeEntries = [
      updatedEntry,
      ...timeEntries.filter((e) => !(e.employee_id === req.employee_id && e.date === req.date)),
    ];

    try {
      await supabase.from("time_entries").upsert({
        id: updatedEntry.id,
        employee_id: updatedEntry.employee_id,
        date: updatedEntry.date,
        entry_time: updatedEntry.entry_time,
        lunch_start: updatedEntry.lunch_start,
        lunch_end: updatedEntry.lunch_end,
        exit_time: updatedEntry.exit_time,
        total_worked_minutes: updatedEntry.total_worked_minutes,
        status: updatedEntry.status,
        inconsistency_type: updatedEntry.inconsistency_type,
        notes: updatedEntry.notes,
      });
    } catch (e) {
      console.error(e);
    }
  }

  adjustmentRequests = adjustmentRequests.map((r) => (r.id === requestId ? updatedReq : r));
  persistLocal();
  emit();

  try {
    await supabase.from("time_adjustment_requests").update({
      status: decision,
      admin_notes: adminNotes || null,
      reviewed_by: reviewedBy,
      reviewed_at: reviewedAt,
    }).eq("id", requestId);
  } catch (err) {
    console.error("Falha ao atualizar ajuste no Supabase:", err);
  }
}

// ----------------------------------------------------------------------------
// Ações de Gestão de Colaboradores
// ----------------------------------------------------------------------------

export async function saveEmployee(employee: Partial<Employee> & { name: string }) {
  const isEditing = Boolean(employee.id && employees.some((e) => e.id === employee.id));
  const id = employee.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const fullEmployee: Employee = {
    id,
    name: employee.name.trim(),
    email: employee.email ? employee.email.trim() : null,
    avatar_url: employee.avatar_url || null,
    department: employee.department || "Geral",
    role: employee.role || "Colaborador",
    work_schedule: employee.work_schedule || "09:00 - 18:00 (1h intervalo)",
    daily_hours: employee.daily_hours || 8,
    weekend_daily_hours: employee.weekend_daily_hours ?? 4,
    status: employee.status || "active",
    is_admin: Boolean(employee.is_admin),
    created_at: employee.created_at || now,
  };

  if (isEditing) {
    employees = employees.map((e) => (e.id === id ? fullEmployee : e));
  } else {
    employees = [...employees, fullEmployee];
  }

  persistLocal();
  emit();

  try {
    await supabase.from("employees").upsert({
      id: fullEmployee.id,
      name: fullEmployee.name,
      email: fullEmployee.email,
      avatar_url: fullEmployee.avatar_url,
      department: fullEmployee.department,
      role: fullEmployee.role,
      work_schedule: fullEmployee.work_schedule,
      daily_hours: fullEmployee.daily_hours,
      status: fullEmployee.status,
      is_admin: fullEmployee.is_admin,
    } as any);
  } catch (err) {
    console.error("Erro salvando colaborador no Supabase:", err);
  }

  return fullEmployee;
}

export async function deleteEmployee(id: string) {
  employees = employees.filter((e) => e.id !== id);
  timeEntries = timeEntries.filter((e) => e.employee_id !== id);
  adjustmentRequests = adjustmentRequests.filter((a) => a.employee_id !== id);

  if (activeEmployeeId === id) {
    activeEmployeeId = employees[0]?.id ?? null;
    if (typeof window !== "undefined") {
      if (activeEmployeeId) localStorage.setItem(ACTIVE_EMP_KEY, activeEmployeeId);
      else localStorage.removeItem(ACTIVE_EMP_KEY);
    }
  }

  persistLocal();
  emit();

  try {
    await supabase.from("employees").delete().eq("id", id);
  } catch (err) {
    console.error("Erro ao excluir colaborador no Supabase:", err);
  }
}

// ----------------------------------------------------------------------------
// Ações de Gestão do Calendário
// ----------------------------------------------------------------------------

export async function saveCalendarEvent(event: Partial<CalendarEvent> & { title: string; start_date: string; end_date: string; event_type: CalendarEventType }) {
  const id = event.id || crypto.randomUUID();
  const isEditing = Boolean(event.id && calendarEvents.some((ev) => ev.id === event.id));
  const now = new Date().toISOString();

  const fullEvent: CalendarEvent = {
    id,
    employee_id: event.employee_id || null,
    title: event.title.trim(),
    event_type: event.event_type,
    start_date: event.start_date,
    end_date: event.end_date,
    description: event.description || null,
    created_by: event.created_by || "RH",
    created_at: event.created_at || now,
  };

  if (isEditing) {
    calendarEvents = calendarEvents.map((ev) => (ev.id === id ? fullEvent : ev));
  } else {
    calendarEvents = [...calendarEvents, fullEvent];
  }

  persistLocal();
  emit();

  try {
    await supabase.from("calendar_events").upsert({
      id: fullEvent.id,
      employee_id: fullEvent.employee_id,
      title: fullEvent.title,
      event_type: fullEvent.event_type,
      start_date: fullEvent.start_date,
      end_date: fullEvent.end_date,
      description: fullEvent.description,
      created_by: fullEvent.created_by,
    });
  } catch (err) {
    console.error("Erro salvando evento de calendário no Supabase:", err);
  }

  return fullEvent;
}

export async function deleteCalendarEvent(id: string) {
  calendarEvents = calendarEvents.filter((ev) => ev.id !== id);
  persistLocal();
  emit();

  try {
    await supabase.from("calendar_events").delete().eq("id", id);
  } catch (err) {
    console.error("Erro ao excluir evento no Supabase:", err);
  }
}
