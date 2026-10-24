import { useState, useEffect } from "react";
import {
  Sparkles,
  Search,
  Trash2,
  CheckCircle2,
  Shield,
  Zap,
  Sword,
  Flame,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReferenceGallery } from "./ReferenceGallery";
import { SuggestionCard } from "./SuggestionCard";
import {
  type AbilitySlot,
  type SlotType,
  DEFAULT_SLOT_LABELS,
  updateSlot,
  removeSlot,
} from "@/lib/abilities-store";
import {
  useSlotReferences,
  useSlotSuggestions,
  useJobs,
  enqueueJob,
} from "@/lib/jobs-store";

interface Props {
  slot: AbilitySlot;
  canDelete?: boolean;
}

const SLOT_ICONS: Record<SlotType, React.ReactNode> = {
  passive: <Shield className="h-4 w-4 text-cyan-400" />,
  basic: <Sword className="h-4 w-4 text-zinc-400" />,
  skill: <Zap className="h-4 w-4 text-purple-400" />,
  ultimate: <Flame className="h-4 w-4 text-amber-400" />,
};

const SLOT_BADGE_STYLES: Record<SlotType, string> = {
  passive: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  basic: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30",
  skill: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  ultimate: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

export function AbilitySlotCard({ slot, canDelete = false }: Props) {
  const [title, setTitle] = useState(slot.title ?? "");
  const [notes, setNotes] = useState(slot.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const { references } = useSlotReferences(slot.id);
  const { suggestions } = useSlotSuggestions(slot.id);
  const { jobs } = useJobs(slot.character_id);

  // Verifica se há algum job rodando especificamente para este slot
  const runningJob = jobs.find(
    (j) =>
      (j.status === "running" || j.status === "queued") &&
      j.scope &&
      j.scope["slot_id"] === slot.id
  );

  useEffect(() => {
    setTitle(slot.title ?? "");
    setNotes(slot.notes ?? "");
  }, [slot.title, slot.notes]);

  const handleSave = async (newTitle: string, newNotes: string) => {
    if (newTitle === (slot.title ?? "") && newNotes === (slot.notes ?? "")) return;
    setSaving(true);
    try {
      await updateSlot(slot.id, {
        title: newTitle.trim() || DEFAULT_SLOT_LABELS[slot.slot_type],
        notes: newNotes.trim() || null,
      });
    } catch {
      toast.error("Erro ao salvar alterações no slot.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remover "${slot.title}"?`)) return;
    try {
      await removeSlot(slot.id);
      toast.success("Habilidade removida.");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  const handleSearchReferences = async () => {
    try {
      await enqueueJob({
        type: "scrape",
        character_id: slot.character_id,
        scope: { slot_id: slot.id },
      });
      toast.success(`Buscando referências para "${slot.title}"...`);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  const handleGenerateSuggestions = async () => {
    try {
      await enqueueJob({
        type: "suggest",
        character_id: slot.character_id,
        scope: { slot_id: slot.id },
      });
      toast.success(`Gerando sugestões criativas para "${slot.title}"...`);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="relative rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`gap-1.5 py-1 ${SLOT_BADGE_STYLES[slot.slot_type]}`}>
            {SLOT_ICONS[slot.slot_type]}
            <span>{DEFAULT_SLOT_LABELS[slot.slot_type]}</span>
          </Badge>

          {slot.chosen_suggestion_id && (
            <Badge variant="outline" className="border-green-500/40 text-green-400 gap-1 text-[11px]">
              <CheckCircle2 className="h-3 w-3" /> Habilidade Definida
            </Badge>
          )}

          {runningJob && (
            <Badge variant="secondary" className="gap-1.5 text-[11px] animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              {runningJob.type === "scrape" ? "Buscando referências..." : "Criando sugestões..."}
            </Badge>
          )}

          {saving && <span className="text-[11px] text-muted-foreground animate-pulse">Salvando...</span>}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Recolher detalhes" : "Expandir detalhes"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {canDelete && slot.slot_type === "skill" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              title="Excluir habilidade"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Inputs de Título e Notas */}
      <div className="space-y-3">
        <div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleSave(title, notes)}
            className="font-semibold text-base border-transparent hover:border-border focus:border-primary px-2 -mx-2 h-9"
            placeholder={DEFAULT_SLOT_LABELS[slot.slot_type]}
          />
        </div>

        <div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => handleSave(title, notes)}
            rows={2}
            className="text-xs resize-none border-border/60 bg-muted/30 focus:bg-background"
            placeholder="Conceito, inspiração ou palavras-chave (ex: corte dimensional de chamas negras, antecipação rápida)..."
          />
        </div>
      </div>

      {/* Barra de Ações Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>{references.length} referências</span>
          <span>•</span>
          <span>{suggestions.length} sugestões</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={!!runningJob}
            onClick={handleSearchReferences}
          >
            <Search className="mr-1.5 h-3.5 w-3.5 text-primary" /> Buscar Referências
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="h-8 text-xs"
            disabled={!!runningJob}
            onClick={handleGenerateSuggestions}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-400" /> Gerar 4 Sugestões
          </Button>
        </div>
      </div>

      {/* Conteúdo Expandido: Galeria de Referências e Sugestões */}
      {expanded && (
        <div className="space-y-4 pt-2">
          {/* Galeria de referências */}
          <ReferenceGallery items={references} />

          {/* Sugestões criativas geradas por IA */}
          {suggestions.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Sugestões de Animação & VFX ({suggestions.length})
                </h4>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <SuggestionCard
                    key={s.id}
                    suggestion={s}
                    slotId={slot.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
