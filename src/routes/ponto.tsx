import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Clock,
  LayoutDashboard,
  Calendar,
  Users,
  AlertTriangle,
  FileCheck,
  User,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PontoVisaoGeral } from "@/components/ponto/PontoVisaoGeral";
import { PontoMeuPonto } from "@/components/ponto/PontoMeuPonto";
import { PontoCalendario } from "@/components/ponto/PontoCalendario";
import { PontoColaboradores } from "@/components/ponto/PontoColaboradores";
import { PontoInconsistencias } from "@/components/ponto/PontoInconsistencias";
import { CompactPunchWidget } from "@/components/ponto/CompactPunchWidget";
import {
  useActiveEmployee,
  useAdjustmentRequests,
  useTimeEntries,
  getTodayDateStr,
} from "@/lib/ponto-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ponto")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Controle de Ponto & Gestão de Jornada — Twins System" },
      {
        name: "description",
        content:
          "Sistema moderno de controle de ponto, banco de horas, inconsistências e gestão de colaboradores.",
      },
    ],
  }),
  component: PontoPage,
});

function PontoPage() {
  const [activeTab, setActiveTab] = useState("visao-geral");
  const activeEmployee = useActiveEmployee();
  const adjustments = useAdjustmentRequests();
  const timeEntries = useTimeEntries();
  const today = getTodayDateStr();

  const pendingAdjustmentsCount = adjustments.filter(
    (a) => a.status === "pending"
  ).length;

  const inconsistenciesCount = timeEntries.filter(
    (e) => e.inconsistency_type !== null && e.date !== today
  ).length;

  const totalInconsistencyBadge = pendingAdjustmentsCount + inconsistenciesCount;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Top Header do Módulo de Ponto */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9">
            <Link to="/" title="Voltar para Personagens">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Clock className="h-6 w-6" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-none tracking-tight">
                Controle de Ponto
              </h1>
              <span className="rounded-full bg-primary/10 border border-primary/25 px-2.5 py-0.5 text-[10px] font-bold text-primary font-mono">
                ADP Lite
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gestão de jornada de trabalho, espelho de ponto, ajustes e colaboradores.
            </p>
          </div>
        </div>

        {/* Widget de Bater Ponto no Cabeçalho */}
        <div className="flex items-center gap-3">
          <CompactPunchWidget />
        </div>
      </header>

      {/* Abas Principais de Navegação do Módulo */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl h-11 p-1 bg-muted/40 rounded-xl border border-border/80">
          {/* 1. Visão Geral */}
          <TabsTrigger
            value="visao-geral"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>

          {/* 2. Meu Ponto */}
          <TabsTrigger
            value="meu-ponto"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Meu Ponto</span>
          </TabsTrigger>

          {/* 3. Calendário */}
          <TabsTrigger
            value="calendario"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Calendário</span>
          </TabsTrigger>

          {/* 4. Colaboradores */}
          <TabsTrigger
            value="colaboradores"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg"
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Colaboradores</span>
            <span className="sm:hidden">Equipe</span>
          </TabsTrigger>

          {/* 5. Inconsistências */}
          <TabsTrigger
            value="inconsistencias"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-lg relative"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Inconsistências</span>
            <span className="sm:hidden">Ajustes</span>
            {totalInconsistencyBadge > 0 && (
              <span className="rounded-full bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 font-mono">
                {totalInconsistencyBadge}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo das Abas */}
        <TabsContent value="visao-geral" className="space-y-6">
          <PontoVisaoGeral onNavigateTab={setActiveTab} />
        </TabsContent>

        <TabsContent value="meu-ponto" className="space-y-6">
          <PontoMeuPonto />
        </TabsContent>

        <TabsContent value="calendario" className="space-y-6">
          <PontoCalendario />
        </TabsContent>

        <TabsContent value="colaboradores" className="space-y-6">
          <PontoColaboradores />
        </TabsContent>

        <TabsContent value="inconsistencias" className="space-y-6">
          <PontoInconsistencias />
        </TabsContent>
      </Tabs>
    </div>
  );
}
