-- Trazabilidad SENASA + gestión por potrero/categoría en manga.

ALTER TABLE public.establecimientos
  ADD COLUMN IF NOT EXISTS renspa text;

ALTER TABLE public.manga_animales
  ADD COLUMN IF NOT EXISTS potrero_id uuid,
  ADD COLUMN IF NOT EXISTS categoria text,
  ADD COLUMN IF NOT EXISTS fecha_aplicacion date,
  ADD COLUMN IF NOT EXISTS motivo_declaracion text;

ALTER TABLE public.manga_animales
  ADD CONSTRAINT manga_animales_potrero_id_fkey
  FOREIGN KEY (potrero_id) REFERENCES public.potreros(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS manga_animales_potrero_id_idx
  ON public.manga_animales USING btree (potrero_id);
