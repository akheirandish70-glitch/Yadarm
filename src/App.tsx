import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Tag, Trash2, LayoutGrid, List, Filter, X, Search, Smile, StickyNote, Settings, Pencil, Check, Moon, Sun } from "lucide-react";
import { supabase } from "./supabase";
import { ChangePassword } from "./auth";

type TagType = { id: string; name: string; color: string };
type StatusType = "action" | "plan" | "done";
type NoteRow = { id: string; text: string; tag_ids: string[]; created_at: string; status: StatusType };

const STATUS_ORDER: StatusType[] = ["action","plan","done"];
const STATUS_LABEL: Record<StatusType,string> = { action: "اکشن", plan: "پلن", done: "اتمام" };

function useTheme() {
  const [theme, setTheme] = useState<"light"|"dark"|"system">(() => (localStorage.getItem('mn_theme') as any) || 'light');
  useEffect(() => {
    const root = document.documentElement;
    const preferDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && preferDark);
    root.classList.toggle("dark", isDark);
    localStorage.setItem('mn_theme', theme);
  }, [theme]);
  return { theme, setTheme };
}

export default function App() {
  const { theme, setTheme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [view, setView] = useState<"cards"|"list">("cards");
  const [query, setQuery] = useState("");
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<StatusType[]>([]);
  const [tab, setTab] = useState<"notes"|"add"|"settings">("notes");

  const [draftText, setDraftText] = useState("");
  const [draftStatus, setDraftStatus] = useState<StatusType>("action");
  const [quickTagIds, setQuickTagIds] = useState<string[]>([]);

  const [editing, setEditing] = useState<NoteRow | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // session user id
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // load notes/tags
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: tagsData } = await supabase.from('tags').select('*').order('created_at', { ascending: false });
      if (tagsData && tagsData.length) setTags(tagsData.map((t: any) => ({ id: t.id, name: t.name, color: t.color })));
      else {
        const def = defaultTags();
        const { data: inserted } = await supabase.from('tags').insert(def.map(d => ({ ...d, user_id: userId }))).select('*');
        if (inserted) setTags(inserted.map((t: any) => ({ id: t.id, name: t.name, color: t.color })));
      }
      const { data: notesData } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
      setNotes((notesData || []).map((n: any) => ({ id: n.id, text: n.text, tag_ids: n.tag_ids, created_at: n.created_at, status: n.status })));
    })();
  }, [userId]);

  const tagMap = useMemo(() => Object.fromEntries(tags.map(t => [t.id, t])), [tags]);
  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter(n => (!q || n.text.toLowerCase().includes(q)))
      .filter(n => (!filterTagIds.length || filterTagIds.every(id => n.tag_ids.includes(id))))
      .filter(n => (!filterStatuses.length || filterStatuses.includes(n.status)));
  }, [notes, query, filterTagIds, filterStatuses]);

  async function addNote() {
    const text = draftText.trim();
    if (!text || !userId) return;
    const { data, error } = await supabase.from('notes').insert({ user_id: userId, text, tag_ids: quickTagIds, status: draftStatus }).select('*').single();
    if (!error && data) {
      setNotes(prev => [{ id: data.id, text: data.text, tag_ids: data.tag_ids, created_at: data.created_at, status: data.status }, ...prev]);
      // Stay on Add tab (requested), clear fields and keep focus
      setDraftText(""); setQuickTagIds([]); setDraftStatus("action");
      textareaRef.current?.focus();
    }
  }
  async function removeNote(id: string) {
    await supabase.from('notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }
  async function updateNote(id: string, patch: Partial<NoteRow>) {
    const payload: any = {};
    if (patch.text !== undefined) payload.text = patch.text;
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.tag_ids !== undefined) payload.tag_ids = patch.tag_ids;
    const { data } = await supabase.from('notes').update(payload).eq('id', id).select('*').single();
    if (data) setNotes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
  }
  async function addTag(name: string, color: string) {
    name = name.trim(); if (!name || !userId) return;
    const exists = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (exists) { setQuickTagIds(p => (p.includes(exists.id) ? p : [...p, exists.id])); return; }
    const { data } = await supabase.from('tags').insert({ user_id: userId, name, color }).select('*').single();
    if (data) { setTags(prev => [...prev, { id: data.id, name: data.name, color: data.color }]); setQuickTagIds(p => [...p, data.id]); }
  }
  async function updateTagColor(id: string, color: string) {
    const { data } = await supabase.from('tags').update({ color }).eq('id', id).select('*').single();
    if (data) setTags(prev => prev.map(t => t.id === id ? { ...t, color: data.color } : t));
  }

  function clearFilters() { setQuery(""); setFilterTagIds([]); setFilterStatuses([]); searchRef.current?.focus(); }
  function cycleStatus(s: StatusType): StatusType { const i = STATUS_ORDER.indexOf(s); return STATUS_ORDER[(i+1)%STATUS_ORDER.length]; }
  function cycleTheme(){ setTheme(prev => prev === 'dark' ? 'light' : 'dark'); }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") { e.preventDefault(); addNote(); }
      if (e.key === "/") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") { e.preventDefault(); searchRef.current?.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draftText, quickTagIds, draftStatus]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100" dir="rtl">
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 dark:bg-neutral-900/90 border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Yadarm" className="h-9 w-9 rounded-2xl border shadow bg-white p-1 dark:bg-neutral-800 dark:border-neutral-700"/>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Yadarm</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">یادداشت آرمین</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cycleTheme} className="h-10 px-3 rounded-xl border bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700">{theme==='dark'?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 sm:px-4 pb-28 pt-4 sm:pt-6 grid gap-4 sm:gap-6">
        {tab === "add" and (
          <section className="grid gap-3">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2"><span className="text-sm sm:text-base font-medium">نوشتن یادداشت</span><kbd className="text-xs text-neutral-400">Ctrl/⌘ + Enter</kbd></div>
              <textarea ref={textareaRef} dir="rtl" className="w-full resize-y rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 min-h-[140px] text-right" placeholder="متن یادداشت را بنویسید..." value={draftText} onChange={(e)=>setDraftText(e.target.value)} />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 flex-wrap justify-end"><span className="text-sm text-neutral-600">وضعیت:</span> <StatusSegment value={draftStatus} onChange={setDraftStatus} /></div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:ml-auto">

                  <QuickTags tags={tags} selectedIds={quickTagIds} onToggle={(id)=>setQuickTagIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])} onAdd={(name,color)=>addTag(name,color)} />
                  <button onClick={addNote} className="inline-flex items-center gap-2 px-3 sm:px-4 h-10 sm:h-11 rounded-2xl bg-neutral-900 text-white hover:opacity-90 dark:bg-white dark:text-neutral-900">
                    <Plus className="h-4 w-4" /> ثبت یادداشت
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === "notes" and (
          <>
            <section className="grid gap-3">
              <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2"><Filter className="h-4 w-4" /><span className="text-sm font-medium">جستجو و فیلتر</span></div>
                <div className="grid gap-2">
                  <div className="group relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                    <input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="برای جستجو تایپ کنید (کلید / )" className="w-full pl-9 pr-3 h-12 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:h-16 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 text-right text-base" />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {(['action','plan','done'] as StatusType[]).map(s => (
                        <label key={s} className="inline-flex items-center gap-2 select-none text-sm text-neutral-600 dark:text-neutral-300">
                          <input type="checkbox" className="accent-black" checked={filterStatuses.includes(s)} onChange={e=>setFilterStatuses(prev => (e.target.checked ? [...prev, s] : prev.filter(x => x !== s)))} />
                          <span>{STATUS_LABEL[s]}</span>
                        </label>
                      ))}
                    </div>
                    <ViewToggle view={view} setView={setView} />
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {tags.map(t => (
                      <label key={t.id} className="inline-flex items-center gap-2 select-none text-sm">
                        <input type="checkbox" className="accent-black" checked={filterTagIds.includes(t.id)} onChange={e=>setFilterTagIds(prev => (e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id)))} />
                        <ColorDot color={t.color} /><span>{t.name}</span>
                      </label>
                    ))}
                    {!!(query || filterTagIds.length || filterStatuses.length) and (
                      <button onClick={clearFilters} className="ml-auto text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><X className="h-4 w-4 inline mr-1" /> پاک کردن</button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
              <div className="p-3 sm:p-4 flex items-center justify-between"><div className="text-sm sm:text-base font-medium">یادداشت‌ها</div></div>
              <div className="p-3 sm:p-4">
                {view === "cards" and (<CardView notes={visibleNotes} tagMap={tagMap} onRemove={(id)=>removeNote(id)} onEdit={setEditing} onCycleStatus={(id)=>{ const s = notes.find(n=>n.id===id)!.status; updateNote(id, { status: cycleStatus(s) }) }} />)}
                {view === "list" and (<ListView notes={visibleNotes} tagMap={tagMap} onRemove={(id)=>removeNote(id)} onEdit={setEditing} onCycleStatus={(id)=>{ const s = notes.find(n=>n.id===id)!.status; updateNote(id, { status: cycleStatus(s) }) }} />)}
                {visibleNotes.length === 0 and (<EmptyState />)}
              </div>
            </section>
          </>
        )}

        {tab === "settings" and (
          <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2"><Settings className="h-4 w-4" /><span className="text-sm font-medium">تنظیمات</span></div>
            <div className="grid gap-6">
              <div className="grid gap-2">
                <h3 className="text-sm font-medium">تغییر رمز عبور</h3>
                <ChangePassword />
              </div>
              <div className="grid gap-2">
                <h3 className="text-sm font-medium">مدیریت تگ‌ها</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {tags.map(t => (
                    <div key={t.id} className="flex items-center gap-2 border rounded-xl p-2 justify-between border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center gap-2"><ColorDot color={t.color} /><span className="text-sm" title={t.name}>{t.name}</span></div>
                      <input type="color" value={t.color} onChange={e=>updateTagColor(t.id, e.target.value)} className="h-8 w-12 p-0 border rounded bg-transparent" title="انتخاب رنگ" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {editing and (
        <EditModal
          note={editing}
          allTags={tags}
          onClose={() => setEditing(null)}
          onSave={(patch) => { updateNote(editing.id, patch); setEditing(null); }}
        />
      )}

      <div className="fixed inset-x-0 bottom-4 z-20 pointer-events-none">
        <nav className="pointer-events-auto mx-auto w-[min(calc(100%-32px),560px)]">
          <div className="rounded-[20px] shadow-lg border bg-white dark:bg-neutral-800 dark:border-neutral-700 px-2 py-2 grid grid-cols-3 gap-2 items-center justify-center mx-auto">
            <NavBtn active={tab === "notes"} onClick={()=>setTab("notes")} icon={<StickyNote className="h-5 w-5" />} label="دفترچه" />
            <NavBtn active={tab === "add"} onClick={()=>setTab("add")} icon={<Plus className="h-5 w-5" />} label="بنویس" />
            <NavBtn active={tab === "settings"} onClick={()=>setTab("settings")} icon={<Settings className="h-5 w-5" />} label="تنظیمات" />
          </div>
        </nav>
      </div>
    </div>
  );
}

function ViewToggle({ view, setView }: { view: "cards"|"list"; setView: (v: any)=>void }) {
  const opts = [
    { id: "cards", label: "کارت", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "list", label: "لیست", icon: <List className="h-4 w-4" /> },
  ];
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-1 flex items-center shadow-sm">
      {opts.map(o => (
        <button key={o.id} className={`px-3 h-10 rounded-xl text-sm inline-flex items-center gap-1 ${view === o.id ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "hover:bg-neutral-100 dark:hover:bg-neutral-800"}`} onClick={() => setView(o.id as any)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

function StatusSegment({ value, onChange }:{ value: StatusType; onChange: (v: StatusType)=>void }) {
  return (
    <div className="inline-flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-1">
      {(['action','plan','done'] as StatusType[]).map(s => {
        const active = value === s;
        return (
          <button key={s} onClick={()=>onChange(s)} className={`px-3 h-9 rounded-xl text-sm ${active ? "bg-white dark:bg-neutral-900 shadow-sm" : "hover:bg-white/70 dark:hover:bg-neutral-700/50"} text-neutral-600 dark:text-neutral-300`}>
            {({action:'اکشن',plan:'پلن',done:'اتمام'} as any)[s]}
          </button>
        );
      })}
    </div>
  );
}

function QuickTags({ tags, selectedIds, onToggle, onAdd }:{ tags: TagType[]; selectedIds: string[]; onToggle: (id: string)=>void; onAdd: (name: string, color: string)=>void; }) {
  const [newTag, setNewTag] = useState("");
  const [color, setColor] = useState("#64748b");
  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      {tags.map(t => (
        <button key={t.id} onClick={() => onToggle(t.id)} className={`px-2 h-9 rounded-xl border text-sm inline-flex items-center gap-2 ${selectedIds.includes(t.id) ? "ring-2 ring-offset-1 ring-neutral-900 dark:ring-white" : ""}`} style={{ borderColor: t.color }} title={`تگ: ${t.name}`}>
          <ColorDot color={t.color} />{t.name}
        </button>
      ))}
      <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-700 rounded-xl p-1">
        <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { onAdd(newTag, color); setNewTag(""); } }} placeholder="تگ جدید" className="h-9 px-2 w-28 focus:outline-none text-right bg-transparent" />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 w-9 p-0 rounded bg-transparent" title="انتخاب رنگ" />
        <button onClick={() => { onAdd(newTag, color); setNewTag(""); }} className="h-9 px-2 rounded-md bg-neutral-900 text-white text-sm dark:bg-white dark:text-neutral-900" title="افزودن تگ">افزودن</button>
      </div>
    </div>
  );
}

function CardView({ notes, tagMap, onRemove, onEdit, onCycleStatus }:{ notes: NoteRow[]; tagMap: Record<string, TagType>; onRemove: (id: string)=>void; onEdit: (n: NoteRow)=>void; onCycleStatus: (id: string)=>void; }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`}> 
      {notes.map(n => (
        <div key={n.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-3 bg-white dark:bg-neutral-900">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs text-neutral-400">{new Date(n.created_at).toLocaleString("fa-IR")}</span>
            <div className="flex items-center gap-3">
              <StatusLabel status={n.status} onClick={()=>onCycleStatus(n.id)} />
              <button className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={() => onEdit(n)} title="ویرایش"><Pencil className="h-4 w-4" /></button>
              <button className="text-neutral-400 hover:text-red-600" onClick={() => onRemove(n.id)} title="حذف"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <p className={`mt-2 whitespace-pre-wrap text-base leading-7 text-right`}>{n.text}</p>
          <div className="mt-3 flex flex-wrap gap-2 justify-end">
            {n.tag_ids.map(id => tagMap[id]).filter(Boolean).map(t => (
              <span key={t.id} className="px-2 h-7 inline-flex items-center gap-2 rounded-full border text-xs" style={{ borderColor: t.color }}><ColorDot color={t.color} />{t.name}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ notes, tagMap, onRemove, onEdit, onCycleStatus }:{ notes: NoteRow[]; tagMap: Record<string, TagType>; onRemove: (id: string)=>void; onEdit: (n: NoteRow)=>void; onCycleStatus: (id: string)=>void; }) {
  return (
    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {notes.map(n => (
        <div key={n.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 py-3`}>
          <div className="sm:w-40 text-xs text-neutral-400">{new Date(n.created_at).toLocaleString("fa-IR")}</div>
          <div className="flex-1 whitespace-pre-wrap text-right">{n.text}</div>
          <div className="flex items-center gap-3 ml-auto">
            <StatusLabel status={n.status} onClick={()=>onCycleStatus(n.id)} />
            <button className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={() => onEdit(n)} title="ویرایش"><Pencil className="h-4 w-4" /></button>
            <button className="text-neutral-400 hover:text-red-600" onClick={() => onRemove(n.id)} title="حذف"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {n.tag_ids.map(id => tagMap[id]).filter(Boolean).map(t => (
              <span key={t.id} className="px-2 h-7 inline-flex items-center gap-2 rounded-full border text-xs" style={{ borderColor: t.color }}><ColorDot color={t.color} />{t.name}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center text-neutral-400">هنوز یادداشتی مطابق فیلترها وجود ندارد.<div className="mt-2 text-xs">یک یادداشت جدید بسازید یا فیلترها را پاک کنید.</div></div>
  );
}

function ColorDot({ color }:{ color: string }) { return <span className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color }} />; }

function NavBtn({ active, onClick, icon, label }:{ active: boolean; onClick: ()=>void; icon: React.ReactNode; label: string; }) {
  return (
    <button onClick={onClick} className={`h-12 rounded-xl flex items-center justify-center gap-2 text-sm ${active ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800"} border border-neutral-200 dark:border-neutral-700`}>
      {icon}<span>{label}</span>
    </button>
  );
}

function EmojiPicker({ onPick }:{ onPick: (e: string)=>void; }) {
  const [open, setOpen] = useState(false);
  const EMOJIS = ["😀","😄","😁","😊","😍","🤩","😎","🤔","😇","😴","😅","😢","🔥","✨","✅","📌","📝","⚡","🚀","💡"];
  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)} className="px-2 h-10 rounded-xl border inline-flex items-center gap-2 dark:border-neutral-700"><Smile className="h-4 w-4"/> ایموجی</button>
      {open and (
        <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow p-2 grid grid-cols-10 gap-1 z-10">
          {EMOJIS.map(e => (
            <button key={e} className="h-8 w-8 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-lg" onClick={()=>{ onPick(e); setOpen(False); }}>{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function insertAtCursor(ref: React.RefObject<HTMLTextAreaElement>, text: string, setValue: (v: string)=>void) {
  const el = ref.current; if (!el) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const value = el.value;
  const next = value.slice(0, start) + text + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => { el.focus(); const pos = start + text.length; el.setSelectionRange(pos, pos); });
}

function defaultTags(): TagType[] { return [ { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), name: "ایده", color: "#64748b" }, { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), name: "کارها", color: "#64748b" }, { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), name: "شخصی", color: "#64748b" }, ]; }

function StatusLabel({ status, onClick }:{ status: StatusType; onClick?: ()=>void }) {
  return (
    <button onClick={onClick} className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-300 underline-offset-2 hover:underline" title="تغییر سریع وضعیت">
      {({action:'اکشن',plan:'پلن',done:'اتمام'} as any)[status]}
    </button>
  );
}

function EditModal({ note, allTags, onClose, onSave }:{ note: NoteRow; allTags: TagType[]; onClose: ()=>void; onSave: (patch: Partial<NoteRow>)=>void }) {
  const [text, setText] = useState(note.text);
  const [status, setStatus] = useState<StatusType>(note.status);
  const [selected, setSelected] = useState<string[]>(note.tag_ids);
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full sm:w-[560px] max-h-[90vh] overflow-auto bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-neutral-500">ویرایش یادداشت</div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"><X className="h-5 w-5"/></button>
        </div>
        <div className="grid gap-3">
          <StatusSegment value={status} onChange={setStatus} />
          <textarea dir="rtl" className="w-full min-h-[140px] rounded-2xl border border-neutral-200 dark:border-neutral-700 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 text-right bg-white dark:bg-neutral-900" value={text} onChange={(e)=>setText(e.target.value)} />
          <div className="flex flex-wrap gap-2 justify-end">
            {allTags.map(t => (
              <div key={t.id} className={`px-2 h-9 rounded-xl border text-sm inline-flex items-center gap-2 ${selected.includes(t.id) ? "ring-2 ring-offset-1 ring-neutral-900" : ""}`} style={{ borderColor: t.color }}>
                <button onClick={()=>toggle(t.id)} className="inline-flex items-center gap-2"><ColorDot color={t.color} />{t.name}</button>
                {selected.includes(t.id) && <button onClick={()=>toggle(t.id)} className="text-neutral-400 hover:text-red-600" title="حذف از این یادداشت"><X className="h-4 w-4"/></button>}
              </div>
            ))}>
                <ColorDot color={t.color} />{t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="h-10 px-3 rounded-2xl border">انصراف</button>
          <button onClick={()=>onSave({ text, status, tag_ids: selected })} className="h-10 px-4 rounded-2xl bg-neutral-900 text-white inline-flex items-center gap-2"><Check className="h-4 w-4"/> ذخیره</button>
        </div>
      </div>
    </div>
  );
}
