import { Link } from "@tanstack/react-router";
import { Pencil, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { RarityBadge } from "./RarityBadge";
import { fmt } from "@/lib/scale";
import { pendingCount, type Character } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CharacterCard({ c, onEdit, onDelete }: { c: Character; onEdit: () => void; onDelete: () => void }) {
  const pend = pendingCount(c);
  return (
    <div className={cn("group overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-glow", c.status === "done" ? "border-success/50" : "border-border")}>
      <Link to="/personagem/$id" params={{ id: c.id }} className="block">
        <div className="relative aspect-square bg-muted">
          {c.image_url ? <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" /> : <User className="absolute inset-0 m-auto h-16 w-16 text-muted-foreground" />}
          <StatusBadge status={c.status} className="absolute left-2 top-2" />
        </div>
        <div className="space-y-1 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-xl font-bold">{c.name}</h3>
            <RarityBadge rarity={c.rarity} size="xs" />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{c.height_m ? `${c.height_m.toLocaleString("pt-BR")} m` : "Sem altura"}</span>
            <span className="font-mono text-primary">{c.scale ? `× ${fmt(c.scale)}` : "—"}</span>
          </div>
          <p className={cn("text-xs", pend ? "text-warning" : "text-success")}>{pend ? `${pend} item(ns) pendente(s)` : "Checklist completo"}</p>
        </div>
      </Link>
      <div className="flex gap-2 border-t border-border p-2">
        <Button variant="ghost" size="sm" className="flex-1" onClick={onEdit}><Pencil className="h-4 w-4" /> Editar</Button>
        <Button variant="ghost" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /> Excluir</Button>
      </div>
    </div>
  );
}
