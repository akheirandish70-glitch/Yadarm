
'use client';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [mode, setMode] = useState('login');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.push('/'); });
  }, [router]);

  const handleAuth = async (e) => {
    e.preventDefault(); setErr('');
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      router.push('/');
    } catch (error) { setErr(error.message); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <form onSubmit={handleAuth} className="card w-full max-w-md p-6">
        <h1 className="text-xl font-bold text-center">Yadarm</h1>
        <p className="mt-1 text-center text-sm text-gray-600">برای ورود ایمیل و رمز عبور خود را وارد کنید.</p>
        <div className="mt-6 space-y-3">
          <input type="email" placeholder="example@gmail.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input type="password" placeholder="******" value={password} onChange={e=>setPassword(e.target.value)} required />
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button type="submit" className="btn btn-primary w-full">{mode==='login'?'ورود':'ثبت‌نام'}</button>
          <button type="button" className="btn w-full" onClick={()=>setMode(mode==='login'?'signup':'login')}>
            {mode==='login'?'حساب ندارید؟ ثبت‌نام کنید':'حساب دارید؟ وارد شوید'}
          </button>
        </div>
      </form>
    </div>
  );
}
