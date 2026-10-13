-- EST-18 / G9: RLS ownership por establecimiento (reemplaza USING (true) en tablas con estab_id)
-- Patrón manga: establecimiento_id IN (SELECT id FROM establecimientos WHERE user_id = auth.uid())
-- No toca policies manga_animales / registros_manga / animal_eventos / lotes huevos (ya scoped).

-- Helper expression reused via identical subselect (no function needed).

-- ── animales ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS animales_all ON public.animales;
CREATE POLICY animales_select ON public.animales FOR SELECT TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY animales_insert ON public.animales FOR INSERT TO authenticated
  WITH CHECK (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY animales_update ON public.animales FOR UPDATE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY animales_delete ON public.animales FOR DELETE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));

-- ── gastos ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS gastos_all ON public.gastos;
CREATE POLICY gastos_select ON public.gastos FOR SELECT TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY gastos_insert ON public.gastos FOR INSERT TO authenticated
  WITH CHECK (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY gastos_update ON public.gastos FOR UPDATE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY gastos_delete ON public.gastos FOR DELETE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));

-- ── insumos ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS insumos_all ON public.insumos;
CREATE POLICY insumos_select ON public.insumos FOR SELECT TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY insumos_insert ON public.insumos FOR INSERT TO authenticated
  WITH CHECK (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY insumos_update ON public.insumos FOR UPDATE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY insumos_delete ON public.insumos FOR DELETE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));

-- ── insumos_movimientos ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS authenticated_full_access ON public.insumos_movimientos;
CREATE POLICY insumos_movimientos_select ON public.insumos_movimientos FOR SELECT TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY insumos_movimientos_insert ON public.insumos_movimientos FOR INSERT TO authenticated
  WITH CHECK (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY insumos_movimientos_update ON public.insumos_movimientos FOR UPDATE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY insumos_movimientos_delete ON public.insumos_movimientos FOR DELETE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));

-- ── potreros ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS potreros_all ON public.potreros;
CREATE POLICY potreros_select ON public.potreros FOR SELECT TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY potreros_insert ON public.potreros FOR INSERT TO authenticated
  WITH CHECK (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY potreros_update ON public.potreros FOR UPDATE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY potreros_delete ON public.potreros FOR DELETE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));

-- ── prenez ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS prenez_all ON public.prenez;
CREATE POLICY prenez_select ON public.prenez FOR SELECT TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY prenez_insert ON public.prenez FOR INSERT TO authenticated
  WITH CHECK (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY prenez_update ON public.prenez FOR UPDATE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY prenez_delete ON public.prenez FOR DELETE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));

-- ── tareas ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS tareas_all ON public.tareas;
CREATE POLICY tareas_select ON public.tareas FOR SELECT TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY tareas_insert ON public.tareas FOR INSERT TO authenticated
  WITH CHECK (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY tareas_update ON public.tareas FOR UPDATE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));
CREATE POLICY tareas_delete ON public.tareas FOR DELETE TO authenticated
  USING (establecimiento_id IN (
    SELECT id FROM public.establecimientos WHERE user_id = auth.uid()
  ));

-- ── profiles: SELECT solo propio (antes USING true) ─────────────────────────
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ── establecimientos SELECT: solo propios (antes select_estab_compartido true)
DROP POLICY IF EXISTS select_estab_compartido ON public.establecimientos;
CREATE POLICY establecimientos_select_own ON public.establecimientos FOR SELECT TO authenticated
  USING (user_id = auth.uid());

COMMENT ON POLICY animales_select ON public.animales IS 'EST-18 G9 ownership';
COMMENT ON POLICY establecimientos_select_own ON public.establecimientos IS 'EST-18 G9 ownership (reemplaza select abierto)';
