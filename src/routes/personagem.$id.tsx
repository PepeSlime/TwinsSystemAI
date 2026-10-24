import { createFileRoute, Link } from "@tanstack/react-router";
import { CharacterDetail } from "@/components/CharacterDetail";
import { useCharacter, useCharactersLoaded } from "@/lib/store";

export const Route = createFileRoute("/personagem/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do personagem — R6 Scale Manager" },
      { name: "description", content: "Checklist técnico, escala e conclusão do personagem R6." },
      { property: "og:title", content: "Detalhes do personagem — R6 Scale Manager" },
      { property: "og:description", content: "Checklist técnico, escala e conclusão do personagem R6." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const c = useCharacter(id);
  const loaded = useCharactersLoaded();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {c ? <CharacterDetail c={c} /> : !loaded ? <p className="py-20 text-center text-muted-foreground">Carregando...</p> : (
        <div className="py-20 text-center">
          <p className="text-muted-foreground">Personagem não encontrado.</p>
          <Link to="/" className="text-primary underline">Voltar</Link>
        </div>
      )}
    </div>
  );
}
