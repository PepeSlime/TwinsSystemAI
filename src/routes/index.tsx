import { useState, useMemo } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Box,
  Activity,
  ArrowUpDown,
  Search,
  Filter,
  X,
  Sparkles,
  Shield,
  Skull,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CharacterForm } from "@/components/CharacterForm";
import { CharacterCard } from "@/components/CharacterCard";
import { SettingsDialog } from "@/components/SettingsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteCharacter, useCharacters, useCharactersLoaded, type Character, type CharacterType } from "@/lib/store";
import { RARITIES, getRarityWeight, type CharacterRarity } from "@/lib/rarity";
import { CHARACTER_CLASSES } from "@/lib/character-classes";
import { cn } from "@/lib/utils";


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

type SortOption = "recent" | "alpha-asc" | "alpha-desc" | "rarity-desc" | "rarity-asc";

const SORT_STORAGE_KEY = "r6sm.characters_sort_by";

function getInitialSortBy(): SortOption {
  if (typeof window === "undefined") return "recent";
  try {
    const saved = localStorage.getItem(SORT_STORAGE_KEY);
    if (
      saved === "recent" ||
      saved === "alpha-asc" ||
      saved === "alpha-desc" ||
      saved === "rarity-desc" ||
      saved === "rarity-asc"
    ) {
      return saved as SortOption;
    }
  } catch {
    // fallback
  }
  return "recent";
}

