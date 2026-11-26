import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Clock,
  Play,
  Coffee,
  RotateCcw,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  User,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useActiveEmployee,
  useEmployees,
  useTodayEntry,
  setActiveEmployee,
  registerPunch,
  getNextPunchAction,
  calculateWorkedMinutes,
  formatMinutes,
  formatTimeOnly,
  getDailyTargetHours,
  isWeekend,
  type JourneyStatus,
} from "@/lib/ponto-store";
import { cn } from "@/lib/utils";

export function CompactPunchWidget({ className }: { className?: string }) {
  const activeEmployee = useActiveEmployee();
  const employees = useEmployees();
  const todayEntry = useTodayEntry(activeEmployee?.id);

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const nextAction = getNextPunchAction(todayEntry);
  const workedMinutes = calculateWorkedMinutes(
    todayEntry?.entry_time || null,
    todayEntry?.lunch_start || null,
    todayEntry?.lunch_end || null,
    todayEntry?.exit_time || null,
    currentTime
  );

  const status: JourneyStatus = todayEntry?.status || "not_started";

  const statusConfig: Record<
    JourneyStatus,
    { label: string; bgClass: string; textClass: string; dotClass: string }
  > = {
    not_started: {
      label: "Não iniciado",
      bgClass: "bg-muted/80 border-border text-muted-foreground",
      textClass: "text-muted-foreground",
      dotClass: "bg-muted-foreground",
    },
    in_progress: {
      label: "Trabalhando",
      bgClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-emerald-500/10",
      textClass: "text-emerald-400",
      dotClass: "bg-emerald-500 animate-pulse",
    },
    lunch: {
      label: "Em intervalo",
      bgClass: "bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-amber-500/10",
      textClass: "text-amber-400",
      dotClass: "bg-amber-500 animate-pulse",
    },
    finished: {
      label: "Finalizado",
      bgClass: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
      textClass: "text-cyan-400",
      dotClass: "bg-cyan-500",
    },
    inconsistent: {
      label: "Inconsistência",
      bgClass: "bg-rose-500/15 border-rose-500/30 text-rose-400",
      textClass: "text-rose-400",
      dotClass: "bg-rose-500",
    },
  };

  const currentCfg = statusConfig[status];

  // Identificação do último registro
  let lastPunchLabel = "Nenhuma marcação hoje";
  if (todayEntry?.exit_time) {
    lastPunchLabel = `Saída às ${formatTimeOnly(todayEntry.exit_time)}`;
  } else if (todayEntry?.lunch_end) {
    lastPunchLabel = `Retorno às ${formatTimeOnly(todayEntry.lunch_end)}`;
  } else if (todayEntry?.lunch_start) {
    lastPunchLabel = `Almoço às ${formatTimeOnly(todayEntry.lunch_start)}`;
  } else if (todayEntry?.entry_time) {
    lastPunchLabel = `Entrada às ${formatTimeOnly(todayEntry.entry_time)}`;
  }

  async function handlePunch() {
    if (!activeEmployee) {
      toast.error("Nenhum colaborador selecionado.");
      return;
    }
    setLoading(true);
    try {
      const res = await registerPunch(activeEmployee.id);
      toast.success(res.message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar ponto.");
    } finally {
      setLoading(false);
    }
  }

  const timeString = currentTime.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "group flex items-center gap-2.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all shadow-xs cursor-pointer hover:border-primary/50",
              currentCfg.bgClass
            )}
            title="Clique para abrir detalhes do registro de ponto"
          >
            {/* Indicador pulsante do status */}
            <span className={cn("h-2 w-2 rounded-full shrink-0", currentCfg.dotClass)} />

            {/* Relógio Compacto */}
            <div className="flex items-center gap-1.5 font-mono font-semibold text-foreground">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{timeString}</span>
            </div>

            {/* Divisor */}
            <span className="h-3 w-[1px] bg-border hidden sm:block" />

            {/* Tempo trabalhado ou status */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-[11px] font-semibold">{currentCfg.label}</span>
              {workedMinutes > 0 && (
                <span className="font-mono text-[11px] opacity-80">
                  ({formatMinutes(workedMinutes)})
                </span>
              )}
            </div>

            {/* Avatar do Colaborador Ativo */}
            <div className="flex items-center gap-1 pl-1 border-l border-border/70">
              {activeEmployee?.avatar_url ? (
                <img
                  src={activeEmployee.avatar_url}
                  alt={activeEmployee.name}
                  className="h-5 w-5 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                  {activeEmployee?.name?.charAt(0) || "U"}
                </div>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-transform" />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-80 p-4 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-2xl space-y-4"
        >
          {/* Cabeçalho do Popover: Colaborador e Relógio */}
          <div className="flex items-start justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {activeEmployee?.avatar_url ? (
                <img
                  src={activeEmployee.avatar_url}
                  alt={activeEmployee.name}
                  className="h-9 w-9 rounded-xl object-cover border border-border shrink-0"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-sm text-foreground truncate">
                  {activeEmployee?.name || "Selecione um colaborador"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {activeEmployee?.role} · {activeEmployee?.department}
                </p>
              </div>
            </div>

            {/* Trocar colaborador */}
            {employees.length > 1 && (
              <select
                value={activeEmployee?.id || ""}
                onChange={(e) => setActiveEmployee(e.target.value)}
                className="text-[10px] font-semibold bg-muted/60 hover:bg-muted border border-border rounded-lg px-2 py-1 cursor-pointer text-muted-foreground hover:text-foreground"
                title="Trocar colaborador ativo"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.department})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Relógio Dinâmico & Status */}
          <div className="rounded-xl border border-border bg-muted/20 p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Horário Atual
              </span>
              <p className="text-xl font-extrabold font-mono text-foreground tracking-tight">
                {timeString}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="text-right space-y-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border",
                  currentCfg.bgClass
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", currentCfg.dotClass)} />
                {currentCfg.label}
              </span>
              <p className="text-xs font-mono font-bold text-foreground">
                {formatMinutes(workedMinutes)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Meta: {getDailyTargetHours(activeEmployee, currentTime)}h
                {isWeekend(currentTime) ? " (Fim de semana)" : "/dia"}
              </p>
            </div>
          </div>

          {/* Linha do Tempo das 4 Marcações do Dia */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Marcações de hoje</span>
              <span className="font-medium text-foreground">{lastPunchLabel}</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center">
              {/* 1. Entrada */}
              <div
                className={cn(
                  "rounded-lg border p-1.5 text-[10px] transition-all",
                  todayEntry?.entry_time
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold"
                    : "border-border/60 bg-muted/30 text-muted-foreground"
                )}
              >
                <p className="text-[9px] uppercase tracking-wider opacity-75">Entrada</p>
                <p className="font-mono text-xs mt-0.5">
                  {formatTimeOnly(todayEntry?.entry_time)}
                </p>
              </div>

              {/* 2. Almoço */}
              <div
                className={cn(
                  "rounded-lg border p-1.5 text-[10px] transition-all",
                  todayEntry?.lunch_start
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold"
                    : "border-border/60 bg-muted/30 text-muted-foreground"
                )}
              >
                <p className="text-[9px] uppercase tracking-wider opacity-75">Almoço</p>
                <p className="font-mono text-xs mt-0.5">
                  {formatTimeOnly(todayEntry?.lunch_start)}
                </p>
              </div>

              {/* 3. Retorno */}
              <div
                className={cn(
                  "rounded-lg border p-1.5 text-[10px] transition-all",
                  todayEntry?.lunch_end
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold"
                    : "border-border/60 bg-muted/30 text-muted-foreground"
                )}
              >
                <p className="text-[9px] uppercase tracking-wider opacity-75">Retorno</p>
                <p className="font-mono text-xs mt-0.5">
                  {formatTimeOnly(todayEntry?.lunch_end)}
                </p>
              </div>

              {/* 4. Saída */}
              <div
                className={cn(
                  "rounded-lg border p-1.5 text-[10px] transition-all",
                  todayEntry?.exit_time
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 font-bold"
                    : "border-border/60 bg-muted/30 text-muted-foreground"
                )}
              >
                <p className="text-[9px] uppercase tracking-wider opacity-75">Saída</p>
                <p className="font-mono text-xs mt-0.5">
                  {formatTimeOnly(todayEntry?.exit_time)}
                </p>
              </div>
            </div>
          </div>

          {/* Botão de Próxima Marcação Inteligente */}
          <div>
            {!nextAction.isComplete ? (
              <Button
                type="button"
                onClick={handlePunch}
                disabled={loading}
                className={cn(
                  "w-full h-10 font-bold shadow-md gap-2 text-white",
                  nextAction.type === "entry_time" && "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30",
                  nextAction.type === "lunch_start" && "bg-amber-600 hover:bg-amber-500 shadow-amber-900/30",
                  nextAction.type === "lunch_end" && "bg-amber-600 hover:bg-amber-500 shadow-amber-900/30",
                  nextAction.type === "exit_time" && "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-900/30"
                )}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : nextAction.type === "entry_time" ? (
                  <Play className="h-4 w-4 fill-current" />
                ) : nextAction.type === "lunch_start" ? (
                  <Coffee className="h-4 w-4" />
                ) : nextAction.type === "lunch_end" ? (
                  <RotateCcw className="h-4 w-4" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                <span>{loading ? "Registrando..." : nextAction.label}</span>
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                <span>Jornada de hoje finalizada ({formatMinutes(workedMinutes)})</span>
              </div>
            )}
          </div>

          {/* Link para o Módulo de Ponto Completo */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <Link
              to="/ponto"
              onClick={() => setPopoverOpen(false)}
              className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold"
            >
              <span>Acessar Meu Ponto & Gestão</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            <span className="text-[10px] text-muted-foreground">ADP Lite</span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
