-- ─── ANIMALES ──────────────────────────────────────────────────────────────────

create table if not exists public.animales (
  id                uuid        primary key default gen_random_uuid(),
  establecimiento_id uuid       references public.establecimientos(id) on delete cascade not null,
  categoria         text        not null check (categoria in ('Terneros','Novillos','Vacas','Vaquillonas','Toros')),
  potrero           text        not null,
  cantidad          integer     not null check (cantidad >= 0),
  fecha             date        not null default current_date,
  responsable       text        not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.animales enable row level security;

create policy "animales_select" on public.animales for select
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "animales_insert" on public.animales for insert
  with check (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "animales_update" on public.animales for update
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "animales_delete" on public.animales for delete
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create index if not exists animales_establecimiento_id_idx on public.animales(establecimiento_id);

create trigger on_animales_updated
  before update on public.animales
  for each row execute procedure public.handle_updated_at();


-- ─── POTREROS ──────────────────────────────────────────────────────────────────

create table if not exists public.potreros (
  id                uuid        primary key default gen_random_uuid(),
  establecimiento_id uuid       references public.establecimientos(id) on delete cascade not null,
  nombre            text        not null,
  hectareas         numeric(10,2) not null check (hectareas > 0),
  estado            text        not null default 'activo' check (estado in ('activo','descanso','mantenimiento')),
  cabezas           integer     not null default 0 check (cabezas >= 0),
  categoria_animal  text,
  desde             date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.potreros enable row level security;

create policy "potreros_select" on public.potreros for select
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "potreros_insert" on public.potreros for insert
  with check (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "potreros_update" on public.potreros for update
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "potreros_delete" on public.potreros for delete
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create index if not exists potreros_establecimiento_id_idx on public.potreros(establecimiento_id);

create trigger on_potreros_updated
  before update on public.potreros
  for each row execute procedure public.handle_updated_at();


-- ─── INSUMOS ───────────────────────────────────────────────────────────────────

create table if not exists public.insumos (
  id                uuid        primary key default gen_random_uuid(),
  establecimiento_id uuid       references public.establecimientos(id) on delete cascade not null,
  nombre            text        not null,
  categoria         text        not null check (categoria in ('ALIMENTO','SANIDAD','INSUMOS AGRÍCOLAS','ESTRUCTURA')),
  inventario        numeric(12,2) not null default 0 check (inventario >= 0),
  unidad            text        not null,
  minimo            numeric(12,2) not null default 0 check (minimo >= 0),
  emoji             text        not null default '📦',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.insumos enable row level security;

create policy "insumos_select" on public.insumos for select
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "insumos_insert" on public.insumos for insert
  with check (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "insumos_update" on public.insumos for update
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "insumos_delete" on public.insumos for delete
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create index if not exists insumos_establecimiento_id_idx on public.insumos(establecimiento_id);

create trigger on_insumos_updated
  before update on public.insumos
  for each row execute procedure public.handle_updated_at();


-- ─── TAREAS ────────────────────────────────────────────────────────────────────

create table if not exists public.tareas (
  id                uuid        primary key default gen_random_uuid(),
  establecimiento_id uuid       references public.establecimientos(id) on delete cascade not null,
  titulo            text        not null,
  descripcion       text        not null default '',
  prioridad         text        not null default 'media' check (prioridad in ('alta','media','baja')),
  fecha_limite      date        not null,
  responsable       text        not null,
  completada        boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.tareas enable row level security;

create policy "tareas_select" on public.tareas for select
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "tareas_insert" on public.tareas for insert
  with check (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "tareas_update" on public.tareas for update
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "tareas_delete" on public.tareas for delete
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create index if not exists tareas_establecimiento_id_idx on public.tareas(establecimiento_id);
create index if not exists tareas_completada_idx on public.tareas(establecimiento_id, completada);

create trigger on_tareas_updated
  before update on public.tareas
  for each row execute procedure public.handle_updated_at();


-- ─── GASTOS ────────────────────────────────────────────────────────────────────

create table if not exists public.gastos (
  id                uuid        primary key default gen_random_uuid(),
  establecimiento_id uuid       references public.establecimientos(id) on delete cascade not null,
  concepto          text        not null,
  categoria         text        not null,
  tipo              text        not null check (tipo in ('ingreso','gasto')),
  monto             numeric(14,2) not null check (monto > 0),
  fecha             date        not null default current_date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.gastos enable row level security;

create policy "gastos_select" on public.gastos for select
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "gastos_insert" on public.gastos for insert
  with check (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "gastos_update" on public.gastos for update
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "gastos_delete" on public.gastos for delete
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create index if not exists gastos_establecimiento_id_idx on public.gastos(establecimiento_id);
create index if not exists gastos_fecha_idx on public.gastos(establecimiento_id, fecha desc);

create trigger on_gastos_updated
  before update on public.gastos
  for each row execute procedure public.handle_updated_at();
