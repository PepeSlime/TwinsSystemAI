import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Save, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { saveEmployee, deleteEmployee, type Employee } from "@/lib/ponto-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeToEdit?: Employee | null;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employeeToEdit,
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Desenvolvimento");
  const [role, setRole] = useState("");
  const [workSchedule, setWorkSchedule] = useState("09:00 - 18:00 (1h intervalo)");
  const [dailyHours, setDailyHours] = useState("8");
  const [weekendDailyHours, setWeekendDailyHours] = useState("4");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (employeeToEdit) {
      setName(employeeToEdit.name);
      setEmail(employeeToEdit.email || "");
      setDepartment(employeeToEdit.department);
      setRole(employeeToEdit.role);
      setWorkSchedule(employeeToEdit.work_schedule);
      setDailyHours(String(employeeToEdit.daily_hours));
      setWeekendDailyHours(String(employeeToEdit.weekend_daily_hours ?? 4));
      setAvatarUrl(employeeToEdit.avatar_url || "");
      setStatus(employeeToEdit.status);
      setIsAdmin(employeeToEdit.is_admin);
    } else {
      setName("");
      setEmail("");
      setDepartment("Desenvolvimento");
      setRole("");
      setWorkSchedule("09:00 - 18:00 (1h intervalo)");
      setDailyHours("8");
      setWeekendDailyHours("4");
      setAvatarUrl("");
      setStatus("active");
      setIsAdmin(false);
    }
  }, [employeeToEdit, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome completo do colaborador.");
      return;
    }

    setSaving(true);
    try {
      await saveEmployee({
        id: employeeToEdit?.id,
        name: name.trim(),
        email: email.trim() || null,
        department: department.trim(),
        role: role.trim() || "Colaborador",
        work_schedule: workSchedule.trim(),
        daily_hours: Number(dailyHours) || 8,
        weekend_daily_hours: Number(weekendDailyHours) || 4,
        avatar_url: avatarUrl.trim() || null,
        status,
        is_admin: isAdmin,
      });

      toast.success(
        employeeToEdit
          ? "Dados do colaborador atualizados!"
          : "Novo colaborador cadastrado com sucesso!"
      );
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!employeeToEdit) return;
    if (
      !confirm(
        `Tem certeza que deseja excluir o colaborador "${employeeToEdit.name}"? Todos os seus registros de ponto serão removidos.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      await deleteEmployee(employeeToEdit.id);
      toast.success(`Colaborador "${employeeToEdit.name}" excluído com sucesso.`);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir colaborador.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card/95 backdrop-blur-md border border-border p-6 rounded-2xl shadow-2xl space-y-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold">
            <User className="h-5 w-5" />
            <DialogTitle className="text-lg">
              {employeeToEdit ? "Editar Colaborador" : "Cadastrar Novo Colaborador"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre as informações contratuais, horários e departamento do membro da equipe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {/* Nome e E-mail */}
          <div className="space-y-1.5">
            <Label htmlFor="emp-name" className="text-xs font-semibold">
              Nome Completo *
            </Label>
            <Input
              id="emp-name"
              placeholder="Ex.: Carolina Santos"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-9 text-xs bg-muted/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-email" className="text-xs font-semibold">
              E-mail Corporativo
            </Label>
            <Input
              id="emp-email"
              type="email"
              placeholder="carolina.santos@twins.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 text-xs bg-muted/30"
            />
          </div>

          {/* Departamento e Cargo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Departamento *</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="h-9 text-xs bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Desenvolvimento">Desenvolvimento</SelectItem>
                  <SelectItem value="Arte & 3D">Arte & 3D</SelectItem>
                  <SelectItem value="VFX & Animação">VFX & Animação</SelectItem>
                  <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
                  <SelectItem value="Game Design">Game Design</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-role" className="text-xs font-semibold">
                Cargo / Função *
              </Label>
              <Input
                id="emp-role"
                placeholder="Ex.: 3D Modeler, Dev"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="h-9 text-xs bg-muted/30"
              />
            </div>
          </div>

          {/* Horário de Trabalho e Cargas Horárias */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="emp-sched" className="text-xs font-semibold">
                Horário Contratual (Exibição)
              </Label>
              <Input
                id="emp-sched"
                placeholder="09:00 - 18:00 (1h intervalo)"
                value={workSchedule}
                onChange={(e) => setWorkSchedule(e.target.value)}
                className="h-9 text-xs bg-muted/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emp-hours" className="text-xs font-semibold">
                    Carga Seg - Sex
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Dia útil</span>
                </div>
                <div className="relative">
                  <Input
                    id="emp-hours"
                    type="number"
                    min="1"
                    max="12"
                    value={dailyHours}
                    onChange={(e) => setDailyHours(e.target.value)}
                    className="h-9 text-xs bg-muted/30 font-mono pr-7"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                    h
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emp-weekend-hours" className="text-xs font-semibold">
                    Carga Sáb / Dom
                  </Label>
                  <span className="text-[10px] text-amber-400 font-semibold">Fim de Semana</span>
                </div>
                <div className="relative">
                  <Input
                    id="emp-weekend-hours"
                    type="number"
                    min="1"
                    max="12"
                    value={weekendDailyHours}
                    onChange={(e) => setWeekendDailyHours(e.target.value)}
                    className="h-9 text-xs bg-muted/30 font-mono pr-7 border-amber-500/30"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                    h
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Foto / Avatar URL */}
          <div className="space-y-1.5">
            <Label htmlFor="emp-avatar" className="text-xs font-semibold">
              URL da Foto / Avatar (opcional)
            </Label>
            <Input
              id="emp-avatar"
              placeholder="https://..."
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="h-9 text-xs bg-muted/30"
            />
          </div>

          {/* Permissões de Admin / Status */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center justify-between rounded-xl border border-border p-2.5">
              <div className="space-y-0.5">
                <Label htmlFor="emp-admin" className="text-xs font-semibold">
                  Admin / RH
                </Label>
                <p className="text-[10px] text-muted-foreground">Pode aprovar pontos</p>
              </div>
              <Switch id="emp-admin" checked={isAdmin} onCheckedChange={setIsAdmin} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-2.5">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Ativo</Label>
                <p className="text-[10px] text-muted-foreground">Bate ponto normal</p>
              </div>
              <Switch
                checked={status === "active"}
                onCheckedChange={(c) => setStatus(c ? "active" : "inactive")}
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-border">
            {employeeToEdit ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="gap-1.5 text-xs"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>{deleting ? "Excluindo..." : "Excluir Colaborador"}</span>
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
                disabled={saving || deleting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || deleting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Salvando..." : "Salvar Colaborador"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
