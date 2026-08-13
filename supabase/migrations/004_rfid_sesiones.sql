-- ─── MANGA_SESIONES ────────────────────────────────────────────────────────
-- Una "Sesión de lectura" agrupa los animales procesados durante una jornada
-- (ej. "Vacunación Agosto 2026").

create table if not exists public.manga_sesiones (
  id                uuid        primary key default gen_random_uuid(),
  establecimiento_id uuid       references public.establecimientos(id) on delete cascade not null,
  nombre            text        not null,
  fecha             date        not null default current_date,
  usuario           text,
  created_at        timestamptz not null default now()
);

alter table public.manga_sesiones enable row level security;

create policy "manga_sesiones_select" on public.manga_sesiones for select
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "manga_sesiones_insert" on public.manga_sesiones for insert
  with check (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "manga_sesiones_update" on public.manga_sesiones for update
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create policy "manga_sesiones_delete" on public.manga_sesiones for delete
  using (establecimiento_id in (select id from public.establecimientos where user_id = auth.uid()));

create index if not exists manga_sesiones_estab_idx on public.manga_sesiones(establecimiento_id, fecha);


-- ─── REGISTROS_MANGA extensiones ───────────────────────────────────────────
-- Agrega sesión, timestamp real de lectura, estado de sincronización y
-- clave de idempotencia (client_id) para soportar sincronización offline.

alter table public.registros_manga
  add column if not exists sesion_id  uuid references public.manga_sesiones(id) on delete set null,
  add column if not exists scanned_at timestamptz,
  add column if not exists sync_state text not null default 'sincronizado' check (sync_state in ('sincronizado','pendiente')),
  add column if not exists client_id  uuid;

create unique index if not exists registros_manga_client_id_idx
  on public.registros_manga (establecimiento_id, client_id)
  where client_id is not null;

create index if not exists registros_manga_sesion_id_idx on public.registros_manga(sesion_id);
create index if not exists registros_manga_sync_state_idx on public.registros_manga(sync_state);
