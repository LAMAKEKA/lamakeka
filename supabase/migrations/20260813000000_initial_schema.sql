-- Esquema completo de La Makeka (regenerado desde el backup real)
-- Reemplaza las migraciones 001-004 que estaban desactualizadas

-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.handle_updated_at() OWNER TO postgres;

--
-- Name: animales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.animales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    categoria text NOT NULL,
    potrero text NOT NULL,
    cantidad integer NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    responsable text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    tipo text DEFAULT 'Ingreso'::text,
    deleted boolean DEFAULT false,
    CONSTRAINT animales_cantidad_check CHECK ((cantidad >= 0)),
    CONSTRAINT animales_categoria_check CHECK ((categoria = ANY (ARRAY['Terneros'::text, 'Novillos'::text, 'Vacas'::text, 'Vaquillonas'::text, 'Toros'::text])))
);


ALTER TABLE public.animales OWNER TO postgres;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tabla text NOT NULL,
    registro_id uuid NOT NULL,
    datos_anteriores jsonb,
    datos_nuevos jsonb,
    modificado_por uuid,
    modificado_por_nombre text,
    accion text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: establecimientos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.establecimientos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    nombre text NOT NULL,
    ubicacion text NOT NULL,
    tipo text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT establecimientos_tipo_check CHECK ((tipo = ANY (ARRAY['ganadero'::text, 'agricola'::text, 'mixto'::text])))
);


ALTER TABLE public.establecimientos OWNER TO postgres;

--
-- Name: gastos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gastos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    concepto text NOT NULL,
    categoria text NOT NULL,
    tipo text NOT NULL,
    monto numeric(14,2) NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT gastos_monto_check CHECK ((monto > (0)::numeric)),
    CONSTRAINT gastos_tipo_check CHECK ((tipo = ANY (ARRAY['ingreso'::text, 'gasto'::text])))
);


ALTER TABLE public.gastos OWNER TO postgres;

--
-- Name: insumos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insumos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    nombre text NOT NULL,
    categoria text NOT NULL,
    inventario numeric(12,2) DEFAULT 0 NOT NULL,
    unidad text NOT NULL,
    minimo numeric(12,2) DEFAULT 0 NOT NULL,
    emoji text DEFAULT '📦'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT insumos_categoria_check CHECK ((categoria = ANY (ARRAY['ALIMENTO'::text, 'SANIDAD'::text, 'INSUMOS AGRÍCOLAS'::text, 'ESTRUCTURA'::text]))),
    CONSTRAINT insumos_inventario_check CHECK ((inventario >= (0)::numeric)),
    CONSTRAINT insumos_minimo_check CHECK ((minimo >= (0)::numeric))
);


ALTER TABLE public.insumos OWNER TO postgres;

--
-- Name: insumos_movimientos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insumos_movimientos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid,
    insumo_id uuid,
    tipo text NOT NULL,
    cantidad numeric NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    motivo text,
    responsable text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT insumos_movimientos_tipo_check CHECK ((tipo = ANY (ARRAY['ingreso'::text, 'egreso'::text, 'ajuste'::text])))
);


ALTER TABLE public.insumos_movimientos OWNER TO postgres;

--
-- Name: manga_animales; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.manga_animales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    eid text NOT NULL,
    vid text,
    raza text,
    sexo text,
    fecha_nacimiento date,
    lote text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.manga_animales OWNER TO postgres;

--
-- Name: manga_campos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.manga_campos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    etiqueta text NOT NULL,
    tipo text NOT NULL,
    opciones jsonb,
    obligatorio boolean DEFAULT false NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    ancho text DEFAULT 'mitad'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT manga_campos_ancho_check CHECK ((ancho = ANY (ARRAY['mitad'::text, 'completo'::text]))),
    CONSTRAINT manga_campos_tipo_check CHECK ((tipo = ANY (ARRAY['numero'::text, 'texto'::text, 'texto_largo'::text, 'selector'::text, 'escala'::text, 'booleano'::text])))
);


ALTER TABLE public.manga_campos OWNER TO postgres;

--
-- Name: potreros; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.potreros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    nombre text NOT NULL,
    hectareas numeric(10,2) NOT NULL,
    estado text DEFAULT 'activo'::text NOT NULL,
    cabezas integer DEFAULT 0 NOT NULL,
    categoria_animal text,
    desde date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    latitud numeric,
    longitud numeric,
    CONSTRAINT potreros_cabezas_check CHECK ((cabezas >= 0)),
    CONSTRAINT potreros_estado_check CHECK ((estado = ANY (ARRAY['activo'::text, 'descanso'::text, 'mantenimiento'::text]))),
    CONSTRAINT potreros_hectareas_check CHECK ((hectareas > (0)::numeric))
);


ALTER TABLE public.potreros OWNER TO postgres;

