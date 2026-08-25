-- =====================================================================
-- MIGRACIÓN: PERSISTENCIA DE LOGO_URL Y CONFIGURACIÓN DE STORAGE LOGOS
-- =====================================================================

-- 1. Agregar columna logo_url a la tabla instituciones
ALTER TABLE public.instituciones 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Asegurar la creación del bucket público 'logos' en Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Política de lectura pública para los objetos del bucket 'logos'
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Logos institucionales de acceso publico'
  ) THEN
    CREATE POLICY "Logos institucionales de acceso publico" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'logos');
  END IF;
END $$;
