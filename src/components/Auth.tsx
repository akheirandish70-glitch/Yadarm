
import React, { useState } from 'react';
import { supabase } from '../supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login'|'signup'>('login');
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      location.reload();
    } catch (err:any) {
      setError(err.message || 'خطا در احراز هویت');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow p-6" dir="rtl">
        <h1 className="text-xl font-bold mb-2 text-right">Yadarm</h1>
        <p className="text-sm text-neutral-500 mb-4 text-right">برای ورود ایمیل و رمز عبور خود را وارد کنید.</p>
        <form onSubmit={submit} className="grid gap-3">
          <input dir="ltr" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ایمیل" className="h-11 px-3 rounded-2xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"/>
          <input dir="ltr" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="رمز عبور" className="h-11 px-3 rounded-2xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"/>
          {error && <div className="text-sm text-red-600 text-right">{error}</div>}
          <button disabled={loading} className="h-11 rounded-2xl bg-neutral-900 text-white">{loading ? '...' : (mode==='login' ? 'ورود' : 'ثبت‌نام')}</button>
        </form>
        <div className="mt-4 text-sm text-right">
          {mode==='login' ? (
            <button onClick={()=>setMode('signup')} className="underline">حساب ندارید؟ ثبت‌نام</button>
          ) : (
            <button onClick={()=>setMode('login')} className="underline">قبلا ثبت‌نام کرده‌اید؟ ورود</button>
          )}
        </div>
      </div>
    </div>
  );
}