--
-- Name: prenez; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prenez (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    potrero text NOT NULL,
    categoria text NOT NULL,
    fecha_diagnostico date NOT NULL,
    total_diagnosticadas integer NOT NULL,
    prenadas integer NOT NULL,
    vacias integer NOT NULL,
    dudosas integer DEFAULT 0,
    fecha_parto_estimada date,
    observaciones text,
    created_by uuid,
    created_by_nombre text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.prenez OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: registros_manga; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.registros_manga (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    animal_id uuid,
    eid text NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    datos jsonb DEFAULT '{}'::jsonb NOT NULL,
    usuario text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.registros_manga OWNER TO postgres;

--
-- Name: tareas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tareas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    establecimiento_id uuid NOT NULL,
    titulo text NOT NULL,
    descripcion text DEFAULT ''::text NOT NULL,
    prioridad text DEFAULT 'media'::text NOT NULL,
    fecha_limite date NOT NULL,
    responsable text NOT NULL,
    completada boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT tareas_prioridad_check CHECK ((prioridad = ANY (ARRAY['alta'::text, 'media'::text, 'baja'::text])))
);


ALTER TABLE public.tareas OWNER TO postgres;

--

-- Name: animales animales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT animales_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: establecimientos establecimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.establecimientos
    ADD CONSTRAINT establecimientos_pkey PRIMARY KEY (id);


--
-- Name: gastos gastos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT gastos_pkey PRIMARY KEY (id);


--
-- Name: insumos_movimientos insumos_movimientos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insumos_movimientos
    ADD CONSTRAINT insumos_movimientos_pkey PRIMARY KEY (id);


--
-- Name: insumos insumos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_pkey PRIMARY KEY (id);


--
-- Name: manga_animales manga_animales_establecimiento_id_eid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manga_animales
    ADD CONSTRAINT manga_animales_establecimiento_id_eid_key UNIQUE (establecimiento_id, eid);


--
-- Name: manga_animales manga_animales_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manga_animales
    ADD CONSTRAINT manga_animales_pkey PRIMARY KEY (id);


--
-- Name: manga_campos manga_campos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manga_campos
    ADD CONSTRAINT manga_campos_nombre_key UNIQUE (nombre);


--
-- Name: manga_campos manga_campos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manga_campos
    ADD CONSTRAINT manga_campos_pkey PRIMARY KEY (id);


--
-- Name: potreros potreros_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.potreros
    ADD CONSTRAINT potreros_pkey PRIMARY KEY (id);


--
-- Name: prenez prenez_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prenez
    ADD CONSTRAINT prenez_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: registros_manga registros_manga_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_manga
    ADD CONSTRAINT registros_manga_pkey PRIMARY KEY (id);


--
-- Name: tareas tareas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_pkey PRIMARY KEY (id);


--

-- Name: animales_establecimiento_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX animales_establecimiento_id_idx ON public.animales USING btree (establecimiento_id);


--
-- Name: establecimientos_user_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX establecimientos_user_id_unique ON public.establecimientos USING btree (user_id);


--
-- Name: gastos_establecimiento_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX gastos_establecimiento_id_idx ON public.gastos USING btree (establecimiento_id);


--
-- Name: gastos_fecha_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX gastos_fecha_idx ON public.gastos USING btree (establecimiento_id, fecha DESC);


--
-- Name: insumos_establecimiento_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX insumos_establecimiento_id_idx ON public.insumos USING btree (establecimiento_id);


--
-- Name: manga_animales_establecimiento_eid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX manga_animales_establecimiento_eid_idx ON public.manga_animales USING btree (establecimiento_id, eid);


--
-- Name: potreros_establecimiento_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX potreros_establecimiento_id_idx ON public.potreros USING btree (establecimiento_id);


--
-- Name: registros_manga_eid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX registros_manga_eid_idx ON public.registros_manga USING btree (eid);


--
-- Name: registros_manga_estab_fecha_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX registros_manga_estab_fecha_idx ON public.registros_manga USING btree (establecimiento_id, fecha);


--
-- Name: tareas_completada_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tareas_completada_idx ON public.tareas USING btree (establecimiento_id, completada);


--
-- Name: tareas_establecimiento_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tareas_establecimiento_id_idx ON public.tareas USING btree (establecimiento_id);


--
-- Name: animales on_animales_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_animales_updated BEFORE UPDATE ON public.animales FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: establecimientos on_establecimientos_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_establecimientos_updated BEFORE UPDATE ON public.establecimientos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: gastos on_gastos_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_gastos_updated BEFORE UPDATE ON public.gastos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: insumos on_insumos_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_insumos_updated BEFORE UPDATE ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: potreros on_potreros_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_potreros_updated BEFORE UPDATE ON public.potreros FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: tareas on_tareas_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER on_tareas_updated BEFORE UPDATE ON public.tareas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: animales animales_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT animales_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: animales animales_establecimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.animales
    ADD CONSTRAINT animales_establecimiento_id_fkey FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_modificado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_modificado_por_fkey FOREIGN KEY (modificado_por) REFERENCES auth.users(id);


--
-- Name: establecimientos establecimientos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.establecimientos
    ADD CONSTRAINT establecimientos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: gastos gastos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT gastos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: gastos gastos_establecimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gastos
    ADD CONSTRAINT gastos_establecimiento_id_fkey FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE;


--
-- Name: insumos insumos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: insumos insumos_establecimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_establecimiento_id_fkey FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE;


--
-- Name: insumos_movimientos insumos_movimientos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insumos_movimientos
    ADD CONSTRAINT insumos_movimientos_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: insumos_movimientos insumos_movimientos_establecimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insumos_movimientos
    ADD CONSTRAINT insumos_movimientos_establecimiento_id_fkey FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE;


--
-- Name: insumos_movimientos insumos_movimientos_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insumos_movimientos
    ADD CONSTRAINT insumos_movimientos_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id) ON DELETE CASCADE;


