import { useEffect, useState } from 'react';
import { Search, FileText, IdCard } from 'lucide-react';
import api from '../../../api/axios';

/**
 * Pilih 1 alumni, lalu cetak Surat Rekomendasi (kalau ada lamaran
 * diterima) atau Kartu Pencari Kerja — kedua halaman cetak ada di
 * pages/print/, dibuka tab baru supaya BKK bisa langsung print dari sana.
 */
export default function CetakDokumenTab() {
  const [alumni, setAlumni] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    api.get('/bkk/tracer').then((res) => setAlumni(res.data));
  }, []);

  const filtered = alumni.filter((s) => (s.user?.name || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="surface-card p-4 border-l-4 border-l-brand-400">
        <p className="text-sm text-ink-700">Pilih alumni untuk mencetak Surat Rekomendasi atau Kartu Pencari Kerja.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama alumni..." className="field-input pl-10" />
      </div>

      <div className="space-y-2">
        {filtered.map((s) => (
          <div key={s.id} className="surface-card p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-900 truncate">{s.user?.name}</p>
              <p className="text-xs text-ink-500">{s.jurusan?.nama || '-'}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <a
                href={`/print/surat-rekomendasi?student_id=${s.id}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 border border-line-200 rounded-lg px-2.5 py-1.5"
              >
                <FileText className="w-3.5 h-3.5" /> Surat Rekomendasi
              </a>
              <a
                href={`/print/kartu-pencari-kerja?student_id=${s.id}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 border border-line-200 rounded-lg px-2.5 py-1.5"
              >
                <IdCard className="w-3.5 h-3.5" /> Kartu Pencari Kerja
              </a>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="surface-card p-8 text-center text-ink-300 text-sm">Tidak ada alumni ditemukan.</div>
        )}
      </div>
    </div>
  );
}
