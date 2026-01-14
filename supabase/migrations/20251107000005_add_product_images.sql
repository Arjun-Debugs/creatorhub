-- Add images array column to products table for multi-image support
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN public.products.images IS 'Array of image URLs for product gallery';
