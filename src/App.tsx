import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Tag, Trash2, LayoutGrid, List, Table as TableIcon, Filter, X, Search, Smile, StickyNote, Settings, Pencil, Check, Moon, Sun } from "lucide-react";

type TagType = { id: string; name: string; color: string };
type StatusType = "action" | "plan" | "done";
type NoteType = { id: string; text: string; tagIds: string[]; createdAt: number; status: StatusType };

const uid = () => Math.random().toString(36).slice(2, 10);
const formatDate = (ts: number) => new Date(ts).toLocaleString("fa-IR");
const STORAGE_KEYS = { notes: "mn_notes_v3", tags: "mn_tags_v1", settings: "mn_settings_v3", theme: "mn_theme" };
const PALETTE = ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316"];
const STATUS_ORDER: StatusType[] = ["action","plan","done"];
const STATUS_META: Record<StatusType, { label: string; text: string; bg: string; ring: string; dot: string; darkText: string; darkBg: string; darkRing: string }>= {
  action: { label: "اکشن", text: "text-red-700", bg: "bg-red-50", ring: "ring-red-200", dot: "bg-red-500", darkText:"text-red-200", darkBg:"bg-red-900/30", darkRing:"ring-red-900/40" },
  plan:   { label: "پلن",   text: "text-blue-700", bg: "bg-blue-50", ring: "ring-blue-200", dot: "bg-blue-500", darkText:"text-blue-200", darkBg:"bg-blue-900/30", darkRing:"ring-blue-900/40" },
  done:   { label: "اتمام", text: "text-green-700", bg: "bg-green-50", ring: "ring-green-200", dot: "bg-green-500", darkText:"text-green-200", darkBg:"bg-green-900/30", darkRing:"ring-green-900/40" },
};

function useTheme() {
  const [theme, setTheme] = useState<"light"|"dark"|"system">(() => (localStorage.getItem(STORAGE_KEYS.theme) as any) || "light");
  useEffect(() => {
    const root = document.documentElement;
    const preferDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && preferDark);
    root.classList.toggle("dark", isDark);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);
  return { theme, setTheme };
}

