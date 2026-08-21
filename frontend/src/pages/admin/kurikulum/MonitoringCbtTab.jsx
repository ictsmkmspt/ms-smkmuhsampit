import { useEffect, useMemo, useState } from 'react';
import { Radio, ListChecks, ClipboardEdit, ShieldAlert } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';

const TIPE_BADGE = {
  ujian: 'badge-soft bg-mist-50 text-ink-700 border border-line-200',
  latihan: 'badge-soft bg-honey-50 text-honey-700 border border-honey-200',
};
const TIPE_LABEL = { ujian: 'Ujian', latihan: 'Latihan' };
const STATUS_LABEL = { draft: 'Draf', terbuka: 'Terbuka', selesai: 'Selesai' };
const AKSI_LABEL = { diubah: 'Diubah', dihapus: 'Dihapus', dibuka_kembali: 'Dibuka Kembali' };
const AKSI_BADGE = {
  diubah: 'badge-soft badge-honey',
  dihapus: 'badge-soft bg-rose-50 text-rose-700 border border-rose-100',
  dibuka_kembali: 'badge-soft badge-brand',
};

const formatWaktu = (iso) => new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Menu "Monitoring CBT" Admin/Waka Kurikulum — baca-saja, lintas guru.
// Menampilkan semua Tujuan Pembelajaran (TP) beserta jumlah Materi di
// dalamnya, dan semua Ujian & Latihan beserta status/jumlah peserta —
// supaya kurikulum bisa memantau kelengkapan materi & aktivitas ujian
// semua guru tanpa perlu login satu-satu sebagai tiap guru.
export default function MonitoringCbtTab() {
  const [tpList, setTpList] = useState([]);
  const [examList, setExamList] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/cbt-monitoring/tp'),
      api.get('/cbt-monitoring/ujian'),
      api.get('/cbt-monitoring/audit-log'),
    ]).then(([tpRes, examRes, auditRes]) => {
      setTpList(tpRes.data);
      setExamList(examRes.data);
      setAuditLog(auditRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const subjectOptions = useMemo(() => {
    const map = new Map();
    tpList.forEach((t) => { if (t.subject) map.set(t.subject.id, t.subject); });
    examList.forEach((e) => { if (e.subject) map.set(e.subject.id, e.subject); });
    return [...map.values()].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [tpList, examList]);

  const filteredTp = useMemo(() => tpList.filter((t) => !subjectFilter || t.subject_id === Number(subjectFilter)), [tpList, subjectFilter]);
  const filteredExam = useMemo(() => examList.filter((e) => !subjectFilter || e.subject_id === Number(subjectFilter)), [examList, subjectFilter]);

  if (loading) return <p className="text-center text-sm text-ink-300 py-8">Memuat...</p>;

  return (
    <div className="space-y-6">
      <div className="surface-card p-4">
        <label className="block text-xs font-medium text-ink-500 mb-1">Saring Mata Pelajaran</label>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="field-input text-ink-700 text-sm max-w-xs">
          <option value="">Semua Mapel</option>
          {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
        </select>
      </div>

      <div>
        <h2 className="flex items-center gap-1.5 font-display font-semibold text-ink-900 mb-3">
          <ListChecks className="w-4 h-4 text-brand-600" /> Tujuan Pembelajaran
          <span className="text-ink-500 font-sans font-normal text-sm">({filteredTp.length})</span>
        </h2>
        <div className="surface-card overflow-hidden">
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 pt-3 pl-4 font-medium whitespace-nowrap px-2">Guru</th>
                  <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Mapel</th>
                  <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Judul TP</th>
                  <th className="pb-2 pt-3 pr-4 font-medium text-right whitespace-nowrap px-2">Jumlah Materi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTp.map((t) => (
                  <tr key={t.id} className="border-t border-line-200">
                    <td className="py-2.5 pl-4 text-ink-900 whitespace-nowrap px-2"><TruncateText text={t.teacher?.user?.name} /></td>
                    <td className="whitespace-nowrap px-2 text-ink-700">{t.subject?.nama}</td>
                    <td className="whitespace-nowrap px-2 text-ink-700"><TruncateText text={t.judul} /></td>
                    <td className="pr-4 text-right whitespace-nowrap px-2 font-semibold text-ink-900">{t.materi_list_count}</td>
                  </tr>
                ))}
                {filteredTp.length === 0 && (
                  <tr><td colSpan="4" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada TP untuk saringan ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="flex items-center gap-1.5 font-display font-semibold text-ink-900 mb-3">
          <ClipboardEdit className="w-4 h-4 text-brand-600" /> Ujian & Latihan
          <span className="text-ink-500 font-sans font-normal text-sm">({filteredExam.length})</span>
        </h2>
        <div className="surface-card overflow-hidden">
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 pt-3 pl-4 font-medium whitespace-nowrap px-2">Nama</th>
                  <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Mapel &middot; Kelas</th>
                  <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Guru</th>
                  <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Status</th>
                  <th className="pb-2 pt-3 pr-4 font-medium text-right whitespace-nowrap px-2">Peserta</th>
                </tr>
              </thead>
              <tbody>
                {filteredExam.map((ex) => (
                  <tr key={ex.id} className="border-t border-line-200">
                    <td className="py-2.5 pl-4 whitespace-nowrap px-2">
                      <div className="flex items-center gap-1.5">
                        <TruncateText text={ex.nama} className="text-ink-900" />
                        <span className={TIPE_BADGE[ex.tipe]}>{TIPE_LABEL[ex.tipe]}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 text-ink-700">{ex.subject?.nama} &middot; {ex.class_rooms?.map((c) => c.name).join(', ')}</td>
                    <td className="whitespace-nowrap px-2 text-ink-700"><TruncateText text={ex.teacher?.user?.name} /></td>
                    <td className="whitespace-nowrap px-2">
                      {ex.status === 'terbuka' ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-rose-700"><Radio className="w-3 h-3 animate-pulse" /> Terbuka</span>
                      ) : (
                        <span className="text-xs text-ink-500">{STATUS_LABEL[ex.status] || ex.status}</span>
                      )}
                    </td>
                    <td className="pr-4 text-right whitespace-nowrap px-2 font-semibold text-ink-900">{ex.attempts_count}</td>
                  </tr>
                ))}
                {filteredExam.length === 0 && (
                  <tr><td colSpan="5" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada ujian/latihan untuk saringan ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="flex items-center gap-1.5 font-display font-semibold text-ink-900 mb-3">
          <ShieldAlert className="w-4 h-4 text-brand-600" /> Riwayat Aksi Berisiko
          <span className="text-ink-500 font-sans font-normal text-sm">({auditLog.length})</span>
        </h2>
        <p className="text-xs text-ink-500 mb-3">
          Catatan Edit/Hapus/Buka Kembali yang dilakukan pada ujian yang SUDAH ADA siswa mengerjakannya — 100 kejadian terbaru.
        </p>
        <div className="surface-card overflow-hidden">
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 pt-3 pl-4 font-medium whitespace-nowrap px-2">Waktu</th>
                  <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Ujian</th>
                  <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Aksi</th>
                  <th className="pb-2 pt-3 font-medium whitespace-nowrap px-2">Dilakukan Oleh</th>
                  <th className="pb-2 pt-3 pr-4 font-medium text-right whitespace-nowrap px-2">Peserta Saat Itu</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((log) => (
                  <tr key={log.id} className="border-t border-line-200">
                    <td className="py-2.5 pl-4 text-ink-700 whitespace-nowrap px-2">{formatWaktu(log.created_at)}</td>
                    <td className="whitespace-nowrap px-2 text-ink-900"><TruncateText text={log.nama_ujian} /></td>
                    <td className="whitespace-nowrap px-2"><span className={AKSI_BADGE[log.aksi]}>{AKSI_LABEL[log.aksi] || log.aksi}</span></td>
                    <td className="whitespace-nowrap px-2 text-ink-700">{log.actor_nama} <span className="text-ink-400">({log.actor_role})</span></td>
                    <td className="pr-4 text-right whitespace-nowrap px-2 font-semibold text-ink-900">{log.attempts_count_saat_itu}</td>
                  </tr>
                ))}
                {auditLog.length === 0 && (
                  <tr><td colSpan="5" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada aksi berisiko yang tercatat.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
