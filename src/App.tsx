import React, { useEffect, useMemo, useRef, useState } from "react";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Plus, LogOut, Settings, Lock, Search, List as ListIcon, LayoutGrid, Trash2, Pencil, Check } from "lucide-react";

type StatusType = "action" | "plan" | "done";
type Note = { id: string; text: string; tagIds: string[]; status: StatusType; createdAt?: any };
type Tag = { id: string; name: string; color: string };

const STATUS_LABELS: Record<StatusType, string> = { action: "اکشن", plan: "پلن", done: "اتمام" };

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
  }, []);

  if (loadingAuth) return <div className="min-h-screen grid place-items-center text-gray-500">در حال بارگذاری…</div>;
  if (!user) return <AuthScreen />;

  return <NotesApp user={user} />;
}

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const email = emailRef.current!.value.trim();
      const pass = passRef.current!.value;
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        await createUserWithEmailAndPassword(auth, email, pass);
      }
    } catch (e:any) {
      setErr(e?.message || "خطا");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 dark:bg-neutral-900">
      <form onSubmit={submit} className="w-full max-w-sm bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow">
        <h1 className="text-xl mb-4 text-center">{mode === "login" ? "ورود به حساب" : "ساخت حساب جدید"}</h1>
        <label className="block mb-3">
          <span className="text-sm">ایمیل</span>
          <input ref={emailRef} type="email" required className="mt-1 w-full rounded-xl border p-3 outline-none focus:ring" />
        </label>
        <label className="block mb-4">
          <span className="text-sm">رمز عبور</span>
          <input ref={passRef} type="password" required minLength={6} className="mt-1 w-full rounded-xl border p-3 outline-none focus:ring" />
        </label>
        {err && <div className="text-red-600 text-sm mb-2">{err}</div>}
        <button disabled={busy} className="w-full rounded-xl p-3 bg-black text-white dark:bg-white dark:text-black disabled:opacity-50">
          {busy ? "لطفاً صبر کنید…" : (mode === "login" ? "ورود" : "ایجاد حساب")}
        </button>
        <div className="flex items-center justify-between mt-4 text-sm">
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="underline">
            {mode === "login" ? "حساب ندارید؟ ثبت‌نام" : "حساب دارید؟ ورود"}
          </button>
          <span className="opacity-70">فراموشی رمز (به‌زودی)</span>
        </div>
      </form>
    </div>
  );
}

