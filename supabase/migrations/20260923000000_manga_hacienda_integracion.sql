-- Integración manga ↔ hacienda: estado del animal + eventos individuales
-- PRD: docs/superpowers/specs/2026-09-23-manga-hacienda-integracion-prd.md
-- RLS: mismo patrón que manga_animales / registros_manga (establecimiento.user_id = auth.uid())

ALTER TABLE public.manga_animales
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'manga_animales_estado_check'
  ) THEN
    ALTER TABLE public.manga_animales
      ADD CONSTRAINT manga_animales_estado_check
      CHECK (estado = ANY (ARRAY[
        'activo'::text,
        'sin_ubicar'::text,
        'vendido'::text,
        'muerto'::text,
        'transferido'::text,
        'baja'::text
      ]));
  END IF;
END $$;

-- Sin potrero y aún "activo" por default → sin_ubicar
UPDATE public.manga_animales
SET estado = 'sin_ubicar'
WHERE potrero_id IS NULL
  AND estado = 'activo';

CREATE INDEX IF NOT EXISTS manga_animales_estado_idx
  ON public.manga_animales (establecimiento_id, estado);

CREATE INDEX IF NOT EXISTS manga_animales_estab_potrero_estado_idx
  ON public.manga_animales (establecimiento_id, potrero_id, estado);

CREATE TABLE IF NOT EXISTS public.animal_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establecimiento_id uuid NOT NULL REFERENCES public.establecimientos(id) ON DELETE CASCADE,
  animal_id uuid NOT NULL REFERENCES public.manga_animales(id) ON DELETE CASCADE,
  eid text NOT NULL,
  tipo text NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  usuario text,
  created_by uuid,
  sesion_id uuid,
  registro_manga_id uuid REFERENCES public.registros_manga(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT animal_eventos_tipo_check CHECK (tipo = ANY (ARRAY[
    'alta'::text,
    'cambio_potrero'::text,
    'cambio_categoria'::text,
    'venta'::text,
    'muerte'::text,
    'transferencia_salida'::text,
    'observacion'::text,
    'peso'::text,
    'sanidad'::text,
    'prenez'::text,
    'otro'::text
  ]))
);

CREATE INDEX IF NOT EXISTS animal_eventos_animal_fecha_idx
  ON public.animal_eventos (establecimiento_id, animal_id, fecha DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS animal_eventos_eid_idx
  ON public.animal_eventos (establecimiento_id, eid);

ALTER TABLE public.animal_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS animal_eventos_select ON public.animal_eventos;
CREATE POLICY animal_eventos_select ON public.animal_eventos
  FOR SELECT
  USING (
    establecimiento_id IN (
      SELECT establecimientos.id
      FROM public.establecimientos
      WHERE establecimientos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS animal_eventos_insert ON public.animal_eventos;
CREATE POLICY animal_eventos_insert ON public.animal_eventos
  FOR INSERT
  WITH CHECK (
    establecimiento_id IN (
      SELECT establecimientos.id
      FROM public.establecimientos
      WHERE establecimientos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS animal_eventos_update ON public.animal_eventos;
CREATE POLICY animal_eventos_update ON public.animal_eventos
  FOR UPDATE
  USING (
    establecimiento_id IN (
      SELECT establecimientos.id
      FROM public.establecimientos
      WHERE establecimientos.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS animal_eventos_delete ON public.animal_eventos;
CREATE POLICY animal_eventos_delete ON public.animal_eventos
  FOR DELETE
  USING (
    establecimiento_id IN (
      SELECT establecimientos.id
      FROM public.establecimientos
      WHERE establecimientos.user_id = auth.uid()
    )
  );

COMMENT ON COLUMN public.manga_animales.estado IS
  'activo|sin_ubicar cuentan en stock EID; vendido|muerto|transferido|baja no';

COMMENT ON TABLE public.animal_eventos IS
  'Timeline de eventos individuales (alta, movimientos, egresos, sanidad)';
