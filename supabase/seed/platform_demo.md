# Seed platform demo (EST-8 lab)

**Nunca** guardes el password en git, PR, Linear ni este archivo.

Email lab: `testprueba@gmail.com` (`PLATFORM_DEMO_EMAIL` en `src/lib/tenant/platformDemo.ts`).

## 1) Crear user (humano)

1. Supabase Dashboard → Authentication → Users → Add user  
   Project: `szffikjajxqxawxavshw`
2. Email: `testprueba@gmail.com`
3. Password: generá uno fuerte → guardalo en 1Password / chat privado **solo**.
4. Auto-confirm email si el proyecto lo pide.

## 2) Setup en la app

1. Login con ese user en https://lamakeka.vercel.app o localhost:3000
2. Debe caer en `/setup` (sin establecimiento)
3. Nombre display sugerido: `Campo Demo`
4. Tipo: **mixto** (o agrícola si querés nav sin manga por default de tipo)
5. Guardar → home

Post-Task 8 el insert ya setea `modules_enabled` / `rubros` / `is_platform_demo` si el email matchea.

## 3) SQL opcional (afinar demo nav)

SQL Editor: https://supabase.com/dashboard/project/szffikjajxqxawxavshw/sql/new

````sql
UPDATE public.establecimientos e
SET
  is_platform_demo = true,
  nombre_display = 'Campo Demo',
  tagline = 'Plataforma multi-rubro',
  logo_url = COALESCE(e.logo_url, '/logo-makeka.png'),
  modules_enabled = ARRAY[
    'inicio', 'agricola', 'hacienda', 'insumos', 'finanzas', 'reportes', 'tareas'
  ]::text[],
  rubros = ARRAY['ganaderia', 'agricola']::text[]
WHERE e.user_id = (
  SELECT id FROM auth.users WHERE email = 'testprueba@gmail.com' LIMIT 1
);
````

Notas:

- Sin `manga` / `senasa` / `potreros` en este array → bottom/sidebar demo distinto a Makeka.
- Makeka real **no** tocar: filtrar por email demo only.

## 4) Smoke

| User | Expect |
|------|--------|
| Makeka real | Nav legacy (manga, etc.) intacta |
| testprueba post-SQL | Ve Agrícola; no Manga/SENASA si no están en array |
| GET `/agricola` sin módulo | redirect `/` |

## 5) Status

- User demo creado en Auth: **no** (humano sigue este doc)
- SQL demo apply: **no**
