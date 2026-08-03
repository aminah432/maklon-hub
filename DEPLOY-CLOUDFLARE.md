# Deploy Maklon Control Center ke Cloudflare Workers

Aplikasi ini (TanStack Start + Nitro) sudah otomatis mem-build output
Cloudflare Worker. Tidak perlu adapter tambahan.

## 1. Hasil build

`bun run build` menghasilkan:

- `dist/server/index.mjs` — kode Worker (SSR + server functions)
- `dist/client/` — aset statis (di-bind sebagai `ASSETS`)
- `dist/server/wrangler.json` — konfigurasi Worker (dibuat otomatis:
  `compatibility_flags: ["nodejs_compat"]`, assets binding, nama worker)
- `.wrangler/deploy/config.json` — mengarahkan perintah `wrangler deploy`
  ke config di atas, jadi cukup jalankan `wrangler deploy` dari root.

Jangan membuat `wrangler.toml` sendiri di root — file itu akan bentrok
dengan config yang dihasilkan Nitro.

## 2. Deploy dari komputer (CLI)

```bash
bun install
bunx wrangler login
bun run deploy          # = vite build && wrangler deploy
```

Preview lokal pakai runtime Workers asli:

```bash
bun run cf:preview      # = vite build && wrangler dev
```

## 3. Deploy via Cloudflare Dashboard (Workers Builds / Git)

Cloudflare Dashboard → **Workers & Pages** → **Create** → **Import a repository**
(pilih repo GitHub project ini), lalu isi:

| Field | Isi |
|---|---|
| Project / Worker name | `maklon-control-center` |
| Production branch | `main` |
| **Build command** | `bun run build` |
| **Deploy command** | `bunx wrangler deploy` |
| **Build output directory** | `dist/client` |
| Root directory | `/` (kosongkan) |
| Package manager | Bun (atau npm: `npm ci && npm run build`) |

Kalau memakai npm bukan bun:
- Build command: `npm install && npm run build`
- Deploy command: `npx wrangler deploy`

Catatan: Worker name diambil dari `name` di `package.json`
(`maklon-control-center`). Ubah di sana kalau mau nama lain.

## 4. Environment variables (WAJIB)

Ada dua jenis. Isi **keduanya**.

### a. Build-time (dibutuhkan Vite saat build, prefix `VITE_`)

Di Cloudflare: Settings → **Build** → *Build variables and secrets*.
Kalau deploy dari lokal, cukup ada di file `.env`.

```
VITE_SUPABASE_URL=<URL backend>
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
VITE_SUPABASE_PROJECT_ID=<project id>
```

### b. Runtime (dibaca Worker lewat `process.env`)

Di Cloudflare: Settings → **Variables and Secrets** (scope: Production).

```
SUPABASE_URL=<URL backend>
SUPABASE_PUBLISHABLE_KEY=<publishable key>
SUPABASE_PROJECT_ID=<project id>
```

Jika nanti ada fitur yang butuh service role, tambahkan sebagai
**Secret** (bukan plain text): `SUPABASE_SERVICE_ROLE_KEY`.

Nilai semuanya sama persis dengan yang ada di file `.env` project ini.

Untuk `wrangler dev` lokal, taruh runtime vars di file `.dev.vars`
(sudah di-gitignore):

```
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
```

## 5. Setelah deploy

1. Worker aktif di `https://maklon-control-center.<subdomain>.workers.dev`.
2. Tambahkan URL itu (dan custom domain kalau ada) ke daftar
   **Redirect URLs** / **Site URL** di pengaturan Auth backend, supaya
   login & OAuth tidak ditolak.
3. Custom domain: Worker → Settings → **Domains & Routes** → Add custom domain.

## 6. Troubleshooting

- **`nodejs_compat` error** — pastikan deploy memakai
  `dist/server/wrangler.json` hasil build, bukan config manual.
- **Halaman putih / 500 di semua route** — cek Worker Logs
  (Observability → Logs). Wrapper SSR di `src/server.ts` sudah
  mencetak stack error asli ke sana.
- **Login gagal setelah deploy** — variabel `VITE_*` belum diisi saat
  build, sehingga client bundle tidak punya URL backend. Isi build
  variables lalu re-deploy.
- **Deploy ditolak karena ukuran** — Worker gratis dibatasi 3 MB
  (gzip). Build ini di bawah batas; hindari menambah dependency berat.
