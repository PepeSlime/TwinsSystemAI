import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Box, Activity } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CharacterForm } from "@/components/CharacterForm";
import { CharacterCard } from "@/components/CharacterCard";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { deleteCharacter, useCharacters, useCharactersLoaded, type Character } from "@/lib/store";

export const Route = createFileRoute("/")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { edit?: string } => (typeof s["edit"] === "string" ? { edit: s["edit"] } : {}),
  head: () => ({
    meta: [
      { title: "R6 Scale Manager — Escala de personagens R6" },
      { name: "description", content: "Calcule a escala de personagens R6 no Roblox pela altura real e controle o checklist de finalização." },
      { property: "og:title", content: "R6 Scale Manager" },
      { property: "og:description", content: "Calculadora de escala R6 e checklist de finalização de modelos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const list = useCharacters();
  const loaded = useCharactersLoaded();
  const editing = edit ? list.find((c) => c.id === edit) ?? null : null;
  const [toDelete, setToDelete] = useState<Character | null>(null);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow"><Box className="h-6 w-6" /></div>
          <div>
            <h1 className="text-3xl font-bold leading-none">R6 Scale Manager</h1>
            <p className="text-sm text-muted-foreground">Escala e checklist de personagens R6</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/fila">
              <Activity className="h-4 w-4 mr-1.5 text-primary" /> Fila de IA
            </Link>
          </Button>
          <SettingsDialog />
        </div>
      </header>

      <CharacterForm editing={editing} onDone={() => edit && navigate({ to: "/", search: {} })} />

      <section>
        <h2 className="mb-4 text-2xl font-bold">Personagens <span className="text-muted-foreground">({list.length})</span></h2>
        {!loaded ? (
          <p className="p-10 text-center text-muted-foreground">Carregando personagens...</p>
        ) : list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">Nenhum personagem cadastrado ainda.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((c) => (
              <CharacterCard key={c.id} c={c} onEdit={() => { navigate({ to: "/", search: { edit: c.id } }); window.scrollTo({ top: 0, behavior: "smooth" }); }} onDelete={() => setToDelete(c)} />
            ))}
          </div>
        )}
      </section>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) { deleteCharacter(toDelete.id); toast.success("Personagem excluído."); } }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
