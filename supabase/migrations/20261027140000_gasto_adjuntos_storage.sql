-- Adjuntos de gastos/ingresos (multi-archivo) + bucket privado Storage.
-- Path típico: {establecimiento_id}/{gasto_id}/{uuid}.{ext}
-- Idempotente.

-- ── Tabla ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gasto_adjuntos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establecimiento_id uuid NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
  gasto_id uuid NOT NULL REFERENCES public.gastos(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  nombre_original text NOT NULL,
  mime text NOT NULL,
  bytes integer NOT NULL CHECK (bytes > 0),
  bytes_original integer,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gasto_adjuntos_storage_path_unique UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS gasto_adjuntos_gasto_id_idx
  ON public.gasto_adjuntos (gasto_id);

CREATE INDEX IF NOT EXISTS gasto_adjuntos_establecimiento_id_idx
  ON public.gasto_adjuntos (establecimiento_id, created_at DESC);

ALTER TABLE public.gasto_adjuntos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gasto_adjuntos_select ON public.gasto_adjuntos;
CREATE POLICY gasto_adjuntos_select ON public.gasto_adjuntos
  FOR SELECT TO authenticated
  USING (
    establecimiento_id IN (
      SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS gasto_adjuntos_insert ON public.gasto_adjuntos;
CREATE POLICY gasto_adjuntos_insert ON public.gasto_adjuntos
  FOR INSERT TO authenticated
  WITH CHECK (
    establecimiento_id IN (
      SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS gasto_adjuntos_update ON public.gasto_adjuntos;
CREATE POLICY gasto_adjuntos_update ON public.gasto_adjuntos
  FOR UPDATE TO authenticated
  USING (
    establecimiento_id IN (
      SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    establecimiento_id IN (
      SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS gasto_adjuntos_delete ON public.gasto_adjuntos;
CREATE POLICY gasto_adjuntos_delete ON public.gasto_adjuntos
  FOR DELETE TO authenticated
  USING (
    establecimiento_id IN (
      SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
    )
  );

GRANT ALL ON TABLE public.gasto_adjuntos TO authenticated;
GRANT ALL ON TABLE public.gasto_adjuntos TO service_role;

-- ── Bucket privado (facturas / comprobantes) ────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gasto-adjuntos',
  'gasto-adjuntos',
  false,
  10485760, -- 10 MB post-compresión (cliente apunta a ≤8 MB)
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path folder[1] = establecimiento_id del dueño
DROP POLICY IF EXISTS gasto_adjuntos_storage_select ON storage.objects;
CREATE POLICY gasto_adjuntos_storage_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'gasto-adjuntos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.establecimientos WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS gasto_adjuntos_storage_insert ON storage.objects;
CREATE POLICY gasto_adjuntos_storage_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gasto-adjuntos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.establecimientos WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS gasto_adjuntos_storage_update ON storage.objects;
CREATE POLICY gasto_adjuntos_storage_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'gasto-adjuntos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.establecimientos WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'gasto-adjuntos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.establecimientos WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS gasto_adjuntos_storage_delete ON storage.objects;
CREATE POLICY gasto_adjuntos_storage_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'gasto-adjuntos'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.establecimientos WHERE user_id = auth.uid()
    )
  );