function NotesApp({ user }: { user: any }) {
  const [view, setView] = useState<"cards" | "list">("cards"); // جدول حذف شد
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [editing, setEditing] = useState<Note | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newPass, setNewPass] = useState("");

  const notesCol = collection(db, "users", user.uid, "notes");
  const tagsCol = collection(db, "users", user.uid, "tags");

  useEffect(() => {
    const qNotes = query(notesCol, orderBy("createdAt","desc"));
    const unsub1 = onSnapshot(qNotes, (snap) => {
      const arr: Note[] = [];
      snap.forEach((d:any) => arr.push({ id: d.id, ...(d.data()) } as Note));
      setNotes(arr);
    });
    const unsub2 = onSnapshot(tagsCol, (snap) => {
      const arr: Tag[] = [];
      snap.forEach((d:any) => arr.push({ id: d.id, ...(d.data()) } as Tag));
      setTags(arr);
    });
    return () => { unsub1(); unsub2(); };
  }, [user.uid]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter(n => {
      const okQ = !q || n.text?.toLowerCase().includes(q);
      const okStatus = !statusFilter.length || statusFilter.includes(n.status);
      return okQ && okStatus;
    });
  }, [notes, query, statusFilter]);

  const addNote = async () => {
    const newNote: Omit<Note,"id"> = { text: "یادداشت جدید", tagIds: [], status: "action", createdAt: serverTimestamp() };
    await addDoc(notesCol, newNote as any);
  };
  const saveNote = async (n: Note) => {
    const { id, ...rest } = n;
    await setDoc(doc(notesCol, id), rest as any, { merge: true });
    setEditing(null);
  };
  const removeNote = async (id: string) => {
    await deleteDoc(doc(notesCol, id));
  };

  const addTag = async (name: string, color: string) => {
    await addDoc(tagsCol, { name, color, createdAt: serverTimestamp() } as any);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass) return;
    await updatePassword(auth.currentUser!, newPass);
    setNewPass("");
    alert("رمز عبور تغییر کرد");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={addNote} className="rounded-xl border px-3 py-2 flex items-center gap-2"><Plus size={18}/> یادداشت جدید</button>

          {/* جستجو که با فوکِس بزرگ می‌شود */}
          <div className="relative flex-1">
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2 focus-within:ring transition-all duration-200">
              <Search size={18}/>
              <input
                value={query}
                onChange={e=>setQuery(e.target.value)}
                placeholder="جستجو…"
                className="w-40 md:w-56 lg:w-72 focus:w-[min(100%,36rem)] transition-all bg-transparent outline-none"
              />
            </div>
          </div>

          {/* فیلتر وضعیت‌ها (چند انتخابی) */}
          <div className="hidden sm:flex items-center gap-2">
            {(["action","plan","done"] as StatusType[]).map(s => (
              <button key={s}
                onClick={()=> setStatusFilter(f => f.includes(s) ? f.filter(x=>x!==s) : [...f,s])}
                className={`px-3 py-2 rounded-xl border text-sm ${statusFilter.includes(s) ? "bg-gray-200 dark:bg-neutral-700" : ""}`}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* انتخاب مدل نمایش فقط همین‌جا */}
          <div className="hidden md:flex items-center gap-2 ml-2">
            <button onClick={()=>setView("cards")} title="کارت" className={`p-2 rounded-xl border ${view==="cards"?"bg-gray-200 dark:bg-neutral-700":""}`}><LayoutGrid size={18}/></button>
            <button onClick={()=>setView("list")} title="لیست" className={`p-2 rounded-xl border ${view==="list"?"bg-gray-200 dark:bg-neutral-700":""}`}><ListIcon size={18}/></button>
          </div>

          <div className="ms-auto flex items-center gap-2">
            <button onClick={()=>setShowSettings(true)} className="rounded-xl border px-3 py-2 flex items-center gap-1"><Settings size={18}/> تنظیمات</button>
            <button onClick={()=>signOut(auth)} className="rounded-xl border px-3 py-2 flex items-center gap-1"><LogOut size={18}/> خروج</button>
          </div>
        </div>
      </header>

        <main className="max-w-5xl mx-auto px-4 py-6">
          {view==="cards"
            ? <CardsView notes={filtered} tags={tags} onEdit={setEditing} onDelete={removeNote}/>
            : <ListView notes={filtered} tags={tags} onEdit={setEditing} onDelete={removeNote}/>}
        </main>

      {/* دیالوگ ویرایش */}
      {editing && (
        <EditDialog note={editing} tags={tags} onClose={()=>setEditing(null)} onSave={saveNote} />
      )}

      {/* تنظیمات: تغییر رمز + مدیریت تگ (فقط color-picker) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg flex items-center gap-2"><Settings size={18}/> تنظیمات</h2>
              <button onClick={()=>setShowSettings(false)} className="text-sm">بستن</button>
            </div>
            <form onSubmit={changePassword} className="space-y-3">
              <label className="block">
                <span className="text-sm">تغییر رمز عبور</span>
                <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} className="mt-1 w-full rounded-xl border p-3 outline-none focus:ring" placeholder="رمز جدید"/>
              </label>
              <button className="rounded-xl border px-4 py-2 flex items-center gap-2"><Lock size={16}/> ذخیره</button>
              <p className="text-xs opacity-70">بازیابی رمز از طریق ایمیل بعداً فعال می‌شود.</p>
            </form>

            <TagManager tags={tags} onAdd={(name,color)=>addTag(name,color)} />
          </div>
        </div>
      )}
    </div>
  );
}

function CardsView({ notes, tags, onEdit, onDelete }:{ notes: Note[], tags: Tag[], onEdit:(n:Note)=>void, onDelete:(id:string)=>void }) {
  const tagMap = useMemo(()=>Object.fromEntries(tags.map(t=>[t.id,t])), [tags]);
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map(n => (
        <article key={n.id} className="rounded-2xl border p-4 bg-white dark:bg-neutral-800 flex flex-col gap-3">
          <div className="text-xs opacity-70">{new Date().toLocaleDateString("fa-IR")}</div>
          <div className="whitespace-pre-wrap">{n.text}</div>
          <div className="flex flex-wrap gap-2">
            {n.tagIds?.map(id => tagMap[id]?.name && (
              <span key={id} className="px-2 py-1 rounded-xl border text-xs" title={tagMap[id]?.name}>{tagMap[id]?.name}</span>
            ))}
          </div>
          {/* وضعیت فقط متن خاکستری */}
          <div className="text-xs text-gray-500">{STATUS_LABELS[n.status]}</div>
          <div className="flex gap-2 mt-2">
            <button onClick={()=>onEdit(n)} className="rounded-xl border px-3 py-1 text-sm flex items-center gap-1"><Pencil size={16}/> ویرایش</button>
            <button onClick={()=>onDelete(n.id)} className="rounded-xl border px-3 py-1 text-sm flex items-center gap-1"><Trash2 size={16}/> حذف</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ListView({ notes, tags, onEdit, onDelete }:{ notes: Note[], tags: Tag[], onEdit:(n:Note)=>void, onDelete:(id:string)=>void }) {
  const tagMap = useMemo(()=>Object.fromEntries(tags.map(t=>[t.id,t])), [tags]);
  return (
    <div className="divide-y rounded-2xl border bg-white dark:bg-neutral-800">
      {notes.map(n => (
        <div key={n.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="whitespace-pre-wrap">{n.text}</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {n.tagIds?.map(id => tagMap[id]?.name && (
                <span key={id} className="px-2 py-1 rounded-xl border text-xs">{tagMap[id]?.name}</span>
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-500">{STATUS_LABELS[n.status]}</div>
          <div className="flex gap-2">
            <button onClick={()=>onEdit(n)} className="rounded-xl border px-3 py-1 text-sm"><Pencil size={16}/></button>
            <button onClick={()=>onDelete(n.id)} className="rounded-xl border px-3 py-1 text-sm"><Trash2 size={16}/></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EditDialog({ note, tags, onClose, onSave }:{ note: Note, tags: Tag[], onClose:()=>void, onSave:(n:Note)=>void }) {
  const [text,setText] = useState(note.text);
  const [status,setStatus] = useState<StatusType>(note.status);
  const [tagIds,setTagIds] = useState<string[]>(note.tagIds||[]);

  const toggleTag = (id:string) => setTagIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
      <div className="w-full max-w-2xl bg白 dark:bg-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg">ویرایش یادداشت</h2>
          <button onClick={onClose}>بستن</button>
        </div>
        <div className="grid gap-4">
          <textarea value={text} onChange={e=>setText(e.target.value)} rows={6} className="w-full rounded-xl border p-3 outline-none focus:ring" />
          <div className="flex flex-wrap gap-2">
            {(["action","plan","done"] as StatusType[]).map(s => (
              <label key={s} className={`px-3 py-2 rounded-xl border text-sm cursor-pointer ${status===s?"bg-gray-200 dark:bg-neutral-700":""}`}>
                <input type="radio" name="status" className="hidden" checked={status===s} onChange={()=>setStatus(s)} />
                {STATUS_LABELS[s]}
              </label>
            ))}
          </div>
          <div>
            <div className="text-sm mb-2">تگ‌ها</div>
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <button key={t.id} onClick={()=>toggleTag(t.id)} className={`px-2 py-1 rounded-xl border text-xs ${tagIds.includes(t.id)?"bg-gray-200 dark:bg-neutral-700":""}`}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={()=>onSave({ ...note, text, status, tagIds })} className="rounded-xl border px-4 py-2 flex items-center gap-1"><Check size={16}/> ذخیره</button>
        </div>
      </div>
    </div>
  );
}

function TagManager({ tags, onAdd }:{ tags: Tag[], onAdd:(name:string,color:string)=>void }) {
  const nameRef = React.useRef<HTMLInputElement>(null);
  const colorRef = React.useRef<HTMLInputElement>(null);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameRef.current!.value.trim();
    const color = colorRef.current!.value || "#888888";
    if (!name) return;
    onAdd(name, color);
    nameRef.current!.value = "";
  };

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-base mb-2">تگ‌ها</h3>
      <form onSubmit={add} className="flex items-center gap-2">
        <input ref={nameRef} placeholder="نام تگ" className="flex-1 rounded-xl border p-3 outline-none focus:ring"/>
        <input ref={colorRef} type="color" className="h-10 w-14 rounded" title="انتخاب رنگ"/>
        <button className="rounded-xl border px-4 py-2">افزودن</button>
      </form>
      <div className="flex flex-wrap gap-2 mt-3">
        {tags.map(t => (
          <span key={t.id} className="px-2 py-1 rounded-xl border text-xs" style={{borderColor: t.color}}>{t.name}</span>
        ))}
      </div>
    </div>
  );
}
