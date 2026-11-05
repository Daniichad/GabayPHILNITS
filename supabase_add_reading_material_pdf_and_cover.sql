-- ==============================================================================
-- Migration: Add `cover_image_url` and `pdf_url` to `public.reading_materials`
-- ==============================================================================

-- 1. Ensure columns exist on `reading_materials`
ALTER TABLE public.reading_materials 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

ALTER TABLE public.reading_materials 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2. Add performance index on pdf_url
CREATE INDEX IF NOT EXISTS idx_reading_materials_pdf_url 
ON public.reading_materials(pdf_url);

-- ==============================================================================
-- 3. Optional: Set Verified Open-Access Book Cover Images and PDFs
-- ==============================================================================

-- Sample update for Strategy & IT Governance:
-- UPDATE public.reading_materials
-- SET cover_image_url = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
--     pdf_url = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
-- WHERE title ILIKE '%Corporate Strategy%';

-- Sample update for IT Legal Affairs & Compliance:
-- UPDATE public.reading_materials
-- SET cover_image_url = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=600&auto=format&fit=crop'
-- WHERE title ILIKE '%IT Legal Affairs%';
