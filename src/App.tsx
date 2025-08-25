import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Tag, Trash2, LayoutGrid, List, Filter, X, Search, Smile, StickyNote, Settings as SettingsIcon, Pencil, Check, Moon, Sun } from "lucide-react";
import { supabase } from "./lib.supabase";

type StatusType = "action" | "plan" | "done";
type TagRow = { id: string; user_id?: string; name: string; color: string; created_at?: string };
type NoteRow = { id: string; user_id?: string; text: string; tag_ids: string[]; status: StatusType; created_at: string };

const STATUS_TEXT: Record<StatusType,string> = { action: "اکشن", plan: "پلن", done: "اتمام" };
const STATUS_ORDER: StatusType[] = ["action","plan","done"];
const formatDate = (iso: string) => new Date(iso).toLocaleString("fa-IR");

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [tab, setTab] = useState<"notes"|"add"|"settings">("notes");
  const [view, setView] = useState<"cards"|"list">("cards");
  const [query, setQuery] = useState("");
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<StatusType[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [editing, setEditing] = useState<NoteRow | null>(null);
  const [theme, setTheme] = useState<"light"|"dark">((localStorage.getItem("yadarm_theme") as any) || "light");

  // add form
  const [draftText, setDraftText] = useState("");
  const [draftStatus, setDraftStatus] = useState<StatusType>("action");
  const [quickTagIds, setQuickTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6b7280");

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // theme
  useEffect(() => {
    localStorage.setItem("yadarm_theme", theme);
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  // auth
  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    })();
    return () => { sub.data.subscription.unsubscribe(); }
  }, []);

  // load data
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: tagsData } = await supabase.from("tags").select("*").order("created_at", { ascending: true });
      setTags(tagsData || []);
      const { data: notesData } = await supabase.from("notes").select("*").order("created_at", { ascending: false });
      setNotes(notesData || []);
    })();
  }, [session]);

  const tagMap = useMemo(() => Object.fromEntries(tags.map(t => [t.id, t])), [tags]);
  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter(n => {
        const matchText = !q || n.text.toLowerCase().includes(q);
        const matchTags = !filterTagIds.length || filterTagIds.every(id => (n.tag_ids || []).includes(id));
        const matchStatus = !filterStatuses.length || filterStatuses.includes(n.status);
        return matchText && matchTags && matchStatus;
      });
  }, [notes, query, filterTagIds, filterStatuses]);

  // CRUD
  async function addNote() {
    const text = draftText.trim();
    if (!text || !session) return;
    const payload = { text, tag_ids: quickTagIds, status: draftStatus, user_id: session.user.id };
    const { data, error } = await supabase.from("notes").insert(payload).select("*").single();
    if (error) { alert(error.message); return; }
    setNotes(prev => [data!, ...prev]);
    setDraftText("");
    setDraftStatus("action");
    setQuickTagIds([]);
    textareaRef.current?.focus();
  }
  async function removeNote(id: string) {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (!error) setNotes(prev => prev.filter(n => n.id === id));
  }
  async function updateNote(id: string, patch: Partial<NoteRow>) {
    const { data, error } = await supabase.from("notes").update(patch).eq("id", id).select("*").single();
    if (!error && data) setNotes(prev => prev.map(n => (n.id === id ? data : n)));
  }
  async function addTag(name: string, color: string) {
    const nm = name.trim();
    if (!nm || !session) return;
    const exists = tags.find(t => t.name.toLowerCase() === nm.toLowerCase());
    if (exists) { setQuickTagIds(p => (p.includes(exists.id) ? p : [...p, exists.id])); return; }
    const { data, error } = await supabase.from("tags").insert({ name: nm, color, user_id: session.user.id }).select("*").single();
    if (!error && data) { setTags(p => [...p, data!]); setQuickTagIds(p => [...p, data!.id]); setNewTagName(""); }
  }
  async function updateTagColor(id: string, color: string) {
    const { data } = await supabase.from("tags").update({ color }).eq("id", id).select("*").single();
    if (data) setTags(prev => prev.map(t => t.id === id ? data : t));
  }
  function cycleStatus(s: StatusType): StatusType {
    const i = STATUS_ORDER.indexOf(s); return STATUS_ORDER[(i+1)%STATUS_ORDER.length];
  }
  function clearFilters() { setQuery(""); setFilterTagIds([]); setFilterStatuses([]); searchRef.current?.focus(); }

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
  }, [draftText, quickTagIds, draftStatus]);

  if (!session) {
    return <AuthScreen theme={theme} setTheme={setTheme} />;
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 dark:bg-neutral-900/90 border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-neutral-900 text-white grid place-items-center shadow dark:bg-neutral-800"><Tag className="h-5 w-5" /></div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Yadarm</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">یادداشت آرمین</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            
            <button onClick={()=>setTheme(theme === "dark" ? "light" : "dark")} className="h-10 w-10 rounded-xl border grid place-items-center">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-3 sm:px-4 pb-28 pt-4 sm:pt-6 grid gap-4 sm:gap-6">
        {/* ADD TAB */}
        {tab === "add" && (
          <section className="grid gap-3 max-w-3xl mx-auto">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm sm:text-base font-medium">نوشتن یادداشت</span>
                <kbd className="text-xs text-neutral-400">Ctrl/⌘ + Enter</kbd>
              </div>
              <textarea
                ref={textareaRef}
                dir="rtl"
                className="w-full resize-y rounded-2xl border border-neutral-200 dark:border-neutral-700 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 min-h-[140px] text-right bg-white dark:bg-neutral-900"
                placeholder="متن یادداشت را بنویسید..."
                value={draftText}
                onChange={(e)=>setDraftText(e.target.value)}
              />
              <div className="mt-3 grid gap-2">
                <div className="flex flex-wrap items-center gap-2 justify-end">
                  {tags.map(t => (
                    <button key={t.id} onClick={() => setQuickTagIds(p => p.includes(t.id) ? p.filter(x=>x!==t.id) : [...p, t.id])} className={`px-2 h-9 rounded-xl border text-sm inline-flex items-center gap-2 ${quickTagIds.includes(t.id) ? "ring-2 ring-offset-1 ring-neutral-900 dark:ring-neutral-200" : ""}`} style={{ borderColor: t.color }}>
                      <ColorDot color={t.color} />{t.name}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <input value={newTagName} onChange={e=>setNewTagName(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") addTag(newTagName, newTagColor); }} placeholder="تگ جدید" className="h-10 px-2 w-28 focus:outline-none text-right rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900" />
                  <input type="color" value={newTagColor} onChange={e=>setNewTagColor(e.target.value)} className="h-10 w-10 p-0 rounded" title="انتخاب رنگ" />
                  <button onClick={()=>addNote()} className="h-10 px-3 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-sm inline-flex items-center gap-2"><Plus className="h-4 w-4" /> ثبت یادداشت</button>
                </div>
                <div className="flex items-center gap-2 justify-between">
                  <StatusSegment value={draftStatus} onChange={setDraftStatus} />
                  <EmojiPicker onPick={(emo)=>insertAtCursor(textareaRef, emo, setDraftText)} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* NOTES TAB */}
        {tab === "notes" && (
          <>
            <section className="grid gap-3 max-w-3xl mx-auto">
              <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2"><Filter className="h-4 w-4" /><span className="text-sm font-medium">فیلتر و جستجو</span></div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <input ref={searchRef} value={query} onChange={e=>setQuery(e.target.value)} placeholder="جستجو در متن (کلید / )" className="w-full pl-9 pr-3 h-11 focus:h-14 transition-all rounded-2xl border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 text-right bg-white dark:bg-neutral-900" />
                  </div>
                  <div><ViewToggle view={view} setView={setView} /></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 justify-between">
                  <div className="flex flex-wrap gap-2 justify-start">
                    {tags.map(t => (
                      <label key={t.id} className="inline-flex items-center gap-2 select-none text-sm">
                        <input type="checkbox" className="accent-black" checked={filterTagIds.includes(t.id)} onChange={e=>setFilterTagIds(prev => (e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id)))} />
                        <ColorDot color={t.color} /><span>{t.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {(["action","plan","done"] as StatusType[]).map(s => (
                      <label key={s} className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" className="accent-black" checked={filterStatuses.includes(s)} onChange={e=>setFilterStatuses(p=> e.target.checked ? [...p,s] : p.filter(x=>x!==s))} />
                        <span className="text-neutral-600 dark:text-neutral-300">{STATUS_TEXT[s]}</span>
                      </label>
                    ))}
                  </div>
                  {!!(query || filterTagIds.length || filterStatuses.length) && (
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
                {view === "cards" && (<CardView notes={visibleNotes} tagMap={tagMap} onRemove={removeNote} onEdit={setEditing} onCycleStatus={(id)=>{
                  const n = notes.find(x=>x.id===id)!; updateNote(id, { status: cycleStatus(n.status) });
                }} />)}
                {view === "list" && (<ListView notes={visibleNotes} tagMap={tagMap} onRemove={removeNote} onEdit={setEditing} onCycleStatus={(id)=>{
                  const n = notes.find(x=>x.id===id)!; updateNote(id, { status: cycleStatus(n.status) });
                }} />)}
                {visibleNotes.length === 0 && (<EmptyState />)}
              </div>
            </section>
          </>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <SettingsPanel onLogout={async()=>{ await supabase.auth.signOut(); }} onChangePassword={async(pw)=>{
            await supabase.auth.updateUser({ password: pw });
            alert("رمز عبور تغییر کرد.");
          }} />
        )}
      </main>

      {/* Edit Modal */}
      {editing && (
        <EditModal
          note={editing}
          allTags={tags}
          onClose={() => setEditing(null)}
          onSave={async (patch) => { await updateNote(editing.id, patch as any); setEditing(null); }}
        />
      )}

      {/* Bottom Navigation - Island */}
      <div className="fixed inset-x-0 bottom-4 z-20 pointer-events-none">
        <nav className="pointer-events-auto mx-auto w-[min(calc(100%-32px),560px)]">
          <div className="rounded-[20px] shadow-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-2 grid grid-cols-3 gap-2 items-center justify-center mx-auto">
            <NavBtn active={tab === "notes"} onClick={()=>setTab("notes")} icon={<StickyNote className="h-5 w-5" />} label="یادداشت‌ها" />
            <NavBtn active={tab === "add"} onClick={()=>setTab("add")} icon={<Plus className="h-5 w-5" />} label="یادداشت جدید" />
            <NavBtn active={tab === "settings"} onClick={()=>setTab("settings")} icon={<SettingsIcon className="h-5 w-5" />} label="تنظیمات" />
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
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-1 flex items-center shadow-sm">
      {opts.map(o => (
        <button key={o.id} className={`px-3 h-10 rounded-xl text-sm inline-flex items-center gap-1 ${view === o.id ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900" : "hover:bg-neutral-100 dark:hover:bg-neutral-700"}`} onClick={() => setView(o.id as any)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

function StatusSegment({ value, onChange }:{ value: StatusType; onChange: (v: StatusType)=>void }) {
  const BTN = "px-3 h-9 rounded-xl text-sm hover:bg-white dark:hover:bg-neutral-700";
  const ACTIVE = "ring-2 ring-neutral-300 dark:ring-neutral-600 bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100";
  return (
    <div className="inline-flex items-center bg-neutral-100 dark:bg-neutral-700 rounded-2xl p-1">
      {(["action","plan","done"] as StatusType[]).map(s => (
        <button key={s} onClick={()=>onChange(s)} className={`${BTN} ${value===s?ACTIVE:""}`}>{STATUS_TEXT[s]}</button>
      ))}
    </div>
  );
}

function CardView({ notes, tagMap, onRemove, onEdit, onCycleStatus }:{ notes: NoteRow[]; tagMap: Record<string, TagRow>; onRemove: (id: string)=>void; onEdit: (n: NoteRow)=>void; onCycleStatus: (id: string)=>void; }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`}>
      {notes.map(n => (
        <div key={n.id} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-3 bg-white dark:bg-neutral-800">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs text-neutral-400">{formatDate(n.created_at)}</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={n.status} onClick={()=>onCycleStatus(n.id)} />
              <button className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={() => onEdit(n)} title="ویرایش"><Pencil className="h-4 w-4" /></button>
              <button className="text-neutral-400 hover:text-red-600" onClick={() => onRemove(n.id)} title="حذف"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <p className={`mt-2 whitespace-pre-wrap text-base leading-7 text-right`}>{n.text}</p>
          <div className="mt-3 flex flex-wrap gap-2 justify-end">
            {(n.tag_ids||[]).map(id => tagMap[id]).filter(Boolean).map(t => (
              <span key={t.id} className="px-2 h-7 inline-flex items-center gap-2 rounded-full border text-xs" style={{ borderColor: t.color }}><ColorDot color={t.color} />{t.name}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({ notes, tagMap, onRemove, onEdit, onCycleStatus }:{ notes: NoteRow[]; tagMap: Record<string, TagRow>; onRemove: (id: string)=>void; onEdit: (n: NoteRow)=>void; onCycleStatus: (id: string)=>void; }) {
  return (
    <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
      {notes.map(n => (
        <div key={n.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 py-3`}>
          <div className="sm:w-40 text-xs text-neutral-400">{formatDate(n.created_at)}</div>
          <div className="flex-1 whitespace-pre-wrap text-right">{n.text}</div>
          <div className="flex items-center gap-2 ml-auto">
            <StatusBadge status={n.status} onClick={()=>onCycleStatus(n.id)} />
            <button className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={() => onEdit(n)} title="ویرایش"><Pencil className="h-4 w-4" /></button>
            <button className="text-neutral-400 hover:text-red-600" onClick={() => onRemove(n.id)} title="حذف"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {(n.tag_ids||[]).map(id => tagMap[id]).filter(Boolean).map(t => (
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
    <button onClick={onClick} className={`h-12 rounded-xl flex items-center justify-center gap-2 text-sm ${active ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900" : "bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700"} border border-neutral-200 dark:border-neutral-700`}>
      {icon}<span>{label}</span>
    </button>
  );
}

function EmojiPicker({ onPick }:{ onPick: (e: string)=>void; }) {
  const [open, setOpen] = useState(false);
  const EMOJIS = ["😀","😄","😁","😊","😍","🤩","😎","🤔","😇","😴","😅","😢","🔥","✨","✅","📌","📝","⚡","🚀","💡"];
  return (
    <div className="relative">
      <button onClick={()=>setOpen(o=>!o)} className="px-2 h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 inline-flex items-center gap-2 bg-white dark:bg-neutral-900"><Smile className="h-4 w-4"/> ایموجی</button>
      {open && (
        <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow p-2 grid grid-cols-10 gap-1 z-10">
          {EMOJIS.map(e => (
            <button key={e} className="h-8 w-8 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-lg" onClick={()=>{ onPick(e); setOpen(false); }}>{e}</button>
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

function StatusBadge({ status, onClick }:{ status: StatusType; onClick?: ()=>void }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-2 px-2 h-7 rounded-full border text-xs text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700 ${onClick ? "hover:opacity-90" : ""}`} title="تغییر سریع وضعیت">
      <span className="h-2 w-2 rounded-full bg-neutral-500" />{STATUS_TEXT[status]}
    </button>
  );
}

function EditModal({ note, allTags, onClose, onSave }:{ note: NoteRow; allTags: TagRow[]; onClose: ()=>void; onSave: (patch: Partial<NoteRow>)=>void }) {
  const [text, setText] = useState(note.text);
  const [status, setStatus] = useState<StatusType>(note.status);
  const [selected, setSelected] = useState<string[]>(note.tag_ids || []);
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full sm:w-[560px] max-h-[90vh] overflow-auto bg-white dark:bg-neutral-800 rounded-t-3xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-neutral-500">ویرایش یادداشت</div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"><X className="h-5 w-5"/></button>
        </div>
        <div className="grid gap-3">
          <StatusSegment value={status} onChange={setStatus} />
          <textarea dir="rtl" className="w-full min-h-[140px] rounded-2xl border border-neutral-200 dark:border-neutral-700 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 text-right bg-white dark:bg-neutral-900" value={text} onChange={(e)=>setText(e.target.value)} />
          <div className="flex flex-wrap gap-2 justify-end">
            {allTags.map(t => (
              <button key={t.id} onClick={()=>toggle(t.id)} className={`px-2 h-9 rounded-xl border text-sm inline-flex items-center gap-2 ${selected.includes(t.id) ? "ring-2 ring-offset-1 ring-neutral-900 dark:ring-neutral-200" : ""}`} style={{ borderColor: t.color }}>
                <ColorDot color={t.color} />{t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-neutral-400">ایجاد شده در {formatDate(note.created_at)}</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-10 px-3 rounded-2xl border border-neutral-200 dark:border-neutral-700">انصراف</button>
            <button onClick={()=>onSave({ text, status, tag_ids: selected })} className="h-10 px-4 rounded-2xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 inline-flex items-center gap-2"><Check className="h-4 w-4"/> ذخیره</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ onLogout, onChangePassword }:{ onLogout: ()=>void; onChangePassword: (pw: string)=>void }) {
  const [pw1, setPw1] = useState(""); const [pw2, setPw2] = useState("");
  return (
    <section className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-4 grid gap-4 max-w-xl">
      <div className="flex items-center gap-2"><SettingsIcon className="h-5 w-5" /><h2 className="text-base font-medium">تنظیمات</h2></div>
      <div className="grid gap-2">
        <label className="text-sm">تغییر رمز عبور</label>
        <input type="password" value={pw1} onChange={e=>setPw1(e.target.value)} placeholder="رمز جدید" className="h-11 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3" />
        <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="تکرار رمز جدید" className="h-11 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3" />
        <button onClick={()=>{ if(pw1 && pw1===pw2) onChangePassword(pw1); else alert("رمزها یکسان نیستند"); }} className="h-11 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">ذخیره رمز</button>
      </div>
      <div className="text-sm text-neutral-500">بازیابی رمز از طریق ایمیل: به‌زودی</div>
      <div className="flex justify-end">
        <button onClick={onLogout} className="h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700">خروج از حساب</button>
      </div>
    </section>
  );
}

function AuthScreen({ theme, setTheme }:{ theme:"light"|"dark"; setTheme:(t:"light"|"dark")=>void }) {
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");

  async function submit() {
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100" dir="rtl">
      <div className="absolute top-4 left-4">
        <button onClick={()=>setTheme(theme === "dark" ? "light" : "dark")} className="h-10 w-10 rounded-xl border border-neutral-200 dark:border-neutral-700 grid place-items-center">
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
      <div className="w-[min(420px,calc(100%-32px))] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow p-5 grid gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-neutral-900 text-white grid place-items-center dark:bg-neutral-100 dark:text-neutral-900"><Tag className="h-5 w-5" /></div>
          <div>
            <div className="text-lg font-semibold">Yadarm</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">یادداشت آرمین</div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 bg-neutral-100 dark:bg-neutral-700 rounded-xl p-1">
          <button onClick={()=>setMode("login")} className={`h-10 rounded-lg ${mode==="login"?"bg-white dark:bg-neutral-800":""}`}>ورود</button>
          <button onClick={()=>setMode("signup")} className={`h-10 rounded-lg ${mode==="signup"?"bg-white dark:bg-neutral-800":""}`}>ثبت‌نام</button>
        </div>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ایمیل" className="h-11 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-right" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="رمز عبور" className="h-11 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-right" />
        <button onClick={submit} className="h-11 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">{mode==="login"?"ورود":"ثبت‌نام"}</button>
      </div>
    </div>
  );
}