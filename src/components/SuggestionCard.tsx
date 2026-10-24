import { CheckCircle2, ThumbsDown, Sparkles, Volume2, Wand2, Activity } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type Suggestion,
  updateSuggestionStatus,
} from "@/lib/jobs-store";

export function SuggestionCard({
  suggestion,
  slotId,
}: {
  suggestion: Suggestion;
  slotId: string;
}) {
  const isChosen = suggestion.status === "chosen";
  const isDiscarded = suggestion.status === "discarded";

  const handleChoose = async () => {
    try {
      await updateSuggestionStatus(suggestion.id, slotId, "chosen");
      toast.success(`"${suggestion.title}" escolhida como habilidade oficial!`);
    } catch {
      toast.error("Erro ao selecionar sugestão.");
    }
  };

  const handleDiscard = async () => {
    try {
      await updateSuggestionStatus(suggestion.id, slotId, "discarded");
      toast.info("Sugestão descartada.");
    } catch {
      toast.error("Erro ao descartar sugestão.");
    }
  };

  const handleRestore = async () => {
    try {
      await updateSuggestionStatus(suggestion.id, slotId, "draft");
      toast.info("Sugestão reaberta.");
    } catch {
      toast.error("Erro ao reabrir sugestão.");
    }
  };

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
        isChosen
          ? "border-green-500/60 bg-green-950/20 shadow-md shadow-green-950/20"
          : isDiscarded
          ? "border-border/40 bg-muted/20 opacity-60"
          : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <div className="space-y-3">
        {/* Header do Card */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                #{suggestion.position}
              </span>
              <h5 className="font-bold text-sm leading-tight text-foreground">
                {suggestion.title}
              </h5>
            </div>
            {suggestion.fidelity_source && (
              <span className="text-[11px] text-muted-foreground">
                Fonte: {suggestion.fidelity_source}
              </span>
            )}
          </div>

          {isChosen && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-[10px] gap-1">
              <CheckCircle2 className="h-3 w-3" /> Escolhida
            </Badge>
          )}
        </div>

        {/* Nota de Hype */}
        {suggestion.hype_note && (
          <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200">
            <span className="font-semibold flex items-center gap-1 text-[11px]">
              <Sparkles className="h-3 w-3 text-amber-400" /> Fator Hype:
            </span>
            <p className="mt-0.5 text-[11px] text-amber-100/90">{suggestion.hype_note}</p>
          </div>
        )}

        {/* Descrição Visual */}
        {suggestion.visual_description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {suggestion.visual_description}
          </p>
        )}

        {/* Beats da Animação */}
        {suggestion.animation_beats && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5 text-[11px] space-y-1">
            <span className="font-semibold text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3 text-primary" /> Beats de Combate (R6):
            </span>
            <div className="grid gap-1 pl-1 text-zinc-300">
              {suggestion.animation_beats.antecipacao && (
                <div><span className="text-muted-foreground font-mono">1. Preparo:</span> {suggestion.animation_beats.antecipacao}</div>
              )}
              {suggestion.animation_beats.impacto && (
                <div><span className="text-muted-foreground font-mono">2. Impacto:</span> {suggestion.animation_beats.impacto}</div>
              )}
              {suggestion.animation_beats.finalizacao && (
                <div><span className="text-muted-foreground font-mono">3. Finalização:</span> {suggestion.animation_beats.finalizacao}</div>
              )}
            </div>
          </div>
        )}

        {/* Especificações de VFX */}
        {suggestion.vfx && (
          <div className="space-y-1.5 border-t border-border/50 pt-2 text-[11px]">
            {suggestion.vfx.particulas && (
              <div className="text-muted-foreground flex items-start gap-1">
                <Wand2 className="h-3 w-3 text-purple-400 shrink-0 mt-0.5" />
                <span><strong className="text-zinc-200">VFX:</strong> {suggestion.vfx.particulas}</span>
              </div>
            )}
            {suggestion.vfx.som && (
              <div className="text-muted-foreground flex items-start gap-1">
                <Volume2 className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />
                <span><strong className="text-zinc-200">Áudio:</strong> {suggestion.vfx.som}</span>
              </div>
            )}
            {suggestion.vfx.cores && suggestion.vfx.cores.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground">Paleta:</span>
                {suggestion.vfx.cores.map((c, i) => (
                  <span
                    key={i}
                    title={c}
                    className="h-3.5 w-3.5 rounded border border-border shadow-xs"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Viabilidade Roblox */}
        {suggestion.roblox_feasibility && (
          <div className="text-[10px] text-zinc-400 bg-zinc-900/60 p-2 rounded border border-border/40">
            <strong>Viabilidade R6:</strong> {suggestion.roblox_feasibility}
          </div>
        )}
      </div>

      {/* Ações Inferiores */}
      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 mt-4">
        {isChosen ? (
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleRestore}>
            Desmarcar Escolha
          </Button>
        ) : isDiscarded ? (
          <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground" onClick={handleRestore}>
            Restaurar Sugestão
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 text-muted-foreground hover:text-destructive"
              onClick={handleDiscard}
            >
              <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Descartar
            </Button>
            <Button
              size="sm"
              className="text-xs h-7 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleChoose}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Escolher
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
