
import './globals.css';
import { Vazirmatn } from 'next/font/google';
import RegisterSW from '@/components/RegisterSW';

export const metadata = {
  title: 'Yadarm',
  description: 'اپ PWA یادداشت‌ها با Supabase',
  themeColor: '#000000',
  manifest: '/manifest.json',
};

const vazirmatn = Vazirmatn({ subsets: ['arabic','latin'], variable: '--font-vazirmatn' });

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body>
        <main className="container max-w-xl py-6">{children}</main>
        <RegisterSW />
      </body>
    </html>
  );
}