--
-- Name: manga_animales manga_animales_establecimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manga_animales
    ADD CONSTRAINT manga_animales_establecimiento_id_fkey FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE;


--
-- Name: potreros potreros_establecimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.potreros
    ADD CONSTRAINT potreros_establecimiento_id_fkey FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE;


--
-- Name: prenez prenez_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prenez
    ADD CONSTRAINT prenez_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: prenez prenez_establecimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prenez
    ADD CONSTRAINT prenez_establecimiento_id_fkey FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: registros_manga registros_manga_animal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_manga
    ADD CONSTRAINT registros_manga_animal_id_fkey FOREIGN KEY (animal_id) REFERENCES public.manga_animales(id) ON DELETE SET NULL;


--
-- Name: registros_manga registros_manga_establecimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.registros_manga
    ADD CONSTRAINT registros_manga_establecimiento_id_fkey FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE;


--
-- Name: tareas tareas_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: tareas tareas_establecimiento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tareas
    ADD CONSTRAINT tareas_establecimiento_id_fkey FOREIGN KEY (establecimiento_id) REFERENCES public.establecimientos(id) ON DELETE CASCADE;


--
-- Name: animales; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.animales ENABLE ROW LEVEL SECURITY;

--
-- Name: animales animales_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY animales_all ON public.animales TO authenticated USING (true) WITH CHECK (true);


--
-- Name: audit_log audit_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_insert ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_select ON public.audit_log FOR SELECT TO authenticated USING (true);


--
-- Name: insumos_movimientos authenticated_full_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_full_access ON public.insumos_movimientos TO authenticated USING (true) WITH CHECK (true);


--
-- Name: establecimientos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.establecimientos ENABLE ROW LEVEL SECURITY;

--
-- Name: gastos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

--
-- Name: gastos gastos_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gastos_all ON public.gastos TO authenticated USING (true) WITH CHECK (true);


--
-- Name: insumos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

--
-- Name: insumos insumos_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY insumos_all ON public.insumos TO authenticated USING (true) WITH CHECK (true);


--
-- Name: insumos_movimientos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.insumos_movimientos ENABLE ROW LEVEL SECURITY;

--
-- Name: manga_animales; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.manga_animales ENABLE ROW LEVEL SECURITY;

--
-- Name: manga_animales manga_animales_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY manga_animales_delete ON public.manga_animales FOR DELETE USING ((establecimiento_id IN ( SELECT establecimientos.id
   FROM public.establecimientos
  WHERE (establecimientos.user_id = auth.uid()))));


--
-- Name: manga_animales manga_animales_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY manga_animales_insert ON public.manga_animales FOR INSERT WITH CHECK ((establecimiento_id IN ( SELECT establecimientos.id
   FROM public.establecimientos
  WHERE (establecimientos.user_id = auth.uid()))));


--
-- Name: manga_animales manga_animales_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY manga_animales_select ON public.manga_animales FOR SELECT USING ((establecimiento_id IN ( SELECT establecimientos.id
   FROM public.establecimientos
  WHERE (establecimientos.user_id = auth.uid()))));


--
-- Name: manga_animales manga_animales_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY manga_animales_update ON public.manga_animales FOR UPDATE USING ((establecimiento_id IN ( SELECT establecimientos.id
   FROM public.establecimientos
  WHERE (establecimientos.user_id = auth.uid()))));


--
-- Name: manga_campos; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.manga_campos ENABLE ROW LEVEL SECURITY;

--
-- Name: manga_campos manga_campos_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY manga_campos_delete ON public.manga_campos FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: manga_campos manga_campos_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY manga_campos_insert ON public.manga_campos FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: manga_campos manga_campos_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY manga_campos_select ON public.manga_campos FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: manga_campos manga_campos_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY manga_campos_update ON public.manga_campos FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: potreros; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.potreros ENABLE ROW LEVEL SECURITY;

