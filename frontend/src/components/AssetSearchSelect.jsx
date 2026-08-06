import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

// Kotak cari-sambil-ketik untuk memilih aset, dipakai di Daftar Aset (filter
// tabel) dan form Pemeliharaan (pilih aset spesifik). Aset difilter di sisi
// frontend berdasarkan kode, nama, kategori, dan nama ruang — cukup untuk
// jumlah aset sekolah yang wajar, tanpa perlu endpoint pencarian baru.
export function filterAssets(assets, q) {
  const term = q.trim().toLowerCase();
  if (!term) return assets;
  return assets.filter((a) => [a.kode_aset, a.nama, a.kategori, a.room?.nama]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(term)));
}

export default function AssetSearchSelect({ assets, value, onChange, placeholder = 'Cari kode / nama / kategori / ruang…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const hasil = useMemo(() => filterAssets(assets, query).slice(0, 30), [assets, query]);
  const terpilih = assets.find((a) => String(a.id) === String(value));

  const pilih = (a) => {
    onChange(a ? String(a.id) : '');
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative">
      {terpilih ? (
        <div className="field-input flex items-center justify-between gap-2 text-ink-700">
          <span className="truncate">
            <span className="font-mono text-xs text-ink-500">{terpilih.kode_aset}</span> — {terpilih.nama}
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
          {hasil.length === 0 && <p className="px-3 py-2 text-sm text-ink-300">Tidak ada aset yang cocok.</p>}
          {hasil.map((a) => (
            <button
              type="button"
              key={a.id}
              onMouseDown={() => pilih(a)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-mist-100 flex items-center justify-between gap-2"
            >
              <span className="truncate">
                <span className="font-mono text-xs text-ink-500">{a.kode_aset}</span> — {a.nama}
                {a.kategori && <span className="text-ink-400"> · {a.kategori}</span>}
              </span>
              <span className="text-xs text-ink-400 shrink-0">{a.room?.nama || '-'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
