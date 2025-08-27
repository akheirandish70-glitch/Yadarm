
# Yadarm — Next.js + Supabase (PWA)

این پروژه یک اپ PWA برای مدیریت یادداشت‌هاست:
- Auth با Supabase (ایمیل/رمز)
- فهرست + جستجو + فیلتر وضعیت
- ایجاد یادداشت + انتخاب/افزودن تگ
- تنظیمات: تغییر رمز عبور، حذف تگ‌ها
- PWA کامل: manifest, service worker, صفحه‌ی آفلاین

## راه‌اندازی
```bash
npm i
cp .env.example .env.local  # مقادیر Supabase را وارد کنید
npm run dev
```
### متغیرها
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## Supabase
SQL جداول و RLS در `supabase.sql` موجود است (در تب SQL اجرا کنید).

## دیپلوی در Vercel
- ریپو GitHub → Import در Vercel
- Environment Variables: URL/ANON_KEY
- Build و تمام

## PWA
- `public/manifest.json`
- `public/sw.js` (Cache-first برای استاتیک، Network-first برای HTML با fallback به `/offline`)
- صفحه‌ی `/offline`
- آیکن‌ها در `public/icons`

> روی HTTPS (مانند Vercel) Service Worker فعال می‌شود.
