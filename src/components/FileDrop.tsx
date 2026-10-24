import { useRef, useState } from "react";
import { Upload, X, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  accept: string;
  value: string | null;
  fileName?: string | null;
  fileType?: string | null;
  onFile: (f: File) => void;
  onRemove: () => void;
}

export function FileDrop({ label, accept, value, fileName, fileType, onFile, onRemove }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const isPdf = fileType === "application/pdf" || value?.startsWith("data:application/pdf");

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      {value ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted p-2">
          {isPdf ? (
            <div className="flex h-16 w-16 items-center justify-center rounded bg-background"><FileText className="h-8 w-8 text-primary" /></div>
          ) : (
            <img src={value} alt="Pré-visualização" className="h-16 w-16 rounded object-cover" />
          )}
          <span className="flex-1 truncate text-sm">{fileName || (isPdf ? "Documento PDF" : "Imagem")}</span>
          <Button type="button" size="icon" variant="ghost" onClick={() => ref.current?.click()} aria-label="Trocar"><RefreshCw className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="ghost" onClick={onRemove} aria-label="Remover"><X className="h-4 w-4" /></Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
          className={cn("flex w-full flex-col items-center gap-1 rounded-md border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors hover:border-primary", over && "border-primary bg-primary/10")}
        >
          <Upload className="h-5 w-5" />
          Arraste e solte ou clique para enviar
        </button>
      )}
    </div>
  );
}
