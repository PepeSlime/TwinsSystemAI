import { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  AlertTriangle,
  Coffee,
  CheckCircle2,
  CalendarCheck,
  User,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  useEmployees,
  useTimeEntries,
  useCalendarEvents,
  useActiveEmployee,
  formatMinutes,
  formatTimeOnly,
  getTodayDateStr,
  calculateWorkedMinutes,
  type CalendarEvent,
  type CalendarEventType,
} from "@/lib/ponto-store";
import { CalendarEventDialog } from "./CalendarEventDialog";
import { cn } from "@/lib/utils";

export function PontoCalendario() {
  const employees = useEmployees();
  const timeEntries = useTimeEntries();
  const calendarEvents = useCalendarEvents();
  const activeEmployee = useActiveEmployee();
  const today = getTodayDateStr();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }
  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function goToToday() {
    setCurrentDate(new Date());
  }

  // Geração dos dias do mês com preenchimento das semanas
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Domingo, 1 = Segunda...

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isWeekend: boolean;
      isToday: boolean;
    }> = [];

    // Dias do mês anterior para completar a primeira semana
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split("T")[0]!;
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isWeekend: prevDate.getDay() === 0 || prevDate.getDay() === 6,
        isToday: dateStr === today,
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}`;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: dateStr === today,
      });
    }

    // Dias do próximo mês para fechar a grade (múltiplo de 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = nextDate.toISOString().split("T")[0]!;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isWeekend: nextDate.getDay() === 0 || nextDate.getDay() === 6,
        isToday: dateStr === today,
      });
    }

    return days;
  }, [year, month, today]);

  const monthLabel = currentDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  // Eventos e registros do dia selecionado para o modal de detalhes
  const selectedDayData = useMemo(() => {
    if (!selectedDayDetail) return null;

    const entries = timeEntries.filter((e) => e.date === selectedDayDetail);
    const events = calendarEvents.filter((ev) => {
      return (
        selectedDayDetail >= ev.start_date && selectedDayDetail <= ev.end_date
      );
    });

    return {
      date: selectedDayDetail,
      entries,
      events,
    };
  }, [selectedDayDetail, timeEntries, calendarEvents]);

  const eventBadgeConfig: Record<
    CalendarEventType,
    { label: string; badgeClass: string }
  > = {
    holiday: {
      label: "Feriado",
      badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    },
    corporate: {
      label: "Corporativo",
      badgeClass: "bg-primary/20 text-primary border-primary/40",
    },
    day_off: {
      label: "Folga",
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    },
    vacation: {
      label: "Férias",
      badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    },
    absence: {
      label: "Ausência",
      badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    },
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior do Calendário */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold capitalize text-foreground">
              {monthLabel}
            </h2>
            <p className="text-xs text-muted-foreground">
              Calendário corporativo de jornadas, feriados, folgas e ausências.
            </p>
          </div>
        </div>

        {/* Controles de Navegação e Botão Novo Evento */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-xs h-8"
          >
            Hoje
          </Button>

          <div className="flex items-center rounded-xl border border-border bg-muted/20 p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={prevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEventToEdit(null);
              setEventDialogOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 gap-1.5"
          >
            <Plus className="h-4 w-4" /> Novo Evento / Feriado
          </Button>
        </div>
      </div>

      {/* Legenda de Tipos de Eventos */}
      <div className="flex flex-wrap items-center gap-2.5 px-1 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground text-[11px] mr-1">Legenda:</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Feriado
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Evento Corporativo
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Folga
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Férias / Ausência
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Dia Trabalhado
        </span>
      </div>

      {/* Grade do Calendário Mensal */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center font-bold text-xs text-muted-foreground py-2.5">
          <span>Dom</span>
          <span>Seg</span>
          <span>Ter</span>
          <span>Qua</span>
          <span>Qui</span>
          <span>Sex</span>
          <span>Sáb</span>
        </div>

        {/* Células dos dias */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
          {calendarGrid.map((dayItem) => {
            // Eventos do dia
            const dayEvents = calendarEvents.filter(
              (ev) => dayItem.dateStr >= ev.start_date && dayItem.dateStr <= ev.end_date
            );

            // Registro de ponto do colaborador ativo (se houver)
            const activeEntry = timeEntries.find(
              (e) => e.employee_id === activeEmployee?.id && e.date === dayItem.dateStr
            );

            const hasInconsistency = activeEntry?.inconsistency_type && dayItem.dateStr !== today;

            return (
              <div
                key={dayItem.dateStr}
                onClick={() => setSelectedDayDetail(dayItem.dateStr)}
                className={cn(
                  "min-h-[96px] sm:min-h-[115px] p-2 flex flex-col justify-between transition-all cursor-pointer hover:bg-muted/30 group",
                  !dayItem.isCurrentMonth && "bg-muted/15 text-muted-foreground/40",
                  dayItem.isWeekend && dayItem.isCurrentMonth && "bg-muted/10",
                  dayItem.isToday && "ring-1 ring-primary/80 bg-primary/5"
                )}
              >
                {/* Cabeçalho do dia */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs font-bold font-mono rounded-full h-6 w-6 flex items-center justify-center transition-all",
                      dayItem.isToday
                        ? "bg-primary text-primary-foreground font-extrabold shadow-sm"
                        : "text-foreground group-hover:bg-muted"
                    )}
                  >
                    {dayItem.dayNumber}
                  </span>

                  {/* Indicador de inconsistência */}
                  {hasInconsistency && (
                    <span
                      title={`Inconsistência: ${activeEntry?.inconsistency_type}`}
                      className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"
                    />
                  )}
                </div>

                {/* Conteúdo do Dia: Tags de Eventos e Horas Trabalhadas */}
                <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                  {/* Eventos Corporativos / Feriados */}
                  {dayEvents.slice(0, 2).map((ev) => {
                    const cfg = eventBadgeConfig[ev.event_type] || eventBadgeConfig.corporate;
                    return (
                      <div
                        key={ev.id}
                        className={cn(
                          "truncate rounded px-1.5 py-0.5 text-[9px] font-bold border",
                          cfg.badgeClass
                        )}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <span className="text-[9px] font-semibold text-muted-foreground">
                      +{dayEvents.length - 2} outro(s)
                    </span>
                  )}

                  {/* Registro de trabalho do colaborador */}
                  {activeEntry?.entry_time && (
                    <div className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono text-emerald-300 font-semibold truncate flex items-center justify-between">
                      <span>
                        {formatTimeOnly(activeEntry.entry_time)} - {formatTimeOnly(activeEntry.exit_time)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Rodapé do dia */}
                <div className="text-[10px] text-right text-muted-foreground opacity-60 group-hover:opacity-100 font-mono">
                  {activeEntry?.total_worked_minutes
                    ? formatMinutes(activeEntry.total_worked_minutes)
                    : ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal com Detalhes do Dia Clicado */}
      <Dialog
        open={selectedDayDetail !== null}
        onOpenChange={(open) => !open && setSelectedDayDetail(null)}
      >
        <DialogContent className="max-w-lg bg-card/95 backdrop-blur-md border border-border p-6 rounded-2xl shadow-2xl space-y-4">
          {selectedDayData && (
            <>
              <DialogHeader className="border-b border-border pb-3">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  <span>
                    Detalhes do Dia —{" "}
                    {new Date(selectedDayData.date + "T00:00:00").toLocaleDateString(
                      "pt-BR",
                      {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Eventos agendados e marcações de ponto realizadas nesta data.
                </DialogDescription>
              </DialogHeader>

              {/* Eventos da Data */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Eventos & Feriados ({selectedDayData.events.length})
                </h4>
                {selectedDayData.events.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhum evento corporativo ou feriado registrado nesta data.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayData.events.map((ev) => {
                      const cfg =
                        eventBadgeConfig[ev.event_type] || eventBadgeConfig.corporate;
                      return (
                        <div
                          key={ev.id}
                          className="rounded-xl border border-border bg-muted/20 p-3 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.2 text-[9px] font-bold border",
                                  cfg.badgeClass
                                )}
                              >
                                {cfg.label}
                              </span>
                              <p className="text-xs font-bold text-foreground">
                                {ev.title}
                              </p>
                            </div>
                            {ev.description && (
                              <p className="text-xs text-muted-foreground">
                                {ev.description}
                              </p>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-primary"
                            onClick={() => {
                              setEventToEdit(ev);
                              setSelectedDayDetail(null);
                              setEventDialogOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Marcações de Ponto na Data */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Registros de Ponto da Equipe ({selectedDayData.entries.length})
                </h4>
                {selectedDayData.entries.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhuma marcação de ponto realizada neste dia.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedDayData.entries.map((entry) => {
                      const emp = employees.find((e) => e.id === entry.employee_id);
                      const worked = calculateWorkedMinutes(
                        entry.entry_time,
                        entry.lunch_start,
                        entry.lunch_end,
                        entry.exit_time
                      );

                      return (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-border bg-card p-3 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            {emp?.avatar_url ? (
                              <img
                                src={emp.avatar_url}
                                alt={emp.name}
                                className="h-7 w-7 rounded-full object-cover border border-border"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                                {emp?.name?.charAt(0) || "U"}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-foreground">
                                {emp?.name || "Colaborador"}
                              </p>
                              <p className="text-[10px] font-mono text-muted-foreground">
                                E: {formatTimeOnly(entry.entry_time)} · A:{" "}
                                {formatTimeOnly(entry.lunch_start)} às{" "}
                                {formatTimeOnly(entry.lunch_end)} · S:{" "}
                                {formatTimeOnly(entry.exit_time)}
                              </p>
                            </div>
                          </div>

                          <span className="font-mono font-bold text-foreground">
                            {formatMinutes(worked)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botão para Adicionar Evento Nesta Data */}
              <div className="pt-2 flex justify-between border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = selectedDayData.date;
                    setSelectedDayDetail(null);
                    setEventToEdit(null);
                    setEventDialogOpen(true);
                  }}
                  className="text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Evento neste dia
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDayDetail(null)}
                >
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Cadastro/Edição de Evento */}
      <CalendarEventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        eventToEdit={eventToEdit}
      />
    </div>
  );
}
