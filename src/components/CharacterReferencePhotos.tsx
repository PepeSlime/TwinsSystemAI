import { useState, useRef } from "react";
import {
  Images,
  Plus,
  Trash2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  UploadCloud,
  Loader2,
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
  addCharacterReferenceImages,
  deleteCharacterReferenceImage,
  fileToDataUrl,
  type Character,
  type CharacterReferenceImage,
} from "@/lib/store";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  character: Character;
  className?: string;
}

export function CharacterReferencePhotos({ character, className }: Props) {
  const images = character.reference_images ?? [];
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedImage = selectedIdx !== null ? images[selectedIdx] : null;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const itemsToUpload: { url: string; name: string }[] = [];
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
        });
      }

      if (itemsToUpload.length > 0) {
        await addCharacterReferenceImages(character.id, itemsToUpload);
        toast.success(
          itemsToUpload.length === 1
            ? "1 foto de referência adicionada com sucesso!"
            : `${itemsToUpload.length} fotos de referência adicionadas!`
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

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Tem certeza que deseja remover esta foto de referência?")) return;

    setDeletingId(id);
    try {
      await deleteCharacterReferenceImage(character.id, id);
      toast.success("Foto de referência removida.");
      if (selectedImage?.id === id) {
        setSelectedIdx(null);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro ao excluir foto.");
    } finally {
      setDeletingId(null);
    }
  }

  function handlePrev() {
    if (selectedIdx === null) return;
    setSelectedIdx(selectedIdx > 0 ? selectedIdx - 1 : images.length - 1);
  }

  function handleNext() {
    if (selectedIdx === null) return;
    setSelectedIdx(selectedIdx < images.length - 1 ? selectedIdx + 1 : 0);
  }

  return (
    <div className={cn("space-y-5", className)}>
      {/* Header com contador e botão de upload */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Images className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Fotos de Referência do Personagem
              <span className="ml-2 text-sm font-semibold text-muted-foreground">
                ({images.length})
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Ângulos, renders, detalhes visuais, roupas e poses de referência para modelagem 3D.
            </p>
          </div>
        </div>

        <div>
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
            {uploading ? "Enviando fotos..." : "Adicionar fotos"}
          </Button>
        </div>
      </div>

      {/* Grid de Fotos */}
      {images.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 p-10 text-center transition-all hover:border-cyan-500/50 hover:bg-cyan-500/5 cursor-pointer"
        >
          <div className="rounded-2xl bg-cyan-500/10 p-4 text-cyan-400 mb-3 border border-cyan-500/20">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            Nenhuma foto de referência cadastrada
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            Arraste fotos aqui ou clique no botão abaixo para adicionar imagens de referência extras do personagem.
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
          {images.map((img, idx) => (
            <div
              key={img.id}
              onClick={() => setSelectedIdx(idx)}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
            >
              {/* Imagem */}
              <div className="relative aspect-square w-full overflow-hidden bg-muted/40">
                <img
                  src={img.url}
                  alt={img.name || `Referência ${idx + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Overlay no hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center gap-2">
                  <div className="rounded-full bg-black/60 p-2 text-white shadow-md backdrop-blur-xs">
                    <Maximize2 className="h-4 w-4" />
                  </div>
                </div>

                {/* Botão de excluir */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 shadow-md"
                  disabled={deletingId === img.id}
                  onClick={(e) => handleDelete(e, img.id)}
                  title="Excluir foto"
                >
                  {deletingId === img.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>

                {/* Número do index */}
                <div className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-xs">
                  #{idx + 1}
                </div>
              </div>

              {/* Informações da foto */}
              <div className="p-2.5">
                <p className="truncate text-xs font-semibold text-foreground" title={img.name || "Foto de referência"}>
                  {img.name || `Referência #${idx + 1}`}
                </p>
                {img.created_at && (
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(img.created_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Botão para adicionar mais dentro do grid */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/10 p-4 text-center transition-all hover:border-cyan-500/60 hover:bg-cyan-500/5 cursor-pointer group"
          >
            <div className="rounded-full bg-cyan-500/10 p-3 text-cyan-400 group-hover:scale-110 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
            <span className="mt-2 text-xs font-semibold text-muted-foreground group-hover:text-foreground">
              Adicionar mais
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
                    <span>{selectedImage.name || `Foto de Referência #${(selectedIdx ?? 0) + 1}`}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      ({(selectedIdx ?? 0) + 1} de {images.length})
                    </span>
                  </DialogTitle>
                </div>
                <div className="flex items-center gap-2 mr-6">
                  <a
                    href={selectedImage.url}
                    download={selectedImage.name || `referencia-${(selectedIdx ?? 0) + 1}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md px-2 py-1 hover:bg-muted transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Baixar original
                  </a>
                </div>
              </DialogHeader>

              {/* Área da imagem com botões de navegação */}
              <div className="relative flex items-center justify-center min-h-[350px] max-h-[75vh] overflow-hidden rounded-lg bg-black/40">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name || "Foto ampliada"}
                  className="max-h-[72vh] w-auto max-w-full object-contain rounded"
                />

                {images.length > 1 && (
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
