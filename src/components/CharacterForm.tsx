import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calculator, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileDrop } from "./FileDrop";
import { ScaleResult } from "./ScaleResult";
import { calculateScale, parseHeight, round3 } from "@/lib/scale";
import { fileToDataUrl, saveCharacter, useSettings, type Character } from "@/lib/store";

const MAX_BYTES = 10 * 1024 * 1024;

export function CharacterForm({ editing, onDone }: { editing?: Character | null; onDone?: () => void }) {
  const settings = useSettings();
  const [name, setName] = useState("");
  const [universe, setUniverse] = useState("");
  const [evoEnabled, setEvoEnabled] = useState(false);
  const [height, setHeight] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ url: string; name: string; type: string } | null>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    setName(editing?.name ?? "");
    setUniverse(editing?.universe ?? "");
    setEvoEnabled(Boolean(editing?.evo_enabled));
    setHeight(editing?.height_m ? String(editing.height_m).replace(".", ",") : "");
    setImage(editing?.image_url ?? null);
    setSheet(editing?.model_sheet_url ? { url: editing.model_sheet_url, name: editing.model_sheet_name ?? "", type: editing.model_sheet_type ?? "" } : null);
    setShowResult(!!editing?.height_m);
  }, [editing]);

  const heightM = parseHeight(height);
  const calc = useMemo(() => (heightM ? calculateScale(heightM, settings) : null), [heightM, settings]);

  async function readFile(f: File, kind: "image" | "sheet") {
    if (f.size > MAX_BYTES) { toast.error("Arquivo muito grande (máx. 10 MB)."); return; }
    const url = await fileToDataUrl(f);
    if (kind === "image") setImage(url);
    else setSheet({ url, name: f.name, type: f.type });
  }

  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Informe o nome do personagem."); return; }
    if (height && !heightM) { toast.error("Altura inválida."); return; }
    const scaleChanged = editing && editing.height_m !== heightM;
    const c: Character = {
      id: editing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      universe: universe.trim() || null,
      evo_enabled: evoEnabled,
      image_url: image,
      height_m: heightM,
      scale: calc ? round3(calc.scale) : null,
      scale_ok: calc ? (editing && !scaleChanged ? editing.scale_ok : true) : false,
      anchored_ok: editing?.anchored_ok ?? false,
      cancollide_ok: editing?.cancollide_ok ?? false,
      model_sheet_url: sheet?.url ?? null,
      model_sheet_name: sheet?.name ?? null,
      model_sheet_type: sheet?.type ?? null,
      status: editing?.status ?? "modeling",
      completed_at: editing?.completed_at ?? null,
      created_at: editing?.created_at ?? new Date().toISOString(),
    };
    setSaving(true);
    try {
      await saveCharacter(c);
      toast.success(editing ? "Personagem atualizado!" : "Personagem salvo!");
      if (!editing) {
        setName(""); setUniverse(""); setEvoEnabled(false); setHeight(""); setImage(null); setSheet(null); setShowResult(false);
      }
      onDone?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{editing ? `Editando: ${editing.name}` : "Novo personagem"}</h2>
        {editing && <Button type="button" variant="ghost" size="sm" onClick={onDone}><X className="h-4 w-4 mr-1" /> Cancelar edição</Button>}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome do personagem *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Aizen, Gojo, Guarda Real" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="universe">Universo / Obra de origem (opcional)</Label>
            <Input id="universe" value={universe} onChange={(e) => setUniverse(e.target.value)} placeholder="Ex.: Bleach, Jujutsu Kaisen, Marvel" />
            <p className="text-xs text-muted-foreground">Essencial para a precisão das buscas de referências e VFX.</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="evo-switch" className="text-sm font-medium">Forma Evoluída (Evo)</Label>
              <p className="text-xs text-muted-foreground">Habilita slots de habilidades para a transformação / forma avançada.</p>
            </div>
            <Switch id="evo-switch" checked={evoEnabled} onCheckedChange={setEvoEnabled} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height">Altura real (m ou cm)</Label>
            <div className="flex gap-2">
              <Input id="height" inputMode="decimal" value={height} onChange={(e) => { setHeight(e.target.value); setShowResult(true); }} placeholder="1,85 ou 185" />
              <Button type="button" variant="secondary" onClick={() => { if (!heightM) toast.error("Digite uma altura válida."); setShowResult(true); }}>
                <Calculator className="h-4 w-4 mr-1" /> Calcular escala
              </Button>
            </div>
            {heightM && <p className="text-xs text-muted-foreground">Interpretado como {heightM.toLocaleString("pt-BR")} m</p>}
          </div>
        </div>
        <div className="space-y-4">
          <FileDrop label="Imagem do personagem (opcional)" accept="image/*" value={image} onFile={(f) => readFile(f, "image")} onRemove={() => setImage(null)} />
          <FileDrop label="Model Sheet (opcional, imagem ou PDF)" accept="image/*,application/pdf" value={sheet?.url ?? null} fileName={sheet?.name ?? null} fileType={sheet?.type ?? null} onFile={(f) => readFile(f, "sheet")} onRemove={() => setSheet(null)} />
        </div>
      </div>
      {showResult && calc && <ScaleResult calc={calc} />}
      <Button type="submit" size="lg" className="w-full md:w-auto" disabled={saving}>
        <Save className="h-4 w-4 mr-1.5" /> {saving ? "Salvando..." : "Salvar personagem"}
      </Button>
    </form>
  );
}
