import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AVAILABLE_AI_MODELS,
  getActiveAiModel,
  setActiveAiModel,
  getModelConfig,
  getFallbackModel,
  executeGroqWithFallback,
} from "./ai-models";

describe("ai-models.ts", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("lists all available AI models with defined quota limits", () => {
    expect(AVAILABLE_AI_MODELS.length).toBeGreaterThanOrEqual(3);

    const gpt120 = AVAILABLE_AI_MODELS.find((m) => m.id === "openai/gpt-oss-120b");
    expect(gpt120).toBeDefined();
    expect(gpt120?.limits.rpm).toBe(30);
    expect(gpt120?.limits.tpm).toBe(8000);
    expect(gpt120?.limits.rpd).toBe(1000);

    const qwen = AVAILABLE_AI_MODELS.find((m) => m.id === "qwen/qwen3.8-27b");
    expect(qwen).toBeDefined();
    expect(qwen?.limits.rpm).toBe(60);

    const gpt20 = AVAILABLE_AI_MODELS.find((m) => m.id === "openai/gpt-oss-20b");
    expect(gpt20).toBeDefined();
    expect(gpt20?.limits.rpm).toBe(60);
  });

  it("gets and sets active AI model in localStorage", () => {
    expect(getActiveAiModel()).toBe("openai/gpt-oss-120b");

    setActiveAiModel("qwen/qwen3.8-27b");
    expect(getActiveAiModel()).toBe("qwen/qwen3.8-27b");

    setActiveAiModel("openai/gpt-oss-20b");
    expect(getActiveAiModel()).toBe("openai/gpt-oss-20b");
  });

  it("determines correct fallback model when quota is exhausted", () => {
    expect(getFallbackModel("openai/gpt-oss-120b")).toBe("qwen/qwen3.8-27b");
    expect(getFallbackModel("qwen/qwen3.8-27b")).toBe("openai/gpt-oss-20b");
    expect(getFallbackModel("openai/gpt-oss-20b")).toBe("openai/gpt-oss-120b");
  });

  it("falls back automatically to next model when receiving HTTP 429", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      callCount++;
      const body = JSON.parse((init?.body as string) || "{}");

      // Primeira chamada tenta openai/gpt-oss-120b e falha com 429
      if (body.model === "openai/gpt-oss-120b") {
        return {
          ok: false,
          status: 429,
          text: async () => "Rate limit exceeded (TPM/RPM)",
        };
      }

      // Segunda chamada com o fallback qwen/qwen3.8-27b é bem sucedida
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: { content: '{"status":"ok"}' },
            },
          ],
        }),
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await executeGroqWithFallback({
      apiKey: "test-api-key",
      messages: [{ role: "user", content: "ping" }],
      preferredModel: "openai/gpt-oss-120b",
    });

    expect(callCount).toBe(2);
    expect(result.wasFallback).toBe(true);
    expect(result.modelUsed).toBe("qwen/qwen3.8-27b");
    expect(result.content).toBe('{"status":"ok"}');
  });
});