--
-- Name: potreros potreros_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY potreros_all ON public.potreros TO authenticated USING (true) WITH CHECK (true);


--
-- Name: prenez; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.prenez ENABLE ROW LEVEL SECURITY;

--
-- Name: prenez prenez_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY prenez_all ON public.prenez TO authenticated USING (true) WITH CHECK (true);


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));


--
-- Name: profiles profiles_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: profiles profiles_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: registros_manga; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.registros_manga ENABLE ROW LEVEL SECURITY;

--
-- Name: registros_manga registros_manga_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY registros_manga_delete ON public.registros_manga FOR DELETE USING ((establecimiento_id IN ( SELECT establecimientos.id
   FROM public.establecimientos
  WHERE (establecimientos.user_id = auth.uid()))));


--
-- Name: registros_manga registros_manga_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY registros_manga_insert ON public.registros_manga FOR INSERT WITH CHECK ((establecimiento_id IN ( SELECT establecimientos.id
   FROM public.establecimientos
  WHERE (establecimientos.user_id = auth.uid()))));


--
-- Name: registros_manga registros_manga_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY registros_manga_select ON public.registros_manga FOR SELECT USING ((establecimiento_id IN ( SELECT establecimientos.id
   FROM public.establecimientos
  WHERE (establecimientos.user_id = auth.uid()))));


--
-- Name: registros_manga registros_manga_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY registros_manga_update ON public.registros_manga FOR UPDATE USING ((establecimiento_id IN ( SELECT establecimientos.id
   FROM public.establecimientos
  WHERE (establecimientos.user_id = auth.uid()))));


--
-- Name: establecimientos select_estab_compartido; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY select_estab_compartido ON public.establecimientos FOR SELECT TO authenticated USING (true);


--
-- Name: tareas; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

--
-- Name: tareas tareas_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tareas_all ON public.tareas TO authenticated USING (true) WITH CHECK (true);


--
-- Name: establecimientos users_insert_own_establecimiento; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_insert_own_establecimiento ON public.establecimientos FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: establecimientos users_update_own_establecimiento; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_update_own_establecimiento ON public.establecimientos FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION handle_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_updated_at() TO anon;
GRANT ALL ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.handle_updated_at() TO service_role;


--
-- Name: TABLE animales; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.animales TO anon;
GRANT ALL ON TABLE public.animales TO authenticated;
GRANT ALL ON TABLE public.animales TO service_role;


--
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_log TO anon;
GRANT ALL ON TABLE public.audit_log TO authenticated;
GRANT ALL ON TABLE public.audit_log TO service_role;


--
-- Name: TABLE establecimientos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.establecimientos TO anon;
GRANT ALL ON TABLE public.establecimientos TO authenticated;
GRANT ALL ON TABLE public.establecimientos TO service_role;


--
-- Name: TABLE gastos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.gastos TO anon;
GRANT ALL ON TABLE public.gastos TO authenticated;
GRANT ALL ON TABLE public.gastos TO service_role;


--
-- Name: TABLE insumos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.insumos TO anon;
GRANT ALL ON TABLE public.insumos TO authenticated;
GRANT ALL ON TABLE public.insumos TO service_role;


--
-- Name: TABLE insumos_movimientos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.insumos_movimientos TO anon;
GRANT ALL ON TABLE public.insumos_movimientos TO authenticated;
GRANT ALL ON TABLE public.insumos_movimientos TO service_role;


--
-- Name: TABLE manga_animales; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.manga_animales TO anon;
GRANT ALL ON TABLE public.manga_animales TO authenticated;
GRANT ALL ON TABLE public.manga_animales TO service_role;


--
-- Name: TABLE manga_campos; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.manga_campos TO anon;
GRANT ALL ON TABLE public.manga_campos TO authenticated;
GRANT ALL ON TABLE public.manga_campos TO service_role;


--
-- Name: TABLE potreros; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.potreros TO anon;
GRANT ALL ON TABLE public.potreros TO authenticated;
GRANT ALL ON TABLE public.potreros TO service_role;


--
-- Name: TABLE prenez; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.prenez TO anon;
GRANT ALL ON TABLE public.prenez TO authenticated;
GRANT ALL ON TABLE public.prenez TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE registros_manga; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.registros_manga TO anon;
GRANT ALL ON TABLE public.registros_manga TO authenticated;
GRANT ALL ON TABLE public.registros_manga TO service_role;


--
-- Name: TABLE tareas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tareas TO anon;
GRANT ALL ON TABLE public.tareas TO authenticated;
GRANT ALL ON TABLE public.tareas TO service_role;


--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
