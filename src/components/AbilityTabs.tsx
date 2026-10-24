import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Sparkles,
  Layers,
  Zap,
  Globe,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbilitySlotCard } from "./AbilitySlotCard";
import { ScheduleDialog } from "./ScheduleDialog";
import {
  useAbilitySlots,
  initializeSlotsForForm,
  addSkillSlot,
  type AbilitySlot,
  type SlotForm,
} from "@/lib/abilities-store";
import { enqueueJob } from "@/lib/jobs-store";
import { updateCharacter, type Character } from "@/lib/store";

export function AbilityTabs({ character }: { character: Character }) {
  const [universe, setUniverse] = useState(character.universe ?? "");
  const [evoEnabled, setEvoEnabled] = useState(Boolean(character.evo_enabled));
  const [activeFormTab, setActiveFormTab] = useState<SlotForm>("unevo");
  const [savingChar, setSavingChar] = useState(false);

  const { slots, loading } = useAbilitySlots(character.id);

  useEffect(() => {
    setUniverse(character.universe ?? "");
    setEvoEnabled(Boolean(character.evo_enabled));
  }, [character.universe, character.evo_enabled]);

  // Inicializa slots padrão para a forma ativa se estiver vazia
  useEffect(() => {
    if (!loading && character.id) {
      const unevoSlots = slots.filter((s) => s.form === "unevo");
      if (unevoSlots.length === 0) {
        initializeSlotsForForm(character.id, "unevo");
      }
      if (evoEnabled) {
        const evoSlots = slots.filter((s) => s.form === "evo");
        if (evoSlots.length === 0) {
          initializeSlotsForForm(character.id, "evo");
        }
      }
    }
  }, [loading, character.id, slots, evoEnabled]);

  const handleUniverseBlur = async () => {
    if (universe === (character.universe ?? "")) return;
    setSavingChar(true);
    try {
      await updateCharacter(character.id, { universe: universe.trim() || null });
      toast.success("Universo atualizado!");
    } catch {
      toast.error("Erro ao atualizar universo.");
    } finally {
      setSavingChar(false);
    }
  };

  const handleEvoToggle = async (enabled: boolean) => {
    setEvoEnabled(enabled);
    if (!enabled && activeFormTab === "evo") {
      setActiveFormTab("unevo");
    }
    try {
      await updateCharacter(character.id, { evo_enabled: enabled });
      toast.success(enabled ? "Forma Evo ativada!" : "Forma Evo desativada.");
      if (enabled) {
        await initializeSlotsForForm(character.id, "evo");
      }
    } catch {
      toast.error("Erro ao alterar forma Evo.");
    }
  };

  const handleAddSkill = async (form: SlotForm) => {
    const currentSkills = slots.filter((s) => s.form === form && s.slot_type === "skill");
    try {
      await addSkillSlot(character.id, form, currentSkills.length);
      toast.success("Nova habilidade adicionada!");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  const renderSlots = (form: SlotForm) => {
    const formSlots = slots.filter((s) => s.form === form);
    const passiveSlot = formSlots.find((s) => s.slot_type === "passive");
    const basicSlot = formSlots.find((s) => s.slot_type === "basic");
    const skillSlots = formSlots.filter((s) => s.slot_type === "skill");
    const ultimateSlot = formSlots.find((s) => s.slot_type === "ultimate");

    return (
      <div className="space-y-6">
        {/* Passiva e Básico */}
        <div className="grid gap-4 md:grid-cols-2">
          {passiveSlot && <AbilitySlotCard slot={passiveSlot} />}
          {basicSlot && <AbilitySlotCard slot={basicSlot} />}
        </div>

        {/* Habilidades 1..N */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-400" />
              <span>Habilidades ({skillSlots.length})</span>
            </h3>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => handleAddSkill(form)}
            >
              <Plus className="h-4 w-4 text-primary" /> Adicionar Habilidade
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {skillSlots.map((s, idx) => (
              <AbilitySlotCard
                key={s.id}
                slot={s}
                canDelete={skillSlots.length > 1}
              />
            ))}
          </div>
        </div>

        {/* Ultimate / Transformação */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
            <span>{form === "evo" ? "Transformação / Ultimate Evo" : "Ultimate"}</span>
          </h3>
          {ultimateSlot && <AbilitySlotCard slot={ultimateSlot} />}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Universo e Switch Evo */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-1 flex-wrap items-center gap-4 min-w-[280px]">
          <div className="space-y-1 flex-1">
            <Label htmlFor="universe-input" className="text-xs font-semibold flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-primary" /> Universo / Obra de Origem
            </Label>
            <Input
              id="universe-input"
              value={universe}
              onChange={(e) => setUniverse(e.target.value)}
              onBlur={handleUniverseBlur}
              placeholder="Ex.: Bleach, One Piece, Jujutsu Kaisen"
              className="h-8 text-sm"
            />
          </div>

          <div className="flex items-center gap-3 border-l border-border pl-4">
            <div className="space-y-0.5">
              <Label htmlFor="evo-toggle" className="text-xs font-semibold cursor-pointer">
                Forma Evoluída (Evo)
              </Label>
              <p className="text-[11px] text-muted-foreground">Adiciona aba para a forma avançada</p>
            </div>
            <Switch
              id="evo-toggle"
              checked={evoEnabled}
              onCheckedChange={handleEvoToggle}
            />
          </div>
        </div>

        {/* Botões Globais de Ação */}
        <div className="flex items-center gap-2">
          <ScheduleDialog characterId={character.id} characterName={character.name} />
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await enqueueJob({
                  type: "scrape",
                  character_id: character.id,
                  scope: { form: activeFormTab },
                });
                toast.success(`Buscando referências para a forma ${activeFormTab === "evo" ? "Evo" : "Unevo"}...`);
              } catch (err: unknown) {
                toast.error((err as Error).message);
              }
            }}
          >
            <Search className="mr-1.5 h-3.5 w-3.5 text-primary" /> Buscar Referências da Forma
          </Button>
          <Button
            size="sm"
            onClick={async () => {
              try {
                await enqueueJob({
                  type: "suggest",
                  character_id: character.id,
                  scope: { form: activeFormTab },
                });
                toast.success(`Gerando sugestões para a forma ${activeFormTab === "evo" ? "Evo" : "Unevo"}...`);
              } catch (err: unknown) {
                toast.error((err as Error).message);
              }
            }}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-400" /> Gerar Sugestões da Forma
          </Button>
        </div>
      </div>

      {/* Sub-abas: Unevo e Evo */}
      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs
          value={activeFormTab}
          onValueChange={(v) => setActiveFormTab(v as SlotForm)}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="unevo" className="flex items-center gap-1.5">
              <Layers className="h-4 w-4" />
              <span>Forma Unevo</span>
            </TabsTrigger>

            {evoEnabled ? (
              <TabsTrigger value="evo" className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>Forma Evo</span>
              </TabsTrigger>
            ) : (
              <div className="flex items-center justify-center text-xs text-muted-foreground cursor-not-allowed opacity-50">
                Evo desativada
              </div>
            )}
          </TabsList>

          <TabsContent value="unevo">
            {renderSlots("unevo")}
          </TabsContent>

          {evoEnabled && (
            <TabsContent value="evo">
              {renderSlots("evo")}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
