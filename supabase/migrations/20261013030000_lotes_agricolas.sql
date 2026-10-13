-- EST-19: lotes agrícolas MVP
CREATE TABLE IF NOT EXISTS public.lotes_agricolas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establecimiento_id uuid NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  cultivo text,
  hectareas numeric(12, 2),
  estado text NOT NULL DEFAULT 'planificado',
  fecha_siembra date,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lotes_agricolas_nombre_check CHECK (char_length(btrim(nombre)) > 0),
  CONSTRAINT lotes_agricolas_hectareas_check CHECK (hectareas IS NULL OR hectareas >= 0),
  CONSTRAINT lotes_agricolas_estado_check CHECK (estado = ANY (ARRAY[
    'planificado'::text,
    'en_curso'::text,
    'cosechado'::text,
    'descanso'::text
  ]))
);

CREATE INDEX IF NOT EXISTS lotes_agricolas_estab_idx
  ON public.lotes_agricolas (establecimiento_id, created_at DESC);

ALTER TABLE public.lotes_agricolas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lotes_agricolas_select ON public.lotes_agricolas;
CREATE POLICY lotes_agricolas_select ON public.lotes_agricolas FOR SELECT TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS lotes_agricolas_insert ON public.lotes_agricolas;
CREATE POLICY lotes_agricolas_insert ON public.lotes_agricolas FOR INSERT TO authenticated
  WITH CHECK (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS lotes_agricolas_update ON public.lotes_agricolas;
CREATE POLICY lotes_agricolas_update ON public.lotes_agricolas FOR UPDATE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS lotes_agricolas_delete ON public.lotes_agricolas;
CREATE POLICY lotes_agricolas_delete ON public.lotes_agricolas FOR DELETE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));

GRANT ALL ON TABLE public.lotes_agricolas TO authenticated;
GRANT ALL ON TABLE public.lotes_agricolas TO service_role;

COMMENT ON TABLE public.lotes_agricolas IS 'EST-19 MVP lotes/cultivos — sin motor de cosecha';
