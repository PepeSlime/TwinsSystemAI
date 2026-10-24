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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { type, character_id, scope, total } = body;

    if (!type || !character_id) {
      return new Response(
        JSON.stringify({ error: "Parâmetros 'type' e 'character_id' são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica limite de orçamento diário
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: usageData } = await supabase
      .from("ai_usage")
      .select("est_cost")
      .eq("day", todayStr);

    const sumCost = (usageData || []).reduce(
      (acc: number, r: { est_cost: number }) => acc + (Number(r.est_cost) || 0),
      0
    );

    if (sumCost >= 2.0) {
      return new Response(
        JSON.stringify({ error: "Limite diário de IA atingido ($2.00)." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enfileira job
    const { data: job, error: insertError } = await supabase
      .from("jobs")
      .insert({
        type,
        character_id,
        scope: scope ?? {},
        status: "queued",
        progress: 0,
        total: total ?? 1,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ job }), {
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
