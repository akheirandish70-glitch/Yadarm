
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import NavBar from '@/components/NavBar';

export default function SettingsPage(){
  const router = useRouter();
  const [pwd, setPwd] = useState('');
  const [tags, setTags] = useState([]);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (!data.session) router.push('/login'); }); fetchTags(); }, [router]);
  async function fetchTags(){ const user = (await supabase.auth.getUser()).data.user; const { data } = await supabase.from('tags').select('*').eq('user_id', user.id).order('name'); setTags(data || []); }
  async function changePassword(){ if (pwd.length < 6) return alert('رمز عبور حداقل ۶ کاراکتر.'); const { error } = await supabase.auth.updateUser({ password: pwd }); if (error) return alert(error.message); alert('رمز عبور تغییر کرد.'); setPwd(''); }
  async function removeTag(id){ if (!confirm('حذف این تگ؟')) return; await supabase.from('note_tags').delete().eq('tag_id', id); await supabase.from('tags').delete().eq('id', id); fetchTags(); }

  return (
    <div className="pb-24">
      <h1 className="text-lg font-bold mb-3">تنظیمات</h1>
      <div className="card p-3 space-y-3">
        <div>
          <label className="block text-sm mb-1">تغییر رمز عبور</label>
          <div className="flex gap-2">
            <input type="password" className="flex-1" placeholder="رمز جدید" value={pwd} onChange={e=>setPwd(e.target.value)} />
            <button className="btn btn-primary" onClick={changePassword}>اعمال</button>
          </div>
        </div>
        <hr />
        <div>
          <label className="block text-sm mb-2">مدیریت تگ‌ها</label>
          <div className="grid gap-2">
            {tags.map(t => (
              <div key={t.id} className="flex items-center justify-between border rounded-xl px-3 py-2">
                <span>{t.name}</span>
                <button className="btn btn-ghost text-red-600" onClick={()=>removeTag(t.id)}>حذف</button>
              </div>
            ))}
            {!tags.length && <p className="text-sm text-gray-600">تگی موجود نیست.</p>}
          </div>
        </div>
      </div>
      <NavBar />
    </div>
  );
}
