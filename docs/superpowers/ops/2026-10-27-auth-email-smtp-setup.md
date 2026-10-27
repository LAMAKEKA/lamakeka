# Auth email (confirm signup + recovery) — 2026-10-27

**Project:** `szffikjajxqxawxavshw`  
**App prod:** https://lamakeka.vercel.app  
**Goal:** quien se registra por mail recibe el correo, confirma, y aterriza en `/setup`.

**Status app:** PR código (resend + redirect helpers) en git.  
**Status cloud:** checklist humano abajo (Auth UI + SMTP).

---

## 1) URL Configuration (obligatorio)

Dashboard → **Authentication** → **URL Configuration**  
https://supabase.com/dashboard/project/szffikjajxqxawxavshw/auth/url-configuration

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://lamakeka.vercel.app` |
| **Redirect URLs** (una por línea / add) | ver lista |

Redirect URLs mínimas:

```
https://lamakeka.vercel.app/auth/callback
https://lamakeka.vercel.app/**
http://localhost:3000/auth/callback
http://localhost:3000/**
http://127.0.0.1:3000/auth/callback
http://127.0.0.1:3000/**
```

Si usás preview de Vercel del PR, sumá:

```
https://*.vercel.app/auth/callback
https://*.vercel.app/**
```

(Sin el dominio en allowlist el link del mail cae en “redirect not allowed”.)

---

## 2) Confirm email ON

Dashboard → **Authentication** → **Providers** → **Email**  
https://supabase.com/dashboard/project/szffikjajxqxawxavshw/auth/providers

- [ ] **Enable Email provider** = on  
- [ ] **Confirm email** = **ON** (usuarios nuevos deben confirmar)  
- [ ] Secure email change = on (recomendado)

Con Confirm ON: `signUp` **no** devuelve session → la app muestra “Revisá tu email” y el link del mail va a  
`/auth/callback?next=/setup` → setup del campo.

---

## 3) SMTP real (para que el mail LLEGUE)

El SMTP built-in de Supabase es de prueba: rate limit bajo y a menudo cae en spam o no llega.

Dashboard → **Project Settings** → **Authentication** → **SMTP Settings**  
(o **Auth** → **SMTP** según UI)  
https://supabase.com/dashboard/project/szffikjajxqxawxavshw/settings/auth

### Opción recomendada: Resend (gratis tier)

1. Cuenta en https://resend.com  
2. Verify domain (ideal: dominio propio del producto) **o** usar onboarding `onboarding@resend.dev` solo para lab.  
3. API key → SMTP:

| SMTP field | Valor típico Resend |
|------------|---------------------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) o `587` |
| User | `resend` |
| Pass | API key Resend |
| Sender email | `onboarding@resend.dev` (lab) o `noreply@tudominio.com` |
| Sender name | `La Makeka` |

- [ ] Enable custom SMTP  
- [ ] Save  
- [ ] **No** pegar la API key en git / PR / Linear

### Alternativa: Brevo / Mailgun / SendGrid

Mismo panel; host/user/pass del proveedor. Sender verificado.

---

## 4) Templates de mail (ES)

Dashboard → **Authentication** → **Email Templates**  
https://supabase.com/dashboard/project/szffikjajxqxawxavshw/auth/templates

### Confirm signup

**Subject:** Confirmá tu cuenta — La Makeka

**Body (HTML simple):**

```html
<h2>Bienvenido/a a La Makeka</h2>
<p>Hola {{ .Data.nombre }},</p>
<p>Confirmá tu email para configurar tu establecimiento (ganadero, agrícola o mixto).</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar email y continuar</a></p>
<p>Si no creaste esta cuenta, ignorá este mensaje.</p>
```

Importante: el link debe ser **`{{ .ConfirmationURL }}`** (Supabase arma el token).  
No hardcodear solo Site URL sin el token.

### Reset password

**Subject:** Restablecer contraseña — La Makeka

```html
<h2>Restablecer contraseña</h2>
<p>Pediste cambiar la contraseña de La Makeka.</p>
<p><a href="{{ .ConfirmationURL }}">Elegir nueva contraseña</a></p>
<p>Si no fuiste vos, ignorá este mail.</p>
```

---

## 5) Flujo esperado (app)

1. `/register` → signUp con `emailRedirectTo` = `{origin}/auth/callback?next=/setup`  
2. Sin session → pantalla “Revisá tu email” + **Reenviar**  
3. Click en mail → `/auth/callback` → user sin estab → **`/setup`**  
4. Completa nombre + tipo → home  
5. Login con email no confirmado → error + **Reenviar confirmación**  
6. Forgot password → recovery → `/reset-password`

Código: `src/lib/auth/emailRedirect.ts`, register/login/forgot-password.

---

## 6) Smoke checklist (humano)

| Paso | OK? |
|------|-----|
| Site URL = prod | |
| Redirect URLs incluyen prod + localhost callback | |
| Confirm email ON | |
| Custom SMTP enabled + test send | |
| Register email real → mail llega &lt; 2 min | |
| Link → `/setup` | |
| Resend desde pantalla success | |
| Login sin confirmar → botón reenviar | |
| Forgot password mail llega | |

---

## 7) Auth logs si no llega

https://supabase.com/dashboard/project/szffikjajxqxawxavshw/auth/users  
+ **Logs** del proyecto (Auth): buscar `mail` / rate limit / SMTP error.

Rate limit built-in: pocos mails/hora. Con SMTP custom sube el cupo del proveedor.

---

## No hacer

- No desactivar confirm “para que ande” en prod sin decisión de producto.  
- No poner service_role ni SMTP pass en el repo.  
- No usar Site URL = localhost en prod (rompe links del mail en el celu).
