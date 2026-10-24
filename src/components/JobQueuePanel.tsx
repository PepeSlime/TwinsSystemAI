import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Search,
  Sparkles,
  Layers,
  ArrowLeft,
  RefreshCw,
  Calendar,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useJobs, cancelJob, type Job, type JobType, type JobStatus } from "@/lib/jobs-store";
import { useJobSchedules, toggleSchedule, deleteSchedule } from "@/lib/schedules-store";
import { useCharacters } from "@/lib/store";
import { AiUsageWidget } from "./AiUsageWidget";
import { ScheduleDialog } from "./ScheduleDialog";

const JOB_TYPE_LABELS: Record<JobType, { label: string; icon: React.ReactNode }> = {
  scrape: { label: "Busca de Referências", icon: <Search className="h-3.5 w-3.5 text-primary" /> },
  suggest: { label: "Sugestões de Habilidades", icon: <Sparkles className="h-3.5 w-3.5 text-amber-400" /> },
  image: { label: "Geração de Imagens", icon: <Sparkles className="h-3.5 w-3.5 text-purple-400" /> },
  overrides: { label: "OVERRIDES Blender", icon: <Layers className="h-3.5 w-3.5 text-blue-400" /> },
};

const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; icon: React.ReactNode; style: string }
> = {
  queued: {
    label: "Na Fila",
    icon: <Clock className="h-3.5 w-3.5 text-zinc-400" />,
    style: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
  },
  running: {
    label: "Processando",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />,
    style: "bg-primary/10 text-primary border-primary/30",
  },
  done: {
    label: "Concluído",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />,
    style: "bg-green-500/10 text-green-400 border-green-500/30",
  },
  failed: {
    label: "Falhou",
    icon: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
    style: "bg-destructive/10 text-destructive border-destructive/30",
  },
  canceled: {
    label: "Cancelado",
    icon: <XCircle className="h-3.5 w-3.5 text-zinc-500" />,
    style: "bg-zinc-500/10 text-zinc-500 border-zinc-500/30",
  },
};

export function JobQueuePanel() {
  const { jobs, loading } = useJobs();
  const { schedules, loading: schedulesLoading } = useJobSchedules();
  const characters = useCharacters();
  const [filter, setFilter] = useState<string>("all");

  const getCharName = (id: string | null) => {
    if (!id) return "Geral (Equipe)";
    const char = characters.find((c) => c.id === id);
    return char ? char.name : "Personagem";
  };

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
  const activeCount = jobs.filter((j) => j.status === "running" || j.status === "queued").length;
  const activeSchedulesCount = schedules.filter((s) => s.enabled).length;

  const handleCancel = async (jobId: string) => {
    try {
      await cancelJob(jobId);
      toast.info("Processo cancelado.");
    } catch {
      toast.error("Falha ao cancelar processo.");
    }
  };

  const handleToggleSchedule = async (id: string, current: boolean) => {
    try {
      await toggleSchedule(id, !current);
      toast.info(!current ? "Agendamento ativado." : "Agendamento pausado.");
    } catch {
      toast.error("Erro ao alterar agendamento.");
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteSchedule(id);
      toast.success("Agendamento excluído.");
    } catch {
      toast.error("Erro ao excluir agendamento.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Link>
            </Button>
            <h1 className="text-3xl font-extrabold tracking-tight">Fila & Automações</h1>
            {activeCount > 0 && (
              <Badge className="bg-primary text-primary-foreground gap-1.5 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" /> {activeCount} ativo{activeCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento de requisições assíncronas, buscas em lote, agendamentos e controle de IA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ScheduleDialog />
        </div>
      </div>

      {/* Widget de Gastos Diários com IA */}
      <AiUsageWidget />

      {/* Tabs: Fila de Processamento vs Agendamentos CRON */}
      <Tabs defaultValue="queue" className="w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="queue" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Fila de Tarefas</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                {jobs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Agendamentos CRON</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                {activeSchedulesCount} ativos
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Filtros de status (apenas para a fila) */}
          <div className="flex gap-1.5 text-xs">
            {["all", "running", "queued", "done", "failed"].map((st) => (
              <button
                key={st}
                type="button"
                className={`rounded-lg px-2.5 py-1 transition-colors ${
                  filter === st
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                onClick={() => setFilter(st)}
              >
                {st === "all" ? "Todos" : STATUS_CONFIG[st as JobStatus]?.label || st}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo da Fila */}
        <TabsContent value="queue" className="space-y-3 mt-0">
          {loading ? (
            <div className="flex justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground space-y-2">
              <RefreshCw className="mx-auto h-8 w-8 opacity-40" />
              <p className="text-sm">Nenhum processo encontrado nesta visualização.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((job) => {
                const typeInfo = JOB_TYPE_LABELS[job.type] || { label: job.type, icon: null };
                const statusInfo = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued;
                const percent = job.total > 0 ? Math.round((job.progress / job.total) * 100) : 0;

                return (
                  <div
                    key={job.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1.5 border-border">
                          {typeInfo.icon}
                          <span>{typeInfo.label}</span>
                        </Badge>
                        <span className="text-sm font-bold text-foreground">
                          {getCharName(job.character_id)}
                        </span>
                        {job.character_id && (
                          <Link
                            to="/personagem/$id"
                            params={{ id: job.character_id }}
                            className="text-xs text-primary underline hover:opacity-80"
                          >
                            Ver personagem
                          </Link>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`gap-1.5 ${statusInfo.style}`}>
                          {statusInfo.icon}
                          <span>{statusInfo.label}</span>
                        </Badge>

                        {(job.status === "running" || job.status === "queued") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => handleCancel(job.id)}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>
                          Progresso: {job.progress} de {job.total} slots
                        </span>
                        <span>{percent}%</span>
                      </div>
                      <Progress value={percent} className="h-1.5" />
                    </div>

                    {/* Mensagem de Erro se houver */}
                    {job.error && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
                        <strong>Erro:</strong> {job.error}
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span>Iniciado em: {new Date(job.created_at).toLocaleString("pt-BR")}</span>
                      {job.finished_at && (
                        <span>Finalizado em: {new Date(job.finished_at).toLocaleString("pt-BR")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Conteúdo dos Agendamentos CRON */}
        <TabsContent value="schedules" className="space-y-3 mt-0">
          {schedulesLoading ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground space-y-3">
              <Calendar className="mx-auto h-8 w-8 opacity-40 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Nenhum agendamento recorrente cadastrado.</p>
                <p className="text-xs text-muted-foreground">
                  Crie buscas automáticas de referências (ex: toda madrugada às 04:00) para novos conteúdos de anime.
                </p>
              </div>
              <ScheduleDialog />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {schedules.map((sc) => (
                <div
                  key={sc.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs gap-1 border-primary/40 text-primary">
                        <Clock className="h-3 w-3" /> {sc.cron}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">
                        {getCharName(sc.character_id)}
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground">
                      {sc.last_run_at ? (
                        <span>Última execução: {new Date(sc.last_run_at).toLocaleString("pt-BR")}</span>
                      ) : (
                        <span>Aguardando primeiro disparo</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={sc.enabled}
                      onCheckedChange={() => handleToggleSchedule(sc.id, sc.enabled)}
                      aria-label="Ativar ou desativar agendamento"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteSchedule(sc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
