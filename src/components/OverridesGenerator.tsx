import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Loader2,
  History,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  FileText,
  ExternalLink,
  Download,
  FolderArchive,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileDrop } from "./FileDrop";
import { OverridesResult } from "./OverridesResult";
import {
  parseOverridesPython,
  extractDominantColors,
  type OverridesResult as ResultType,
} from "@/lib/overrides";
import {
  generateOverridesWithAI,
  saveOverridesRun,
  useOverridesRuns,
  type OverridesRun,
} from "@/lib/overrides-store";
import { updateCharacter, type Character } from "@/lib/store";
import { AiModelSelector } from "./AiModelSelector";

export function OverridesGenerator({ character }: { character: Character }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(character.image_url);
  const [modelSheetUrl, setModelSheetUrl] = useState<string | null>(character.model_sheet_url);
  const [modelSheetName, setModelSheetName] = useState<string | null>(character.model_sheet_name);
  const [modelSheetType, setModelSheetType] = useState<string | null>(character.model_sheet_type);

  const [inputMaterials, setInputMaterials] = useState<string>(
    `OVERRIDES = {\n    "Armadura_Ouro": {"color": "#C0C0C0", "metallic": 0.50, "roughness": 0.50},\n    "Pele": {"color": "#FFFFFF", "metallic": 0.00, "roughness": 0.50},\n    "Cabelo": {"color": "#111111", "metallic": 0.00, "roughness": 0.50},\n}`
  );
  const [partHints, setPartHints] = useState<string>("");
  const [dominantColors, setDominantColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<ResultType | null>(null);
  const [activeTab, setActiveTab] = useState<"generator" | "history">("generator");

  const imageRef = useRef<HTMLImageElement>(null);
  const { runs } = useOverridesRuns(character.id);

  // Análise de cores dominantes a partir da foto do personagem
  useEffect(() => {
    if (!photoUrl) {
      setDominantColors([]);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        const colors = await extractDominantColors(img, 8);
        setDominantColors(colors);
      } catch (err) {
        console.warn("Falha ao extrair cores dominantes da foto", err);
      }
    };
    img.src = photoUrl;
  }, [photoUrl]);

  // Validação em tempo real do bloco colado
  const parseStatus = parseOverridesPython(inputMaterials);
  const materialCount = parseStatus.success && parseStatus.overrides ? Object.keys(parseStatus.overrides).length : 0;

  const handleGenerate = async (doubtAnswer?: string) => {
    if (!parseStatus.success || !parseStatus.overrides) {
      toast.error(parseStatus.error || "Corrija o bloco de materiais antes de gerar.");
      return;
    }

    setLoading(true);
    try {
      const res = await generateOverridesWithAI({
        characterId: character.id,
        characterName: character.name,
        universe: character.universe || undefined,
        inputMaterials,
        photoUrl,
        partHints: partHints.trim() || undefined,
        dominantColors: dominantColors.length > 0 ? dominantColors : undefined,
        userAnswer: doubtAnswer || undefined,
      });

      setCurrentResult(res);

      await saveOverridesRun({
        character_id: character.id,
        input_materials: inputMaterials,
        part_hints: partHints.trim() || undefined,
        result_json: res.overrides,
        result_python: res.pythonCode,
        result_table: res.table,
        questions: res.questions,
        model: res.modelUsed,
      });

      toast.success("Overrides gerados com sucesso!");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Falha ao gerar OVERRIDES com IA.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreRun = (run: OverridesRun) => {
    if (run.input_materials) setInputMaterials(run.input_materials);
    if (run.part_hints) setPartHints(run.part_hints);
    if (run.result_json && run.result_python && run.result_table) {
      setCurrentResult({
        overrides: run.result_json,
        pythonCode: run.result_python,
        table: run.result_table,
        unmapped: [],
        questions: run.questions || [],
      });
    }
    setActiveTab("generator");
    toast.info("Execução restaurada do histórico.");
  };

  const handlePhotoUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const url = e.target?.result as string;
      setPhotoUrl(url);
      await updateCharacter(character.id, {
        image_url: url,
      });
      toast.success("Foto do personagem atualizada!");
    };
    reader.readAsDataURL(file);
  };

  const handleModelSheetUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const url = e.target?.result as string;
      setModelSheetUrl(url);
      setModelSheetName(file.name);
      setModelSheetType(file.type);
      await updateCharacter(character.id, {
        model_sheet_url: url,
        model_sheet_name: file.name,
        model_sheet_type: file.type,
      });
      toast.success("Model Sheet arquivado com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  const isModelSheetPdf =
    modelSheetType === "application/pdf" ||
    modelSheetUrl?.startsWith("data:application/pdf");

  return (
    <div className="space-y-6">
      {/* Abas internas: Gerador vs Histórico & Seletor de Modelo */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "generator" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("generator")}
          >
            <Sparkles className="mr-1.5 h-4 w-4" /> Gerador
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("history")}
          >
            <History className="mr-1.5 h-4 w-4" /> Histórico ({runs.length})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <AiModelSelector />
        </div>
      </div>

      {activeTab === "history" ? (
        <div className="space-y-4">
          {runs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
              <History className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Nenhum histórico de execução gravado para este personagem.
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {new Date(r.created_at).toLocaleString("pt-BR")}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {r.model}
                      </Badge>
                      {r.result_json && (
                        <span className="text-xs text-muted-foreground">
                          {Object.keys(r.result_json).length} materiais
                        </span>
                      )}
                    </div>
                    {r.part_hints && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        Dicas: {r.part_hints}
                      </p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleRestoreRun(r)}>
                    Restaurar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Lado esquerdo: Formulário & Resultado */}
          <div className="space-y-6">
            {/* Bloco de materiais do script */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="input-materials" className="font-semibold text-sm">
                  Bloco de Materiais do Blender (OVERRIDES)
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setInputMaterials(
                        `OVERRIDES = {\n    "Armadura_Peitoral": {"color": "#C0C0C0", "metallic": 0.50, "roughness": 0.50},\n    "Pele_Rosto": {"color": "#FFFFFF", "metallic": 0.00, "roughness": 0.50},\n    "Cabelo_Mechas": {"color": "#111111", "metallic": 0.00, "roughness": 0.50},\n    "Capa_Tecido": {"color": "#FFFFFF", "metallic": 0.00, "roughness": 0.50},\n}`
                      )
                    }
                  >
                    Exemplo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => setInputMaterials("OVERRIDES = {\n    \n}")}
                  >
                    Limpar
                  </Button>
                  {parseStatus.success ? (
                    <Badge variant="outline" className="border-green-500/40 text-green-400 gap-1 text-[11px]">
                      <CheckCircle className="h-3 w-3" /> {materialCount} materiais
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-destructive/40 text-destructive gap-1 text-[11px]">
                      <AlertCircle className="h-3 w-3" /> Sintaxe inválida
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-2.5 text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground">Como funciona:</strong> Cole aqui o bloco <code className="text-primary font-mono">OVERRIDES = &#123; ... &#125;</code> gerado pelo seu script do Blender para este modelo 3D. A IA preservará os nomes exatos dos materiais da sua malha, deduzirá a parte do corpo correspondente, e aplicará as cores oficiais do <strong>{character.name}</strong> e do seu Model Sheet.
                </p>
              </div>

              <Textarea
                id="input-materials"
                rows={7}
                value={inputMaterials}
                onChange={(e) => setInputMaterials(e.target.value)}
                className="font-mono text-xs"
                placeholder='OVERRIDES = {\n    "Nome_Do_Material_Do_Blender": {"color": "#C0C0C0", "metallic": 0.50, "roughness": 0.50},\n}'
              />
            </div>

            {/* Dicas de partes */}
            <div className="space-y-2">
              <Label htmlFor="part-hints" className="font-semibold">
                Dicas de Peças e Materiais (Opcional)
              </Label>
              <Input
                id="part-hints"
                value={partHints}
                onChange={(e) => setPartHints(e.target.value)}
                placeholder="Ex: Armadura_Ouro é o peitoral e ombreiras; Pele é o rosto"
              />
              <p className="text-xs text-muted-foreground">
                Ajuda a IA a associar cada material à região exata do model sheet.
              </p>
            </div>

            {/* Botão de Ação */}
            <Button
              size="lg"
              className="w-full sm:w-auto"
              disabled={loading || !parseStatus.success}
              onClick={() => handleGenerate()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando OVERRIDES com IA...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Gerar OVERRIDES para Blender
                </>
              )}
            </Button>

            {/* Resultado da geração */}
            {currentResult && (
              <OverridesResult
                result={currentResult}
                characterName={character.name}
                onAnswerQuestion={(q, ans) => handleGenerate(`Pergunta: "${q}" -> Resposta: "${ans}"`)}
              />
            )}
          </div>

          {/* Lado direito: Foto do Personagem & Model Sheet Arquivado */}
          <div className="space-y-6">
            {/* Foto de Referência para Overrides */}
            <div className="space-y-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">Foto de Referência Visual</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Usada pela IA para guiar as cores reais do modelo 3D.
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5">
                  Paleta Ativa
                </Badge>
              </div>

              {photoUrl ? (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-lg border border-border bg-muted flex items-center justify-center">
                    <img
                      ref={imageRef}
                      src={photoUrl}
                      alt="Foto do Personagem"
                      className="max-h-[260px] w-full object-contain"
                    />
                  </div>
                  <FileDrop
                    value={photoUrl}
                    onFile={handlePhotoUpload}
                    onRemove={() => setPhotoUrl(null)}
                    accept="image/*"
                    label="Trocar foto do personagem"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
                    <User className="mb-2 h-8 w-8 opacity-40" />
                    <p className="text-xs">Nenhuma foto anexada ao personagem</p>
                  </div>
                  <FileDrop
                    value={null}
                    onFile={handlePhotoUpload}
                    onRemove={() => {}}
                    accept="image/*"
                    label="Enviar foto do personagem"
                  />
                </div>
              )}

              {/* Cores dominantes detectadas */}
              {dominantColors.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3">
                  <Label className="text-xs font-semibold">Cores Extraídas da Foto</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {dominantColors.map((hex, i) => (
                      <button
                        key={i}
                        type="button"
                        title={`Clique para copiar ${hex}`}
                        className="group flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1 text-xs hover:border-primary transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(hex);
                          toast.info(`Cor ${hex} copiada!`);
                        }}
                      >
                        <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ backgroundColor: hex }} />
                        <span className="font-mono text-[10px] text-muted-foreground group-hover:text-foreground">
                          {hex}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Model Sheet Arquivado (Documentação Técnica) */}
            <div className="space-y-3 rounded-xl border border-border/80 bg-card/60 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderArchive className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Model Sheet Arquivado</h4>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {modelSheetUrl ? "Guardado" : "Pendente"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Documentação técnica original (turnarounds, blueprints ou PDFs) preservada no personagem.
              </p>

              {modelSheetUrl ? (
                <div className="rounded-lg border border-border bg-background/50 p-3 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">
                        {modelSheetName || (isModelSheetPdf ? "model-sheet.pdf" : "model-sheet.png")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {isModelSheetPdf ? "Documento PDF" : "Imagem Técnica"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs flex-1 gap-1">
                      <a href={modelSheetUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                        <span>Abrir</span>
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs flex-1 gap-1">
                      <a href={modelSheetUrl} download={modelSheetName || "model-sheet"}>
                        <Download className="h-3 w-3" />
                        <span>Baixar</span>
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground italic">
                    Nenhum model sheet arquivado ainda.
                  </p>
                  <FileDrop
                    value={null}
                    onFile={handleModelSheetUpload}
                    onRemove={() => {}}
                    accept="image/*,application/pdf"
                    label="Arquivar Model Sheet (PNG ou PDF)"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
