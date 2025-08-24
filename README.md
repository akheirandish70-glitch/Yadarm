# Yadarm (v10) — Auth + Sync
- Supabase Auth (email/password): ثبت‌نام، ورود، خروج، تغییر رمز (از «تنظیمات»).
- RLS: هر کاربر فقط داده‌های خودش را می‌بیند؛ داده‌ها بین تمام دستگاه‌ها سینک است.
- PWA + دارک‌مود.

## راه‌اندازی Supabase
1) در supabase.com یک پروژه بسازید. از Settings → API مقدار `Project URL` و `Anon Key` را بردارید.
2) در SQL Editor محتوای فایل `supabase.sql` این ریپو را اجرا کنید تا جدول‌ها و RLS ساخته شوند.
3) در محیط Vercel (Project → Settings → Environment Variables) دو مقدار زیر را اضافه کنید و Redeploy کنید:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon key

