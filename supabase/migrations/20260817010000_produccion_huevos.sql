-- Producción de huevos: lotes, carga diaria, movimientos de plantel.

CREATE TABLE public.lotes_gallinas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    nombre text NOT NULL,
    cantidad integer NOT NULL,
    galpon text,
    fecha_alta date DEFAULT CURRENT_DATE NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT lotes_gallinas_pkey PRIMARY KEY (id),
    CONSTRAINT lotes_gallinas_cantidad_check CHECK ((cantidad >= 0)),
    CONSTRAINT lotes_gallinas_nombre_check CHECK ((char_length(btrim(nombre)) > 0)),
    CONSTRAINT lotes_gallinas_establecimiento_id_fkey
      FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE
);

CREATE TABLE public.produccion_huevos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    lote_id uuid NOT NULL,
    fecha date NOT NULL,
    maples integer NOT NULL,
    merma integer NOT NULL,
    observaciones text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT produccion_huevos_pkey PRIMARY KEY (id),
    CONSTRAINT produccion_huevos_maples_check CHECK ((maples >= 0)),
    CONSTRAINT produccion_huevos_merma_check CHECK ((merma >= 0)),
    CONSTRAINT produccion_huevos_lote_fecha_key UNIQUE (lote_id, fecha),
    CONSTRAINT produccion_huevos_establecimiento_id_fkey
      FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    CONSTRAINT produccion_huevos_lote_id_fkey
      FOREIGN KEY (lote_id) REFERENCES public.lotes_gallinas(id) ON DELETE RESTRICT
);

CREATE TABLE public.movimientos_gallinas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    lote_id uuid NOT NULL,
    tipo text NOT NULL,
    cantidad integer NOT NULL,
    fecha date NOT NULL,
    motivo text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT movimientos_gallinas_pkey PRIMARY KEY (id),
    CONSTRAINT movimientos_gallinas_tipo_check CHECK ((tipo = ANY (ARRAY['alta'::text, 'muerte'::text, 'venta'::text]))),
    CONSTRAINT movimientos_gallinas_cantidad_check CHECK ((cantidad > 0)),
    CONSTRAINT movimientos_gallinas_establecimiento_id_fkey
      FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE,
    CONSTRAINT movimientos_gallinas_lote_id_fkey
      FOREIGN KEY (lote_id) REFERENCES public.lotes_gallinas(id) ON DELETE RESTRICT
);

CREATE INDEX lotes_gallinas_estab_vivos_idx
  ON public.lotes_gallinas USING btree (establecimiento_id)
  WHERE (deleted_at IS NULL);

CREATE INDEX produccion_huevos_estab_fecha_idx
  ON public.produccion_huevos USING btree (establecimiento_id, fecha DESC);

CREATE INDEX movimientos_gallinas_estab_fecha_idx
  ON public.movimientos_gallinas USING btree (establecimiento_id, fecha DESC);

ALTER TABLE public.lotes_gallinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produccion_huevos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_gallinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY lotes_gallinas_select ON public.lotes_gallinas FOR SELECT
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY lotes_gallinas_insert ON public.lotes_gallinas FOR INSERT
  WITH CHECK ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY lotes_gallinas_update ON public.lotes_gallinas FOR UPDATE
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY lotes_gallinas_delete ON public.lotes_gallinas FOR DELETE
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));

CREATE POLICY produccion_huevos_select ON public.produccion_huevos FOR SELECT
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY produccion_huevos_insert ON public.produccion_huevos FOR INSERT
  WITH CHECK ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY produccion_huevos_update ON public.produccion_huevos FOR UPDATE
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY produccion_huevos_delete ON public.produccion_huevos FOR DELETE
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));

CREATE POLICY movimientos_gallinas_select ON public.movimientos_gallinas FOR SELECT
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY movimientos_gallinas_insert ON public.movimientos_gallinas FOR INSERT
  WITH CHECK ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY movimientos_gallinas_update ON public.movimientos_gallinas FOR UPDATE
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));
CREATE POLICY movimientos_gallinas_delete ON public.movimientos_gallinas FOR DELETE
  USING ((establecimiento_id IN (SELECT establecimientos.id FROM public.establecimientos WHERE (establecimientos.user_id = auth.uid()))));

GRANT ALL ON TABLE public.lotes_gallinas TO anon;
GRANT ALL ON TABLE public.lotes_gallinas TO authenticated;
GRANT ALL ON TABLE public.lotes_gallinas TO service_role;
GRANT ALL ON TABLE public.produccion_huevos TO anon;
GRANT ALL ON TABLE public.produccion_huevos TO authenticated;
GRANT ALL ON TABLE public.produccion_huevos TO service_role;
GRANT ALL ON TABLE public.movimientos_gallinas TO anon;
GRANT ALL ON TABLE public.movimientos_gallinas TO authenticated;
GRANT ALL ON TABLE public.movimientos_gallinas TO service_role;
