import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

// Kotak cari-sambil-ketik untuk memilih siswa, dipakai di form yang perlu
// pilih 1 siswa dari daftar panjang (mis. Penempatan PKL) — pola sama
// seperti AssetSearchSelect. Siswa difilter di sisi frontend berdasarkan
// nama, NIS, dan nama kelas.
export function filterStudents(students, q) {
  const term = q.trim().toLowerCase();
  if (!term) return students;
  return students.filter((s) => [s.user?.name, s.nis, s.class_room?.name]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(term)));
}

export default function StudentSearchSelect({ students, value, onChange, placeholder = 'Ketik nama atau NIS siswa…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const hasil = useMemo(() => filterStudents(students, query).slice(0, 30), [students, query]);
  const terpilih = students.find((s) => String(s.id) === String(value));

  const pilih = (s) => {
    onChange(s ? String(s.id) : '');
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative">
      {terpilih ? (
        <div className="field-input flex items-center justify-between gap-2 text-ink-700">
          <span className="truncate">
            {terpilih.user?.name} <span className="text-xs text-ink-500">· {terpilih.class_room?.name || 'Tanpa kelas'}</span>
          </span>
          <button type="button" onClick={() => pilih(null)} className="text-ink-300 hover:text-honey-700 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="field-input pl-9"
          />
        </div>
      )}

      {open && !terpilih && (
        <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto surface-card border border-line-200 shadow-lg py-1">
          {hasil.length === 0 && <p className="px-3 py-2 text-sm text-ink-300">Tidak ada siswa yang cocok.</p>}
          {hasil.map((s) => (
            <button
              type="button"
              key={s.id}
              onMouseDown={() => pilih(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-mist-100 flex items-center justify-between gap-2"
            >
              <span className="truncate">{s.user?.name}</span>
              <span className="text-xs text-ink-400 shrink-0">{s.class_room?.name || '-'} · {s.nis}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
