import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Tag, Trash2, LayoutGrid, List, Table as TableIcon, Filter, X, Search, Smile, StickyNote, Settings, Pencil, Check } from "lucide-react";
type TagType = { id: string; name: string; color: string };
type StatusType = "action" | "plan" | "done";
type NoteType = { id: string; text: string; tagIds: string[]; createdAt: number; status: StatusType };
const uid = () => Math.random().toString(36).slice(2, 10);
const formatDate = (ts: number) => new Date(ts).toLocaleString("fa-IR");
const STORAGE_KEYS = { notes: "mn_notes_v2", tags: "mn_tags_v1", settings: "mn_settings_v2" };
const PALETTE = ["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316"];
const STATUS_ORDER: StatusType[] = ["action","plan","done"];
const STATUS_META: Record<StatusType, { label: string; text: string; bg: string; ring: string; dot: string }>= {
  action: { label: "اکشن", text: "text-red-700", bg: "bg-red-50", ring: "ring-red-200", dot: "bg-red-500" },
  plan:   { label: "پلن",   text: "text-blue-700", bg: "bg-blue-50", ring: "ring-blue-200", dot: "bg-blue-500" },
  done:   { label: "اتمام", text: "text-green-700", bg: "bg-green-50", ring: "ring-green-200", dot: "bg-green-500" },
};
export default function MinimalNotesApp() {
  const [notes, setNotes] = useState<NoteType[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [view, setView] = useState<"cards"|"list"|"table">("cards");
  const [query, setQuery] = useState(""); const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [tab, setTab] = useState<"notes"|"add"|"tags">("notes");
  const [draftText, setDraftText] = useState(""); const [draftStatus, setDraftStatus] = useState<StatusType>("action"); const [quickTagIds, setQuickTagIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<NoteType | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null); const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    try {
      const ns = JSON.parse(localStorage.getItem(STORAGE_KEYS.notes) || "[]"); const ts = JSON.parse(localStorage.getItem(STORAGE_KEYS.tags) || "[]"); const st = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");
      setNotes(ns); setTags(ts.length ? ts : defaultTags()); setView(st.view || "cards");
    } catch {}
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.tags, JSON.stringify(tags)); }, [tags]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ view })); }, [view]);
  const tagMap = useMemo(() => Object.fromEntries(tags.map(t => [t.id, t])), [tags]);
  const visibleNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter(n => (!q || n.text.toLowerCase().includes(q)) && (!filterTagIds.length || filterTagIds.every(id => n.tagIds.includes(id)))).sort((a, b) => b.createdAt - a.createdAt);
  }, [notes, query, filterTagIds]);
  function addNote() { const text = draftText.trim(); if (!text) return; const newNote: NoteType = { id: uid(), text, tagIds: [...quickTagIds], createdAt: Date.now(), status: draftStatus }; setNotes(prev => [newNote, ...prev]); setDraftText(""); setQuickTagIds([]); setDraftStatus("action"); setTab("notes"); textareaRef.current?.focus(); }
  function toggleQuickTag(id: string) { setQuickTagIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])); }
  function removeNote(id: string) { setNotes(prev => prev.filter(n => n.id !== id)); }
  function updateNote(id: string, patch: Partial<NoteType>) { setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n)); }
  function addTag(name: string, color: string) { name = name.trim(); if (!name) return; const exists = tags.find(t => t.name.toLowerCase() === name.toLowerCase()); if (exists) { setQuickTagIds(p => (p.includes(exists.id) ? p : [...p, exists.id])); return; } const nt: TagType = { id: uid(), name, color }; setTags(p => [...p, nt]); setQuickTagIds(p => [...p, nt.id]); }
  function updateTagColor(id: string, color: string) { setTags(prev => prev.map(t => t.id === id ? { ...t, color } : t)); }
  function clearFilters() { setQuery(""); setFilterTagIds([]); searchRef.current?.focus(); }
  function cycleStatus(s: StatusType): StatusType { const i = STATUS_ORDER.indexOf(s); return STATUS_ORDER[(i+1)%STATUS_ORDER.length]; }
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") { e.preventDefault(); addNote(); } if (e.key === "/") { const tag = (e.target as HTMLElement)?.tagName?.toLowerCase(); if (tag !== "input" && tag !== "textarea") { e.preventDefault(); searchRef.current?.focus(); } } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [draftText, quickTagIds, draftStatus]);
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900" dir="rtl">
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/90 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Yadarm" className="h-9 w-9 rounded-2xl border shadow bg-white p-1"/>
            <div><h1 className="text-lg font-semibold tracking-tight">Yadarm</h1><p className="text-xs text-neutral-500">یادداشت آرمین</p></div>
          </div>
          <div className="hidden sm:flex items-center gap-2"><ViewToggle view={view} setView={setView} /></div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 sm:px-4 pb-28 pt-4 sm:pt-6 grid gap-4 sm:gap-6">
        {/* add tab */}
        {/* ... keep as earlier ... */}
      </main>
    </div>
  );
}
function ViewToggle({ view, setView }: { view: "cards"|"list"|"table"; setView: (v: any)=>void }) {
  const opts = [
    { id: "cards", label: "کارت", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "list", label: "لیست", icon: <List className="h-4 w-4" /> },
    { id: "table", label: "جدول", icon: <TableIcon className="h-4 w-4" /> },
  ];
  return (<div className="bg-white border rounded-2xl p-1 flex items-center shadow-sm">
    {opts.map(o => (<button key={o.id} className={`px-3 h-10 rounded-xl text-sm inline-flex items-center gap-1 ${view === o.id ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`} onClick={() => setView(o.id)}>
      {o.icon}{o.label}
    </button>))}
  </div>);
}
function LayoutGrid(props:any){return null} function List(props:any){return null} function TableIcon(props:any){return null}
export function defaultTags(){ return [ { id: uid(), name: "ایده", color: "#3b82f6" }, { id: uid(), name: "کارها", color: "#10b981" }, { id: uid(), name: "شخصی", color: "#f59e0b" }, ]; }
