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

    // Busca agendamentos habilitados
    const { data: schedules, error } = await supabase
      .from("job_schedules")
      .select("*")
      .eq("enabled", true);

    if (error) throw error;

    const enqueued: string[] = [];
    const nowIso = new Date().toISOString();

    for (const sc of schedules || []) {
      // Dispara job de scrape para o agendamento
      const { data: job } = await supabase
        .from("jobs")
        .insert({
          type: "scrape",
          character_id: sc.character_id,
          scope: sc.scope ?? {},
          status: "queued",
          progress: 0,
          total: 1,
        })
        .select()
        .single();

      if (job) {
        enqueued.push(job.id);
        await supabase
          .from("job_schedules")
          .update({ last_run_at: nowIso })
          .eq("id", sc.id);
      }
    }

    return new Response(JSON.stringify({ dispatched: enqueued.length, jobs: enqueued }), {
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
