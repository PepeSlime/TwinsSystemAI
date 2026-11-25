import { useState, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Clock,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Calendar,
  FileText,
  User,
  Shield,
  Briefcase,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
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
  useActiveEmployee,
  setActiveEmployee,
  deleteEmployee,
  getTodayDateStr,
  calculateWorkedMinutes,
  formatMinutes,
  formatTimeOnly,
  type Employee,
  type JourneyStatus,
} from "@/lib/ponto-store";
import { EmployeeFormDialog } from "./EmployeeFormDialog";
import { cn } from "@/lib/utils";

export function PontoColaboradores() {
  const employees = useEmployees();
  const timeEntries = useTimeEntries();
  const adjustmentRequests = useAdjustmentRequests();
  const activeEmployee = useActiveEmployee();
  const today = getTodayDateStr();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPunchSituation, setSelectedPunchSituation] = useState("all");

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [selectedEmployeeProfile, setSelectedEmployeeProfile] = useState<Employee | null>(null);

  const handleDelete = async (emp: Employee) => {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir o colaborador "${emp.name}"? Todos os seus registros de ponto e solicitações de ajuste associadas serão removidos.`
      )
    ) {
      return;
    }
    try {
      await deleteEmployee(emp.id);
      if (selectedEmployeeProfile?.id === emp.id) {
        setSelectedEmployeeProfile(null);
      }
      toast.success(`Colaborador "${emp.name}" excluído com sucesso.`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao excluir colaborador."
      );
    }
  };

  const departments = Array.from(new Set(employees.map((e) => e.department)));

  // Filtros combinados
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDept = selectedDept === "all" || emp.department === selectedDept;
      const matchesStatus = selectedStatus === "all" || emp.status === selectedStatus;

      // Situação do ponto hoje
      const todayEntry = timeEntries.find(
        (e) => e.employee_id === emp.id && e.date === today
      );
      const situation = todayEntry?.status || "not_started";
      const matchesSituation =
        selectedPunchSituation === "all" || situation === selectedPunchSituation;

      return matchesSearch && matchesDept && matchesStatus && matchesSituation;
    });
  }, [
    employees,
    searchTerm,
    selectedDept,
    selectedStatus,
    selectedPunchSituation,
    timeEntries,
    today,
  ]);

  // Dados do colaborador selecionado no modal de perfil
  const profileData = useMemo(() => {
    if (!selectedEmployeeProfile) return null;

    const empId = selectedEmployeeProfile.id;
    const entries = timeEntries.filter((e) => e.employee_id === empId);
    const adjustments = adjustmentRequests.filter((a) => a.employee_id === empId);

    const totalMinutes = entries.reduce((acc, e) => {
      return (
        acc +
        calculateWorkedMinutes(e.entry_time, e.lunch_start, e.lunch_end, e.exit_time)
      );
    }, 0);

    const inconsistencies = entries.filter(
      (e) => e.inconsistency_type !== null && e.date !== today
    );

    return {
      entries,
      adjustments,
      totalMinutes,
      inconsistencies,
    };
  }, [selectedEmployeeProfile, timeEntries, adjustmentRequests, today]);

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Botão Novo Colaborador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Gestão de Colaboradores</span>
            <span className="text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">
              {employees.length} cadastrado(s)
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastros contratuais, horários de trabalho e perfil de cada membro da equipe.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setEmployeeToEdit(null);
            setFormDialogOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Novo Colaborador
        </Button>
      </div>

      {/* Controles de Busca e Filtros */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-initial">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, cargo ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-xs bg-card"
          />
        </div>

        {/* Filtro por Departamento */}
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="h-8 w-[150px] text-xs bg-card">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">Todos os setores</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por Situação do Ponto Hoje */}
        <Select
          value={selectedPunchSituation}
          onValueChange={setSelectedPunchSituation}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs bg-card">
            <SelectValue placeholder="Situação Hoje" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">Todas as situações</SelectItem>
            <SelectItem value="in_progress">Trabalhando agora</SelectItem>
            <SelectItem value="lunch">Em intervalo</SelectItem>
            <SelectItem value="finished">Jornada finalizada</SelectItem>
            <SelectItem value="not_started">Ainda não iniciou</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro por Status */}
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="h-8 w-[120px] text-xs bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de Cards de Colaboradores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filteredEmployees.map((emp) => {
          const todayEntry = timeEntries.find(
            (e) => e.employee_id === emp.id && e.date === today
          );
          const situation: JourneyStatus = todayEntry?.status || "not_started";
          const isCurrentActive = activeEmployee?.id === emp.id;

          const situationConfig: Record<
            JourneyStatus,
            { label: string; badgeClass: string; dotClass: string }
          > = {
            not_started: {
              label: "Não Iniciou",
              badgeClass: "border-border bg-muted/40 text-muted-foreground",
              dotClass: "bg-muted-foreground",
            },
            in_progress: {
              label: "Trabalhando",
              badgeClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
              dotClass: "bg-emerald-400 animate-pulse",
            },
            lunch: {
              label: "Em Almoço",
              badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-300",
              dotClass: "bg-amber-400 animate-pulse",
            },
            finished: {
              label: "Finalizou",
              badgeClass: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
              dotClass: "bg-cyan-400",
            },
            inconsistent: {
              label: "Inconsistente",
              badgeClass: "border-rose-500/40 bg-rose-500/10 text-rose-300",
              dotClass: "bg-rose-400",
            },
          };

          const sitCfg = situationConfig[situation];

          return (
            <div
              key={emp.id}
              className={cn(
                "group relative rounded-2xl border bg-card p-4 flex flex-col justify-between space-y-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md",
                isCurrentActive && "ring-1 ring-primary/80 border-primary bg-primary/5"
              )}
            >
              {/* Topo: Avatar, Nome, Cargo e Badge de Admin */}
              <div className="flex items-start gap-3">
                {emp.avatar_url ? (
                  <img
                    src={emp.avatar_url}
                    alt={emp.name}
                    className="h-11 w-11 rounded-xl object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-base">
                    {emp.name.charAt(0)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm text-foreground truncate">
                      {emp.name}
                    </p>
                    {emp.is_admin && (
                      <span
                        title="Administrador / RH"
                        className="rounded-full bg-primary/20 text-primary p-0.5"
                      >
                        <Shield className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {emp.role}
                  </p>
                  <span className="inline-block mt-0.5 rounded-full bg-muted/60 text-[9px] font-semibold text-muted-foreground px-2 py-0.2">
                    {emp.department}
                  </span>
                </div>
              </div>

              {/* Informações de Jornada e Ponto de Hoje */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Jornada:</span>
                  <span className="font-mono text-foreground font-semibold">
                    {emp.daily_hours}h/dia
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Hoje:</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[9px] font-bold border",
                      sitCfg.badgeClass
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", sitCfg.dotClass)} />
                    {sitCfg.label}
                  </span>
                </div>
              </div>

              {/* Ações do Card */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-7.5"
                  onClick={() => setSelectedEmployeeProfile(emp)}
                >
                  Ver Perfil
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7.5 w-7.5 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setEmployeeToEdit(emp);
                    setFormDialogOpen(true);
                  }}
                  title="Editar cadastro do colaborador"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7.5 w-7.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(emp)}
                  title="Excluir colaborador"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Perfil Completo do Colaborador */}
      <Dialog
        open={selectedEmployeeProfile !== null}
        onOpenChange={(open) => !open && setSelectedEmployeeProfile(null)}
      >
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-md border border-border p-6 rounded-2xl shadow-2xl space-y-5">
          {selectedEmployeeProfile && profileData && (
            <>
              {/* Header do Perfil */}
              <DialogHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedEmployeeProfile.avatar_url ? (
                    <img
                      src={selectedEmployeeProfile.avatar_url}
                      alt={selectedEmployeeProfile.name}
                      className="h-14 w-14 rounded-2xl object-cover border border-border"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xl">
                      {selectedEmployeeProfile.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-xl font-bold">
                        {selectedEmployeeProfile.name}
                      </DialogTitle>
                      {selectedEmployeeProfile.is_admin && (
                        <span className="rounded-full bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5 border border-primary/30">
                          RH / Admin
                        </span>
                      )}
                    </div>
                    <DialogDescription className="text-xs text-muted-foreground">
                      {selectedEmployeeProfile.role} · {selectedEmployeeProfile.department}
                    </DialogDescription>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {selectedEmployeeProfile.email || "Sem e-mail cadastrado"}
                    </p>
                  </div>
                </div>

                {/* Botão de Tornar Ativo para Bater Ponto */}
                <Button
                  size="sm"
                  variant={
                    activeEmployee?.id === selectedEmployeeProfile.id
                      ? "secondary"
                      : "outline"
                  }
                  className="text-xs gap-1.5"
                  onClick={() => {
                    setActiveEmployee(selectedEmployeeProfile.id);
                  }}
                >
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span>
                    {activeEmployee?.id === selectedEmployeeProfile.id
                      ? "Colaborador Selecionado"
                      : "Selecionar para Bater Ponto"}
                  </span>
                </Button>
              </DialogHeader>

              {/* Métricas do Perfil */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Carga Contratual
                  </span>
                  <p className="text-base font-extrabold text-foreground font-mono">
                    {selectedEmployeeProfile.daily_hours}h / dia
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedEmployeeProfile.work_schedule}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Horas Trabalhadas
                  </span>
                  <p className="text-base font-extrabold text-primary font-mono">
                    {formatMinutes(profileData.totalMinutes)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {profileData.entries.length} dia(s) registrados
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Inconsistências
                  </span>
                  <p
                    className={cn(
                      "text-base font-extrabold font-mono",
                      profileData.inconsistencies.length > 0
                        ? "text-rose-400"
                        : "text-emerald-400"
                    )}
                  >
                    {profileData.inconsistencies.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {profileData.adjustments.length} ajuste(s) enviados
                  </p>
                </div>
              </div>

              {/* Últimos Registros do Colaborador */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Últimos Registros de Ponto
                </h4>
                {profileData.entries.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    Nenhum registro de ponto registrado para este colaborador.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                    {profileData.entries.slice(0, 5).map((entry) => {
                      const worked = calculateWorkedMinutes(
                        entry.entry_time,
                        entry.lunch_start,
                        entry.lunch_end,
                        entry.exit_time
                      );
                      return (
                        <div
                          key={entry.id}
                          className="rounded-lg border border-border bg-card p-2.5 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">
                              {new Date(entry.date + "T00:00:00").toLocaleDateString("pt-BR")}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              E: {formatTimeOnly(entry.entry_time)} · A:{" "}
                              {formatTimeOnly(entry.lunch_start)} às{" "}
                              {formatTimeOnly(entry.lunch_end)} · S:{" "}
                              {formatTimeOnly(entry.exit_time)}
                            </span>
                          </div>

                          <span className="font-mono font-bold text-primary">
                            {formatMinutes(worked)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-3 flex items-center justify-between border-t border-border">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      const emp = selectedEmployeeProfile;
                      setSelectedEmployeeProfile(null);
                      setEmployeeToEdit(emp);
                      setFormDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Editar Cadastro
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30"
                    onClick={() => handleDelete(selectedEmployeeProfile)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEmployeeProfile(null)}
                >
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Formulário de Colaborador */}
      <EmployeeFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        employeeToEdit={employeeToEdit}
      />
    </div>
  );
}
