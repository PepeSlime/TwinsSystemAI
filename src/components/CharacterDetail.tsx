import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Pencil,
  RotateCcw,
  User,
  Sliders,
  Sparkles,
  Clapperboard,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checklist } from "./Checklist";
import { FinishCharacterDialog } from "./FinishCharacterDialog";
import { ScaleResult } from "./ScaleResult";
import { StatusBadge } from "./StatusBadge";
import { OverridesGenerator } from "./OverridesGenerator";
import { AbilityTabs } from "./AbilityTabs";
import { calculateScale } from "@/lib/scale";
import { updateCharacter, useSettings, type Character } from "@/lib/store";

export function CharacterDetail({ c }: { c: Character }) {
  const settings = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>("checklist");
  const isPdf = c.model_sheet_type === "application/pdf" || c.model_sheet_url?.startsWith("data:application/pdf");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: "/", search: { edit: c.id } })}
        >
          <Pencil className="h-4 w-4 mr-1" /> Editar personagem
        </Button>
      </div>

      {/* Header do Personagem */}
      <div className="grid gap-6 md:grid-cols-[240px_1fr] items-start rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted shadow-inner">
          {c.image_url ? (
            <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
          ) : (
            <User className="m-auto h-full w-20 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            {c.universe && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {c.universe}
              </span>
            )}
            {c.evo_enabled && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
                Forma Evo Ativa
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{c.name}</h1>
          <p className="text-sm text-muted-foreground">
            {c.height_m ? `${c.height_m.toLocaleString("pt-BR")} m de altura` : "Altura não informada"}
            {c.completed_at && ` · Concluído em ${new Date(c.completed_at).toLocaleString("pt-BR")}`}
          </p>

          <div className="pt-2">
            {c.status === "done" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  updateCharacter(c.id, { status: "modeling", completed_at: null });
                  toast("Personagem reaberto para modelagem.");
                }}
              >
                <RotateCcw className="h-4 w-4 mr-1.5" /> Reabrir para modelagem
              </Button>
            ) : (
              <Button size="sm" variant="success" onClick={() => setOpen(true)}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Concluir personagem
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Abas Principais */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="checklist" className="flex items-center gap-1.5">
            <Sliders className="h-4 w-4" />
            <span>Checklist & Escala</span>
          </TabsTrigger>
          <TabsTrigger value="overrides" className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Overrides Blender</span>
          </TabsTrigger>
          <TabsTrigger value="vfx" className="flex items-center gap-1.5">
            <Clapperboard className="h-4 w-4" />
            <span>Animações & VFX</span>
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Checklist & Escala */}
        <TabsContent value="checklist" className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-lg font-bold">Checklist Técnico R6</h2>
            <Checklist character={c} />
          </div>

          {c.height_m && (
            <section className="space-y-3">
              <h2 className="text-xl font-bold">Cálculo de Escala Roblox</h2>
              <ScaleResult calc={calculateScale(c.height_m, settings)} />
            </section>
          )}

          {c.model_sheet_url && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">Model Sheet Técnico Arquivado</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  Documentação Preservada
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Arquivo técnico original de referência e medidas do personagem.
              </p>
              {isPdf ? (
                <a
                  href={c.model_sheet_url}
                  download={c.model_sheet_name ?? "model-sheet.pdf"}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary transition-colors"
                >
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-semibold">{c.model_sheet_name || "Baixar PDF"}</p>
                    <p className="text-xs text-muted-foreground">Clique para baixar o arquivo original</p>
                  </div>
                </a>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card p-2 max-w-3xl">
                  <img
                    src={c.model_sheet_url}
                    alt="Model sheet arquivado"
                    className="max-h-[600px] w-full object-contain rounded-lg"
                  />
                </div>
              )}
            </section>
          )}
        </TabsContent>

        {/* Aba 2: Overrides Blender */}
        <TabsContent value="overrides">
          <OverridesGenerator character={c} />
        </TabsContent>

        {/* Aba 3: Animações & VFX */}
        <TabsContent value="vfx">
          <AbilityTabs character={c} />
        </TabsContent>
      </Tabs>

      <FinishCharacterDialog character={c} open={open} onOpenChange={setOpen} />
    </div>
  );
}
