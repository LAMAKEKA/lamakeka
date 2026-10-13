-- EST-14 / G8: alinear animales.categoria CHECK con CATEGORIAS_BOVINOS (src/lib/senasa.ts)
-- Libreta hacienda: Terneras / Novillitos fallaban el CHECK viejo.

ALTER TABLE public.animales
  DROP CONSTRAINT IF EXISTS animales_categoria_check;

ALTER TABLE public.animales
  ADD CONSTRAINT animales_categoria_check
  CHECK (categoria = ANY (ARRAY[
    'Terneros'::text,
    'Terneras'::text,
    'Novillos'::text,
    'Novillitos'::text,
    'Vacas'::text,
    'Vaquillonas'::text,
    'Toros'::text
  ]));

COMMENT ON CONSTRAINT animales_categoria_check ON public.animales IS
  'Alineado a CATEGORIAS_BOVINOS (EST-14 G8)';
