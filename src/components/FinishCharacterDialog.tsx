import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHECK_ITEMS, type CheckKey } from "./Checklist";
import { RarityBadge } from "./RarityBadge";
import { updateCharacter, type Character } from "@/lib/store";
import { cn } from "@/lib/utils";

export function FinishCharacterDialog({ character, open, onOpenChange }: { character: Character; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [vals, setVals] = useState<Record<CheckKey, boolean>>({ scale_ok: false, anchored_ok: false, cancollide_ok: false });

  useEffect(() => {
    if (open) setVals({ scale_ok: character.scale_ok, anchored_ok: character.anchored_ok, cancollide_ok: character.cancollide_ok });
  }, [open, character]);

  const missing = CHECK_ITEMS.filter((i) => !vals[i.key]).length;

  function confirm() {
    updateCharacter(character.id, { ...vals, status: "done", completed_at: new Date().toISOString() });
    toast.success(`${character.name} concluído!`, { description: "Personagem marcado como Concluído." });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Verificação final</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-1.5 pt-1">
            <span>Confirme cada item antes de concluir “{character.name}”</span>
            <RarityBadge rarity={character.rarity} size="xs" />
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {CHECK_ITEMS.map((it) => (
            <label key={it.key} className={cn("flex cursor-pointer items-center gap-3 rounded-md border p-3", vals[it.key] ? "border-success/40 bg-success/10" : "border-warning/50 bg-warning/10")}>
              <Checkbox checked={vals[it.key]} onCheckedChange={(v) => setVals((s) => ({ ...s, [it.key]: v === true }))} />
              <span className="flex-1 text-sm font-medium">{it.label}</span>
              {!vals[it.key] && <span className="flex items-center gap-1 text-xs font-semibold text-warning"><AlertTriangle className="h-3.5 w-3.5" /> Pendente</span>}
            </label>
          ))}
          <div className="flex items-center gap-3 rounded-md border border-dashed border-border p-3 text-sm">
            <Checkbox checked={!!character.model_sheet_url} disabled />
            <span className="flex-1">Model sheet anexado <span className="text-muted-foreground">(opcional)</span></span>
            {!character.model_sheet_url && <span className="text-xs text-muted-foreground">Não anexado</span>}
          </div>
        </div>
        {missing > 0 && <p className="text-sm text-warning">Faltam {missing} {missing === 1 ? "item" : "itens"} para concluir</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="success" disabled={missing > 0} onClick={confirm}>Confirmar conclusão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
