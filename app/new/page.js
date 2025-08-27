
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import NavBar from '@/components/NavBar';

export default function NewNotePage(){
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('todo');
  const [tags, setTags] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (!data.session) router.push('/login'); }); fetchTags(); }, [router]);

  async function fetchTags(){ const user = (await supabase.auth.getUser()).data.user; const { data } = await supabase.from('tags').select('*').eq('user_id', user.id).order('name'); setTags(data || []); }
  async function submit(){
    const user = (await supabase.auth.getUser()).data.user;
    const { data: note, error } = await supabase.from('notes').insert({ user_id: user.id, title, content, status }).select('*').single();
    if (error) { alert(error.message); return; }
    if (selected.length) { const rows = selected.map(tag_id => ({ note_id: note.id, tag_id })); await supabase.from('note_tags').insert(rows); }
    router.push('/');
  }
  async function createTagInline(name){
    name = (name || '').trim(); if (!name) return;
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase.from('tags').insert({ name, user_id: user.id }).select('*').single();
    if (!error) setTags([...(tags||[]), data]);
  }

  return (
    <div className="pb-24">
      <h1 className="text-lg font-bold mb-3">یادداشت جدید</h1>
      <div className="card p-3 space-y-3">
        <input placeholder="عنوان (اختیاری)" value={title} onChange={e=>setTitle(e.target.value)} />
        <textarea rows={6} placeholder="متن یادداشت را بنویسید..." value={content} onChange={e=>setContent(e.target.value)} />
        <div>
          <label className="block text-sm mb-1">وضعیت</label>
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="todo">باز</option>
            <option value="doing">درحال انجام</option>
            <option value="done">انجام شد</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">انتخاب تگ</label>
          <div className="chips">
            {tags.map(t => (
              <button key={t.id} className={`badge ${selected.includes(t.id)?'bg-black text-white':''}`} onClick={()=>setSelected(s=>s.includes(t.id)?s.filter(i=>i!==t.id):[...s,t.id])}>{t.name}</button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input id="newtag" placeholder="افزودن تگ..." className="flex-1" />
            <button className="btn btn-ghost" onClick={()=>createTagInline(document.getElementById('newtag').value)}>افزودن</button>
          </div>
        </div>
        <button className="btn btn-primary w-full" onClick={submit}>ثبت یادداشت</button>
      </div>
      <NavBar />
    </div>
  );
}
