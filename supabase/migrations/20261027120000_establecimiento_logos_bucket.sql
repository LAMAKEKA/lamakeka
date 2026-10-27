-- Bucket público para logos de establecimientos (setup + Mi campo).
-- Path típico: {user_id}/{timestamp}.png
-- Idempotente.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'establecimiento-logos',
  'establecimiento-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lectura pública (logo en sidebar / header)
DROP POLICY IF EXISTS establecimiento_logos_public_read ON storage.objects;
CREATE POLICY establecimiento_logos_public_read
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'establecimiento-logos');

-- Subida solo a carpeta propia ({auth.uid}/...)
DROP POLICY IF EXISTS establecimiento_logos_owner_insert ON storage.objects;
CREATE POLICY establecimiento_logos_owner_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'establecimiento-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS establecimiento_logos_owner_update ON storage.objects;
CREATE POLICY establecimiento_logos_owner_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'establecimiento-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'establecimiento-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS establecimiento_logos_owner_delete ON storage.objects;
CREATE POLICY establecimiento_logos_owner_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'establecimiento-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
