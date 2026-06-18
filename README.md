# Dashboard

IoT dashboard built with Next.js, TypeScript, Tailwind CSS, and map/analytics components.

**Connect to Render API:** see **[CONNECT_BACKEND.md](./CONNECT_BACKEND.md)**.

## Prerequisites

- Git
- Node.js 20+ (recommended LTS)
- npm 10+

## Clone The Repository

```bash
git clone https://github.com/TeamTerronix/dashboard.git
cd dashboard
```

## Install Dependencies

```bash
npm install
```

## API URL (dashboard + ESP32)

Create `.env.local` from `.env.example` and set **`NEXT_PUBLIC_API_URL`** to your FastAPI base URL **without a trailing slash** (same server that serves `POST /data`).

- Local backend: `http://127.0.0.1:8000`
- Production: your public `https://…` API origin

The dashboard calls `NEXT_PUBLIC_API_URL` for auth and data. ESP32 firmware **`POST`**s to **`{NEXT_PUBLIC_API_URL}/data`** with JSON `{"sensor_uid":"…","temperature":…}` only (timestamp is filled by the server). See `reciever_single_temp.ino` or `reciever_single_temp_wifi/` (same sketch).

## Run In Development

```bash
npm run dev
```

Then open:

http://localhost:3000

## Build For Production

```bash
npm run build
```

## Run Production Server

```bash
npm run start
```

## Lint

```bash
npm run lint
```

## Troubleshooting

- If dependency install fails, delete `node_modules` and `package-lock.json`, then run `npm install` again.
- If the port is busy, run on another port:

```bash
npm run dev -- -p 3001
```
