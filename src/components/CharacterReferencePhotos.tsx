import { useState, useRef, useMemo } from "react";
import {
  Images,
  Plus,
  Trash2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download,
  UploadCloud,
  Loader2,
  FileText,
  User,
  Ghost,
  Sword,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addCharacterReferenceImages,
  deleteCharacterReferenceImage,
  updateCharacter,
  fileToDataUrl,
  type Character,
  type ReferenceCategory,
} from "@/lib/store";
import { REFERENCE_CATEGORIES, getReferenceCategoryLabel } from "@/lib/reference-categories";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  character: Character;
  className?: string;
}

export interface DisplayReferenceItem {
  id: string;
  url: string;
  name: string;
  category: ReferenceCategory;
  sourceType: "character_image" | "character_sheet" | "summon_image" | "summon_sheet" | "reference_image";
  isPdf?: boolean;
  isBuiltIn?: boolean;
  badgeLabel: string;
  originalRefId?: string;
  created_at?: string;
}

export function CharacterReferencePhotos({ character, className }: Props) {
  const [activeTab, setActiveTab] = useState<ReferenceCategory>("character");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unifica todas as fotos do personagem em suas respectivas categorias
  const allItems = useMemo<DisplayReferenceItem[]>(() => {
    const list: DisplayReferenceItem[] = [];

    // 1. Foto principal do personagem (Fotos Personagem)
    if (character.image_url) {
      list.push({
        id: "main-character-image",
        url: character.image_url,
        name: `${character.name} — Perfil Principal`,
        category: "character",
        sourceType: "character_image",
        isBuiltIn: true,
        badgeLabel: "Perfil Principal",
      });
    }

    // 2. Model Sheet principal do personagem (Model Sheet)
    if (character.model_sheet_url) {
      const isPdf =
        character.model_sheet_type === "application/pdf" ||
        character.model_sheet_url.startsWith("data:application/pdf");
      list.push({
        id: "main-model-sheet",
        url: character.model_sheet_url,
        name: character.model_sheet_name || `${character.name} — Model Sheet`,
        category: "model_sheet",
        sourceType: "character_sheet",
        isPdf,
        isBuiltIn: true,
        badgeLabel: "Model Sheet",
      });
    }

    // 3. Invocações (Fotos e Model Sheets)
    const summons = character.summons && character.summons.length > 0
      ? character.summons
      : (character.has_summon && (character.summon_name || character.summon_image_url || character.summon_model_sheet_url))
      ? [{
          id: "legacy",
          name: character.summon_name || "Invocação",
          image_url: character.summon_image_url ?? null,
          height_m: character.summon_height_m ?? null,
          scale: character.summon_scale ?? null,
          model_sheet_url: character.summon_model_sheet_url ?? null,
          model_sheet_name: character.summon_model_sheet_name ?? null,
          model_sheet_type: character.summon_model_sheet_type ?? null,
        }]
      : [];

    for (const s of summons) {
      if (s.image_url) {
        list.push({
          id: `summon-img-${s.id}`,
          url: s.image_url,
          name: `${s.name || "Invocação"} — Foto`,
          category: "summon",
          sourceType: "summon_image",
          isBuiltIn: true,
          badgeLabel: "Invocação",
        });
      }
      if (s.model_sheet_url) {
        const isPdf =
          s.model_sheet_type === "application/pdf" ||
          s.model_sheet_url.startsWith("data:application/pdf");
        list.push({
          id: `summon-sheet-${s.id}`,
          url: s.model_sheet_url,
          name: s.model_sheet_name || `${s.name || "Invocação"} — Model Sheet`,
          category: "summon",
          sourceType: "summon_sheet",
          isPdf,
          isBuiltIn: true,
          badgeLabel: "Model Sheet Invocação",
        });
      }
    }

    // 4. Imagens de referência cadastradas / extras
    const refs = character.reference_images ?? [];
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      if (!ref || !ref.url) continue;
      const cat: ReferenceCategory = ref.category || "character";
      list.push({
        id: ref.id,
        url: ref.url,
        name: ref.name || `Referência #${i + 1}`,
        category: cat,
        sourceType: "reference_image",
        isBuiltIn: false,
        badgeLabel: getReferenceCategoryLabel(cat),
        originalRefId: ref.id,
        created_at: ref.created_at,
      });
    }

    return list;
  }, [character]);

  // Contadores por categoria
  const categoryCounts = useMemo(() => {
    const counts: Record<ReferenceCategory, number> = {
      model_sheet: 0,
      character: 0,
      summon: 0,
      weapon: 0,
    };
    for (const item of allItems) {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    }
    return counts;
  }, [allItems]);

  // Itens filtrados para a aba ativa
  const currentCategoryItems = useMemo(() => {
    return allItems.filter((item) => item.category === activeTab);
  }, [allItems, activeTab]);

  const selectedImage = selectedIdx !== null ? currentCategoryItems[selectedIdx] : null;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const itemsToUpload: { url: string; name: string; category: ReferenceCategory }[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`"${file.name}" não é uma imagem válida.`);
          continue;
        }
        if (file.size > MAX_BYTES) {
          toast.error(`"${file.name}" ultrapassa o limite de 10 MB.`);
          continue;
        }
        const dataUrl = await fileToDataUrl(file);
        itemsToUpload.push({
          url: dataUrl,
          name: file.name.replace(/\.[^/.]+$/, ""),
          category: activeTab,
        });
      }

      if (itemsToUpload.length > 0) {
        await addCharacterReferenceImages(character.id, itemsToUpload);
        toast.success(
          itemsToUpload.length === 1
            ? `1 referência adicionada à categoria "${getReferenceCategoryLabel(activeTab)}"!`
            : `${itemsToUpload.length} referências adicionadas à categoria "${getReferenceCategoryLabel(activeTab)}"!`
        );
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao enviar fotos.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(e: React.MouseEvent, item: DisplayReferenceItem) {
    e.stopPropagation();
    e.preventDefault();

    if (item.isBuiltIn || !item.originalRefId) {
      toast.info("Esta imagem faz parte do cadastro base do personagem. Edite o personagem para alterá-la.");
      return;
    }

    if (!confirm(`Remover "${item.name}" das referências?`)) return;

    setDeletingId(item.originalRefId);
    try {
      await deleteCharacterReferenceImage(character.id, item.originalRefId);
      toast.success("Referência removida.");
      if (selectedImage?.id === item.id) {
        setSelectedIdx(null);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao excluir foto.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleChangeCategory(refId: string, newCategory: ReferenceCategory) {
    const refs = character.reference_images ?? [];
    const updated = refs.map((r) => (r.id === refId ? { ...r, category: newCategory } : r));
    try {
      await updateCharacter(character.id, { reference_images: updated });
      toast.success(`Movida para "${getReferenceCategoryLabel(newCategory)}"`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao alterar categoria.");
    }
  }

  function handlePrev() {
    if (selectedIdx === null) return;
    setSelectedIdx(selectedIdx > 0 ? selectedIdx - 1 : currentCategoryItems.length - 1);
  }

  function handleNext() {
    if (selectedIdx === null) return;
    setSelectedIdx(selectedIdx < currentCategoryItems.length - 1 ? selectedIdx + 1 : 0);
  }

  const categoryIcons: Record<ReferenceCategory, React.ReactNode> = {
    model_sheet: <FileText className="h-4 w-4" />,
    character: <User className="h-4 w-4" />,
    summon: <Ghost className="h-4 w-4" />,
    weapon: <Sword className="h-4 w-4" />,
  };

  const currentCategoryConfig = REFERENCE_CATEGORIES.find((c) => c.id === activeTab);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header com Informações e Botão de Adicionar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-xs">
            <Images className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <span>Referências do Personagem</span>
              <span className="text-xs font-semibold rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-cyan-400">
                {allItems.length} no total
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fotos reunidas em categorias para modelagem 3D, texturas, animação e VFX.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shadow-sm bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5"
            size="sm"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {uploading ? "Enviando..." : `Adicionar em ${currentCategoryConfig?.shortLabel || "Referências"}`}
          </Button>
        </div>
      </div>

      {/* Abas das Categorias */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
          {REFERENCE_CATEGORIES.map((cat) => {
            const isSelected = activeTab === cat.id;
            const count = categoryCounts[cat.id];
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveTab(cat.id);
                  setSelectedIdx(null);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer select-none",
                  isSelected
                    ? "border-cyan-500 bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/50 shadow-sm"
                    : "border-border/70 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className={cn(isSelected ? "text-cyan-400" : "text-muted-foreground")}>
                  {categoryIcons[cat.id]}
                </span>
                <span>{cat.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-bold font-mono",
                    isSelected
                      ? "bg-cyan-500/30 text-cyan-200"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Descrição da Categoria Selecionada */}
        {currentCategoryConfig && (
          <p className="text-xs text-muted-foreground italic px-1">
            {currentCategoryConfig.description}
          </p>
        )}
      </div>

      {/* Grid de Referências da Categoria Ativa */}
      {currentCategoryItems.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/15 p-10 text-center transition-all hover:border-cyan-500/50 hover:bg-cyan-500/5 cursor-pointer"
        >
          <div className="rounded-2xl bg-cyan-500/10 p-4 text-cyan-400 mb-3 border border-cyan-500/20">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Nenhuma foto na categoria "{currentCategoryConfig?.label}"
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            Arraste imagens aqui ou clique para adicionar referências de {currentCategoryConfig?.label.toLowerCase()}.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Escolher imagens (PNG, JPG, WEBP)
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {currentCategoryItems.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => setSelectedIdx(idx)}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
            >
              {/* Imagem ou Prévia de PDF */}
              <div className="relative aspect-square w-full overflow-hidden bg-muted/40">
                {item.isPdf ? (
                  <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center bg-muted/30">
                    <FileText className="h-12 w-12 text-primary mb-2" />
                    <span className="text-xs font-bold text-foreground line-clamp-2">
                      {item.name}
                    </span>
                    <span className="mt-1 rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      DOCUMENTO PDF
                    </span>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                )}

                {/* Overlay no hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center gap-2">
                  <div className="rounded-full bg-black/60 p-2 text-white shadow-md backdrop-blur-xs">
                    <Maximize2 className="h-4 w-4" />
                  </div>
                </div>

                {/* Tag de Origem / Categoria */}
                <div className="absolute left-2 top-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-xs flex items-center gap-1 border border-white/10">
                  {item.isBuiltIn ? (
                    <span className="text-cyan-300 font-bold">★ {item.badgeLabel}</span>
                  ) : (
                    <span>#{idx + 1}</span>
                  )}
                </div>

                {/* Botão de Excluir (somente para referências extras) */}
                {!item.isBuiltIn && item.originalRefId && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 shadow-md"
                    disabled={deletingId === item.originalRefId}
                    onClick={(e) => handleDelete(e, item)}
                    title="Excluir referência"
                  >
                    {deletingId === item.originalRefId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>

              {/* Informações da foto e Ação de Mover Categoria */}
              <div className="p-2.5 flex items-center justify-between gap-2 border-t border-border/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {item.isBuiltIn
                      ? "Item do cadastro principal"
                      : item.created_at
                      ? new Date(item.created_at).toLocaleDateString("pt-BR")
                      : "Referência adicionada"}
                  </p>
                </div>

                {/* Seletor rápido para mudar categoria (para imagens extras) */}
                {!item.isBuiltIn && item.originalRefId && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-cyan-400"
                          title="Alterar categoria desta referência"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                          Mover para categoria
                        </div>
                        {REFERENCE_CATEGORIES.map((cat) => (
                          <DropdownMenuItem
                            key={cat.id}
                            disabled={cat.id === item.category}
                            onClick={() => handleChangeCategory(item.originalRefId!, cat.id)}
                            className="flex items-center gap-2 text-xs"
                          >
                            {categoryIcons[cat.id]}
                            <span>{cat.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Botão para adicionar mais dentro do grid da categoria ativa */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/10 p-4 text-center transition-all hover:border-cyan-500/60 hover:bg-cyan-500/5 cursor-pointer group"
          >
            <div className="rounded-full bg-cyan-500/10 p-3 text-cyan-400 group-hover:scale-110 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
            <span className="mt-2 text-xs font-semibold text-muted-foreground group-hover:text-foreground">
              Adicionar em {currentCategoryConfig?.shortLabel}
            </span>
          </div>
        </div>
      )}

      {/* Lightbox / Modal em Tela Cheia */}
      <Dialog open={selectedIdx !== null} onOpenChange={(open) => !open && setSelectedIdx(null)}>
        <DialogContent className="max-w-4xl p-2 bg-background/95 border-border/80 backdrop-blur-md">
          {selectedImage && (
            <div className="flex flex-col space-y-3">
              <DialogHeader className="px-3 pt-2 pb-0 flex flex-row items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <span>{selectedImage.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      ({(selectedIdx ?? 0) + 1} de {currentCategoryItems.length})
                    </span>
                  </DialogTitle>
                  <p className="text-xs text-cyan-400 font-medium">
                    Categoria: {getReferenceCategoryLabel(selectedImage.category)}
                  </p>
                </div>
                <div className="flex items-center gap-2 mr-6">
                  <a
                    href={selectedImage.url}
                    download={selectedImage.name || `referencia-${selectedImage.category}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md px-2 py-1 hover:bg-muted transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar original
                  </a>
                </div>
              </DialogHeader>

              {/* Área da imagem com navegação */}
              <div className="relative flex items-center justify-center min-h-[350px] max-h-[75vh] overflow-hidden rounded-lg bg-black/40">
                {selectedImage.isPdf ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-white space-y-4">
                    <FileText className="h-16 w-16 text-primary" />
                    <div>
                      <h4 className="text-lg font-bold">{selectedImage.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Este arquivo é um documento PDF técnico.</p>
                    </div>
                    <Button asChild variant="outline" className="text-white border-white/20">
                      <a href={selectedImage.url} target="_blank" rel="noreferrer" download>
                        <Download className="h-4 w-4 mr-1.5" /> Baixar ou Visualizar PDF
                      </a>
                    </Button>
                  </div>
                ) : (
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.name}
                    className="max-h-[72vh] w-auto max-w-full object-contain rounded"
                  />
                )}

                {currentCategoryItems.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handlePrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 text-white hover:bg-black/80 h-9 w-9"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 text-white hover:bg-black/80 h-9 w-9"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
