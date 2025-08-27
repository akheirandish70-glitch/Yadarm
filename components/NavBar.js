
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'فهرست' },
  { href: '/new', label: 'نویس' },
  { href: '/settings', label: 'تنظیمات' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-3 left-1/2 z-50 -translate-x-1/2">
      <div className="card flex items-center gap-2 px-3 py-2">
        {items.map(it => (
          <Link key={it.href} href={it.href} className={`btn ${pathname===it.href?'btn-primary':'btn-ghost'}`}>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
