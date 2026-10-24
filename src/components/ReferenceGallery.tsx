import { useState } from "react";
import { ExternalLink, Film, BookOpen, Tv, Gamepad2, FileQuestion, Trash2, Youtube, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteReferenceItem, type ReferenceItem } from "@/lib/jobs-store";

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  wiki: <BookOpen className="h-3.5 w-3.5 text-blue-400" />,
  live_action: <Film className="h-3.5 w-3.5 text-cyan-400" />,
  comic: <BookOpen className="h-3.5 w-3.5 text-amber-400" />,
  animation: <Tv className="h-3.5 w-3.5 text-purple-400" />,
  game: <Gamepad2 className="h-3.5 w-3.5 text-green-400" />,
  other: <FileQuestion className="h-3.5 w-3.5 text-zinc-400" />,
};

const SOURCE_LABELS: Record<string, string> = {
  wiki: "Wiki / Lore",
  live_action: "Live Action",
  comic: "Mangá / HQ",
  animation: "Anime",
  game: "Jogo",
  other: "Referência",
};

export function getSafeReferenceUrl(url: string | null | undefined, title: string | null): string {
  if (
    !url ||
    url.includes("example.com") ||
    url.includes("example.org") ||
    !url.startsWith("http")
  ) {
    const q = encodeURIComponent(`${title || "personagem"} wiki fandom`);
    return `https://www.google.com/search?q=${q}`;
  }
  return url;
}

export function ReferenceGallery({ items }: { items: ReferenceItem[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = filter === "all" ? items : items.filter((i) => i.source_type === filter);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setDeletingId(id);
      await deleteReferenceItem(id);
      toast.success("Referência removida.");
    } catch {
      toast.error("Erro ao remover referência.");
    } finally {
      setDeletingId(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Referências Canônicas ({items.length})
        </h4>

        {/* Filtro rápido */}
        <div className="flex gap-1 text-[11px]">
          {["all", "wiki", "animation", "comic", "game"].map((src) => (
            <button
              key={src}
              type="button"
              className={`rounded px-1.5 py-0.5 transition-colors ${
                filter === src
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setFilter(src)}
            >
              {src === "all" ? "Todas" : SOURCE_LABELS[src] || src}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {filtered.map((item) => {
          const safeUrl = getSafeReferenceUrl(item.url, item.title);
          const isYouTube = safeUrl.includes("youtube.com");
          const isWiki = safeUrl.includes("fandom.com") || safeUrl.includes("wikipedia.org") || safeUrl.includes("wiki");

          const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title || "")}`;
          const wikiUrl = `https://www.google.com/search?q=${encodeURIComponent(`${item.title || ""} wiki fandom`)}`;

          return (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-muted/20 p-3.5 hover:border-primary/60 transition-all hover:bg-muted/30 shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] gap-1 py-0 h-5 border-border font-medium">
                      {SOURCE_ICONS[item.source_type] || SOURCE_ICONS["other"]}
                      <span>{SOURCE_LABELS[item.source_type] || "Referência"}</span>
                    </Badge>

                    {isWiki ? (
                      <Badge variant="secondary" className="text-[9px] gap-0.5 py-0 h-4 text-blue-400 bg-blue-500/10 border-blue-500/20">
                        <BookOpen className="h-2.5 w-2.5" /> Lore
                      </Badge>
                    ) : isYouTube ? (
                      <Badge variant="secondary" className="text-[9px] gap-0.5 py-0 h-4 text-red-400 bg-red-500/10 border-red-500/20">
                        <Youtube className="h-2.5 w-2.5" /> Vídeo
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-70 group-hover:opacity-100 transition-opacity"
                      disabled={deletingId === item.id}
                      onClick={(e) => handleDelete(e, item.id)}
                      title="Excluir referência"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-6 w-6 items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      title="Abrir link da referência"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs font-bold leading-tight group-hover:text-primary transition-colors"
                >
                  {item.title}
                </a>

                {item.snippet && (
                  <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
                    {item.snippet}
                  </p>
                )}
              </div>

              {/* Ações de pesquisa rápida */}
              <div className="flex items-center gap-2 pt-2.5 mt-2 border-t border-border/40 text-[10px]">
                <span className="text-muted-foreground">Consultar em:</span>
                <a
                  href={wikiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-blue-400 hover:underline"
                >
                  <Search className="h-2.5 w-2.5" /> Wiki/Fandom
                </a>
                <span className="text-muted-foreground">•</span>
                <a
                  href={ytUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-red-400 hover:underline"
                >
                  <Youtube className="h-2.5 w-2.5" /> YouTube
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
