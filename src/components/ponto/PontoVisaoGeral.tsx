import { useState } from "react";
import {
  Users,
  Clock,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Search,
  Filter,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useEmployees,
  useTimeEntries,
  useAdjustmentRequests,
  getTodayDateStr,
  formatMinutes,
  formatTimeOnly,
  calculateWorkedMinutes,
  type JourneyStatus,
  type Employee,
} from "@/lib/ponto-store";
import { cn } from "@/lib/utils";

export function PontoVisaoGeral({
  onNavigateTab,
}: {
  onNavigateTab: (tab: string) => void;
}) {
  const employees = useEmployees();
  const timeEntries = useTimeEntries();
  const adjustments = useAdjustmentRequests();
  const today = getTodayDateStr();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  const activeEmployees = employees.filter((e) => e.status === "active");

  // Entradas de hoje
  const todayEntries = timeEntries.filter((e) => e.date === today);

  // Métricas
  const workingNow = todayEntries.filter((e) => e.status === "in_progress").length;
  const inLunch = todayEntries.filter((e) => e.status === "lunch").length;
  const finishedToday = todayEntries.filter((e) => e.status === "finished").length;
  const notStartedToday = Math.max(
    0,
    activeEmployees.length - (workingNow + inLunch + finishedToday)
  );

  // Inconsistências
  const pendingInconsistencies = timeEntries.filter(
    (e) => e.inconsistency_type !== null && e.date !== today
  ).length;

  const pendingAdjustments = adjustments.filter(
    (a) => a.status === "pending"
  ).length;

  // Departamentos disponíveis
  const departments = Array.from(new Set(employees.map((e) => e.department)));

  // Filtragem da tabela de equipe
  const filteredEmployees = activeEmployees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === "all" || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-8">
      {/* Cards com Métricas Principais */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {/* 1. Colaboradores Ativos */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Ativos</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold text-foreground font-mono">
            {activeEmployees.length}
          </p>
          <p className="text-[10px] text-muted-foreground">Equipe cadastrada</p>
        </div>

        {/* 2. Trabalhando Agora */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-semibold">Trabalhando</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-300 font-mono">
            {workingNow}
          </p>
          <p className="text-[10px] text-muted-foreground">Em jornada ativa</p>
        </div>

        {/* 3. Em Intervalo */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold">Em Intervalo</span>
            <Coffee className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-amber-300 font-mono">
            {inLunch}
          </p>
          <p className="text-[10px] text-muted-foreground">Pausa para refeição</p>
        </div>

        {/* 4. Não Iniciaram Hoje */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Não Iniciaram</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-2xl font-extrabold text-foreground font-mono">
            {notStartedToday}
          </p>
          <p className="text-[10px] text-muted-foreground">Sem entrada hoje</p>
        </div>

        {/* 5. Inconsistências */}
        <div
          onClick={() => onNavigateTab("inconsistencias")}
          className={cn(
            "rounded-2xl border p-4 space-y-2 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5",
            pendingInconsistencies > 0
              ? "border-rose-500/40 bg-rose-500/10 hover:border-rose-500"
              : "border-border bg-card"
          )}
        >
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-semibold">Inconsistências</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <p className="text-2xl font-extrabold text-rose-300 font-mono">
            {pendingInconsistencies}
          </p>
          <p className="text-[10px] text-muted-foreground">Registros incompletos</p>
        </div>

        {/* 6. Solicitações Pendentes */}
        <div
          onClick={() => onNavigateTab("inconsistencias")}
          className={cn(
            "rounded-2xl border p-4 space-y-2 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5",
            pendingAdjustments > 0
              ? "border-primary/40 bg-primary/10 hover:border-primary"
              : "border-border bg-card"
          )}
        >
          <div className="flex items-center justify-between text-primary">
            <span className="text-xs font-semibold">Aprovações</span>
            <FileCheck className="h-4 w-4" />
          </div>
          <p className="text-2xl font-extrabold text-primary font-mono">
            {pendingAdjustments}
          </p>
          <p className="text-[10px] text-muted-foreground">Ajustes a revisar</p>
        </div>
      </div>

      {/* Tabela de Monitoramento da Equipe em Tempo Real */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span>Monitoramento da Equipe Hoje</span>
              <span className="text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acompanhamento de status, horários de entrada, intervalo e tempo trabalhado.
            </p>
          </div>

          {/* Filtros rápidos */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/40"
              />
            </div>

            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="h-8 w-[140px] text-xs bg-muted/40">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">Todos os setores</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela Responsiva */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-2.5 px-3">Colaborador</th>
                <th className="py-2.5 px-3">Horário Previsto</th>
                <th className="py-2.5 px-3">Entrada</th>
                <th className="py-2.5 px-3">Intervalo</th>
                <th className="py-2.5 px-3">Retorno</th>
                <th className="py-2.5 px-3">Saída</th>
                <th className="py-2.5 px-3">Horas Hoje</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    Nenhum colaborador encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const entry = todayEntries.find((e) => e.employee_id === emp.id);
                  const status: JourneyStatus = entry?.status || "not_started";

                  const workedMinutes = entry
                    ? calculateWorkedMinutes(
                        entry.entry_time,
                        entry.lunch_start,
                        entry.lunch_end,
                        entry.exit_time
                      )
                    : 0;

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Colaborador */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {emp.avatar_url ? (
                            <img
                              src={emp.avatar_url}
                              alt={emp.name}
                              className="h-8 w-8 rounded-full object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                              {emp.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-foreground text-xs">{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {emp.role} · {emp.department}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Horário Previsto */}
                      <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">
                        {emp.work_schedule}
                      </td>

                      {/* Entrada */}
                      <td className="py-3 px-3 font-mono">
                        {entry?.entry_time ? (
                          <span className="text-emerald-400 font-semibold">
                            {formatTimeOnly(entry.entry_time)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">--:--</span>
                        )}
                      </td>

                      {/* Intervalo */}
                      <td className="py-3 px-3 font-mono">
                        {entry?.lunch_start ? (
                          <span className="text-amber-400 font-semibold">
                            {formatTimeOnly(entry.lunch_start)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">--:--</span>
                        )}
                      </td>

                      {/* Retorno */}
                      <td className="py-3 px-3 font-mono">
                        {entry?.lunch_end ? (
                          <span className="text-amber-400 font-semibold">
                            {formatTimeOnly(entry.lunch_end)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">--:--</span>
                        )}
                      </td>

                      {/* Saída */}
                      <td className="py-3 px-3 font-mono">
                        {entry?.exit_time ? (
                          <span className="text-cyan-400 font-semibold">
                            {formatTimeOnly(entry.exit_time)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">--:--</span>
                        )}
                      </td>

                      {/* Horas Hoje */}
                      <td className="py-3 px-3 font-mono font-bold text-foreground">
                        {workedMinutes > 0 ? formatMinutes(workedMinutes) : "0h 00m"}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                            status === "in_progress" &&
                              "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
                            status === "lunch" &&
                              "border-amber-500/40 bg-amber-500/10 text-amber-300",
                            status === "finished" &&
                              "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
                            status === "inconsistent" &&
                              "border-rose-500/40 bg-rose-500/10 text-rose-300",
                            status === "not_started" &&
                              "border-border bg-muted/40 text-muted-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              status === "in_progress" && "bg-emerald-400 animate-pulse",
                              status === "lunch" && "bg-amber-400 animate-pulse",
                              status === "finished" && "bg-cyan-400",
                              status === "inconsistent" && "bg-rose-400",
                              status === "not_started" && "bg-muted-foreground"
                            )}
                          />
                          {status === "in_progress" && "Trabalhando"}
                          {status === "lunch" && "Em Intervalo"}
                          {status === "finished" && "Finalizado"}
                          {status === "inconsistent" && "Inconsistente"}
                          {status === "not_started" && "Não Iniciado"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
