import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Calculator,
  Save,
  X,
  Ghost,
  Plus,
  Trash2,
  Images,
  UploadCloud,
  Shield,
  Skull,
  Sword,
  FileText,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileDrop } from "./FileDrop";
import { ScaleResult } from "./ScaleResult";
import { calculateScale, parseHeight, round3 } from "@/lib/scale";
import {
  fileToDataUrl,
  saveCharacter,
  useSettings,
  type Character,
  type CharacterSummon,
  type CharacterReferenceImage,
  type CharacterType,
  type ReferenceCategory,
} from "@/lib/store";
import { RARITIES, type CharacterRarity } from "@/lib/rarity";
import { CHARACTER_CLASSES } from "@/lib/character-classes";
import { REFERENCE_CATEGORIES, getReferenceCategoryLabel } from "@/lib/reference-categories";
import { cn } from "@/lib/utils";





const MAX_BYTES = 10 * 1024 * 1024;

interface FormSummon {
  id: string;
  name: string;
  heightStr: string;
  image: string | null;
  sheet: { url: string; name: string; type: string } | null;
  showResult: boolean;
}

function createDefaultSummon(index: number = 0): FormSummon {
  return {
    id: crypto.randomUUID(),
    name: "",
    heightStr: "",
    image: null,
    sheet: null,
    showResult: false,
  };
}

