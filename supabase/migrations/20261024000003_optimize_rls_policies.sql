-- Ajuste de políticas RLS para evitar avaliações redundantes (Performance Advisor 0006)
DROP POLICY IF EXISTS "team read ai_usage" ON public.ai_usage;
DROP POLICY IF EXISTS "team write ai_usage" ON public.ai_usage;
CREATE POLICY "team all ai_usage" ON public.ai_usage FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "team read prompt_templates" ON public.prompt_templates;
DROP POLICY IF EXISTS "team write prompt_templates" ON public.prompt_templates;
CREATE POLICY "team all prompt_templates" ON public.prompt_templates FOR ALL USING (true) WITH CHECK (true);
