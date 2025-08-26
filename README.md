
# Yadarm (React + Vite + Tailwind + Supabase)

## راه‌اندازی سریع
1) مقادیر زیر را در Vercel → Settings → Environment Variables بسازید (برای Production و Preview):
   - `VITE_SUPABASE_URL` = مقدار Project URL از Supabase
   - `VITE_SUPABASE_ANON_KEY` = مقدار anon key از Supabase (Project Settings → API)

2) Deploy کنید. سپس صفحه را باز کنید → ثبت‌نام (ایمیل/رمز) → وارد شوید.

## نکات
- نمایش «دفترچه»: حالت کارت/لیست، فیلتر تگ و وضعیت، جستجو (placeholder: «جستجو»).
- «بنویس»: وضعیت بالای فیلد، دکمه ثبت زیر فیلد سمت راست، افزودن تگ جدید + color picker سمت چپ، تگ‌های انتخاب‌شده زیر فیلد.
- «تنظیمات»: تغییر رمز عبور + مدیریت تگ‌ها (تغییر رنگ/حذف).
- ویرایش یادداشت: امکان حذف تگ از یادداشت و ذخیره.
- همه‌چیز RTL و بهینه برای فارسی.
