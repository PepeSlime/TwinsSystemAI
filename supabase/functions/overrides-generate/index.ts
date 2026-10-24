import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const groqApiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("XAI_API_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { character_id, input_materials, part_hints, model_sheet_url, user_answer } = body;

    if (!character_id || !input_materials) {
      return new Response(
        JSON.stringify({ error: "character_id e input_materials são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: templateData } = await supabase
      .from("prompt_templates")
      .select("body")
      .eq("key", "overrides")
      .eq("active", true)
      .maybeSingle();

    const systemPrompt = templateData?.body || "Você é assistente gerador de OVERRIDES do Blender para texturas Roblox.";

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Materiais de Entrada:\n${input_materials}\n\nDicas de Partes:\n${part_hints || "Nenhuma dica informada."}\n${
          user_answer ? `\nResposta do usuário à dúvida anterior:\n${user_answer}` : ""
        }`,
      },
    ];

    const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        temperature: 0.1,
        messages,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error(`Falha na IA Groq: ${errText}`);
    }

    const json = await aiRes.json();
    const rawOutput = json.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ raw: rawOutput }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
