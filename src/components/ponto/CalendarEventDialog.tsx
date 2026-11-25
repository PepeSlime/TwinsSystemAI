import { useState } from "react";
import { toast } from "sonner";
import { Calendar, Save, Trash2, Loader2 } from "lucide-react";
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
  useEmployees,
  saveCalendarEvent,
  deleteCalendarEvent,
  type CalendarEvent,
  type CalendarEventType,
} from "@/lib/ponto-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventToEdit?: CalendarEvent | null;
  defaultDate?: string;
}

export function CalendarEventDialog({
  open,
  onOpenChange,
  eventToEdit,
  defaultDate,
}: Props) {
  const employees = useEmployees();
  const [title, setTitle] = useState(eventToEdit?.title || "");
  const [eventType, setEventType] = useState<CalendarEventType>(
    eventToEdit?.event_type || "corporate"
  );
  const [startDate, setStartDate] = useState(
    eventToEdit?.start_date || defaultDate || new Date().toISOString().split("T")[0]!
  );
  const [endDate, setEndDate] = useState(
    eventToEdit?.end_date || defaultDate || new Date().toISOString().split("T")[0]!
  );
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>(
    eventToEdit?.employee_id || "all"
  );
  const [description, setDescription] = useState(eventToEdit?.description || "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o título do evento.");
      return;
    }
    setSaving(true);
    try {
      await saveCalendarEvent({
        id: eventToEdit?.id,
        title: title.trim(),
        event_type: eventType,
        start_date: startDate,
        end_date: endDate,
        employee_id: targetEmployeeId === "all" ? null : targetEmployeeId,
        description: description.trim() || null,
        created_by: "RH",
      });
      toast.success(
        eventToEdit ? "Evento atualizado com sucesso!" : "Evento cadastrado com sucesso!"
      );
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar evento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!eventToEdit) return;
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    setSaving(true);
    try {
      await deleteCalendarEvent(eventToEdit.id);
      toast.success("Evento excluído.");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao excluir evento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-md border border-border p-6 rounded-2xl shadow-2xl space-y-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Calendar className="h-5 w-5" />
            <DialogTitle className="text-lg">
              {eventToEdit ? "Editar Evento do Calendário" : "Cadastrar Novo Evento / Feriado"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Defina feriados, eventos corporativos, folgas e ausências da equipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="evt-title" className="text-xs font-semibold">
              Título do Evento *
            </Label>
            <Input
              id="evt-title"
              placeholder="Ex.: Feriado de Tiradentes, Confraternização, Férias Lucas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-9 text-xs bg-muted/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Evento *</Label>
              <Select
                value={eventType}
                onValueChange={(v) => setEventType(v as CalendarEventType)}
              >
                <SelectTrigger className="h-9 text-xs bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">Feriado</SelectItem>
                  <SelectItem value="corporate">Evento Corporativo</SelectItem>
                  <SelectItem value="day_off">Folga</SelectItem>
                  <SelectItem value="vacation">Férias</SelectItem>
                  <SelectItem value="absence">Ausência / Licença</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Abrangência</Label>
              <Select
                value={targetEmployeeId}
                onValueChange={setTargetEmployeeId}
              >
                <SelectTrigger className="h-9 text-xs bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda a Empresa</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="evt-start" className="text-xs font-semibold">
                Data Inicial *
              </Label>
              <Input
                id="evt-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="h-9 text-xs bg-muted/30 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="evt-end" className="text-xs font-semibold">
                Data Final *
              </Label>
              <Input
                id="evt-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="h-9 text-xs bg-muted/30 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evt-desc" className="text-xs font-semibold">
              Descrição / Observações (opcional)
            </Label>
            <Textarea
              id="evt-desc"
              placeholder="Detalhes sobre o evento, horário ou alinhamentos..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="text-xs bg-muted/30 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-border">
            {eventToEdit ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={saving}
                className="gap-1.5 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
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
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Salvando..." : "Salvar Evento"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
