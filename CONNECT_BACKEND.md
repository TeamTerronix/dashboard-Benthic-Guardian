# Connect Dashboard (Vercel) to Backend (Render)

Backend URL: **https://backend-benthic-guardian.onrender.com**

---

## 1. Vercel (production dashboard)

1. Open [vercel.com](https://vercel.com) → your **dashboard** project.
2. **Settings** → **Environment Variables**.
3. Add or update:

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_API_URL` | `https://backend-benthic-guardian.onrender.com` |

   - No trailing slash.
   - Apply to **Production**, **Preview**, and **Development** if you use Vercel previews.

4. **Deployments** → **Redeploy** the latest production build (env vars only apply after rebuild).

5. Open your live dashboard → **Login** with a user that exists in Supabase (e.g. one you registered on Render `/docs`).

WebSocket alerts use `wss://` automatically when `NEXT_PUBLIC_API_URL` is `https://`.

---

## 2. Render (CORS — allow the dashboard to call the API)

Browsers block cross-origin requests unless the API allows your dashboard origin.

1. Render → **backend-benthic-guardian** (or your service) → **Environment**.
2. Set:

   ```env
   CORS_ORIGINS=https://YOUR-DASHBOARD.vercel.app
   ```

   Replace with your **exact** Vercel URL (copy from the browser address bar when the dashboard is open).

3. Optional — allow all Vercel preview URLs:

   ```env
   CORS_ORIGIN_REGEX=https://.*\.vercel\.app
   ```

4. **Save** and wait for redeploy (or manual deploy).

`http://localhost:3000` is already allowed by the backend for local dev.

---

## 3. Local development

`dashboard/.env.local` should contain:

```env
NEXT_PUBLIC_API_URL=https://backend-benthic-guardian.onrender.com
```

Or for a local backend:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Then:

```bash
cd dashboard
npm run dev
```

Open http://localhost:3000 and log in.

---

## 4. Quick test checklist

| Step | Check |
|------|--------|
| API health | https://backend-benthic-guardian.onrender.com/ → `"database":"ok"` |
| Register/login on API | https://backend-benthic-guardian.onrender.com/docs |
| Vercel env | `NEXT_PUBLIC_API_URL` set, project redeployed |
| Render CORS | `CORS_ORIGINS` includes your Vercel URL |
| Dashboard login | Works on production URL |

If login fails with a network/CORS error in the browser console:

- Fix `CORS_ORIGINS` on Render (most common).
- Confirm `NEXT_PUBLIC_API_URL` has no typo and no trailing `/`.

---

## 5. Architecture

```
Browser (Vercel dashboard)
    │  HTTPS  /auth/token, /sensors, …
    ▼
Render API (backend-benthic-guardian.onrender.com)
    │
    ▼
Supabase (Postgres)
```

---

## Related files

- `src/lib/api-base.ts` — reads `NEXT_PUBLIC_API_URL`
- `src/lib/auth.ts` — login via `POST /auth/token`
- `.env.example` — template for new developers
