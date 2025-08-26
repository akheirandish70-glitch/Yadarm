
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';
import Auth from './components/Auth';
import type { Note, Tag, Status } from './types';
import { Plus, Tag as TagIcon, Trash2, LayoutGrid, List, Filter, X, Search, Settings, Pencil, Check, LogOut, Moon, Sun } from "lucide-react";

const STATUS_ORDER: Status[] = ['action','plan','done'];
const STATUS_LABEL: Record<Status, string> = { action: 'اکشن', plan: 'پلن', done: 'اتمام' };

const uid = () => Math.random().toString(36).slice(2,10);
const formatDate = (iso: string) => new Date(iso).toLocaleString('fa-IR');

export default function App(){
  const [sessionChecked, setSessionChecked] = useState(false);
  const [userId, setUserId] = useState<string|null>(null);

  useEffect(()=>{
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setSessionChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s)=>{
      setUserId(s?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  },[]);

  if(!sessionChecked) return null;
  if(!userId) return <Auth />;
  return <AppAuthed userId={userId} />;
}

function AppAuthed({ userId }:{ userId:string }){
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tab, setTab] = useState<'notes'|'add'|'settings'>('notes');
  const [view, setView] = useState<'cards'|'list'>('cards');
  const [query, setQuery] = useState('');
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<Status[]>([]);
  const [editing, setEditing] = useState<Note|null>(null);
  const [theme, setTheme] = useState<'light'|'dark'>(()=> (localStorage.getItem('yadarm_theme')==='dark' ? 'dark' : 'light'));
  const searchRef = useRef<HTMLInputElement|null>(null);

  async function loadAll(){
    const { data: t } = await supabase.from('tags').select('*').order('created_at', { ascending: false });
    setTags(t || []);
    const { data: n } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
    setNotes(n || []);
  }
  useEffect(()=>{ loadAll(); },[]);

  // theme
  useEffect(()=>{
    if(theme==='dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('yadarm_theme', theme);
  },[theme]);

  const tagMap = useMemo(()=>Object.fromEntries(tags.map(t=>[t.id, t])),[tags]);
  const visibleNotes = useMemo(()=>{
    const q = query.trim().toLowerCase();
    return notes.filter(n => {
      const textOk = !q || (n.text||'').toLowerCase().includes(q);
      const tagsOk = !filterTagIds.length || (n.tag_ids||[]).some(id => filterTagIds.includes(id));
      const statusOk = !filterStatuses.length || filterStatuses.includes(n.status);
      return textOk && tagsOk && statusOk;
    });
  }, [notes, query, filterTagIds, filterStatuses]);

  // add note form state
  const [draftText, setDraftText] = useState('');
  const [draftStatus, setDraftStatus] = useState<Status>('action');
  const [draftTagName, setDraftTagName] = useState('');
  const [draftTagColor, setDraftTagColor] = useState('#3b82f6');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement|null>(null);

  function toggleTagSelection(id: string){
    setSelectedTagIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  }

  async function addTag(){
    const name = draftTagName.trim();
    if(!name) return;
    const exists = tags.find(t => t.name === name);
    if(exists){ if(!selectedTagIds.includes(exists.id)) setSelectedTagIds([...selectedTagIds, exists.id]); setDraftTagName(''); return; }
    const { data, error } = await supabase.from('tags').insert({ name, color: draftTagColor }).select().single();
    if(!error && data){ setTags([data, ...tags]); setSelectedTagIds([...selectedTagIds, data.id]); setDraftTagName(''); }
  }

  async function addNote(){
    const text = draftText.trim();
    if(!text) return;
    const { data, error } = await supabase.from('notes').insert({ text, status: draftStatus, tag_ids: selectedTagIds }).select().single();
    if(!error && data){
      setNotes([data, ...notes]);
      // stay on page "add" per requirement
      setDraftText(''); setSelectedTagIds([]);
      textareaRef.current?.focus();
    }
  }

  async function removeNote(id: string){
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if(!error) setNotes(prev => prev.filter(n=>n.id!==id));
  }
  async function updateNote(id: string, patch: Partial<Note>){
    const { data, error } = await supabase.from('notes').update(patch).eq('id', id).select().single();
    if(!error && data) setNotes(prev => prev.map(n=> n.id===id ? data : n));
  }

  async function updateTagColor(id: string, color: string){
    const { data, error } = await supabase.from('tags').update({ color }).eq('id', id).select().single();
    if(!error && data) setTags(prev => prev.map(t=> t.id===id ? data : t));
  }
  async function deleteTag(id: string){
    // remove tag from notes first
    const affected = notes.filter(n => (n.tag_ids||[]).includes(id));
    for (const n of affected){
      const nextIds = (n.tag_ids||[]).filter(x=>x!==id);
      await supabase.from('notes').update({ tag_ids: nextIds }).eq('id', n.id);
    }
    await supabase.from('tags').delete().eq('id', id);
    setTags(prev => prev.filter(t=>t.id!==id));
    setNotes(prev => prev.map(n => ({ ...n, tag_ids: (n.tag_ids||[]).filter(x=>x!==id) })));
  }

  function clearFilters(){ setQuery(''); setFilterTagIds([]); setFilterStatuses([]); searchRef.current?.focus(); }

  // ---- UI
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-neutral-900 text-white grid place-items-center shadow">
              <img src="/favicon.svg" className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Yadarm</h1>
              <p className="text-xs text-neutral-500">یادداشت آرمین</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setTheme(t=> t==='dark'?'light':'dark')} className="h-10 w-10 grid place-items-center rounded-xl border border-neutral-200 dark:border-neutral-700">
              {theme==='dark'? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}
            </button>
            <button onClick={async()=>{ await supabase.auth.signOut(); location.reload(); }} className="hidden sm:inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <LogOut className="h-4 w-4"/> خروج
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-3 sm:px-4 pb-28 pt-4 sm:pt-6 grid gap-4 sm:gap-6">
        {/* NOTES / دفترچه */}
        {tab==='notes' && (
          <>
            {/* Filters box */}
            <section className="grid gap-3">
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4"/><span className="text-sm font-medium">فیلتر و جستجو</span>
                </div>

                {/* Search + view inside filter row */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 transition-all">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"/>
                    <input
                      ref={searchRef}
                      value={query}
                      onChange={e=>setQuery(e.target.value)}
                      placeholder="جستجو"
                      className="w-full pl-9 pr-3 h-11 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 text-right"
                    />
                  </div>
                  <ViewToggle view={view} setView={setView} />
                </div>

                {/* Tag filters with collapse after 8 */}
                <TagsFilter tags={tags} selected={filterTagIds} onChange={setFilterTagIds} />

                {/* Status filters (grey text only) */}
                <div className="mt-2 flex flex-wrap gap-2 justify-end">
                  {STATUS_ORDER.map(s => {
                    const active = filterStatuses.includes(s);
                    return (
                      <button key={s} onClick={()=>{
                        setFilterStatuses(prev => active ? prev.filter(x=>x!==s) : [...prev, s]);
                      }} className={`px-3 h-9 rounded-xl border text-sm ${active?'bg-neutral-100 dark:bg-neutral-800':''}`}>
                        {STATUS_LABEL[s]}
                      </button>
                    );
                  })}
                  {(query || filterTagIds.length || filterStatuses.length) ? (
                    <button onClick={clearFilters} className="ml-auto text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><X className="h-4 w-4 inline mr-1"/> پاک کردن فیلترها</button>
                  ) : null}
                </div>
              </div>
            </section>

            {/* Notes list/card */}
            <section className="grid gap-3">
              <div className="flex items-center justify-between">
                <div className="text-sm sm:text-base font-medium">یادداشت‌ها</div>
              </div>

              {view==='cards' ? (
                <CardView notes={visibleNotes} tagMap={tagMap} onRemove={removeNote} onEdit={setEditing} />
              ) : (
                <ListView notes={visibleNotes} tagMap={tagMap} onRemove={removeNote} onEdit={setEditing} />
              )}

              {visibleNotes.length=== 0 && (
                <div className="py-16 text-center text-neutral-400">
                  هنوز یادداشتی مطابق فیلترها وجود ندارد.
                  <div className="mt-2 text-xs">یک یادداشت جدید بسازید یا فیلترها را پاک کنید.</div>
                </div>
              )}
            </section>
          </>
        )}

        {/* ADD / بنویس */}
        {tab==='add' && (
          <section className="grid gap-3">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-3 sm:p-4">
              {/* Status on top */}
              <div className="mb-2 text-right">
                <label className="text-sm font-medium mr-1">وضعیت:</label>
                <StatusSelect value={draftStatus} onChange={setDraftStatus} />
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                dir="rtl"
                className="w-full resize-y rounded-2xl border border-neutral-200 dark:border-neutral-700 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 min-h-[160px] text-right bg-white dark:bg-neutral-900"
                placeholder="متن یادداشت را بنویسید..."
                value={draftText}
                onChange={e=>setDraftText(e.target.value)}
              />

              {/* Selected tags (visually attached to textarea) */}
              <div className="mt-2 -mb-1 text-right">
                <span className="text-sm text-neutral-500">تگ‌ها:</span>
                <div className="mt-1 flex flex-wrap gap-2 justify-end">
                  {(selectedTagIds||[]).map(id => {
                    const t = tagMap[id]; if(!t) return null;
                    return (
                      <span key={id} className="px-2 h-7 inline-flex items-center gap-2 rounded-full border text-xs bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
                        <span className="inline-block h-3 w-3 rounded-full" style={{backgroundColor: t.color}}/>
                        {t.name}
                        <button onClick={()=>toggleTagSelection(id)} className="text-neutral-400 hover:text-red-600"><X className="h-3 w-3"/></button>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Actions row: submit right, add-tag left */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <button onClick={addNote} className="inline-flex items-center gap-2 px-4 h-11 rounded-2xl bg-neutral-900 text-white hover:opacity-90">
                  <Plus className="h-4 w-4" /> ثبت یادداشت
                </button>

                <div className="flex items-center gap-2 ml-auto">
                  <input value={draftTagName} onChange={e=>setDraftTagName(e.target.value)} placeholder="تگ جدید" className="h-11 px-2 w-32 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-right"/>
                  <input type="color" value={draftTagColor} onChange={e=>setDraftTagColor(e.target.value)} className="h-11 w-12 p-0 rounded"/>
                  <button onClick={addTag} className="h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700">افزودن تگ</button>
                </div>
              </div>

              {/* Existing tags to pick (right-aligned like status) */}
              <div className="mt-3 text-right">
                <div className="text-sm font-medium mb-2">تگ‌ها:</div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {tags.map(t => {
                    const active = selectedTagIds.includes(t.id);
                    return (
                      <button key={t.id} onClick={()=>toggleTagSelection(t.id)} className={`px-2 h-9 rounded-xl border text-sm inline-flex items-center gap-2 ${active ? 'ring-2 ring-offset-1 ring-neutral-900 dark:ring-white' : ''}`} style={{ borderColor: t.color }}>
                        <span className="inline-block h-3 w-3 rounded-full" style={{backgroundColor: t.color}}/>
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SETTINGS / تنظیمات */}
        {tab==='settings' && (
          <SettingsPage
            tags={tags}
            onUpdateTagColor={updateTagColor}
            onDeleteTag={deleteTag}
            onReload={loadAll}
          />
        )}
      </main>

      {/* Edit Modal */}
      {editing && (
        <EditModal
          note={editing}
          allTags={tags}
          onClose={()=>setEditing(null)}
          onSave={async (patch) => { await updateNote(editing.id, patch as any); setEditing(null); }}
        />
      )}

      {/* Bottom Navigation - island */}
      <div className="fixed inset-x-0 bottom-4 z-20 pointer-events-none">
        <nav className="pointer-events-auto mx-auto w-[min(calc(100%-32px),560px)]">
          <div className="rounded-[20px] shadow-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 py-2 grid grid-cols-3 gap-2 items-center justify-center mx-auto">
            <NavBtn active={tab==='notes'} onClick={()=>setTab('notes')} icon={<List className="h-5 w-5" />} label="دفترچه" />
            <NavBtn active={tab==='add'} onClick={()=>setTab('add')} icon={<Plus className="h-5 w-5" />} label="بنویس" />
            <NavBtn active={tab==='settings'} onClick={()=>setTab('settings')} icon={<Settings className="h-5 w-5" />} label="تنظیمات" />
          </div>
        </nav>
      </div>
    </div>
  );
}

// ---- UI Pieces

function ViewToggle({ view, setView }:{ view:'cards'|'list'; setView:(v:any)=>void }){
  const opts = [
    { id:'cards', label:'کارت', icon:<LayoutGrid className="h-4 w-4" /> },
    { id:'list', label:'لیست', icon:<List className="h-4 w-4" /> },
  ];
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-1 flex items-center shadow-sm">
      {opts.map(o => (
        <button key={o.id} className={`px-3 h-10 rounded-xl text-sm inline-flex items-center gap-1 ${view===o.id ? "bg-neutral-900 text-white" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`} onClick={()=>setView(o.id as any)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

function TagsFilter({ tags, selected, onChange }:{ tags:Tag[]; selected:string[]; onChange:(ids:string[])=>void; }){
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? tags : tags.slice(0, 8);
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2 justify-end">
        {shown.map(t => {
          const active = selected.includes(t.id);
          return (
            <label key={t.id} className="inline-flex items-center gap-2 select-none text-sm">
              <input type="checkbox" className="accent-black" checked={active} onChange={e=> onChange(e.target.checked ? [...selected, t.id] : selected.filter(x=>x!==t.id))} />
              <span className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10" style={{backgroundColor:t.color}}/>
              <span>{t.name}</span>
            </label>
          );
        })}
      </div>
      {tags.length>8 && !expanded && (
        <div className="mt-2 text-right">
          <button onClick={()=>setExpanded(true)} className="text-sm underline">نمایش همهٔ تگ‌ها</button>
        </div>
      )}
      {expanded && (
        <div className="mt-2 text-right">
          <button onClick={()=>setExpanded(false)} className="text-sm underline">نمایش کمتر</button>
        </div>
      )}
    </div>
  );
}

function StatusSelect({ value, onChange }:{ value:Status; onChange:(s:Status)=>void }){
  return (
    <div className="inline-flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-1">
      {(['action','plan','done'] as Status[]).map(s => {
        const active = value===s;
        return (
          <button key={s} onClick={()=>onChange(s)} className={`px-3 h-9 rounded-xl text-sm ${active ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white ring-2 ring-neutral-200 dark:ring-neutral-700" : "hover:bg-white/70 dark:hover:bg-neutral-700"}`}>
            {statusLabel(s)}
          </button>
        );
      })}
    </div>
  );
}

function statusLabel(s: Status){ return ({action:'اکشن', plan:'پلن', done:'اتمام'} as const)[s]; }

function NavBtn({ active, onClick, icon, label }:{ active:boolean; onClick:()=>void; icon:React.ReactNode; label:string; }){
  return (
    <button onClick={onClick} className={`h-12 rounded-xl flex items-center justify-center gap-2 text-sm ${active ? "bg-neutral-900 text-white" : "bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800"}`}>
      {icon}<span>{label}</span>
    </button>
  );
}

function CardView({ notes, tagMap, onRemove, onEdit }:{ notes:Note[]; tagMap:Record<string, Tag>; onRemove:(id:string)=>void; onEdit:(n:Note)=>void; }){
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {notes.map(n => (
        <div key={n.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-3 bg-white dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs text-neutral-400">{formatDate(n.created_at)}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-600 dark:text-neutral-300">{statusLabel(n.status)}</span>
              <button className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={()=>onEdit(n)} title="ویرایش"><Pencil className="h-4 w-4" /></button>
              <button className="text-neutral-400 hover:text-red-600" onClick={()=>onRemove(n.id)} title="حذف"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-right line-clamp-3">{n.text}</p>
          <div className="mt-3 flex flex-wrap gap-2 justify-end">
            {(n.tag_ids||[]).map(id => {
              const t = tagMap[id]; if(!t) return null;
              return <span key={id} className="px-2 h-7 inline-flex items-center gap-2 rounded-full border text-xs border-neutral-200 dark:border-neutral-700"><span className="inline-block h-3 w-3 rounded-full" style={{backgroundColor:t.color}}/> {t.name}</span>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ notes, tagMap, onRemove, onEdit }:{ notes:Note[]; tagMap:Record<string, Tag>; onRemove:(id:string)=>void; onEdit:(n:Note)=>void; }){
  return (
    <div className="grid gap-3">
      {notes.map(n => (
        <div key={n.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-3 bg-white dark:bg-neutral-900">
          {/* top row */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-400">{formatDate(n.created_at)}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-600 dark:text-neutral-300">{statusLabel(n.status)}</span>
              <button className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={()=>onEdit(n)} title="ویرایش"><Pencil className="h-4 w-4" /></button>
              <button className="text-neutral-400 hover:text-red-600" onClick={()=>onRemove(n.id)} title="حذف"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          {/* first line only */}
          <div className="mt-2 text-right text-base leading-7">
            {(n.text||'').split(/\r?\n/)[0]}
          </div>
          {/* tags */}
          <div className="mt-2 flex flex-wrap gap-2 justify-end">
            {(n.tag_ids||[]).map(id => {
              const t = tagMap[id]; if(!t) return null;
              return <span key={id} className="px-2 h-7 inline-flex items-center gap-2 rounded-full border text-xs border-neutral-200 dark:border-neutral-700"><span className="inline-block h-3 w-3 rounded-full" style={{backgroundColor:t.color}}/> {t.name}</span>;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditModal({ note, allTags, onClose, onSave }:{ note:Note; allTags:Tag[]; onClose:()=>void; onSave:(patch:Partial<Note>)=>void }){
  const [text, setText] = useState(note.text);
  const [status, setStatus] = useState<Status>(note.status);
  const [selected, setSelected] = useState<string[]>(note.tag_ids||[]);
  const toggle = (id:string) => setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full sm:w-[560px] max-h-[90vh] overflow-auto bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-neutral-500">ویرایش یادداشت</div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"><X className="h-5 w-5"/></button>
        </div>
        <div className="grid gap-3">
          <div className="text-right">
            <label className="text-sm font-medium mr-1">وضعیت:</label>
            <StatusSelect value={status} onChange={setStatus} />
          </div>
          <textarea dir="rtl" className="w-full min-h-[140px] rounded-2xl border border-neutral-200 dark:border-neutral-700 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 text-right bg-white dark:bg-neutral-900" value={text} onChange={(e)=>setText(e.target.value)} />
          <div className="flex flex-wrap gap-2 justify-end">
            {allTags.map((t)=>{
              const active = selected.includes(t.id);
              return (
                <div key={t.id} className={`px-2 h-9 rounded-xl border text-sm inline-flex items-center gap-2 ${active ? "ring-2 ring-offset-1 ring-neutral-900 dark:ring-white" : ""}`} style={{ borderColor: t.color }}>
                  <button type="button" onClick={()=>toggle(t.id)} className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{backgroundColor: t.color}}/>
                    {t.name}
                  </button>
                  {active && (
                    <button type="button" onClick={()=>toggle(t.id)} className="text-neutral-400 hover:text-red-600" title="حذف از این یادداشت">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-10 px-3 rounded-2xl border border-neutral-200 dark:border-neutral-700">انصراف</button>
          <button onClick={()=>onSave({ text, status, tag_ids: selected })} className="h-10 px-4 rounded-2xl bg-neutral-900 text-white inline-flex items-center gap-2"><Check className="h-4 w-4"/> ذخیره</button>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ tags, onUpdateTagColor, onDeleteTag, onReload }:{ tags:Tag[]; onUpdateTagColor:(id:string, color:string)=>void; onDeleteTag:(id:string)=>void; onReload:()=>void }){
  const [pwOpen, setPwOpen] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [msg, setMsg] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);

  async function changePassword(e: React.FormEvent){
    e.preventDefault();
    setMsg(null); setError(null);
    if(newPass.length < 6){ setError('رمز باید حداقل ۶ کاراکتر باشد'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if(error){ setError(error.message); } else { setMsg('رمز عبور با موفقیت تغییر کرد.'); setNewPass(''); }
  }

  return (
    <section className="grid gap-3">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-3 sm:p-4">
        <h3 className="font-medium mb-2 text-right">تنظیمات</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Change password card as a button-like panel */}
          <div className="border rounded-2xl p-3 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">تغییر رمز عبور</div>
              <button onClick={()=>setPwOpen(o=>!o)} className="text-sm underline">{pwOpen?'بستن':'باز کردن'}</button>
            </div>
            {pwOpen && (
              <form onSubmit={changePassword} className="grid gap-2">
                <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="رمز عبور جدید" className="h-11 px-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-right" />
                {error && <div className="text-red-600 text-sm text-right">{error}</div>}
                {msg && <div className="text-green-600 text-sm text-right">{msg}</div>}
                <div className="flex justify-end">
                  <button className="h-11 px-4 rounded-2xl bg-neutral-900 text-white">ذخیره</button>
                </div>
              </form>
            )}
          </div>

          {/* Tag management card */}
          <div className="border rounded-2xl p-3 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">مدیریت تگ‌ها</div>
              <button onClick={onReload} className="text-sm underline">بازخوانی</button>
            </div>
            <div className="grid gap-2 max-h-72 overflow-auto pr-1">
              {tags.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-2 border rounded-xl p-2 dark:border-neutral-700">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{backgroundColor: t.color}}></span>
                    <span className="text-sm">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="color" value={t.color} onChange={e=>onUpdateTagColor(t.id, e.target.value)} className="h-9 w-12 p-0 rounded" />
                    <button onClick={()=>onDeleteTag(t.id)} className="h-9 px-3 rounded-xl border hover:bg-red-50 dark:hover:bg-red-900/20">حذف</button>
                  </div>
                </div>
              ))}
              {tags.length===0 && <div className="text-sm text-neutral-500 text-right">تگی وجود ندارد.</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
