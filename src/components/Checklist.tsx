import { Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { updateCharacter, type Character } from "@/lib/store";
import { cn } from "@/lib/utils";

export const CHECK_ITEMS = [
  { key: "scale_ok", label: "Escala calculada e aplicada", tip: "Fator calculado a partir da altura real e aplicado no Studio com model:ScaleTo()." },
  { key: "anchored_ok", label: "Anchored desativado", tip: "Anchored deve ficar DESATIVADO em todas as partes, senão o personagem não se move com a física." },
  { key: "cancollide_ok", label: "CanCollide desativado", tip: "CanCollide deve ficar DESATIVADO nas partes do modelo para evitar colisões indesejadas." },
] as const;

export type CheckKey = (typeof CHECK_ITEMS)[number]["key"];

export function Checklist({ character, compact }: { character: Character; compact?: boolean }) {
  return (
    <TooltipProvider>
      <ul className="space-y-2">
        {CHECK_ITEMS.map((it) => {
          const ok = character[it.key];
          return (
            <li key={it.key} className={cn("flex items-center justify-between gap-3 rounded-md border p-3", ok ? "border-success/40 bg-success/10" : "border-border bg-muted/50")}>
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", ok ? "bg-success" : "bg-pending")} />
                <span className="text-sm font-medium">{it.label}</span>
                <Tooltip>
                  <TooltipTrigger asChild><Info className="h-4 w-4 cursor-help text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent className="max-w-xs">{it.tip}</TooltipContent>
                </Tooltip>
              </div>
              {!compact && (
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs", ok ? "text-success" : "text-muted-foreground")}>{ok ? "OK, configurado" : "Pendente"}</span>
                  <Switch checked={ok} onCheckedChange={(v) => updateCharacter(character.id, { [it.key]: v })} aria-label={it.label} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </TooltipProvider>
  );
}
