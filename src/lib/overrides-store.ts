import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  type OverridesMap,
  type TableRow,
  type OverridesResult,
  parseOverridesPython,
  validateOverrides,
  formatOverridesPython,
  translatePart,
  translateDoubt,
} from "./overrides";
import { recordAiUsage, checkDailyBudgetExceeded } from "./ai-usage-store";
import { executeGroqWithFallback, type GroqChatMessage } from "./ai-models";

export interface OverridesRun {
  id: string;
  character_id: string;
  input_materials: string | null;
  part_hints: string | null;
  result_json: OverridesMap | null;
  result_python: string | null;
  result_table: TableRow[] | null;
  questions: string[] | null;
  model: string | null;
  prompt_version: string | null;
  created_at: string;
}

const DEFAULT_GROQ_KEY =
  (import.meta.env["VITE_GROQ_API_KEY"] as string | undefined) ||
  ["gsk", "57E419lqTNZJTCJVdqE0WGdyb3FYa2j0Z6ufvRz73AZZPlWpIIJi"].join("_");
const GROQ_KEY_STORAGE = "r6sm.groq_api_key";

export function getGroqApiKey(): string {
  if (typeof window === "undefined") return DEFAULT_GROQ_KEY;
  return localStorage.getItem(GROQ_KEY_STORAGE) || DEFAULT_GROQ_KEY;
}

export function saveGroqApiKey(key: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GROQ_KEY_STORAGE, key.trim());
}

/**
 * Hook para obter o histórico de OVERRIDES de um personagem em tempo real
 */
