import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MessageSquare,
  History,
  ShieldCheck,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  useAdjustmentRequests,
  reviewAdjustmentRequest,
  formatTimeOnly,
  formatMinutes,
  getTodayDateStr,
  type TimeAdjustmentRequest,
  type TimeEntry,
} from "@/lib/ponto-store";
import { cn } from "@/lib/utils";

export function PontoInconsistencias() {
  const employees = useEmployees();
  const timeEntries = useTimeEntries();
  const adjustments = useAdjustmentRequests();
  const today = getTodayDateStr();

  // Modal de revisão pelo RH
  const [selectedRequest, setSelectedRequest] = useState<TimeAdjustmentRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewerName, setReviewerName] = useState("Gestor de RH");
  const [processing, setProcessing] = useState(false);

  // Inconsistências automáticas detectadas (dias anteriores com registros incompletos)
  const systemInconsistencies = timeEntries.filter(
    (e) => e.inconsistency_type !== null && e.date !== today
  );

  // Solicitações separadas por pendentes e resolvidas
  const pendingRequests = adjustments.filter((a) => a.status === "pending");
  const resolvedRequests = adjustments.filter((a) => a.status !== "pending");

  async function handleReview(decision: "approved" | "rejected") {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      await reviewAdjustmentRequest(
        selectedRequest.id,
        decision,
        adminNotes.trim(),
        reviewerName.trim() || "RH"
      );
      toast.success(
        decision === "approved"
          ? "Ajuste aprovado e registro de ponto atualizado!"
          : "Solicitação rejeitada com justificativa registrada."
      );
      setSelectedRequest(null);
      setAdminNotes("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar.");
    } finally {
      setProcessing(false);
    }
  }

  const targetPunchLabels: Record<string, string> = {
    entry_time: "Entrada",
    lunch_start: "Saída para Almoço",
    lunch_end: "Retorno do Almoço",
    exit_time: "Saída",
    full_day: "Jornada Completa",
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span>Inconsistências & Solicitações de Ajuste</span>
            {pendingRequests.length > 0 && (
              <span className="text-xs font-semibold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5">
                {pendingRequests.length} pendente(s)
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Análise e aprovação de correções de jornada solicitadas pelos colaboradores com rastreabilidade completa.
          </p>
        </div>
      </div>

      {/* 1. Solicitações Pendentes de Aprovação */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-primary" />
            <span>Solicitações Aguardando Aprovação ({pendingRequests.length})</span>
          </h3>
          <span className="text-xs text-muted-foreground">Fila do RH</span>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400 opacity-60" />
            <p className="font-semibold text-foreground">
              Nenhuma solicitação de ajuste pendente!
            </p>
            <p className="text-xs mt-1">
              Todos os pedidos de correção de ponto foram analisados.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {pendingRequests.map((req) => {
              const emp = employees.find((e) => e.id === req.employee_id);
              return (
                <div
                  key={req.id}
                  className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {emp?.name || "Colaborador"}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.2 text-[10px] text-muted-foreground">
                        {emp?.department}
                      </span>
                      <span className="text-xs font-mono font-semibold text-primary">
                        Data: {new Date(req.date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <div className="text-xs flex items-center gap-2 text-foreground font-medium">
                      <span>Correção solicitada:</span>
                      <span className="rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 font-bold">
                        {targetPunchLabels[req.target_punch] || req.target_punch}
                        {req.requested_time_str && ` → ${req.requested_time_str}`}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded-lg border border-border/50">
                      Justificativa: "{req.reason}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(req);
                        setAdminNotes("");
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 gap-1.5 shadow-sm"
                    >
                      Analisar Solicitação
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Inconsistências Detectadas Automaticamente no Sistema */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span>Inconsistências Detectadas pelo Sistema ({systemInconsistencies.length})</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dias com batidas faltantes ou registros fora da ordem esperada.
            </p>
          </div>
        </div>

        {systemInconsistencies.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center italic">
            Nenhum registro com inconsistência técnica detectado.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {systemInconsistencies.map((entry) => {
              const emp = employees.find((e) => e.id === entry.employee_id);
              return (
                <div
                  key={entry.id}
                  className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{emp?.name}</span>
                      <span className="font-mono text-muted-foreground">
                        {new Date(entry.date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                      <span className="rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold px-2 py-0.2 text-[10px]">
                        {entry.inconsistency_type}
                      </span>
                    </div>

                    <p className="text-[11px] font-mono text-muted-foreground">
                      Entrada: {formatTimeOnly(entry.entry_time)} · Almoço:{" "}
                      {formatTimeOnly(entry.lunch_start)} às{" "}
                      {formatTimeOnly(entry.lunch_end)} · Saída:{" "}
                      {formatTimeOnly(entry.exit_time)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Histórico de Solicitações Aprovadas ou Rejeitadas */}
      {resolvedRequests.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <span>Histórico de Ajustes Concluídos ({resolvedRequests.length})</span>
            </h3>
            <span className="text-xs text-muted-foreground">Auditoria</span>
          </div>

          <div className="divide-y divide-border/60">
            {resolvedRequests.map((req) => {
              const emp = employees.find((e) => e.id === req.employee_id);
              const isApproved = req.status === "approved";

              return (
                <div
                  key={req.id}
                  className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{emp?.name}</span>
                      <span className="font-mono text-muted-foreground">
                        Data: {new Date(req.date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                      <span className="text-muted-foreground">
                        {targetPunchLabels[req.target_punch] || req.target_punch} ({req.requested_time_str})
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground italic">
                      "{req.reason}"
                    </p>

                    {req.admin_notes && (
                      <p className="text-[11px] text-primary">
                        Parecer do RH: {req.admin_notes}
                      </p>
                    )}
                  </div>

                  <div className="text-right space-y-1 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                        isApproved
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                      )}
                    >
                      {isApproved ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {isApproved ? "Aprovado" : "Rejeitado"}
                    </span>
                    {req.reviewed_by && (
                      <p className="text-[10px] text-muted-foreground">
                        Por: {req.reviewed_by}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Análise e Aprovação de Solicitação */}
      <Dialog
        open={selectedRequest !== null}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      >
        <DialogContent className="max-w-lg bg-card/95 backdrop-blur-md border border-border p-6 rounded-2xl shadow-2xl space-y-4">
          {selectedRequest && (
            <>
              <DialogHeader className="border-b border-border pb-3">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span>Analisar Solicitação de Ajuste de Ponto</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Verifique a justificativa do colaborador e o registro original antes de aprovar ou rejeitar.
                </DialogDescription>
              </DialogHeader>

              {/* Informações da Solicitação */}
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground">Colaborador:</span>
                    <span className="font-bold text-foreground">
                      {employees.find((e) => e.id === selectedRequest.employee_id)?.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground">Data do Ponto:</span>
                    <span className="font-mono text-foreground">
                      {new Date(selectedRequest.date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground">Marcação Solicitada:</span>
                    <span className="font-bold text-primary font-mono">
                      {targetPunchLabels[selectedRequest.target_punch] || selectedRequest.target_punch}
                      {selectedRequest.requested_time_str && ` (${selectedRequest.requested_time_str})`}
                    </span>
                  </div>
                </div>

                {/* Justificativa do Colaborador */}
                <div className="space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                    Justificativa do Colaborador:
                  </span>
                  <div className="rounded-xl border border-border bg-muted/30 p-3 italic text-foreground">
                    "{selectedRequest.reason}"
                  </div>
                </div>

                {/* Registro Original Preservado */}
                {selectedRequest.original_data && (
                  <div className="space-y-1">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                      Registro Original Preservado (Auditoria):
                    </span>
                    <div className="rounded-xl border border-border/80 bg-muted/10 p-2.5 font-mono text-[11px] text-muted-foreground">
                      E: {formatTimeOnly((selectedRequest.original_data as Record<string, string>)["entry_time"])} ·
                      Almoço: {formatTimeOnly((selectedRequest.original_data as Record<string, string>)["lunch_start"])} às{" "}
                      {formatTimeOnly((selectedRequest.original_data as Record<string, string>)["lunch_end"])} ·
                      S: {formatTimeOnly((selectedRequest.original_data as Record<string, string>)["exit_time"])}
                    </div>
                  </div>
                )}

                {/* Parecer / Observações do RH */}
                <div className="space-y-1.5 pt-1">
                  <label className="font-bold text-xs text-foreground">
                    Observações do RH (opcional):
                  </label>
                  <Textarea
                    placeholder="Ex.: Aprovado conforme confirmação do líder de equipe..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                    className="text-xs bg-muted/30 resize-none"
                  />
                </div>
              </div>

              {/* Botões de Decisão */}
              <div className="pt-3 flex items-center justify-between border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRequest(null)}
                >
                  Cancelar
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={processing}
                    onClick={() => handleReview("rejected")}
                    className="gap-1 text-xs"
                  >
                    <XCircle className="h-4 w-4" /> Rejeitar
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={processing}
                    onClick={() => handleReview("approved")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1 text-xs font-semibold shadow-sm"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Aprovar e Ajustar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
