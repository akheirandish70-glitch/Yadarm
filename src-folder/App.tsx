import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Tag, Trash2, LayoutGrid, List, Table as TableIcon, Filter, X, Save, Smartphone, MonitorSmartphone, Search, Smile, StickyNote, Settings } from "lucide-react";

type TagType = { id: string; name: string; color: string };
type NoteType = { id: string; text: string; tagIds: string[]; createdAt: number };

const uid = () => Math.random().toString(36).slice(2, 10);
const formatDate = (ts: number) => new Date(ts).toLocaleString("fa-IR");

const STORAGE_KEYS = { notes: "mn_notes_v1", tags: "mn_tags_v1", settings: "mn_settings_v1" };
const PALETTE = ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316"];

export default function MinimalNotesApp() {
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [view, setView] = useState<"cards"|"list"|"table">("cards");
  const [query, setQuery] = useState("");
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [dense, setDense] = useState(false);
  const [tab, setTab] = useState<"notes"|"add"|"tags">("notes");

  const [draftText, setDraftText] = useState("");
  const [quickTagIds, setQuickTagIds] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // ---- load/save (localStorage) ----
  useEffect(() => {
    try {
      const ns = JSON.parse(localStorage.getItem(STORAGE_KEYS.notes) || "[]");
      const ts = JSON.parse(localStorage.getItem(STORAGE_KEYS.tags) || "[]");
      const st = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
      setNotes(ns);
      setTags(ts.length ? ts : defaultTags());
      setView(st.view || "cards");
      setDense(!!st.dense);
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.tags, JSON.stringify(tags)); }, [tags]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ view, dense })); }, [view, dense]);

  // ---- derived ----
  const tagMap = useMemo(() => Object.fromEntries(tags.map(t => [t.id, t])), [tags]);
  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter(n => (!q || n.text.toLowerCase().includes(q)) && (!filterTagIds.length || filterTagIds.every(id => n.tagIds.includes(id))))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [notes, query, filterTagIds]);

  // ---- actions ----
  function addNote() {
    const text = draftText.trim();
    if (!text) return;
    const newNote: NoteType = { id: uid(), text, tagIds: [...quickTagIds], createdAt: Date.now() };
    setNotes(prev => [newNote, ...prev]);
    setDraftText(""); setQuickTagIds([]);
    setTab("notes");
    textareaRef.current?.focus();
  }
  function toggleQuickTag(id: string) { setQuickTagIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])); }
  function removeNote(id: string) { setNotes(prev => prev.filter(n => n.id !== id)); }
  function addTag(name: string, color: string) {
    name = name.trim();
    if (!name) return;
    const exists = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (exists) { setQuickTagIds(prev => (prev.includes(exists.id) ? prev : [...prev, exists.id])); return; }
    const nt: TagType = { id: uid(), name, color };
    setTags(prev => [...prev, nt]);
    setQuickTagIds(prev => [...prev, nt.id]);
  }
  function updateTagColor(id: string, color: string) { setTags(prev => prev.map(t => (t.id === id ? { ...t, color } : t))); }
  function clearFilters() { setQuery(""); setFilterTagIds([]); searchRef.current?.focus(); }

  // shortcuts
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
  }, [draftText, quickTagIds]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-neutral-900 text-white grid place-items-center shadow"><Tag className="h-5 w-5" /></div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Minimal Notes</h1>
              <p className="text-xs text-neutral-500">ساده، سریع، مینیمال — وب‌اپ</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle view={view} setView={setView} />
            <button className={`px-3 h-9 rounded-xl border text-sm ${dense ? "bg-neutral-900 text-white" : "bg-white"}`} onClick={() => setDense(d => !d)} title="تغییر تراکم نمایش">
              <Save className="h-4 w-4 mr-1 inline" />{dense ? "فشرده" : "عادی"}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 grid gap-6">{/* pb for bottom nav */}
        {/* ADD TAB */}
        {tab === "add" && (
          <section className="grid gap-3">
            <div className="bg-white rounded-2xl border shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">نوشتن یادداشت</span>
                <kbd className="text-xs text-neutral-400">Ctrl/⌘ + Enter</kbd>
              </div>
              <textarea
                ref={textareaRef}
                dir="rtl"
                className="w-full resize-none rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 min-h-[120px] text-right"
                placeholder="متن یادداشت را بنویسید..."
                value={draftText}
                onChange={(e)=>setDraftText(e.target.value)}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 justify-end">
                <EmojiPicker onPick={(emo)=>insertAtCursor(textareaRef, emo, setDraftText)} />
                <QuickTags tags={tags} selectedIds={quickTagIds} onToggle={toggleQuickTag} onAdd={(name, color)=>addTag(name, color)} />
                <button onClick={addNote} className="inline-flex items-center gap-2 px-3 h-10 rounded-xl bg-neutral-900 text-white hover:opacity-90">
                  <Plus className="h-4 w-4" /> ثبت یادداشت
                </button>
              </div>
            </div>
          </section>
        )}

        {/* NOTES TAB */}
        {tab === "notes" && (
          <>
            <section className="grid gap-3">
              <div className="bg-white rounded-2xl border shadow-sm p-3">
                <div className="flex items-center gap-2 mb-2"><Filter className="h-4 w-4" /><span className="text-sm font-medium">فیلتر و جستجو</span></div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجو در متن (کلید / )" className="w-full pl-9 pr-3 h-10 rounded-xl border focus:outline-none focus:ring-2 focus:ring-neutral-900/10 text-right" />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 justify-end">
                  {tags.map(t => (
                    <label key={t.id} className="inline-flex items-center gap-2 select-none text-sm">
                      <input type="checkbox" checked={filterTagIds.includes(t.id)} onChange={e=>setFilterTagIds(prev => (e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id)))} />
                      <ColorDot color={t.color} /><span>{t.name}</span>
                    </label>
                  ))}
                  {!!(query || filterTagIds.length) && (
                    <button onClick={clearFilters} className="ml-auto text-sm text-neutral-500 hover:text-neutral-900"><X className="h-4 w-4 inline mr-1" /> پاک کردن فیلترها</button>
                  )}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border shadow-sm">
              <div className="p-3 flex items-center justify-between">
                <div className="text-sm font-medium">یادداشت‌ها</div>
                <div className="flex items-center gap-2 text-xs text-neutral-500"><Smartphone className="h-4 w-4" /> موبایل <MonitorSmartphone className="h-4 w-4" /> دسکتاپ</div>
              </div>
              <div className={`${dense ? "p-2" : "p-4"}`}>
                {view === "cards" && (<CardView notes={visibleNotes} tagMap={tagMap} dense={dense} onRemove={removeNote} />)}
                {view === "list" && (<ListView notes={visibleNotes} tagMap={tagMap} dense={dense} onRemove={removeNote} />)}
                {view === "table" && (<TableView notes={visibleNotes} tagMap={tagMap} onRemove={removeNote} />)}
                {visibleNotes.length === 0 && (<EmptyState />)}
              </div>
            </section>
          </>
        )}

        {/* TAGS TAB */}
        {tab === "tags" && (
          <section className="bg-white rounded-2xl border shadow-sm p-3">
            <div className="flex items-center gap-2 mb-2"><Tag className="h-4 w-4" /><span className="text-sm font-medium">مدیریت تگ‌ها</span></div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {tags.map(t => (
                <div key={t.id} className="flex items-center gap-2 border rounded-xl p-2 justify-between">
                  <div className="flex items-center gap-2"><ColorDot color={t.color} /><span className="text-sm" title={t.name}>{t.name}</span></div>
                  <input type="color" value={t.color} onChange={e=>updateTagColor(t.id, e.target.value)} className="h-7 w-10 p-0 border rounded" title="انتخاب رنگ" />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t">
        <div className="mx-auto max-w-6xl px-2 py-2 grid grid-cols-3 gap-2">
          <NavBtn active={tab === "notes"} onClick={()=>setTab("notes")} icon={<StickyNote className="h-5 w-5" />} label="یادداشت‌ها" />
          <NavBtn active={tab === "add"} onClick={()=>setTab("add")} icon={<Plus className="h-5 w-5" />} label="یادداشت جدید" />
          <NavBtn active={tab === "tags"} onClick={()=>setTab("tags")} icon={<Settings className="h-5 w-5" />} label="تگ‌ها" />
        </div>
      </nav>

      <footer className="py-16 text-center text-xs text-neutral-400">ساخته‌شده با React + Tailwind — ذخیره‌سازی محلی مرورگر</footer>
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
    <div className="bg-white border rounded-xl p-1 flex items-center shadow-sm">
      {opts.map(o => (
        <button key={o.id} className={`px-3 h-9 rounded-lg text-sm inline-flex items-center gap-1 ${view === o.id ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`} onClick={() => setView(o.id)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

function QuickTags({ tags, selectedIds, onToggle, onAdd }:{
  tags: TagType[]; selectedIds: string[]; onToggle: (id: string)=>void; onAdd: (name: string, color: string)=>void;
}) {
  const [newTag, setNewTag] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      {tags.map(t => (
        <button key={t.id} onClick={() => onToggle(t.id)} className={`px-2 h-8 rounded-lg border text-sm inline-flex items-center gap-2 ${selectedIds.includes(t.id) ? "ring-2 ring-offset-1 ring-neutral-900" : ""}`} style={{ borderColor: t.color }} title={`تگ: ${t.name}`}>
          <ColorDot color={t.color} />{t.name}
        </button>
      ))}
      <div className="flex items-center gap-2 border rounded-lg p-1">
        <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { onAdd(newTag, color); setNewTag(""); } }} placeholder="تگ جدید" className="h-8 px-2 w-24 focus:outline-none text-right" />
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1">
            {PALETTE.slice(0, 6).map(c => (<button key={c} className="h-5 w-5 rounded-full border" style={{ backgroundColor: c }} title={c} onClick={() => setColor(c)} />))}
          </div>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-8 p-0 rounded" />
          <button onClick={() => { onAdd(newTag, color); setNewTag(""); }} className="h-8 px-2 rounded-md bg-neutral-900 text-white text-sm" title="افزودن تگ">افزودن</button>
        </div>
      </div>
    </div>
  );
}

function CardView({ notes, tagMap, dense, onRemove }:{ notes: NoteType[]; tagMap: Record<string, TagType>; dense: boolean; onRemove: (id: string)=>void; }) {
  const cols = dense ? "sm:grid-cols-3 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid grid-cols-1 ${cols} gap-3`}>
      {notes.map(n => (
        <div key={n.id} className="rounded-2xl border shadow-sm p-3 bg-white">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs text-neutral-400">{formatDate(n.createdAt)}</span>
            <button className="text-neutral-400 hover:text-red-600" onClick={() => onRemove(n.id)} title="حذف"><Trash2 className="h-4 w-4" /></button>
          </div>
          <p className={`mt-2 whitespace-pre-wrap ${dense ? "text-sm" : "text-base"} text-right`}>{n.text}</p>
          <div className="mt-3 flex flex-wrap gap-2 justify-end">
            {n.tagIds.map(id => tagMap[id]).filter(Boolean).map(t => (
              <span key={t.id} className="px-2 h-7 inline-flex items-center gap-2 rounded-full border text-xs" style={{ borderColor: t.color }}><ColorDot color={t.color} />{t.name}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ notes, tagMap, dense, onRemove }:{ notes: NoteType[]; tagMap: Record<string, TagType>; dense: boolean; onRemove: (id: string)=>void; }) {
  return (
    <div className="divide-y">
      {notes.map(n => (
        <div key={n.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 py-3 ${dense ? "text-sm" : "text-base"}`}>
          <div className="sm:w-40 text-xs text-neutral-400">{formatDate(n.createdAt)}</div>
          <div className="flex-1 whitespace-pre-wrap text-right">{n.text}</div>
          <div className="flex flex-wrap gap-2 justify-end">
            {n.tagIds.map(id => tagMap[id]).filter(Boolean).map(t => (
              <span key={t.id} className="px-2 h-7 inline-flex items-center gap-2 rounded-full border text-xs" style={{ borderColor: t.color }}><ColorDot color={t.color} />{t.name}</span>
            ))}
          </div>
          <button className="text-neutral-400 hover:text-red-600 ml-auto" onClick={() => onRemove(n.id)} title="حذف"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

function TableView({ notes, tagMap, onRemove }:{ notes: NoteType[]; tagMap: Record<string, TagType>; onRemove: (id: string)=>void; }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left bg-neutral-50">
            <th className="p-2">تاریخ</th>
            <th className="p-2">متن</th>
            <th className="p-2">تگ‌ها</th>
            <th className="p-2 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {notes.map(n => (
            <tr key={n.id} className="border-t">
              <td className="p-2 text-neutral-500 whitespace-nowrap">{formatDate(n.createdAt)}</td>
              <td className="p-2 whitespace-pre-wrap text-right">{n.text}</td>
              <td className="p-2">
                <div className="flex flex-wrap gap-2 justify-end">
                  {n.tagIds.map(id => tagMap[id]).filter(Boolean).map(t => (
                    <span key={t.id} className="px-2 h-7 inline-flex items-center gap-2 rounded-full border text-xs" style={{ borderColor: t.color }}><ColorDot color={t.color} />{t.name}</span>
                  ))}
                </div>
              </td>
              <td className="p-2 text-right"><button className="text-neutral-400 hover:text-red-600" onClick={() => onRemove(n.id)} title="حذف"><Trash2 className="h-4 w-4" /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center text-neutral-400">
      هنوز یادداشتی مطابق فیلترها وجود ندارد.
      <div className="mt-2 text-xs">یک یادداشت جدید بسازید یا فیلترها را پاک کنید.</div>
    </div>
  );
}

function ColorDot({ color }:{ color: string }) {
  return <span className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color }} />;
}

function NavBtn({ active, onClick, icon, label }:{ active: boolean; onClick: ()=>void; icon: React.ReactNode; label: string; }) {
  return (
    <button onClick={onClick} className={`h-12 rounded-xl border flex items-center justify-center gap-2 text-sm ${active ? "bg-neutral-900 text-white" : "bg-white hover:bg-neutral-50"}`}>
      {icon}<span>{label}</span>
    </button>
  );
}

function EmojiPicker({ onPick }:{ onPick: (e: string)=>void; }) {
  const [open, setOpen] = useState(false);
  const EMOJIS = ["😀","😄","😁","😊","😍","🤩","😎","🤔","😇","😴","😅","😢","🔥","✨","✅","📌","📝","⚡","🚀","💡"];
  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)} className="px-2 h-10 rounded-xl border inline-flex items-center gap-2"><Smile className="h-4 w-4"/> ایموجی</button>
      {open && (
        <div className="absolute bottom-full mb-2 right-0 bg-white border rounded-xl shadow p-2 grid grid-cols-10 gap-1 z-10">
          {EMOJIS.map(e => (<button key={e} className="h-8 w-8 rounded hover:bg-neutral-100 text-lg" onClick={()=>{ onPick(e); setOpen(false); }}>{e}</button>))}
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
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + text.length;
    el.setSelectionRange(pos, pos);
  });
}

function defaultTags(): TagType[] {
  return [
    { id: uid(), name: "ایده", color: "#3b82f6" },
    { id: uid(), name: "کارها", color: "#10b981" },
    { id: uid(), name: "شخصی", color: "#f59e0b" },
  ];
}
