# Branding por establecimiento (logo + colores)

## Qué hace

Al registrarse (`/setup`) y en **Mi campo** (`/config`) el productor puede:

1. **Subir logo** del campo → aparece en sidebar + header mobile.
2. **Elegir colores** (paletas o hex) → menú (`--color-campo`) y acentos (`--color-cuero`).

Makeka real sigue con `/logo-makeka.png` + paleta olivo por defecto.

## Cloud (Storage) — APPLY una vez

Proyecto: `szffikjajxqxawxavshw`

SQL Editor → pegar archivo:

`supabase/migrations/20261027120000_establecimiento_logos_bucket.sql`

Crea bucket público `establecimiento-logos` + policies por `auth.uid()` en carpeta.

Sin este APPLY, el alta del campo igual funciona; el upload de logo falla con mensaje claro y se puede reintentar en Mi campo.

## Code map

| Piece | Path |
|-------|------|
| Theme parse/CSS | `src/lib/tenant/brandTheme.ts` |
| Upload logo | `src/lib/tenant/uploadEstablecimientoLogo.ts` |
| Insert setup | `buildEstablecimientoInsert` + `logoUrl`/`brandTheme` |
| Shell apply | `app-shell.tsx` (`brandThemeCssVars` + root) |
| Logo UI | `src/components/brand-mark.tsx` |
| Setup form | `src/app/setup/page.tsx` |
| Mi campo | `src/app/config/page.tsx` sección Identidad |
| Migration | `20261027120000_establecimiento_logos_bucket.sql` |

## Tests

```bash
npm test -- --run src/lib/tenant/
npm run typecheck
```
