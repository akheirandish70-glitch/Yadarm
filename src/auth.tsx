import React, { useState } from 'react'
import { supabase } from './supabase'
import { Check } from 'lucide-react'

export function AuthGate({ children }:{ children: React.ReactNode }) {
  const [session, setSession] = React.useState<any>(null)
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])
  if (!session) return <AuthScreen />
  return <>{children}</>
}

export function AuthScreen() {
  const [mode, setMode] = useState<'login'|'signup'>('login')
  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100" dir="rtl">
      <div className="w-[min(96%,420px)] rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">ورود به Yadarm</h1>
        <div className="flex items-center rounded-xl p-1 bg-neutral-100 dark:bg-neutral-700">
          <button onClick={()=>setMode('login')} className={`flex-1 h-10 rounded-lg ${mode==='login'?'bg-white dark:bg-neutral-800 shadow':''}`}>ورود</button>
          <button onClick={()=>setMode('signup')} className={`flex-1 h-10 rounded-lg ${mode==='signup'?'bg-white dark:bg-neutral-800 shadow':''}`}>ثبت‌نام</button>
        </div>
        {mode==='login'? <LoginForm/> : <SignupForm/>}
        <p className="text-xs text-neutral-500">بدون ورود، دسترسی به برنامه ممکن نیست.</p>
      </div>
    </div>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input dir="ltr" type="email" required placeholder="ایمیل" value={email} onChange={e=>setEmail(e.target.value)} className="h-11 rounded-xl border px-3 bg-transparent" />
      <input dir="ltr" type="password" required placeholder="رمز عبور" value={password} onChange={e=>setPassword(e.target.value)} className="h-11 rounded-xl border px-3 bg-transparent" />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <button disabled={loading} className="h-11 rounded-xl bg-neutral-900 text-white disabled:opacity-60">{loading?'درحال ورود...':'ورود'}</button>
      <button type="button" className="text-xs text-neutral-500" onClick={()=>alert('بازیابی رمز عبور به‌زودی افزوده می‌شود.')}>
        بازیابی رمز عبور (به‌زودی)
      </button>
    </form>
  )
}

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setMsg('ثبت‌نام انجام شد. اگر نیاز باشد ایمیل تأیید دریافت می‌کنید. سپس وارد شوید.')
    setLoading(false)
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input dir="ltr" type="email" required placeholder="ایمیل" value={email} onChange={e=>setEmail(e.target.value)} className="h-11 rounded-xl border px-3 bg-transparent" />
      <input dir="ltr" type="password" required placeholder="رمز عبور (حداقل ۶ کاراکتر)" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} className="h-11 rounded-xl border px-3 bg-transparent" />
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {msg && <div className="text-green-600 text-sm">{msg}</div>}
      <button disabled={loading} className="h-11 rounded-xl bg-neutral-900 text-white disabled:opacity-60">{loading?'ثبت‌نام...':'ثبت‌نام'}</button>
    </form>
  )
}

export function ChangePassword() {
  const [newPass, setNewPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  async function change() {
    setErr(''); setMsg(''); setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) setErr(error.message)
    else setMsg('رمز عبور با موفقیت تغییر کرد.')
    setLoading(false)
  }
  async function logout() { await supabase.auth.signOut() }
  return (
    <div className="grid gap-2">
      <label className="text-sm">تغییر رمز عبور</label>
      <input dir="ltr" type="password" placeholder="رمز جدید" minLength={6} value={newPass} onChange={e=>setNewPass(e.target.value)} className="h-11 rounded-xl border px-3 bg-transparent" />
      <div className="flex gap-2">
        <button disabled={loading || newPass.length<6} onClick={change} className="h-11 px-4 rounded-xl bg-neutral-900 text-white disabled:opacity-60">ثبت</button>
        <button type="button" onClick={logout} className="h-11 px-4 rounded-xl border">خروج از حساب</button>
      </div>
      {err && <div className="text-red-600 text-sm">{err}</div>}
      {msg && <div className="text-green-600 text-sm">{msg}</div>}
    </div>
  )
}
