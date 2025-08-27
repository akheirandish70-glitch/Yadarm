
'use client';
export default function NoteCard({ note, onToggleStatus, onDelete }) {
  const statusMap = { todo:'باز', doing:'درحال انجام', done:'انجام شد' };
  return (
    <div className="card p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{note.title || 'بدون عنوان'}</h3>
            <span className="badge">{statusMap[note.status] || 'نامشخص'}</span>
          </div>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(note.tags || []).map(t => (<span key={t.id||t} className="badge">{t.name||t}</span>))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={()=>onToggleStatus?.(note)} className="btn btn-ghost">تغییر وضعیت</button>
            <button onClick={()=>onDelete?.(note)} className="btn btn-ghost text-red-600">حذف</button>
          </div>
        </div>
      </div>
    </div>
  );
}
