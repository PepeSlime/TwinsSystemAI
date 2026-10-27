-- Adiciona coluna JSONB para armazenar fotos e imagens de referência extras do personagem
ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS reference_images jsonb NOT NULL DEFAULT '[]'::jsonb;
