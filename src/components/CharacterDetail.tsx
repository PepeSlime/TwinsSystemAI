import { useState, useMemo } from "react";
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
  Ghost,
  Images,
  Shield,
  Skull,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checklist } from "./Checklist";
import { FinishCharacterDialog } from "./FinishCharacterDialog";
import { ScaleResult } from "./ScaleResult";
import { StatusBadge } from "./StatusBadge";
import { RarityBadge } from "./RarityBadge";
import { ClassBadge } from "./ClassBadge";
import { OverridesGenerator } from "./OverridesGenerator";

import { AbilityTabs } from "./AbilityTabs";
import { CharacterReferencePhotos } from "./CharacterReferencePhotos";
import { calculateScale, fmt } from "@/lib/scale";
import { updateCharacter, useSettings, type Character } from "@/lib/store";
import { cn } from "@/lib/utils";


export function CharacterDetail({ c }: { c: Character }) {
  const settings = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>("checklist");
  const isPdf = c.model_sheet_type === "application/pdf" || c.model_sheet_url?.startsWith("data:application/pdf");

  const [activeDetailSummonIdx, setActiveDetailSummonIdx] = useState(0);

  const summonsToDisplay = (c.summons && c.summons.length > 0)
    ? c.summons
    : (c.has_summon ? [{
        id: "legacy",
        name: c.summon_name || "Invocação",
        image_url: c.summon_image_url ?? null,
        height_m: c.summon_height_m ?? null,
        scale: c.summon_scale ?? null,
        model_sheet_url: c.summon_model_sheet_url ?? null,
        model_sheet_name: c.summon_model_sheet_name ?? null,
        model_sheet_type: c.summon_model_sheet_type ?? null,
      }] : []);

  const safeDetailIdx = Math.min(activeDetailSummonIdx, Math.max(0, summonsToDisplay.length - 1));
  const currentSummon = summonsToDisplay[safeDetailIdx] ?? summonsToDisplay[0];

  const totalReferencesCount = useMemo(() => {
    let count = 0;
    if (c.image_url) count++;
    if (c.model_sheet_url) count++;
    for (const s of summonsToDisplay) {
      if (s.image_url) count++;
      if (s.model_sheet_url) count++;
    }
    count += (c.reference_images?.length ?? 0);
    return count;
  }, [c, summonsToDisplay]);

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
            {c.character_type === "enemy" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-xs font-semibold text-rose-400">
                <Skull className="h-3.5 w-3.5" /> Inimigo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                <Shield className="h-3.5 w-3.5" /> Herói
              </span>
            )}
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
            {c.has_summon && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-500">
                <Ghost className="h-3.5 w-3.5" />
                {summonsToDisplay.length > 1
                  ? `${summonsToDisplay.length} Invocações`
                  : `Invocação: ${summonsToDisplay[0]?.name || c.summon_name || "Ativa"}`}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{c.name}</h1>
            <RarityBadge rarity={c.rarity} size="md" />
            {c.classes && c.classes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {c.classes.map((cls) => (
                  <ClassBadge key={cls} classId={cls} size="sm" />
                ))}
              </div>
            )}
          </div>

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
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="checklist" className="flex items-center gap-1.5">
            <Sliders className="h-4 w-4" />
            <span className="hidden sm:inline">Checklist & Escala</span>
            <span className="sm:hidden">Escala</span>
          </TabsTrigger>
          <TabsTrigger value="references" className="flex items-center gap-1.5">
            <Images className="h-4 w-4 text-cyan-400" />
            <span>Referências ({totalReferencesCount})</span>
          </TabsTrigger>
          <TabsTrigger value="overrides" className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Overrides</span>
            <span className="sm:hidden">Blender</span>
          </TabsTrigger>
          <TabsTrigger value="vfx" className="flex items-center gap-1.5">
            <Clapperboard className="h-4 w-4" />
            <span>VFX</span>
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

          {/* Seção de Invocações */}
          {c.has_summon && summonsToDisplay.length > 0 && currentSummon && (
            <section className="space-y-4 rounded-xl border border-violet-500/30 bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-violet-500/10 p-2 text-violet-500">
                    <Ghost className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {summonsToDisplay.length > 1
                        ? `Invocações do Personagem (${summonsToDisplay.length})`
                        : `Invocação: ${currentSummon.name || "Invocação"}`}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {summonsToDisplay.length > 1
                        ? "Clique em uma invocação para alternar as medidas e model sheet."
                        : (currentSummon.height_m
                            ? `${currentSummon.height_m.toLocaleString("pt-BR")} m de altura`
                            : "Altura não informada")}
                      {currentSummon.scale != null && !isNaN(Number(currentSummon.scale)) ? ` · Escala Roblox: × ${fmt(Number(currentSummon.scale))}` : ""}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-500">
                  {summonsToDisplay.length > 1
                    ? `${summonsToDisplay.length} Invocações Vinculadas`
                    : "Invocação Vinculada"}
                </span>
              </div>

              {/* Botões/Abas para alternar entre as invocações */}
              {summonsToDisplay.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
                  {summonsToDisplay.map((s, idx) => {
                    const isSelected = idx === safeDetailIdx;
                    return (
                      <button
                        key={s.id || idx}
                        type="button"
                        onClick={() => setActiveDetailSummonIdx(idx)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                          isSelected
                            ? "border-violet-500 bg-violet-500/20 text-violet-200 ring-1 ring-violet-500 shadow-sm"
                            : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Ghost className="h-3.5 w-3.5 text-violet-400" />
                        <span>{s.name || `Invocação ${idx + 1}`}</span>
                        {s.height_m && (
                          <span className="text-[10px] opacity-75 font-mono">({s.height_m}m)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Detalhes da Invocação Ativa */}
              <div className="grid gap-6 md:grid-cols-[200px_1fr] items-start pt-2">
                <div className="aspect-square overflow-hidden rounded-xl border border-border bg-muted shadow-inner">
                  {currentSummon.image_url ? (
                    <img
                      src={currentSummon.image_url}
                      alt={currentSummon.name || "Invocação"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground p-4 text-center">
                      <Ghost className="h-10 w-10 mb-2 opacity-40 text-violet-500" />
                      <span className="text-xs">Sem foto da invocação</span>
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {currentSummon.name || `Invocação #${safeDetailIdx + 1}`}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {currentSummon.height_m
                        ? `${currentSummon.height_m.toLocaleString("pt-BR")} m de altura`
                        : "Altura não informada"}
                      {currentSummon.scale != null && !isNaN(Number(currentSummon.scale)) ? ` · Escala Roblox: × ${fmt(Number(currentSummon.scale))}` : ""}
                    </p>
                  </div>

                  {currentSummon.height_m ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Cálculo de Escala Roblox da Invocação</h4>
                      <ScaleResult calc={calculateScale(currentSummon.height_m, settings)} />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
                      Altura da invocação não informada no cadastro.
                    </div>
                  )}

                  {currentSummon.model_sheet_url && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">Model Sheet da Invocação</h4>
                        <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-500">
                          Arquivo Técnico
                        </span>
                      </div>
                      {currentSummon.model_sheet_type === "application/pdf" ||
                      currentSummon.model_sheet_url.startsWith("data:application/pdf") ? (
                        <a
                          href={currentSummon.model_sheet_url}
                          download={currentSummon.model_sheet_name ?? `model-sheet-${currentSummon.name || "invocacao"}.pdf`}
                          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card p-3 hover:border-violet-500 transition-colors"
                        >
                          <FileText className="h-5 w-5 text-violet-500" />
                          <div>
                            <p className="font-semibold text-sm">
                              {currentSummon.model_sheet_name || "Baixar PDF da Invocação"}
                            </p>
                            <p className="text-xs text-muted-foreground">Clique para baixar o arquivo técnico</p>
                          </div>
                        </a>
                      ) : (
                        <div className="overflow-hidden rounded-xl border border-border bg-card p-2 max-w-2xl">
                          <img
                            src={currentSummon.model_sheet_url}
                            alt={`Model sheet ${currentSummon.name || "Invocação"}`}
                            className="max-h-[450px] w-full object-contain rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </TabsContent>

        {/* Aba 2: Fotos de Referência */}
        <TabsContent value="references" className="space-y-6">
          <CharacterReferencePhotos character={c} />
        </TabsContent>

        {/* Aba 3: Overrides Blender */}
        <TabsContent value="overrides">
          <OverridesGenerator character={c} />
        </TabsContent>

        {/* Aba 4: Animações & VFX */}
        <TabsContent value="vfx">
          <AbilityTabs character={c} />
        </TabsContent>
      </Tabs>


      <FinishCharacterDialog character={c} open={open} onOpenChange={setOpen} />
    </div>
  );
}