function Index() {
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const list = useCharacters();
  const loaded = useCharactersLoaded();
  const editing = edit ? list.find((c) => c.id === edit) ?? null : null;
  const [toDelete, setToDelete] = useState<Character | null>(null);

  // Filtros e Ordenação persistente
  const [characterTypeTab, setCharacterTypeTab] = useState<CharacterType>("hero");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [sortBy, setSortByState] = useState<SortOption>(getInitialSortBy);
  const [searchTerm, setSearchTerm] = useState("");

  const setSortBy = (option: SortOption) => {
    setSortByState(option);
    try {
      localStorage.setItem(SORT_STORAGE_KEY, option);
    } catch (e) {
      console.error("Falha ao salvar preferência de ordenação", e);
    }
  };

  // Contagem de heróis e inimigos
  const { heroCount, enemyCount } = useMemo(() => {
    let hero = 0;
    let enemy = 0;
    for (const c of list) {
      if (c.character_type === "enemy") enemy++;
      else hero++;
    }
    return { heroCount: hero, enemyCount: enemy };
  }, [list]);

  // Personagens da aba ativa (Heróis ou Inimigos)
  const tabCharacters = useMemo(() => {
    return list.filter((c) =>
      characterTypeTab === "enemy" ? c.character_type === "enemy" : c.character_type !== "enemy"
    );
  }, [list, characterTypeTab]);

  // Contagem por raridade dentro da aba ativa
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tabCharacters.length };
    for (const r of RARITIES) counts[r.id] = 0;
    for (const c of tabCharacters) {
      const r = c.rarity || "raro";
      counts[r] = (counts[r] || 0) + 1;
    }
    return counts;
  }, [tabCharacters]);

  // Contagem por classe dentro da aba ativa
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cls of CHARACTER_CLASSES) counts[cls.id] = 0;
    for (const c of tabCharacters) {
      for (const cls of c.classes || []) {
        const normalized = cls.toLowerCase();
        counts[normalized] = (counts[normalized] || 0) + 1;
      }
    }
    return counts;
  }, [tabCharacters]);

  // Lista filtrada e ordenada
  const filteredList = useMemo(() => {
    let result = [...tabCharacters];

    // 1. Busca por texto (nome, universo ou classe)
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.universe && c.universe.toLowerCase().includes(q)) ||
          (c.classes && c.classes.some((cls) => cls.toLowerCase().includes(q)))
      );
    }

    // 2. Filtro por Raridade
    if (selectedRarity !== "all") {
      result = result.filter((c) => (c.rarity || "raro") === selectedRarity);
    }

    // 3. Filtro por Classe
    if (selectedClass !== "all") {
      result = result.filter((c) =>
        (c.classes || []).some((cls) => cls.toLowerCase() === selectedClass.toLowerCase())
      );
    }

    // 4. Ordenação
    result.sort((a, b) => {
      if (sortBy === "alpha-asc") {
        return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      }
      if (sortBy === "alpha-desc") {
        return b.name.localeCompare(a.name, "pt-BR", { sensitivity: "base" });
      }
      if (sortBy === "rarity-desc") {
        const diff = getRarityWeight(b.rarity) - getRarityWeight(a.rarity);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, "pt-BR");
      }
      if (sortBy === "rarity-asc") {
        const diff = getRarityWeight(a.rarity) - getRarityWeight(b.rarity);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, "pt-BR");
      }
      // "recent"
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return result;
  }, [tabCharacters, searchTerm, selectedRarity, selectedClass, sortBy]);

  const hasActiveFilters = selectedRarity !== "all" || selectedClass !== "all" || searchTerm.trim().length > 0;

  function clearFilters() {
    setSelectedRarity("all");
    setSelectedClass("all");
    setSearchTerm("");
  }


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

      <section className="space-y-4">
        {/* Barra superior de Personagens com Contador e Controles */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold">Personagens</h2>

            {/* Duas abas: Heróis e Inimigos ao lado da escrita de personagem */}
            <div className="flex items-center rounded-xl border border-border/80 bg-muted/30 p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setCharacterTypeTab("hero")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                  characterTypeTab === "hero"
                    ? "bg-card text-emerald-400 shadow-sm border border-emerald-500/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Heróis</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                    characterTypeTab === "hero"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {heroCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCharacterTypeTab("enemy")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                  characterTypeTab === "enemy"
                    ? "bg-card text-rose-400 shadow-sm border border-rose-500/30"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Skull className="h-3.5 w-3.5" />
                <span>Inimigos</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                    characterTypeTab === "enemy"
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {enemyCount}
                </span>
              </button>
            </div>

            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {filteredList.length} de {tabCharacters.length}
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
              >
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>

          {/* Busca e Ordenação */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-initial">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou universo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-8 text-xs bg-card"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filtro por Classe */}
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-9 w-[165px] text-xs bg-card">
                <SelectValue placeholder="Todas as classes" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">Todas as classes</SelectItem>
                {CHARACTER_CLASSES.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.label} ({classCounts[cls.id] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="h-9 w-[190px] text-xs bg-card">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="alpha-asc">Ordem alfabética (A → Z)</SelectItem>
                  <SelectItem value="alpha-desc">Ordem alfabética (Z → A)</SelectItem>
                  <SelectItem value="rarity-desc">Raridade (Maior → Menor)</SelectItem>
                  <SelectItem value="rarity-asc">Raridade (Menor → Maior)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </div>

        {/* Filtros em Pílulas por Raridade */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1 shrink-0">
            <Filter className="h-3.5 w-3.5" /> Raridade:
          </span>

          {/* Botão "Todas" */}
          <button
            type="button"
            onClick={() => setSelectedRarity("all")}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all shrink-0 cursor-pointer",
              selectedRarity === "all"
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>Todas</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                selectedRarity === "all" ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {tabCharacters.length}
            </span>
          </button>

          {/* Botões individuais por Raridade */}
          {RARITIES.map((r) => {
            const count = rarityCounts[r.id] || 0;
            const isSelected = selectedRarity === r.id;

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRarity(r.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all shrink-0 cursor-pointer",
                  isSelected
                    ? cn(
                        r.borderClass,
                        "ring-1 ring-current bg-card shadow-sm",
                        r.textClass || ""
                      )
                    : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", r.dotClass)} />
                <span>{r.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px]",
                    isSelected ? "bg-muted font-bold" : "bg-muted/70 text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lista de Personagens */}
        {!loaded ? (
          <p className="p-10 text-center text-muted-foreground">Carregando personagens...</p>
        ) : filteredList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">
              {characterTypeTab === "enemy" ? "Nenhum inimigo encontrado." : "Nenhum herói encontrado."}
            </p>
            {hasActiveFilters ? (
              <p className="text-xs">
                Nenhum resultado para os filtros selecionados.{" "}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-primary underline hover:opacity-80"
                >
                  Limpar filtros
                </button>
              </p>
            ) : (
              <p className="text-xs">
                {characterTypeTab === "enemy"
                  ? "Cadastre um inimigo escolhendo a opção 'Inimigo' no formulário acima."
                  : "Cadastre seu primeiro herói no formulário acima."}
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredList.map((c) => (
              <CharacterCard
                key={c.id}
                c={c}
                onEdit={() => {
                  navigate({ to: "/", search: { edit: c.id } });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onDelete={() => setToDelete(c)}
              />
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

