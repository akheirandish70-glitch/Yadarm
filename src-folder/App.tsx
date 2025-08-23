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
