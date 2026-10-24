import { useState } from "react";
import { Calendar, Clock, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  useJobSchedules,
  createSchedule,
  toggleSchedule,
  deleteSchedule,
  CRON_PRESETS,
} from "@/lib/schedules-store";

interface Props {
  characterId?: string;
  characterName?: string;
}

export function ScheduleDialog({ characterId, characterName }: Props) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<string>("0 4 * * *");
  const [customCron, setCustomCron] = useState<string>("0 4 * * *");
  const [scopeType, setScopeType] = useState<string>("character");
  const [saving, setSaving] = useState(false);

  const { schedules } = useJobSchedules(characterId);

  const effectiveCron = preset === "custom" ? customCron : preset;

  const handleCreate = async () => {
    if (!effectiveCron.trim()) {
      toast.error("Informe uma expressão cron válida.");
      return;
    }

    setSaving(true);
    try {
      const scopeData: Record<string, unknown> = {
        scope_type: scopeType,
      };

      if (scopeType === "unevo") scopeData["form"] = "unevo";
      if (scopeType === "evo") scopeData["form"] = "evo";

      await createSchedule({
        character_id: scopeType === "all" ? null : (characterId ?? null),
        cron: effectiveCron,
        scope: scopeData,
        enabled: true,
      });

      toast.success("Agendamento criado com sucesso!");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleSchedule(id, !current);
      toast.info(!current ? "Agendamento ativado." : "Agendamento pausado.");
    } catch {
      toast.error("Erro ao alterar agendamento.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      toast.success("Agendamento removido.");
    } catch {
      toast.error("Erro ao remover agendamento.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" />
          <span>Agendar Busca</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <span>Agendamento de Buscas Automáticas</span>
          </DialogTitle>
          <DialogDescription>
            Configure rotinas periódicas para pesquisar novas referências e animações automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Formulário de Novo Agendamento */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
            <h4 className="font-semibold text-sm">Novo Agendamento</h4>

            {/* Escopo */}
            <div className="space-y-1.5">
              <Label className="text-xs">Escopo da Busca</Label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                value={scopeType}
                onChange={(e) => setScopeType(e.target.value)}
              >
                {characterId && (
                  <>
                    <option value="character">Este personagem ({characterName || "Atual"}) — Unevo + Evo</option>
                    <option value="unevo">Apenas Forma Unevo ({characterName || "Atual"})</option>
                    <option value="evo">Apenas Forma Evo ({characterName || "Atual"})</option>
                  </>
                )}
                <option value="all">Todos os personagens cadastrados</option>
              </select>
            </div>

            {/* Frequência */}
            <div className="space-y-1.5">
              <Label className="text-xs">Frequência</Label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
              >
                {CRON_PRESETS.map((p) => (
                  <option key={p.cron} value={p.cron}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {preset === "custom" && (
              <div className="space-y-1.5">
                <Label htmlFor="custom-cron" className="text-xs">Expressão Cron (5 campos)</Label>
                <Input
                  id="custom-cron"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  placeholder="0 4 * * *"
                  className="font-mono text-xs"
                />
              </div>
            )}

            <Button
              size="sm"
              className="w-full gap-1.5"
              disabled={saving}
              onClick={handleCreate}
            >
              <Plus className="h-4 w-4" /> Criar Agendamento
            </Button>
          </div>

          {/* Lista de Agendamentos Existentes */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Agendamentos Ativos ({schedules.length})</h4>

            {schedules.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                Nenhum agendamento cadastrado.
              </p>
            ) : (
              <div className="space-y-2">
                {schedules.map((sc) => (
                  <div
                    key={sc.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[11px] gap-1">
                          <Clock className="h-3 w-3 text-primary" /> {sc.cron}
                        </Badge>
                        <span className="text-xs font-medium">
                          {sc.character_id ? (characterName || "Personagem") : "Todos os personagens"}
                        </span>
                      </div>
                      {sc.last_run_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Última execução: {new Date(sc.last_run_at).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <Switch
                        checked={sc.enabled}
                        onCheckedChange={() => handleToggle(sc.id, sc.enabled)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(sc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
