# Mi Vida — App de gestión personal

App mobile-first (Next.js + Supabase) con objetivos, hábitos (actividad/comida/peso/lectura),
economía (situación, registro mensual, tarjetas con lectura de resumen por IA, préstamos),
recordatorios, tenis y configuración. Modo claro/oscuro con 5 paletas.

---

## 1. Crear el proyecto en Supabase

1. Entrá a https://supabase.com → **New project**. Elegí nombre, contraseña de DB y región (South America / São Paulo es la más cercana).
2. Cuando esté listo, andá a **SQL Editor → New query**.
3. Copiá y pegá **todo** el contenido de `supabase/migrations/0001_init.sql` y dale **Run**.
   - Crea las 20 tablas, RLS por usuario, triggers, índices, los buckets de storage y la función de categorías iniciales.
   - Es idempotente: lo podés correr de nuevo sin romper nada.
4. Andá a **Project Settings → API** y copiá:
   - **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. (Opcional) En **Authentication → Providers → Email**, si querés entrar sin confirmar el mail, desactivá "Confirm email".

---

## 2. Correr localmente

```bash
npm install
cp .env.example .env.local
# editá .env.local con tus claves (ver abajo)
npm run dev
```

Abrí http://localhost:3000

### Variables de entorno (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
```

> **Importante sobre `ANTHROPIC_API_KEY`:** va **sin** el prefijo `NEXT_PUBLIC_`.
> Eso la mantiene del lado del servidor (las API routes `/api/parse-tarjeta` y
> `/api/estimar-calorias`). Nunca la pongas con `NEXT_PUBLIC_` ni la uses en
> componentes del cliente: quedaría visible en el navegador y cualquiera podría
> usarla a tu costo. La conseguís en https://console.anthropic.com

---

## 3. Subir a GitHub

```bash
git init
git add .
git commit -m "Mi Vida v1"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/mi-vida-app.git
git push -u origin main
```

`.gitignore` ya excluye `node_modules`, `.next` y los `.env`.

---

## 4. Deploy en Vercel

1. https://vercel.com → **Add New → Project** → importá el repo de GitHub.
2. Framework: **Next.js** (lo detecta solo). No cambies build settings.
3. En **Environment Variables** agregá las tres:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
4. **Deploy**.
5. En Supabase → **Authentication → URL Configuration**, agregá tu dominio de Vercel
   (ej. `https://mi-vida-app.vercel.app`) en **Site URL** y **Redirect URLs**.

---

## Notas

- **Backup:** Configuración → "Descargar backup (JSON)" baja todos tus datos. Hacelo seguido,
  sobre todo antes de cambios grandes.
- **Tarjetas:** subí el PDF de Naranja X o una foto del resumen Visa. La IA detecta consumos,
  cuotas (una fila por mes de impacto), y separa USD de ARS. Siempre revisás antes de importar.
- **Cálculos de peso/calorías:** son orientativos (fórmula Mifflin-St Jeor). No reemplazan
  consejo médico ni nutricional.
- **PWA:** podés "Agregar a inicio" desde Safari/iPhone para que funcione como app.
  Los íconos (`public/icon-192.png`, `public/icon-512.png`) los podés reemplazar por los tuyos.

## Stack

Next.js 14 (App Router) · Supabase (Postgres + Auth + Storage + RLS) · Tailwind ·
Recharts · Anthropic API (server-side) · Vercel.