export function CharacterForm({ editing, onDone }: { editing?: Character | null; onDone?: () => void }) {
  const settings = useSettings();
  const [name, setName] = useState("");
  const [characterType, setCharacterType] = useState<CharacterType>("hero");
  const [rarity, setRarity] = useState<CharacterRarity>("raro");
  const [universe, setUniverse] = useState("");
  const [evoEnabled, setEvoEnabled] = useState(false);
  const [height, setHeight] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ url: string; name: string; type: string } | null>(null);
  const [referenceImages, setReferenceImages] = useState<CharacterReferenceImage[]>([]);
  const [formRefCategory, setFormRefCategory] = useState<ReferenceCategory | "all">("all");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const [showResult, setShowResult] = useState(false);

  function toggleClass(classId: string) {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((c) => c !== classId) : [...prev, classId]
    );
  }

  // Múltiplas Invocações (Summons)
  const [hasSummon, setHasSummon] = useState(false);
  const [summonsList, setSummonsList] = useState<FormSummon[]>([createDefaultSummon(0)]);
  const [activeSummonIndex, setActiveSummonIndex] = useState(0);


  useEffect(() => {
    setName(editing?.name ?? "");
    setCharacterType(editing?.character_type ?? "hero");
    setRarity(editing?.rarity ?? "raro");
    setUniverse(editing?.universe ?? "");
    setEvoEnabled(Boolean(editing?.evo_enabled));
    setHeight(editing?.height_m ? String(editing.height_m).replace(".", ",") : "");
    setImage(editing?.image_url ?? null);
    setSheet(editing?.model_sheet_url ? { url: editing.model_sheet_url, name: editing.model_sheet_name ?? "", type: editing.model_sheet_type ?? "" } : null);
    setReferenceImages(editing?.reference_images ?? []);
    setSelectedClasses(editing?.classes ?? []);
    setShowResult(!!editing?.height_m);


    const isHasSummon = Boolean(editing?.has_summon);
    setHasSummon(isHasSummon);

    let initialSummons: FormSummon[] = [];
    if (editing?.summons && editing.summons.length > 0) {
      initialSummons = editing.summons.map((s) => ({
        id: s.id || crypto.randomUUID(),
        name: s.name ?? "",
        heightStr: s.height_m ? String(s.height_m).replace(".", ",") : "",
        image: s.image_url ?? null,
        sheet: s.model_sheet_url
          ? {
              url: s.model_sheet_url,
              name: s.model_sheet_name ?? "",
              type: s.model_sheet_type ?? "",
            }
          : null,
        showResult: Boolean(s.height_m),
      }));
    } else if (
      editing?.has_summon &&
      (editing.summon_name || editing.summon_image_url || editing.summon_height_m || editing.summon_model_sheet_url)
    ) {
      initialSummons = [
        {
          id: crypto.randomUUID(),
          name: editing.summon_name ?? "",
          heightStr: editing.summon_height_m ? String(editing.summon_height_m).replace(".", ",") : "",
          image: editing.summon_image_url ?? null,
          sheet: editing.summon_model_sheet_url
            ? {
                url: editing.summon_model_sheet_url,
                name: editing.summon_model_sheet_name ?? "",
                type: editing.summon_model_sheet_type ?? "",
              }
            : null,
          showResult: Boolean(editing.summon_height_m),
        },
      ];
    }

    if (initialSummons.length === 0) {
      initialSummons = [createDefaultSummon(0)];
    }
    setSummonsList(initialSummons);
    setActiveSummonIndex(0);
  }, [editing]);

  const heightM = parseHeight(height);
  const calc = useMemo(() => (heightM ? calculateScale(heightM, settings) : null), [heightM, settings]);

  const safeActiveIndex = Math.min(activeSummonIndex, Math.max(0, summonsList.length - 1));
  const activeSummon = summonsList[safeActiveIndex] ?? createDefaultSummon(0);

  const activeSummonHeightM = parseHeight(activeSummon.heightStr);
  const activeSummonCalc = useMemo(
    () => (activeSummonHeightM ? calculateScale(activeSummonHeightM, settings) : null),
    [activeSummonHeightM, settings]
  );

  function updateActiveSummon(patch: Partial<FormSummon>) {
    setSummonsList((prev) =>
      prev.map((s, idx) => (idx === safeActiveIndex ? { ...s, ...patch } : s))
    );
  }

  function addSummon() {
    const newSummon = createDefaultSummon(summonsList.length);
    setSummonsList((prev) => [...prev, newSummon]);
    setActiveSummonIndex(summonsList.length);
  }

  function removeSummon(indexToRemove: number) {
    if (summonsList.length <= 1) {
      setSummonsList([createDefaultSummon(0)]);
      return;
    }
    setSummonsList((prev) => prev.filter((_, i) => i !== indexToRemove));
    if (safeActiveIndex >= summonsList.length - 1) {
      setActiveSummonIndex(Math.max(0, summonsList.length - 2));
    }
  }

  async function readFile(f: File, kind: "image" | "sheet" | "summon-image" | "summon-sheet") {
    if (f.size > MAX_BYTES) { toast.error("Arquivo muito grande (máx. 10 MB)."); return; }
    const url = await fileToDataUrl(f);
    if (kind === "image") setImage(url);
    else if (kind === "sheet") setSheet({ url, name: f.name, type: f.type });
    else if (kind === "summon-image") updateActiveSummon({ image: url });
    else if (kind === "summon-sheet") updateActiveSummon({ sheet: { url, name: f.name, type: f.type } });
  }

  async function addReferenceFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newItems: CharacterReferenceImage[] = [];
    const targetCategory: ReferenceCategory = formRefCategory === "all" ? "character" : formRefCategory;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) {
        toast.error(`"${f.name}" não é uma imagem válida.`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`"${f.name}" ultrapassa o limite de 10 MB.`);
        continue;
      }
      const url = await fileToDataUrl(f);
      newItems.push({
        id: crypto.randomUUID(),
        url,
        name: f.name.replace(/\.[^/.]+$/, ""),
        category: targetCategory,
        created_at: new Date().toISOString(),
      });
    }
    if (newItems.length > 0) {
      setReferenceImages((prev) => [...prev, ...newItems]);
      toast.success(
        newItems.length === 1
          ? `1 referência adicionada em ${getReferenceCategoryLabel(targetCategory)}!`
          : `${newItems.length} referências adicionadas!`
      );
    }
    if (refFileInputRef.current) refFileInputRef.current.value = "";
  }

  function removeReferenceImage(id: string) {
    setReferenceImages((prev) => prev.filter((img) => img.id !== id));
  }

  function updateReferenceImageName(id: string, newName: string) {
    setReferenceImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, name: newName } : img))
    );
  }

  function updateReferenceImageCategory(id: string, newCategory: ReferenceCategory) {
    setReferenceImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, category: newCategory } : img))
    );
  }

  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Informe o nome do personagem."); return; }
    if (height && !heightM) { toast.error("Altura do personagem inválida."); return; }

    const processedSummons: CharacterSummon[] = [];
    if (hasSummon) {
      for (let i = 0; i < summonsList.length; i++) {
        const s = summonsList[i];
        if (!s) continue;
        const sHeightM = parseHeight(s.heightStr);
        if (s.heightStr && !sHeightM) {
          toast.error(`Altura inválida na invocação ${i + 1} (${s.name.trim() || `Invocação ${i + 1}`}).`);
          return;
        }

        const sCalc = sHeightM ? calculateScale(sHeightM, settings) : null;
        processedSummons.push({
          id: s.id || crypto.randomUUID(),
          name: s.name.trim() || `Invocação ${i + 1}`,
          image_url: s.image,
          height_m: sHeightM,
          scale: sCalc ? round3(sCalc.scale) : null,
          model_sheet_url: s.sheet?.url ?? null,
          model_sheet_name: s.sheet?.name ?? null,
          model_sheet_type: s.sheet?.type ?? null,
        });
      }
    }

    const firstSummon = processedSummons[0] ?? null;
    const scaleChanged = editing && editing.height_m !== heightM;
    const c: Character = {
      id: editing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      character_type: characterType,
      rarity: rarity,
      classes: selectedClasses,
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
      reference_images: referenceImages,
      // Múltiplas Invocações
      has_summon: hasSummon,
      summons: processedSummons,
      summon_name: firstSummon?.name ?? null,
      summon_image_url: firstSummon?.image_url ?? null,
      summon_height_m: firstSummon?.height_m ?? null,
      summon_scale: firstSummon?.scale ?? null,
      summon_model_sheet_url: firstSummon?.model_sheet_url ?? null,
      summon_model_sheet_name: firstSummon?.model_sheet_name ?? null,
      summon_model_sheet_type: firstSummon?.model_sheet_type ?? null,
      status: editing?.status ?? "modeling",
      completed_at: editing?.completed_at ?? null,
      created_at: editing?.created_at ?? new Date().toISOString(),
    };
    setSaving(true);
    try {
      await saveCharacter(c);
      toast.success(editing ? "Personagem atualizado!" : "Personagem salvo!");
      if (!editing) {
        setName(""); setCharacterType("hero"); setRarity("raro"); setUniverse(""); setEvoEnabled(false); setHeight(""); setImage(null); setSheet(null); setShowResult(false);
        setReferenceImages([]);
        setSelectedClasses([]);
        setHasSummon(false);
        setSummonsList([createDefaultSummon(0)]);
        setActiveSummonIndex(0);
      }

      onDone?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }


  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{editing ? `Editando: ${editing.name}` : "Novo personagem"}</h2>
        {editing && <Button type="button" variant="ghost" size="sm" onClick={onDone}><X className="h-4 w-4 mr-1" /> Cancelar edição</Button>}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          {/* Tipo de Personagem: Herói ou Inimigo */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tipo de personagem *</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCharacterType("hero")}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  characterType === "hero"
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 ring-2 ring-emerald-500/40 shadow-sm"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                    characterType === "hero"
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold leading-tight">Herói</p>
                  <p className="text-[10px] opacity-75 leading-tight mt-0.5">Aliado / Protagonista</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCharacterType("enemy")}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  characterType === "enemy"
                    ? "border-rose-500 bg-rose-500/15 text-rose-300 ring-2 ring-rose-500/40 shadow-sm"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                    characterType === "enemy"
                      ? "border-rose-500/50 bg-rose-500/20 text-rose-300"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  <Skull className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold leading-tight">Inimigo</p>
                  <p className="text-[10px] opacity-75 leading-tight mt-0.5">Vilão / Oponente</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nome do personagem *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Aizen, Gojo, Guarda Real" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Raridade do personagem *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {RARITIES.map((r) => {
                const isSelected = rarity === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRarity(r.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all relative cursor-pointer text-center",
                      isSelected
                        ? cn(r.badgeClass, "ring-2 ring-offset-1 ring-offset-background", r.borderClass)
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn("h-2 w-2 rounded-full", r.dotClass)} />
                      <span className={cn(isSelected && r.textClass)}>{r.label}</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-normal">{r.colorName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Classes do Personagem (Múltipla Seleção) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Classes do personagem</Label>
              <span className="text-[11px] text-muted-foreground">
                {selectedClasses.length === 0
                  ? "Selecione uma ou mais"
                  : `${selectedClasses.length} selecionada(s)`}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CHARACTER_CLASSES.map((cls) => {
                const isSelected = selectedClasses.includes(cls.id);
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => toggleClass(cls.id)}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none",
                      isSelected
                        ? cn(cls.badgeClass, "ring-2 ring-offset-1 ring-offset-background font-bold")
                        : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", cls.dotClass)} />
                      <span className="truncate">{cls.label}</span>
                    </div>
                    {isSelected ? (
                      <span className="text-[11px] font-extrabold text-primary shrink-0 ml-1">✓</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60 shrink-0 ml-1">+</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="universe">Universo / Obra de origem (opcional)</Label>
            <Input id="universe" value={universe} onChange={(e) => setUniverse(e.target.value)} placeholder="Ex.: Bleach, Jujutsu Kaisen, Marvel" />
            <p className="text-xs text-muted-foreground">Essencial para a precisão das buscas de referências e VFX.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5 pr-2">
                <Label htmlFor="evo-switch" className="text-sm font-medium">Forma Evo</Label>
                <p className="text-[11px] text-muted-foreground">Transformação avançada.</p>
              </div>
              <Switch id="evo-switch" checked={evoEnabled} onCheckedChange={setEvoEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5">
                  <Ghost className="h-3.5 w-3.5 text-violet-500" />
                  <Label htmlFor="summon-switch" className="text-sm font-medium">Invocação</Label>
                </div>
                <p className="text-[11px] text-muted-foreground">Pet, Stand ou summon(s).</p>
              </div>
              <Switch
                id="summon-switch"
                checked={hasSummon}
                onCheckedChange={(checked) => {
                  setHasSummon(checked);
                  if (checked && summonsList.length === 0) {
                    setSummonsList([createDefaultSummon(0)]);
                    setActiveSummonIndex(0);
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height">Altura real do personagem (m ou cm)</Label>
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
      {showResult && calc && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Escala Roblox do Personagem</h3>
          <ScaleResult calc={calc} />
        </div>
      )}

      {/* Painel de Múltiplas Invocações */}
      {hasSummon && (
        <div className="space-y-5 rounded-xl border border-violet-500/30 bg-violet-500/5 p-5 transition-all">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-500/15 pb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-violet-500/10 p-1.5 text-violet-500">
                <Ghost className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Invocações do Personagem ({summonsList.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cadastre uma ou mais entidades (Mahoraga, Lobos, Stand, Sentinelas, etc.).
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSummon}
              className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Adicionar outra invocação
            </Button>
          </div>

          {/* Abas das Invocações */}
          <div className="flex flex-wrap items-center gap-2">
            {summonsList.map((s, idx) => {
              const isSelected = idx === safeActiveIndex;
              return (
                <div
                  key={s.id || idx}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    isSelected
                      ? "border-violet-500 bg-violet-500/20 text-violet-200 ring-1 ring-violet-500"
                      : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => setActiveSummonIndex(idx)}
                >
                  <Ghost className="h-3.5 w-3.5 text-violet-400" />
                  <span>{s.name.trim() || `Invocação ${idx + 1}`}</span>
                  {summonsList.length > 1 && (
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-destructive/20 hover:text-destructive text-muted-foreground/70 transition-colors"
                      title="Excluir invocação"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSummon(idx);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Formulário da Invocação Ativa */}
          <div className="rounded-lg border border-violet-500/20 bg-background/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <span className="text-violet-400">#{safeActiveIndex + 1}</span>
                <span>{activeSummon.name.trim() || `Invocação ${safeActiveIndex + 1}`}</span>
              </h4>
              {summonsList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeSummon(safeActiveIndex)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover esta invocação
                </Button>
              )}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`summon-name-${safeActiveIndex}`}>Nome da Invocação</Label>
                  <Input
                    id={`summon-name-${safeActiveIndex}`}
                    value={activeSummon.name}
                    onChange={(e) => updateActiveSummon({ name: e.target.value })}
                    placeholder="Ex.: Mahoraga, Lobo de Jade, Sentinela, Doombot"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`summon-height-${safeActiveIndex}`}>Altura real da Invocação (m ou cm)</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`summon-height-${safeActiveIndex}`}
                      inputMode="decimal"
                      value={activeSummon.heightStr}
                      onChange={(e) => updateActiveSummon({ heightStr: e.target.value, showResult: true })}
                      placeholder="Ex.: 2,50 ou 250"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (!activeSummonHeightM) toast.error("Digite uma altura válida para a invocação.");
                        updateActiveSummon({ showResult: true });
                      }}
                    >
                      <Calculator className="h-4 w-4 mr-1" /> Calcular escala
                    </Button>
                  </div>
                  {activeSummonHeightM && (
                    <p className="text-xs text-muted-foreground">
                      Interpretado como {activeSummonHeightM.toLocaleString("pt-BR")} m
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <FileDrop
                  label="Imagem da Invocação (opcional)"
                  accept="image/*"
                  value={activeSummon.image}
                  onFile={(f) => readFile(f, "summon-image")}
                  onRemove={() => updateActiveSummon({ image: null })}
                />
                <FileDrop
                  label="Model Sheet da Invocação (opcional, imagem ou PDF)"
                  accept="image/*,application/pdf"
                  value={activeSummon.sheet?.url ?? null}
                  fileName={activeSummon.sheet?.name ?? null}
                  fileType={activeSummon.sheet?.type ?? null}
                  onFile={(f) => readFile(f, "summon-sheet")}
                  onRemove={() => updateActiveSummon({ sheet: null })}
                />
              </div>
            </div>

            {activeSummon.showResult && activeSummonCalc && (
              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">Cálculo de Escala Roblox desta Invocação</h4>
                  <span className="font-mono text-xs font-bold text-violet-400">× {round3(activeSummonCalc.scale)}</span>
                </div>
                <ScaleResult calc={activeSummonCalc} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seção de Referências do Personagem */}
      <div className="space-y-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5 transition-all">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/15 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400">
              <Images className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Referências do Personagem ({referenceImages.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Adicione fotos organizadas em categorias (Model Sheet, Fotos Personagem, Invocações e Arma) para orientar a modelagem 3D.
              </p>
            </div>
          </div>
          <div>
            <input
              ref={refFileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addReferenceFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refFileInputRef.current?.click()}
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Adicionar referências
            </Button>
          </div>
        </div>

        {/* Abas de Categorias de Referência */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          <button
            type="button"
            onClick={() => setFormRefCategory("all")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border",
              formRefCategory === "all"
                ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60"
            )}
          >
            Todas ({referenceImages.length})
          </button>
          {REFERENCE_CATEGORIES.map((cat) => {
            const count = referenceImages.filter((img) => (img.category || "character") === cat.id).length;
            const isSelected = formRefCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFormRefCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border",
                  isSelected
                    ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                    : "border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60"
                )}
              >
                <span>{cat.label}</span>
                <span className="font-mono text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {referenceImages.length === 0 ? (
          <div
            onClick={() => refFileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addReferenceFiles(e.dataTransfer.files);
            }}
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-cyan-500/30 bg-background/40 p-6 text-center cursor-pointer hover:border-cyan-500/60 hover:bg-cyan-500/5 transition-all"
          >
            <UploadCloud className="h-7 w-7 text-cyan-400/80 mb-2" />
            <p className="text-xs font-semibold text-foreground">Clique ou arraste fotos de referência aqui</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {formRefCategory !== "all"
                ? `As fotos enviadas entrarão na categoria "${getReferenceCategoryLabel(formRefCategory)}"`
                : "Selecione uma ou mais imagens (PNG, JPG, WEBP até 10 MB)"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {referenceImages
              .filter((img) => formRefCategory === "all" || (img.category || "character") === formRefCategory)
              .map((img, idx) => (
                <div
                  key={img.id}
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card p-2 shadow-xs transition-all hover:border-cyan-500/50"
                >
                  <div className="relative aspect-video w-full overflow-hidden rounded bg-muted">
                    <img src={img.url} alt={img.name || `Ref ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeReferenceImage(img.id)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white hover:bg-destructive hover:text-white transition-colors cursor-pointer"
                      title="Remover foto"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1 py-0.5 text-[9px] font-bold text-white">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <Input
                      className="h-7 text-xs px-2"
                      placeholder="Descrição / Rótulo da foto"
                      value={img.name ?? ""}
                      onChange={(e) => updateReferenceImageName(img.id, e.target.value)}
                    />
                    <select
                      value={img.category || "character"}
                      onChange={(e) => updateReferenceImageCategory(img.id, e.target.value as ReferenceCategory)}
                      className="h-6 w-full rounded border border-border/70 bg-muted/40 text-[10px] font-medium px-1.5 text-muted-foreground focus:text-foreground cursor-pointer"
                    >
                      <option value="character">Fotos Personagem</option>
                      <option value="model_sheet">Model Sheet</option>
                      <option value="summon">Invocações</option>
                      <option value="weapon">Arma</option>
                    </select>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full md:w-auto" disabled={saving}>
        <Save className="h-4 w-4 mr-1.5" /> {saving ? "Salvando..." : "Salvar personagem"}
      </Button>
    </form>
  );
}