export default function App() {
  const { theme, setTheme } = useTheme();

  const [notes, setNotes] = useState<NoteType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [view, setView] = useState<"cards"|"list"|"table">("cards");
  const [query, setQuery] = useState("");
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [tab, setTab] = useState<"notes"|"add"|"tags">("notes");

  const [draftText, setDraftText] = useState("");
  const [draftStatus, setDraftStatus] = useState<StatusType>("action");
  const [quickTagIds, setQuickTagIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<NoteType | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const ns = JSON.parse(localStorage.getItem(STORAGE_KEYS.notes) || "[]");
      const ts = JSON.parse(localStorage.getItem(STORAGE_KEYS.tags) || "[]");
      const st = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
      setNotes(ns);
      setTags(ts.length ? ts : defaultTags());
      setView(st.view || "cards");
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.tags, JSON.stringify(tags)); }, [tags]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ view })); }, [view]);

  const tagMap = useMemo(() => Object.fromEntries(tags.map(t => [t.id, t])), [tags]);
  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter(n => (!q || n.text.toLowerCase().includes(q)) && (!filterTagIds.length || filterTagIds.every(id => n.tagIds.includes(id))))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [notes, query, filterTagIds]);

  function addNote() {
    const text = draftText.trim();
    if (!text) return;
    const newNote: NoteType = { id: uid(), text, tagIds: [...quickTagIds], createdAt: Date.now(), status: draftStatus };
    setNotes(prev => [newNote, ...prev]);
    setDraftText(""); setQuickTagIds([]); setDraftStatus("action"); setTab("notes");
    textareaRef.current?.focus();
  }
  function toggleQuickTag(id: string) { setQuickTagIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])); }
  function removeNote(id: string) { setNotes(prev => prev.filter(n => n.id !== id)); }
  function updateNote(id: string, patch: Partial<NoteType>) { setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n)); }
  function addTag(name: string, color: string) {
    name = name.trim(); if (!name) return;
    const exists = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (exists) { setQuickTagIds(p => (p.includes(exists.id) ? p : [...p, exists.id])); return; }
    const nt: TagType = { id: uid(), name, color }; setTags(p => [...p, nt]); setQuickTagIds(p => [...p, nt.id]);
  }
  function updateTagColor(id: string, color: string) { setTags(prev => prev.map(t => t.id === id ? { ...t, color } : t)); }
  function clearFilters() { setQuery(""); setFilterTagIds([]); searchRef.current?.focus(); }
  function cycleStatus(s: StatusType): StatusType { const i = STATUS_ORDER.indexOf(s); return STATUS_ORDER[(i+1)%STATUS_ORDER.length]; }

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

  const cycleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100" dir="rtl">
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
            <button
              onClick={cycleTheme}
              title={theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}
              className="h-10 px-3 rounded-xl border bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <ViewToggle view={view} setView={setView} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 sm:px-4 pb-28 pt-4 sm:pt-6 grid gap-4 sm:gap-6">
        {tab === "add" && (
          <section className="grid gap-3">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm sm:text-base font-medium">نوشتن یادداشت</span>
                <kbd className="text-xs text-neutral-400">Ctrl/⌘ + Enter</kbd>
              </div>
              <textarea
                ref={textareaRef}
                dir="rtl"
                className="w-full resize-y rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 min-h-[140px] text-right"
                placeholder="متن یادداشت را بنویسید..."
                value={draftText}
                onChange={(e)=>setDraftText(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 justify-between">
                <StatusSegment value={draftStatus} onChange={setDraftStatus} />
                <div className="flex items-center gap-2 ml-auto">
                  <EmojiPicker onPick={(emo)=>insertAtCursor(textareaRef, emo, setDraftText)} />
                  <QuickTags tags={tags} selectedIds={quickTagIds} onToggle={(id)=>setQuickTagIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])} onAdd={(name,color)=>addTag(name,color)} />
                  <button onClick={addNote} className="inline-flex items-center gap-2 px-3 sm:px-4 h-10 sm:h-11 rounded-2xl bg-neutral-900 text-white hover:opacity-90 dark:bg-white dark:text-neutral-900">
                    <Plus className="h-4 w-4" /> ثبت یادداشت
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === "notes" && (
          <>
            <section className="grid gap-3">
              <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2"><Filter className="h-4 w-4" /><span className="text-sm font-medium">فیلتر و جستجو</span></div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجو در متن (کلید / )" className="w-full pl-9 pr-3 h-11 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 text-right" />
                  </div>
                  <div className="sm:hidden"><ViewToggle view={view} setView={setView} /></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 justify-end">
                  {tags.map(t => (
                    <label key={t.id} className="inline-flex items-center gap-2 select-none text-sm">
                      <input type="checkbox" className="accent-black" checked={filterTagIds.includes(t.id)} onChange={e=>setFilterTagIds(prev => (e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id)))} />
                      <ColorDot color={t.color} /><span>{t.name}</span>
                    </label>
                  ))}
                  {!!(query || filterTagIds.length) && (
                    <button onClick={clearFilters} className="ml-auto text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><X className="h-4 w-4 inline mr-1" /> پاک کردن فیلترها</button>
                  )}
                </div>
              </div>
            </section>

            <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
              <div className="p-3 sm:p-4 flex items-center justify-between">
                <div className="text-sm sm:text-base font-medium">یادداشت‌ها</div>
              </div>
              <div className="p-3 sm:p-4">
                {view === "cards" && (<CardView notes={visibleNotes} tagMap={tagMap} onRemove={id=>removeNote(id)} onEdit={setEditing} onCycleStatus={(id)=>updateNote(id, { status: cycleStatus(notes.find(n=>n.id===id)!.status) })} />)}
                {view === "list" && (<ListView notes={visibleNotes} tagMap={tagMap} onRemove={id=>removeNote(id)} onEdit={setEditing} onCycleStatus={(id)=>updateNote(id, { status: cycleStatus(notes.find(n=>n.id===id)!.status) })} />)}
                {view === "table" && (<TableView notes={visibleNotes} tagMap={tagMap} onRemove={id=>removeNote(id)} onEdit={setEditing} onCycleStatus={(id)=>updateNote(id, { status: cycleStatus(notes.find(n=>n.id===id)!.status) })} />)}
                {visibleNotes.length === 0 && (<EmptyState />)}
              </div>
            </section>
          </>
        )}

        {tab === "tags" && (
          <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2"><Tag className="h-4 w-4" /><span className="text-sm font-medium">مدیریت تگ‌ها</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {tags.map(t => (
                <div key={t.id} className="flex items-center gap-2 border rounded-xl p-2 justify-between border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-2"><ColorDot color={t.color} /><span className="text-sm" title={t.name}>{t.name}</span></div>
                  <input type="color" value={t.color} onChange={e=>updateTagColor(t.id, e.target.value)} className="h-8 w-12 p-0 border rounded bg-transparent" title="انتخاب رنگ" />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {editing && (<EditModal note={editing} allTags={tags} onClose={()=>setEditing(null)} onSave={(patch)=>{ updateNote(editing.id, patch); setEditing(null); }} />)}

      <div className="fixed inset-x-0 bottom-4 z-20 pointer-events-none">
        <nav className="pointer-events-auto mx-auto w-[min(calc(100%-32px),560px)]">
          <div className="rounded-[20px] shadow-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-2 grid grid-cols-3 gap-2 items-center justify-center mx-auto">
            <NavBtn active={tab === "notes"} onClick={()=>setTab("notes")} icon={<StickyNote className="h-5 w-5" />} label="یادداشت‌ها" />
            <NavBtn active={tab === "add"} onClick={()=>setTab("add")} icon={<Plus className="h-5 w-5" />} label="یادداشت جدید" />
            <NavBtn active={tab === "tags"} onClick={()=>setTab("tags")} icon={<Settings className="h-5 w-5" />} label="تگ‌ها" />
          </div>
        </nav>
      </div>
    </div>
  );
}

