-- ─── MANGA_ANIMALES ──────────────────────────────────────────────────────────
-- Individual animals identified by EID (electronic tag).
-- Separate from the existing `animales` table which tracks group movements.

create table if not exists public.manga_animales (
  id                uuid        primary key default gen_random_uuid(),
  establecimiento_id uuid       references public.establecimientos(id) on delete cascade not null,
  eid               text        not null,
  vid               text,
  raza              text,
  sexo              text,
  fecha_nacimiento  date,
  lote              text,
  created_at        timestamptz not null default now(),
  unique (establecimiento_id, eid)
);

alter table public.manga_animales enable row level security;

create policy "manga_animales_select" on public.manga_animales for select
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "manga_animales_insert" on public.manga_animales for insert
  with check (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "manga_animales_update" on public.manga_animales for update
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "manga_animales_delete" on public.manga_animales for delete
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create index if not exists manga_animales_establecimiento_eid_idx on public.manga_animales(establecimiento_id, eid);

-- ─── MANGA_CAMPOS ─────────────────────────────────────────────────────────────
-- Configurable form fields for the manga session form.
-- Shared across all establecimientos (global config).

create table if not exists public.manga_campos (
  id          uuid    primary key default gen_random_uuid(),
  nombre      text    unique not null,
  etiqueta    text    not null,
  tipo        text    not null check (tipo in ('numero', 'texto', 'texto_largo', 'selector', 'escala', 'booleano')),
  opciones    jsonb,
  obligatorio boolean not null default false,
  activo      boolean not null default true,
  orden       integer not null default 0,
  ancho       text    not null default 'mitad' check (ancho in ('mitad', 'completo')),
  created_at  timestamptz not null default now()
);

alter table public.manga_campos enable row level security;

create policy "manga_campos_select" on public.manga_campos for select
  using (auth.role() = 'authenticated');

create policy "manga_campos_insert" on public.manga_campos for insert
  with check (auth.role() = 'authenticated');

create policy "manga_campos_update" on public.manga_campos for update
  using (auth.role() = 'authenticated');

create policy "manga_campos_delete" on public.manga_campos for delete
  using (auth.role() = 'authenticated');

-- Default fields
insert into public.manga_campos (nombre, etiqueta, tipo, opciones, obligatorio, activo, orden, ancho) values
  ('peso_kg',            'Peso vivo (kg)',     'numero',     null,                                                                     false, true, 1, 'mitad'),
  ('condicion_corporal', 'Condición corporal', 'escala',     '["1","1.5","2","2.5","3","3.5","4","4.5","5"]'::jsonb,                   false, true, 2, 'completo'),
  ('estado_sanitario',   'Estado sanitario',   'selector',   '["Sano","En tratamiento","Observación","Vacunado hoy"]'::jsonb,          false, true, 3, 'mitad'),
  ('vacuna',             'Vacuna aplicada',    'texto',      null,                                                                     false, true, 4, 'mitad'),
  ('antiparasitario',    'Antiparasitario',    'texto',      null,                                                                     false, true, 5, 'mitad'),
  ('observaciones',      'Observaciones',      'texto_largo',null,                                                                     false, true, 6, 'completo')
on conflict (nombre) do nothing;

-- ─── REGISTROS_MANGA ─────────────────────────────────────────────────────────
-- One record per animal per session. Extra fields stored in JSONB `datos`.

create table if not exists public.registros_manga (
  id                uuid    primary key default gen_random_uuid(),
  establecimiento_id uuid   references public.establecimientos(id) on delete cascade not null,
  animal_id         uuid    references public.manga_animales(id) on delete set null,
  eid               text    not null,
  fecha             date    not null default current_date,
  datos             jsonb   not null default '{}',
  usuario           text,
  created_at        timestamptz not null default now()
);

alter table public.registros_manga enable row level security;

create policy "registros_manga_select" on public.registros_manga for select
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "registros_manga_insert" on public.registros_manga for insert
  with check (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "registros_manga_update" on public.registros_manga for update
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "registros_manga_delete" on public.registros_manga for delete
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create index if not exists registros_manga_estab_fecha_idx on public.registros_manga(establecimiento_id, fecha);
create index if not exists registros_manga_eid_idx on public.registros_manga(eid);
