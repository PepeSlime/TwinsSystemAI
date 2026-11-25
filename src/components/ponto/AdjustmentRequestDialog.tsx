import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Clock, Send, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  requestTimeAdjustment,
  type PunchType,
  type Employee,
} from "@/lib/ponto-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  initialDate?: string;
  initialPunch?: PunchType | "full_day";
}

export function AdjustmentRequestDialog({
  open,
  onOpenChange,
  employee,
  initialDate,
  initialPunch,
}: Props) {
  const [date, setDate] = useState(
    initialDate || new Date().toISOString().split("T")[0]!
  );
  const [targetPunch, setTargetPunch] = useState<PunchType | "full_day">(
    initialPunch || "entry_time"
  );
  const [timeStr, setTimeStr] = useState("09:00");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Por favor, informe a justificativa do ajuste.");
      return;
    }
    if (!timeStr && targetPunch !== "full_day") {
      toast.error("Por favor, informe o horário solicitado.");
      return;
    }

    setSubmitting(true);
    try {
      await requestTimeAdjustment({
        employee_id: employee.id,
        date,
        target_punch: targetPunch,
        requested_time_str: timeStr,
        reason: reason.trim(),
      });
      toast.success(
        "Solicitação de ajuste enviada com sucesso! O RH analisará o pedido."
      );
      onOpenChange(false);
      setReason("");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao enviar solicitação."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-md border border-border p-6 rounded-2xl shadow-2xl space-y-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <DialogTitle className="text-lg">Solicitar Ajuste de Ponto</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Envie uma justificativa para correção de registro esquecido ou incorreto para aprovação do RH.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Identificação do Colaborador */}
          <div className="rounded-xl border border-border bg-muted/20 p-2.5 flex items-center gap-2.5">
            {employee.avatar_url ? (
              <img
                src={employee.avatar_url}
                alt={employee.name}
                className="h-7 w-7 rounded-full object-cover border border-border shrink-0"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                {employee.name.charAt(0)}
              </div>
            )}
            <div className="text-xs">
              <p className="font-bold text-foreground">{employee.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {employee.role} · {employee.department}
              </p>
            </div>
          </div>

          {/* Data do Registro */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-date" className="text-xs font-semibold">
              Data do Registro *
            </Label>
            <Input
              id="adj-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-9 text-xs bg-muted/30"
            />
          </div>

          {/* Qual marcação ajustar */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Marcação a Ajustar *</Label>
            <Select
              value={targetPunch}
              onValueChange={(v) => setTargetPunch(v as PunchType | "full_day")}
            >
              <SelectTrigger className="h-9 text-xs bg-muted/30">
                <SelectValue placeholder="Selecione a marcação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry_time">Entrada / Início da jornada</SelectItem>
                <SelectItem value="lunch_start">Saída para intervalo de almoço</SelectItem>
                <SelectItem value="lunch_end">Retorno do intervalo de almoço</SelectItem>
                <SelectItem value="exit_time">Saída / Finalização da jornada</SelectItem>
                <SelectItem value="full_day">Jornada Completa / Abono</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Horário Solicitado */}
          {targetPunch !== "full_day" && (
            <div className="space-y-1.5">
              <Label htmlFor="adj-time" className="text-xs font-semibold">
                Horário Correto Solicitado *
              </Label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adj-time"
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  required
                  className="h-9 pl-9 text-xs bg-muted/30 font-mono"
                />
              </div>
            </div>
          )}

          {/* Justificativa Detalhada */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-reason" className="text-xs font-semibold">
              Justificativa / Motivo do Ajuste *
            </Label>
            <Textarea
              id="adj-reason"
              placeholder="Ex.: Esquecimento de registrar o retorno de almoço devido a reunião de alinhamento com cliente..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              className="text-xs bg-muted/30 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Enviando..." : "Enviar Solicitação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
