-- Add summon fields to characters table
ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS has_summon boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS summon_name text,
ADD COLUMN IF NOT EXISTS summon_image_url text,
ADD COLUMN IF NOT EXISTS summon_height_m numeric,
ADD COLUMN IF NOT EXISTS summon_scale numeric,
ADD COLUMN IF NOT EXISTS summon_model_sheet_url text,
ADD COLUMN IF NOT EXISTS summon_model_sheet_name text,
ADD COLUMN IF NOT EXISTS summon_model_sheet_type text;