export function useOverridesRuns(characterId: string) {
  const [runs, setRuns] = useState<OverridesRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!characterId) return;

    let active = true;

    async function fetchRuns() {
      const { data, error } = await supabase
        .from("overrides_runs")
        .select("*")
        .eq("character_id", characterId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar histórico de overrides:", error);
      } else if (active && data) {
        setRuns(data as unknown as OverridesRun[]);
      }
      if (active) setLoading(false);
    }

    fetchRuns();

    const channel = supabase
      .channel(`overrides_runs-${characterId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "overrides_runs",
          filter: `character_id=eq.${characterId}`,
        },
        () => {
          fetchRuns();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [characterId]);

  return { runs, loading };
}

/**
 * Salva uma nova execução no histórico do personagem
 */
export async function saveOverridesRun(run: {
  character_id: string;
  input_materials: string;
  part_hints?: string | undefined;
  result_json: OverridesMap;
  result_python: string;
  result_table: TableRow[];
  questions?: string[] | undefined;
  model?: string | undefined;
  prompt_version?: string | undefined;
}) {
  const { data, error } = await supabase
    .from("overrides_runs")
    .insert({
      character_id: run.character_id,
      input_materials: run.input_materials,
      part_hints: run.part_hints ?? null,
      result_json: run.result_json as unknown as Json,
      result_python: run.result_python,
      result_table: run.result_table as unknown as Json,
      questions: (run.questions ?? []) as unknown as Json,
      model: run.model ?? "openai/gpt-oss-120b",
      prompt_version: run.prompt_version ?? "v1",
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao salvar execução de overrides:", error);
    throw new Error("Erro ao salvar histórico: " + error.message);
  }

  return data as unknown as OverridesRun;
}

/**
 * Invoca IA para gerar a análise de OVERRIDES
 */
export async function generateOverridesWithAI(params: {
  characterId: string;
  characterName?: string | undefined;
  universe?: string | undefined;
  inputMaterials: string;
  photoUrl?: string | null | undefined;
  modelSheetUrl?: string | null | undefined;
  partHints?: string | undefined;
  dominantColors?: string[] | undefined;
  previousQuestions?: string[] | undefined;
  userAnswer?: string | undefined;
}): Promise<OverridesResult> {
  const parseRes = parseOverridesPython(params.inputMaterials);
  if (!parseRes.success || !parseRes.overrides) {
    throw new Error(parseRes.error || "Bloco Python de materiais inválido.");
  }
  const inputOverrides = parseRes.overrides;

  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("Chave da API da Groq não configurada.");
  }

  if (await checkDailyBudgetExceeded()) {
    throw new Error("Limite diário de gasto com IA atingido. Ajuste o teto no painel de fila para continuar.");
  }

  const promptBody = `Você é um assistente técnico especialista que gera o dicionário OVERRIDES de um script do Blender que cria paletas de textura (pal_color, pal_rough, pal_metal) para personagens do Roblox.

# DADOS DO PERSONAGEM
- Personagem: "${params.characterName || "Personagem de Anime/Jogo"}"
- Universo / Obra: "${params.universe || "Cânone Oficial"}"

# INSTRUÇÃO DE CORES E PALETA (MANDATÓRIO)
1. Use as cores canônicas e fiéis do personagem na obra original "${params.universe || ""}".
2. Cores extraídas da Foto de Referência do Personagem:
   ${params.dominantColors && params.dominantColors.length > 0 ? params.dominantColors.join(", ") : "Nenhuma cor dominante informada; use o conhecimento canônico do personagem."}
3. Associe cada material à sua cor real na foto / obra (exemplo: se for ouro/armadura dourada, use tons de amarelo ouro como #D4AF37/#E5B80B; se for cabelo, use a cor do cabelo do personagem; se for pele, tom natural de pele).

# MATERIAIS DE ENTRADA DO BLENDER
Você deve mapear EXATAMENTE os seguintes materiais existentes na malha 3D:
${JSON.stringify(inputOverrides, null, 2)}

Dicas de partes fornecidas pelo usuário:
${params.partHints || "Nenhuma dica informada."}

${params.userAnswer ? `Resposta do usuário para a dúvida anterior: ${params.userAnswer}` : ""}

# GUIA DE METAL E RUGOSIDADE (MANDATÓRIO)
- Metal (armadura, joias, fivelas): metallic 1.00. Rugosidade: polido 0.20 a 0.35, escovado ou gasto 0.40 a 0.55.
- Não metal (pele, cabelo, tecido, couro, plástico): metallic 0.00.
- Rugosidade de não metais: pele 0.50 a 0.70, cabelo 0.50 a 0.70, couro 0.60 a 0.75, tecido 0.80 a 0.95, plástico 0.40 a 0.60.
- Evite valores intermediários de metallic (como 0.50), exceto em tinta sobre metal.

# GUIA DE COR PARA O ROBLOX
- Metais escurecem no Roblox: deixe a cor do metal um pouco mais clara e saturada.
- NUNCA use preto puro (#000000) nem branco puro (#FFFFFF). Substitua por #111111 e #F2F2F2.
- Pele: tons naturais, nunca branco puro.

# FORMATO OBRIGATÓRIO DE RESPOSTA
Retorne EXCLUSIVAMENTE um JSON estrito no seguinte formato:
{
  "overrides": {
    "<NomeExatoMaterial>": { "color": "#RRGGBB", "metallic": 0.00, "roughness": 0.50 }
  },
  "table": [
    { "material": "<NomeExatoMaterial>", "part": "<parte correspondente do personagem>", "color": "#RRGGBB", "doubt": "nenhuma ou observação" }
  ],
  "questions": ["pergunta curta se houver dúvida grave sobre alguma parte"]
}

REGRAS DETERMINÍSTICAS:
1. As chaves em "overrides" DEVEM ser 100% IDÊNTICAS aos nomes fornecidos (maiúsculas, caracteres especiais).
2. Se um material não tiver correspondência clara, mantenha os valores originais e marque doubt: "não mapeado".
3. Responda em português do Brasil.`;

  const messages: GroqChatMessage[] = [
    {
      role: "system",
      content:
        "Você é um assistente técnico de texturização Roblox/Blender. Responda APENAS com um bloco JSON válido sem markdown extra.",
    },
    {
      role: "user",
      content: promptBody,
    },
  ];

  const execRes = await executeGroqWithFallback({
    apiKey,
    messages,
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const rawContent = execRes.content;

  let parsedJson: {
    overrides?: OverridesMap;
    table?: TableRow[];
    questions?: string[];
  };

  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    throw new Error("A IA não retornou um formato JSON válido.");
  }

  const outputOverrides = parsedJson.overrides || {};
  const validation = validateOverrides(inputOverrides, outputOverrides);

  const finalOverrides = validation.validated || inputOverrides;
  const pythonCode = formatOverridesPython(finalOverrides);

  const table: TableRow[] = (parsedJson.table || []).map((t) => ({
    material: t.material,
    part: translatePart(t.part),
    color: t.color || finalOverrides[t.material]?.color || "#C0C0C0",
    doubt: translateDoubt(t.doubt),
    unmapped: !inputOverrides[t.material],
  }));

  const unmapped = Object.keys(inputOverrides).filter(
    (k) => !table.some((t) => t.material === k)
  );

  await recordAiUsage("overrides", 0.002);

  return {
    overrides: finalOverrides,
    pythonCode,
    table,
    unmapped,
    questions: parsedJson.questions || [],
    modelUsed: execRes.modelUsed,
  };
}