function ViewToggle({ view, setView }: { view: "cards"|"list"|"table"; setView: (v: any)=>void }) {
  const opts = [
    { id: "cards", label: "کارت", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "list", label: "لیست", icon: <List className="h-4 w-4" /> },
    { id: "table", label: "جدول", icon: <TableIcon className="h-4 w-4" /> },
  ];
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-1 flex items-center shadow-sm">
      {opts.map(o => (
        <button key={o.id} className={`px-3 h-10 rounded-xl text-sm inline-flex items-center gap-1 ${view === o.id ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "hover:bg-neutral-100 dark:hover:bg-neutral-700"}`} onClick={() => setView(o.id)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

function StatusSegment({ value, onChange }:{ value: StatusType; onChange: (v: StatusType)=>void }) {
  return (
    <div className="inline-flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-1">
      {STATUS_ORDER.map(s => {
        const m = STATUS_META[s];
        const active = value === s;
        return (
          <button key={s} onClick={()=>onChange(s)} className={`px-3 h-9 rounded-xl text-sm ${active ? `${m.bg} ${m.text} ring-2 ${m.ring} dark:${m.darkBg} dark:${m.darkText} dark:${m.darkRing}` : "hover:bg-white dark:hover:bg-neutral-700"}`}>
            <span className={`inline-block h-2 w-2 rounded-full mr-2 ${m.dot}`} />{m.label}
          </button>
        );
      })}
    </div>
  );
}

function QuickTags({ tags, selectedIds, onToggle, onAdd }:{ tags: TagType[]; selectedIds: string[]; onToggle: (id: string)=>void; onAdd: (name: string, color: string)=>void; }) {
  const [newTag, setNewTag] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      {tags.map(t => (
        <button key={t.id} onClick={() => onToggle(t.id)} className={`px-2 h-9 rounded-xl border text-sm inline-flex items-center gap-2 ${selectedIds.includes(t.id) ? "ring-2 ring-offset-1 ring-neutral-900 dark:ring-white" : ""}`} style={{ borderColor: t.color }} title={`تگ: ${t.name}`}>
          <ColorDot color={t.color} />{t.name}
        </button>
      ))}
      <div className="flex items-center gap-2 border rounded-xl p-1 border-neutral-200 dark:border-neutral-700">
        <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { onAdd(newTag, color); setNewTag(""); } }} placeholder="تگ جدید" className="h-9 px-2 w-24 focus:outline-none text-right bg-transparent" />
        <div className="flex items-center gap-1">
          {PALETTE.slice(0, 6).map(c => (<button key={c} className="h-5 w-5 rounded-full border" style={{ backgroundColor: c }} title={c} onClick={() => setColor(c)} />))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 w-9 p-0 rounded bg-transparent" />
          <button onClick={() => { onAdd(newTag, color); setNewTag(""); }} className="h-9 px-2 rounded-md bg-neutral-900 text-white text-sm dark:bg-white dark:text-neutral-900" title="افزودن تگ">افزودن</button>
        </div>
      </div>
    </div>
  );
}

function CardView({ notes, tagMap, onRemove, onEdit, onCycleStatus }:{ notes: NoteType[]; tagMap: Record<string, TagType>; onRemove: (id: string)=>void; onEdit: (n: NoteType)=>void; onCycleStatus: (id: string)=>void; }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"> 
      {notes.map(n => (
        <div key={n.id} className="rounded-2xl border shadow-sm p-3 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs text-neutral-400">{formatDate(n.createdAt)}</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={n.status} onClick={()=>onCycleStatus(n.id)} />
              <button className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={() => onEdit(n)} title="ویرایش"><Pencil className="h-4 w-4" /></button>
              <button className="text-neutral-400 hover:text-red-600" onClick={() => onRemove(n.id)} title="حذف"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-right">{n.text}</p>
          <div className="mt-3 flex flex-wrap gap-2 justify-end">
            {n.tagIds.map(id => tagMap[id]).filter(Boolean).map(t => (
              <span key={t.id} className="px-2 h-7 inline-flex items-center gap-2 rounded-full border text-xs border-neutral-300 dark:border-neutral-600"><ColorDot color={t.color} />{t.name}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ notes, tagMap, onRemove, onEdit, onCycleStatus }:{ notes: NoteType[]; tagMap: Record<string, TagType>; onRemove: (id: string)=>void; onEdit: (n: NoteType)=>void; onCycleStatus: (id: string)=>void; }) {
  return (
    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {notes.map(n => (
        <div key={n.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
          <div className="sm:w-40 text-xs text-neutral-400">{formatDate(n.createdAt)}</div>
          <div className="flex-1 whitespace-pre-wrap text-right">{n.text}</div>
          <div className="flex items-center gap-2 ml-auto">
            <StatusBadge status={n.status} onClick={()=>onCycleStatus(n.id)} />
            <button className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={() => onEdit(n)} title="ویرایش"><Pencil className="h-4 w-4" /></button>
            <button className="text-neutral-400 hover:text-red-600" onClick={() => onRemove(n.id)} title="حذف"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {n.tagIds.map(id => tagMap[id]).filter(Boolean).map(t => (
              <span key={t.id} className="px-2 h-7 inline-flex items-center gap-2 rounded-full border text-xs border-neutral-300 dark:border-neutral-600"><ColorDot color={t.color} />{t.name}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableView({ notes, tagMap, onRemove, onEdit, onCycleStatus }:{ notes: NoteType[]; tagMap: Record<string, TagType>; onRemove: (id: string)=>void; onEdit: (n: NoteType)=>void; onCycleStatus: (id: string)=>void; }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left bg-neutral-50 dark:bg-neutral-800">
            <th className="p-2">تاریخ</th>
            <th className="p-2">وضعیت</th>
            <th className="p-2">متن</th>
            <th className="p-2">تگ‌ها</th>
            <th className="p-2 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {notes.map(n => (
            <tr key={n.id} className="border-t border-neutral-200 dark:border-neutral-800">
              <td className="p-2 text-neutral-500 whitespace-nowrap">{formatDate(n.createdAt)}</td>
              <td className="p-2"><StatusBadge status={n.status} onClick={()=>onCycleStatus(n.id)} /></td>
              <td className="p-2 whitespace-pre-wrap text-right">{n.text}</td>
              <td className="p-2">
                <div className="flex flex-wrap gap-2 justify-end">
                  {n.tagIds.map(id => tagMap[id]).filter(Boolean).map(t => (
                    <span key={t.id} className="px-2 h-7 inline-flex items-center gap-2 rounded-full border text-xs border-neutral-300 dark:border-neutral-600"><ColorDot color={t.color} />{t.name}</span>
                  ))}
                </div>
              </td>
              <td className="p-2 text-right">
                <button className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mr-2" onClick={() => onEdit(n)} title="ویرایش"><Pencil className="h-4 w-4" /></button>
                <button className="text-neutral-400 hover:text-red-600" onClick={() => onRemove(n.id)} title="حذف"><Trash2 className="h-4 w-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState() {
  return <div className="py-16 text-center text-neutral-400">هنوز یادداشتی مطابق فیلترها وجود ندارد.<div className="mt-2 text-xs">یک یادداشت جدید بسازید یا فیلترها را پاک کنید.</div></div>;
}

function ColorDot({ color }:{ color: string }) { return <span className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color }} />; }

function NavBtn({ active, onClick, icon, label }:{ active: boolean; onClick: ()=>void; icon: React.ReactNode; label: string; }) {
  return <button onClick={onClick} className={`h-12 rounded-xl flex items-center justify-center gap-2 text-sm ${active ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"}`}>{icon}<span>{label}</span></button>;
}

function EmojiPicker({ onPick }:{ onPick: (e: string)=>void; }) {
  const [open, setOpen] = useState(false);
  const EMOJIS = ["😀","😄","😁","😊","😍","🤩","😎","🤔","😇","😴","😅","😢","🔥","✨","✅","📌","📝","⚡","🚀","💡"];
  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)} className="px-2 h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 inline-flex items-center gap-2"><Smile className="h-4 w-4"/> ایموجی</button>
      {open && (
        <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow p-2 grid grid-cols-10 gap-1 z-10">
          {EMOJIS.map(e => (<button key={e} className="h-8 w-8 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-lg" onClick={()=>{ onPick(e); setOpen(false); }}>{e}</button>))}
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

function defaultTags(): TagType[] { return [ { id: uid(), name: "ایده", color: "#3b82f6" }, { id: uid(), name: "کارها", color: "#10b981" }, { id: uid(), name: "شخصی", color: "#f59e0b" }, ]; }

function StatusBadge({ status, onClick }:{ status: StatusType; onClick?: ()=>void }) {
  const m = STATUS_META[status];
  return <button onClick={onClick} className={`inline-flex items-center gap-2 px-2 h-7 rounded-full border text-xs ${m.bg} ${m.text} ring-1 ${m.ring} dark:${m.darkBg} dark:${m.darkText} dark:ring-1 dark:${m.darkRing} ${onClick ? "hover:opacity-90" : ""}`} title="تغییر سریع وضعیت"><span className={`h-2 w-2 rounded-full ${m.dot}`} />{m.label}</button>;
}

function EditModal({ note, allTags, onClose, onSave }:{ note: NoteType; allTags: TagType[]; onClose: ()=>void; onSave: (patch: Partial<NoteType>)=>void }) {
  const [text, setText] = useState(note.text);
  const [status, setStatus] = useState<StatusType>(note.status);
  const [selected, setSelected] = useState<string[]>(note.tagIds);
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full sm:w-[560px] max-h-[90vh] overflow-auto bg-white dark:bg-neutral-800 rounded-t-3xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-neutral-500">ویرایش یادداشت</div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><X className="h-5 w-5"/></button>
        </div>
        <div className="grid gap-3">
          <StatusSegment value={status} onChange={setStatus} />
          <textarea dir="rtl" className="w-full min-h-[140px] rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 text-right" value={text} onChange={(e)=>setText(e.target.value)} />
          <div className="flex flex-wrap gap-2 justify-end">
            {allTags.map(t => (
              <button key={t.id} onClick={()=>toggle(t.id)} className={`px-2 h-9 rounded-xl border text-sm inline-flex items-center gap-2 ${selected.includes(t.id) ? "ring-2 ring-offset-1 ring-neutral-900 dark:ring-white" : ""}`} style={{ borderColor: t.color }}>
                <ColorDot color={t.color} />{t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-neutral-400">ایجاد شده در {formatDate(note.createdAt)}</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-10 px-3 rounded-2xl border border-neutral-200 dark:border-neutral-700">انصراف</button>
            <button onClick={()=>onSave({ text, status, tagIds: selected })} className="h-10 px-4 rounded-2xl bg-neutral-900 text-white inline-flex items-center gap-2 dark:bg-white dark:text-neutral-900"><Check className="h-4 w-4"/> ذخیره</button>
          </div>
        </div>
      </div>
    </div>
  );
}
