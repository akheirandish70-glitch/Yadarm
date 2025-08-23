# Minimal Notes (React + Vite + Tailwind, PWA, optional Supabase sync)

## Quick Deploy (no coding)
- **Vercel**: New Project → Upload → select this zip → Deploy.
- **Netlify**: Import from Git (or drag & drop the repo and let it build).

### Build settings (auto-detected)
- Build command: `npm run build`
- Publish directory: `dist`

### Optional: enable multi-device sync
1. Create a free project on Supabase.io
2. Copy Project URL and anon key into environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. In Supabase SQL editor, run:

```sql
create table if not exists public.tags (
  id text primary key,
  name text not null,
  color text not null
);
create table if not exists public.notes (
  id text primary key,
  text text not null,
  tagIds text[] not null default '{}',
  createdAt bigint not null
);
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.tags;
```

4. For a quick demo, you can disable RLS. For production, add Row-Level Security policies per user.

### PWA (Installable)
- Already configured (`@vite-pwa/plugin` + manifest). On Chrome/Android: *Add to Home Screen*. On iOS Safari: *Share → Add to Home Screen*. On desktop: install icon in the address bar.

## Local development
```bash
npm install
npm run dev
```
