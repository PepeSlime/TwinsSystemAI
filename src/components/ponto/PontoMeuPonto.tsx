import { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  Plus,
  Coffee,
  CheckCircle2,
  FileText,
  User,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useActiveEmployee,
  useEmployees,
  useTimeEntries,
  useAdjustmentRequests,
  setActiveEmployee,
  formatMinutes,
  formatTimeOnly,
  getTodayDateStr,
  calculateWorkedMinutes,
  getDailyTargetHours,
  getDailyTargetMinutes,
  isWeekend,
  type TimeEntry,
  type PunchType,
} from "@/lib/ponto-store";
import { AdjustmentRequestDialog } from "./AdjustmentRequestDialog";
import { cn } from "@/lib/utils";

export function PontoMeuPonto() {
  const activeEmployee = useActiveEmployee();
  const employees = useEmployees();
  const allEntries = useTimeEntries();
  const allAdjustments = useAdjustmentRequests();
  const today = getTodayDateStr();

  // Mês selecionado para visualização (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  });

  // Modal de ajuste
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [targetAdjustDate, setTargetAdjustDate] = useState<string | undefined>();
  const [targetPunchType, setTargetPunchType] = useState<PunchType | "full_day">("entry_time");

  // Filtra registros do colaborador ativo
  const empEntries = useMemo(() => {
    if (!activeEmployee) return [];
    return allEntries
      .filter((e) => e.employee_id === activeEmployee.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allEntries, activeEmployee]);

  // Registros do mês selecionado
  const monthEntries = useMemo(() => {
    return empEntries.filter((e) => e.date.startsWith(selectedMonth));
  }, [empEntries, selectedMonth]);

  // Cálculos de resumo
  const metrics = useMemo(() => {
    let todayMinutes = 0;
    let weekMinutes = 0;
    let monthMinutes = 0;
    let inconsistentDays = 0;

    const now = new Date();
    const currDay = now.getDate();
    const currMonth = now.getMonth();
    const currYear = now.getFullYear();

    // Início da semana (domingo ou segunda)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    for (const entry of empEntries) {
      const worked = calculateWorkedMinutes(
        entry.entry_time,
        entry.lunch_start,
        entry.lunch_end,
        entry.exit_time
      );

      // Hoje
      if (entry.date === today) {
        todayMinutes += worked;
      }

      // Semana
      const entryDate = new Date(entry.date + "T00:00:00");
      if (entryDate >= startOfWeek && entryDate <= now) {
        weekMinutes += worked;
      }

      // Mês
      if (entryDate.getMonth() === currMonth && entryDate.getFullYear() === currYear) {
        monthMinutes += worked;
      }

      // Inconsistências
      if (entry.inconsistency_type && entry.date !== today) {
        inconsistentDays++;
      }
    }

    // Saldo do mês somando a meta específica de cada dia registrado (8h seg-sex, 4h sáb-dom)
    const expectedMonthMinutes = monthEntries.reduce(
      (acc, entry) => acc + getDailyTargetMinutes(activeEmployee, entry.date),
      0
    );
    const balanceMinutes = monthMinutes - expectedMonthMinutes;

    return {
      todayMinutes,
      weekMinutes,
      monthMinutes,
      balanceMinutes,
      inconsistentDays,
    };
  }, [empEntries, monthEntries, activeEmployee, today]);

  // Ajustes do colaborador
  const empAdjustments = useMemo(() => {
    if (!activeEmployee) return [];
    return allAdjustments.filter((a) => a.employee_id === activeEmployee.id);
  }, [allAdjustments, activeEmployee]);

  function handleOpenAdjustment(date: string, punch: PunchType | "full_day" = "entry_time") {
    setTargetAdjustDate(date);
    setTargetPunchType(punch);
    setAdjustmentOpen(true);
  }

  function handleMonthChange(delta: number) {
    const [y, m] = selectedMonth.split("-").map(Number);
    if (!y || !m) return;
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(
      `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`
    );
  }

  const [currentYear, currentMonthNum] = selectedMonth.split("-").map(Number);
  const monthName = new Date(currentYear!, currentMonthNum! - 1, 1).toLocaleDateString(
    "pt-BR",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="space-y-6">
      {/* Barra de Cabeçalho do Colaborador & Mês */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          {activeEmployee?.avatar_url ? (
            <img
              src={activeEmployee.avatar_url}
              alt={activeEmployee.name}
              className="h-12 w-12 rounded-xl object-cover border border-border"
            />
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-lg">
              <User className="h-6 w-6" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">
                {activeEmployee?.name || "Colaborador"}
              </h2>
              {employees.length > 1 && (
                <Select
                  value={activeEmployee?.id}
                  onValueChange={(id) => setActiveEmployee(id)}
                >
                  <SelectTrigger className="h-7 w-[160px] text-xs bg-muted/40">
                    <SelectValue placeholder="Trocar colaborador" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeEmployee?.role} · {activeEmployee?.department} · Carga: {activeEmployee?.daily_hours || 8}h (Seg-Sex) · {activeEmployee?.weekend_daily_hours || 4}h (Sáb-Dom)
            </p>
          </div>
        </div>

        {/* Navegação de Mês & Botão de Solicitar Ajuste */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center rounded-xl border border-border bg-muted/20 p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => handleMonthChange(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-xs font-bold capitalize text-foreground font-mono">
              {monthName}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => handleMonthChange(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenAdjustment(today, "entry_time")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Solicitar Ajuste
          </Button>
        </div>
      </div>

      {/* Cards de Métricas de Horas */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {/* Horas Hoje */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Horas Hoje</span>
          <p className="text-2xl font-extrabold text-foreground font-mono">
            {formatMinutes(metrics.todayMinutes)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Meta diária: {getDailyTargetHours(activeEmployee, today)}h
            {isWeekend(today) ? " (Fim de semana)" : " (Dia útil)"}
          </p>
        </div>

        {/* Horas na Semana */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Nesta Semana</span>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono">
            {formatMinutes(metrics.weekMinutes)}
          </p>
          <p className="text-[10px] text-muted-foreground">Total acumulado na semana</p>
        </div>

        {/* Total no Mês */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground">No Mês Atual</span>
          <p className="text-2xl font-extrabold text-primary font-mono">
            {formatMinutes(metrics.monthMinutes)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Saldo: {formatMinutes(metrics.balanceMinutes)}
          </p>
        </div>

        {/* Dias com Inconsistências */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1 shadow-xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Inconsistências</span>
          <p
            className={cn(
              "text-2xl font-extrabold font-mono",
              metrics.inconsistentDays > 0 ? "text-rose-400" : "text-foreground"
            )}
          >
            {metrics.inconsistentDays} dia(s)
          </p>
          <p className="text-[10px] text-muted-foreground">Pendentes de correção</p>
        </div>
      </div>

      {/* Tabela de Histórico Diário */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Espelho de Ponto — {monthName}
            </h3>
            <p className="text-xs text-muted-foreground">
              Horários de entrada, intervalo, saída e saldo apurado por dia.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {monthEntries.length} dia(s) com registro
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Entrada</th>
                <th className="py-2.5 px-3">Saída Almoço</th>
                <th className="py-2.5 px-3">Retorno Almoço</th>
                <th className="py-2.5 px-3">Saída</th>
                <th className="py-2.5 px-3">Total Trabalhado</th>
                <th className="py-2.5 px-3">Saldo</th>
                <th className="py-2.5 px-3">Situação</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {monthEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-40 text-primary" />
                    <p className="font-semibold text-foreground">
                      Nenhum registro de ponto encontrado para este mês.
                    </p>
                    <p className="text-xs mt-1">
                      Utilize o widget de ponto no cabeçalho ou clique em "Solicitar Ajuste" acima.
                    </p>
                  </td>
                </tr>
              ) : (
                monthEntries.map((entry) => {
                  const workedMinutes = calculateWorkedMinutes(
                    entry.entry_time,
                    entry.lunch_start,
                    entry.lunch_end,
                    entry.exit_time
                  );
                  const dailyTarget = getDailyTargetMinutes(activeEmployee, entry.date);
                  const dayBalance = workedMinutes - dailyTarget;
                  const isToday = entry.date === today;
                  const isWeekendDay = isWeekend(entry.date);

                  const dateObj = new Date(entry.date + "T00:00:00");
                  const weekday = dateObj.toLocaleDateString("pt-BR", { weekday: "short" });
                  const formattedDate = dateObj.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  });

                  return (
                    <tr
                      key={entry.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors",
                        entry.inconsistency_type && !isToday && "bg-rose-500/5",
                        isToday && "bg-primary/5"
                      )}
                    >
                      {/* Data */}
                      <td className="py-3 px-3 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground capitalize">
                            {weekday}
                          </span>
                          <span className="text-muted-foreground font-mono">
                            {formattedDate}
                          </span>
                          {isWeekendDay && (
                            <span className="rounded bg-amber-500/15 text-amber-300 text-[9px] px-1 font-bold border border-amber-500/30">
                              FDS ({getDailyTargetHours(activeEmployee, entry.date)}h)
                            </span>
                          )}
                          {isToday && (
                            <span className="rounded bg-primary/20 text-primary text-[9px] px-1 font-bold">
                              Hoje
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Entrada */}
                      <td className="py-3 px-3 font-mono font-semibold text-emerald-400">
                        {formatTimeOnly(entry.entry_time)}
                      </td>

                      {/* Saída Almoço */}
                      <td className="py-3 px-3 font-mono font-semibold text-amber-400">
                        {formatTimeOnly(entry.lunch_start)}
                      </td>

                      {/* Retorno Almoço */}
                      <td className="py-3 px-3 font-mono font-semibold text-amber-400">
                        {formatTimeOnly(entry.lunch_end)}
                      </td>

                      {/* Saída */}
                      <td className="py-3 px-3 font-mono font-semibold text-cyan-400">
                        {formatTimeOnly(entry.exit_time)}
                      </td>

                      {/* Total Trabalhado */}
                      <td className="py-3 px-3 font-mono font-bold text-foreground">
                        {formatMinutes(workedMinutes)}
                      </td>

                      {/* Saldo */}
                      <td className="py-3 px-3 font-mono font-semibold text-[11px]">
                        {entry.exit_time ? (
                          <span
                            className={cn(
                              dayBalance >= 0 ? "text-emerald-400" : "text-rose-400"
                            )}
                          >
                            {dayBalance > 0 ? `+${formatMinutes(dayBalance)}` : formatMinutes(dayBalance)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">--</span>
                        )}
                      </td>

                      {/* Situação */}
                      <td className="py-3 px-3">
                        {entry.inconsistency_type && !isToday ? (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-bold text-[10px] bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="h-3 w-3" />
                            {entry.inconsistency_type}
                          </span>
                        ) : entry.status === "finished" ? (
                          <span className="inline-flex items-center gap-1 text-cyan-400 font-bold text-[10px] bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> Concluído
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px] bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            Em andamento
                          </span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenAdjustment(entry.date, "lunch_end")}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          Justificar
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seção de Solicitações de Ajuste do Colaborador */}
      {empAdjustments.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Minhas Solicitações de Ajuste de Ponto ({empAdjustments.length})</span>
            </h3>
            <span className="text-xs text-muted-foreground">Histórico de aprovações</span>
          </div>

          <div className="divide-y divide-border/60">
            {empAdjustments.map((req) => (
              <div
                key={req.id}
                className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs font-mono">
                      {new Date(req.date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Ajuste solicitado para: <strong>{req.target_punch}</strong> ({req.requested_time_str})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    "{req.reason}"
                  </p>
                  {req.admin_notes && (
                    <p className="text-[11px] text-primary">
                      Obs. do RH: {req.admin_notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                      req.status === "pending" && "border-amber-500/40 bg-amber-500/10 text-amber-300",
                      req.status === "approved" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                      req.status === "rejected" && "border-rose-500/40 bg-rose-500/10 text-rose-300"
                    )}
                  >
                    {req.status === "pending" && "Pendente de Análise"}
                    {req.status === "approved" && "Aprovado pelo RH"}
                    {req.status === "rejected" && "Rejeitado pelo RH"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog de Solicitação de Ajuste */}
      {activeEmployee && (
        <AdjustmentRequestDialog
          open={adjustmentOpen}
          onOpenChange={setAdjustmentOpen}
          employee={activeEmployee}
          initialDate={targetAdjustDate}
          initialPunch={targetPunchType}
        />
      )}
    </div>
  );
}
