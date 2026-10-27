-- Add summons JSONB column to characters table
ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS summons jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Migrate existing single summon data into the summons array if summons is empty
UPDATE public.characters
SET summons = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid(),
    'name', COALESCE(NULLIF(trim(summon_name), ''), 'Invocação 1'),
    'image_url', summon_image_url,
    'height_m', summon_height_m,
    'scale', summon_scale,
    'model_sheet_url', summon_model_sheet_url,
    'model_sheet_name', summon_model_sheet_name,
    'model_sheet_type', summon_model_sheet_type
  )
)
WHERE has_summon = true
  AND (summons IS NULL OR jsonb_array_length(summons) = 0)
  AND (summon_name IS NOT NULL OR summon_image_url IS NOT NULL OR summon_height_m IS NOT NULL OR summon_model_sheet_url IS NOT NULL);
