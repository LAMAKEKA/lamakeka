-- Tabla de establecimientos ganaderos
create table if not exists public.establecimientos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  nombre      text not null,
  ubicacion   text not null,
  tipo        text not null check (tipo in ('ganadero', 'agricola', 'mixto')),
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- Un usuario solo puede tener un establecimiento (por ahora)
create unique index if not exists establecimientos_user_id_unique
  on public.establecimientos(user_id);

-- Row Level Security
alter table public.establecimientos enable row level security;

-- Solo puede ver su propio establecimiento
create policy "users_select_own_establecimiento"
  on public.establecimientos for select
  using (auth.uid() = user_id);

-- Solo puede insertar su propio establecimiento
create policy "users_insert_own_establecimiento"
  on public.establecimientos for insert
  with check (auth.uid() = user_id);

-- Solo puede actualizar su propio establecimiento
create policy "users_update_own_establecimiento"
  on public.establecimientos for update
  using (auth.uid() = user_id);

-- Trigger para updated_at automático
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_establecimientos_updated
  before update on public.establecimientos
  for each row execute procedure public.handle_updated_at();
