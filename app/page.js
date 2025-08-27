
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import NoteCard from '@/components/NoteCard';
import NavBar from '@/components/NavBar';

export default function Home() {
  const router = useRouter();
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login'); else fetchData();
    });
  }, [router]);

  async function fetchData(){
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { data: allTags } = await supabase.from('tags').select('*').eq('user_id', user.id).order('name');
    setTags(allTags || []);
    const { data: rows } = await supabase
      .from('notes')
      .select('*, note_tags(tag_id), tags:note_tags(tag_id, tags(name,id))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const hydrated = (rows || []).map(n => ({ ...n, tags: (n.tags || []).map(t => t.tags) }));
    setNotes(hydrated); setLoading(false);
  }

  const filtered = useMemo(() => {
    let arr = notes;
    if (status !== 'all') arr = arr.filter(n => n.status === status);
    if (q.trim()) {
      const t = q.trim();
      arr = arr.filter(n =>
        (n.title || '').includes(t) ||
        (n.content || '').includes(t) ||
        (n.tags || []).some(tag => (tag?.name || '').includes(t))
      );
    }
    return arr;
  }, [notes, status, q]);

  async function toggleStatus(note){
    const next = note.status === 'todo' ? 'doing' : note.status === 'doing' ? 'done' : 'todo';
    await supabase.from('notes').update({ status: next }).eq('id', note.id);
    fetchData();
  }
  async function remove(note){
    if (!confirm('حذف شود؟')) return;
    await supabase.from('notes').delete().eq('id', note.id);
    fetchData();
  }

  if (loading) return <p className="p-6">در حال بارگذاری...</p>;

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Yadarm</h1>
        <button className="btn btn-ghost" onClick={async()=>{ await supabase.auth.signOut(); router.push('/login'); }}>خروج</button>
      </header>

      <section className="card p-3 space-y-3">
        <input placeholder="جستجو در یادداشت‌ها..." value={q} onChange={e=>setQ(e.target.value)} />
        <div className="chips">
          {[{k:'all',l:'همه'},{k:'todo',l:'باز'},{k:'doing',l:'درحال انجام'},{k:'done',l:'انجام شد'}].map(it => (
            <button key={it.k} className={`badge ${status===it.k?'bg-black text-white':''}`} onClick={()=>setStatus(it.k)}>{it.l}</button>
          ))}
        </div>
      </section>

      <div className="mt-4 grid gap-3">
        {filtered.map(n => (<NoteCard key={n.id} note={n} onToggleStatus={toggleStatus} onDelete={remove} />))}
        {!filtered.length && <p className="text-sm text-gray-600">یادداشتی پیدا نشد.</p>}
      </div>

      <NavBar />
    </div>
  );
}
