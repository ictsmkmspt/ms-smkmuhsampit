import { useEffect, useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import api from '../../../../api/axios';

const STATUS_BADGE = {
  draft: 'badge-soft bg-mist-50 text-ink-500 border border-line-200',
  terbuka: 'badge-soft badge-brand',
  selesai: 'badge-soft badge-honey',
};
const STATUS_LABEL = { draft: 'Draf', terbuka: 'Terbuka', selesai: 'Selesai' };

const formatTanggal = (iso) => new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const formatJam = (iso) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export default function JadwalSubTab() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/my-cbt-exams').then((res) => setExams(res.data)).finally(() => setLoading(false));
  }, []);

  // Latihan tidak punya jadwal yang berarti (rentangnya sengaja dibuat
  // sangat lebar) — jadi cuma ujian resmi yang ditampilkan di sini.
  const ujianSaja = useMemo(() => exams.filter((e) => e.tipe === 'ujian'), [exams]);

  const dikelompokkan = useMemo(() => {
    const map = new Map();
    ujianSaja.forEach((ex) => {
      const tgl = ex.jadwal_mulai.slice(0, 10);
      if (!map.has(tgl)) map.set(tgl, []);
      map.get(tgl).push(ex);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ujianSaja]);

  if (loading) return <p className="text-center text-sm text-ink-300 py-8">Memuat...</p>;

  return (
    <div className="space-y-5">
      {dikelompokkan.map(([tgl, list]) => (
        <div key={tgl}>
          <div className="flex items-center gap-2 mb-2">
            <CalendarRange className="w-4 h-4 text-ink-400" />
            <p className="text-sm font-semibold text-ink-700">{formatTanggal(list[0].jadwal_mulai)}</p>
          </div>
          <div className="space-y-2">
            {list.map((ex) => (
              <div key={ex.id} className="surface-card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{ex.nama}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {ex.subject?.nama} · {ex.class_rooms?.map((c) => c.name).join(', ')} · {formatJam(ex.jadwal_mulai)}&ndash;{formatJam(ex.jadwal_selesai)}
                  </p>
                </div>
                <span className={STATUS_BADGE[ex.status]}>{STATUS_LABEL[ex.status]}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {dikelompokkan.length === 0 && (
        <p className="text-center text-sm text-ink-300 py-8">Belum ada ujian terjadwal. Buat lewat menu Buat Ujian.</p>
      )}
    </div>
  );
}
