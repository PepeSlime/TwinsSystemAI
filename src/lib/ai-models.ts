import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface AiModelConfig {
  id: string;
  name: string;
  description: string;
  params: string;
  strengths: string;
  limits: {
    rpm: number; // Requisições por minuto
    rpd: number; // Requisições por dia
    tpm: number; // Tokens por minuto
  };
  isDefault?: boolean;
}

export const AVAILABLE_AI_MODELS: AiModelConfig[] = [
  {
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    params: "120 Bilhões",
    description: "Modelo de raciocínio profundo de alta capacidade, ideal para análises canônicas e JSON estrito.",
    strengths: "Raciocínio complexo, adesão às regras e fidelidade a animes.",
    limits: {
      rpm: 30,
      rpd: 1000,
      tpm: 8000,
    },
    isDefault: true,
  },
  {
    id: "qwen/qwen3.8-27b",
    name: "Qwen 3.8 27B",
    params: "27 Bilhões",
    description: "Modelo veloz com excelente fluência em português do Brasil e alta tolerância de requisições.",
    strengths: "Baixíssima latência, ótimo vocabulário pt-BR e cotas separadas.",
    limits: {
      rpm: 60,
      rpd: 14400,
      tpm: 15000,
    },
  },
  {
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B",
    params: "20 Bilhões",
    description: "Versão compacta de alta velocidade, ideal quando a cota do modelo principal estiver esgotando.",
    strengths: "Resposta imediata e margem ampla de requisições por minuto.",
    limits: {
      rpm: 60,
      rpd: 14400,
      tpm: 20000,
    },
  },
];

const DEFAULT_MODEL: AiModelConfig = AVAILABLE_AI_MODELS[0]!;
const AI_MODEL_STORAGE_KEY = "r6sm.active_ai_model";
const AI_MODEL_CHANGE_EVENT = "r6sm:ai-model-changed";

export function getActiveAiModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL.id;
  const stored = localStorage.getItem(AI_MODEL_STORAGE_KEY);
  if (stored && AVAILABLE_AI_MODELS.some((m) => m.id === stored)) {
    return stored;
  }
  return DEFAULT_MODEL.id;
}

export function setActiveAiModel(modelId: string): void {
  if (typeof window === "undefined") return;
  if (AVAILABLE_AI_MODELS.some((m) => m.id === modelId)) {
    localStorage.setItem(AI_MODEL_STORAGE_KEY, modelId);
    window.dispatchEvent(new CustomEvent(AI_MODEL_CHANGE_EVENT, { detail: modelId }));
  }
}

export function getModelConfig(modelId: string): AiModelConfig {
  const found = AVAILABLE_AI_MODELS.find((m) => m.id === modelId);
  return found || DEFAULT_MODEL;
}

export function getFallbackModel(currentModelId: string): string {
  const index = AVAILABLE_AI_MODELS.findIndex((m) => m.id === currentModelId);
  if (index !== -1 && index + 1 < AVAILABLE_AI_MODELS.length) {
    const next = AVAILABLE_AI_MODELS[index + 1];
    if (next) return next.id;
  }
  return DEFAULT_MODEL.id;
}

/**
 * Hook do React para acompanhar o modelo ativo com reatividade em tempo real entre abas e componentes
 */
export function useActiveAiModel() {
  const [activeModel, setActiveModel] = useState<string>(() => getActiveAiModel());

  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setActiveModel(custom.detail);
      } else {
        setActiveModel(getActiveAiModel());
      }
    };

    window.addEventListener(AI_MODEL_CHANGE_EVENT, handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener(AI_MODEL_CHANGE_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  return {
    activeModel,
    config: getModelConfig(activeModel),
    setModel: setActiveAiModel,
    allModels: AVAILABLE_AI_MODELS,
  };
}

export interface GroqChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqExecutionOptions {
  apiKey: string;
  messages: GroqChatMessage[];
  temperature?: number;
  response_format?: { type: "json_object" };
  preferredModel?: string;
}

export interface GroqExecutionResult {
  content: string;
  modelUsed: string;
  wasFallback: boolean;
}

/**
 * Executa uma chamada à API Groq com failover / fallback automático.
 * Se o modelo atual receber erro 429 (Rate Limit / Quota Exceeded),
 * ele migra para o próximo modelo com cotas separadas e tenta novamente.
 */
export async function executeGroqWithFallback(options: GroqExecutionOptions): Promise<GroqExecutionResult> {
  const initialModel = options.preferredModel || getActiveAiModel();
  let currentModel = initialModel;
  let attempts = 0;
  const maxAttempts = AVAILABLE_AI_MODELS.length;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
          model: currentModel,
          messages: options.messages,
          temperature: options.temperature ?? 0.1,
          ...(options.response_format ? { response_format: options.response_format } : {}),
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content || "{}";
        
        // Se houve fallback bem-sucedido, atualiza o modelo salvo para as próximas
        if (currentModel !== initialModel) {
          setActiveAiModel(currentModel);
        }

        return {
          content,
          modelUsed: currentModel,
          wasFallback: currentModel !== initialModel,
        };
      }

      // Se atingiu o limite de taxa / cota da Groq (HTTP 429)
      if (response.status === 429) {
        const fallback = getFallbackModel(currentModel);
        if (fallback !== currentModel) {
          const currentCfg = getModelConfig(currentModel);
          const nextCfg = getModelConfig(fallback);
          console.warn(`[Groq Rate Limit 429] Cota excedida no ${currentCfg.name}. Alternando para ${nextCfg.name}...`);
          
          toast.warning(
            `Cota do ${currentCfg.name} temporariamente esgotada. Alternando automaticamente para ${nextCfg.name}...`,
            { duration: 6000 }
          );

          currentModel = fallback;
          continue;
        }
      }

      const errText = await response.text();
      throw new Error(`Erro na API Groq (${response.status}): ${errText}`);
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || "";
      if (attempts >= maxAttempts || !errorMsg.includes("429")) {
        throw err;
      }
    }
  }

  throw new Error("Todos os modelos de IA disponíveis atingiram o limite de requisições. Aguarde alguns instantes ou selecione outro modelo.");
}
