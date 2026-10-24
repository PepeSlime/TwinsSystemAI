CREATE TABLE public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text,
  height_m numeric,
  scale numeric,
  anchored_ok boolean NOT NULL DEFAULT false,
  cancollide_ok boolean NOT NULL DEFAULT false,
  scale_ok boolean NOT NULL DEFAULT false,
  model_sheet_url text,
  model_sheet_name text,
  model_sheet_type text,
  status text NOT NULL DEFAULT 'modeling',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.characters TO anon, authenticated;
GRANT ALL ON public.characters TO service_role;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team read" ON public.characters FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team insert" ON public.characters FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "team update" ON public.characters FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "team delete" ON public.characters FOR DELETE TO anon, authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.characters;

CREATE POLICY "team files read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'characters');
CREATE POLICY "team files insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'characters');
CREATE POLICY "team files delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'characters');