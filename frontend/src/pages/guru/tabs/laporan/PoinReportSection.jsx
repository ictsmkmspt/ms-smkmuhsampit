import { useEffect, useState } from 'react';
import { Search, AlertOctagon, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../../api/axios';
import StudentViolationModal from '../../../../components/StudentViolationModal';

const PAGE_SIZE = 5;

export default function PoinReportSection() {
  const [summary, setSummary] = useState([]);
  const [detail, setDetail] = useState([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [page, setPage] = useState(1);

  const loadSummary = () => {
    setLoading(true);
    return api.get('/violations/summary')
      .then((res) => setSummary(res.data))
      .finally(() => setLoading(false));
  };

  const loadDetail = () => {
    const params = {};
    if (date) params.date = date;
    setPage(1);
    return api.get('/violations/detail', { params }).then((res) => setDetail(res.data));
  };

  const loadAll = () => { loadSummary(); loadDetail(); };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line

  const totalAlpa = summary.reduce((sum, s) => sum + (s.alpa_count || 0), 0);
  const totalPages = Math.max(1, Math.ceil(detail.length / PAGE_SIZE));
  const paginatedDetail = detail.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 flex flex-col gap-6">
        <div className="surface-card p-5 flex flex-wrap gap-3 items-end">
          <button onClick={loadAll} className="btn-primary">
            <Search className="w-4 h-4" /> Tampilkan
          </button>
          <div className="ml-auto flex gap-2">
            <span className="badge-soft badge-rose">Total Alpa: {totalAlpa}</span>
          </div>
        </div>

        <div className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-4">Akumulasi Poin Pelanggaran per Siswa</h2>
          {loading ? (
            <p className="text-center text-ink-300 py-6">Memuat...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium">Nama Siswa</th>
                  <th className="font-medium text-right">Total Poin</th>
                </tr>
              </thead>
              <tbody>
                {[...summary].sort((a, b) => b.total_poin - a.total_poin).map((s) => (
                  <tr key={s.id} className="border-t border-line-200">
                    <td className="py-2.5">
                      <button onClick={() => setSelectedStudent(s)} className="text-ink-900 font-medium hover:text-brand-600 hover:underline transition text-left">
                        {s.user?.name}
                      </button>
                    </td>
                    <td className="text-right">
                      <span className={`badge-soft ${s.total_poin > 0 ? 'badge-honey' : 'badge-brand'}`}>{s.total_poin} poin</span>
                    </td>
                  </tr>
                ))}
                {summary.length === 0 && (
                  <tr><td colSpan="2" className="py-6 text-center text-ink-300">Belum ada data siswa.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="surface-card p-5 h-full flex flex-col">
          <h2 className="font-display font-semibold text-ink-900 mb-3">Riwayat Kejadian Pelanggaran</h2>

          <div className="flex gap-2 mb-3">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input text-sm flex-1" />
            <button onClick={loadDetail} className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 whitespace-nowrap">Filter</button>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {paginatedDetail.map((v) => (
              <div key={v.id} className="border border-line-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="text-ink-900 font-medium truncate">{v.student?.user?.name}</p>
                  <p className="text-xs text-ink-500 truncate">
                    {v.date} · {v.violation_type?.name || (v.type === 'alpa' ? 'Tidak Hadir' : '-')}
                  </p>
                </div>
                <span className="text-honey-700 font-medium shrink-0">+{v.poin}</span>
              </div>
            ))}
            {detail.length === 0 && (
              <p className="py-6 text-center text-ink-300 text-sm">Tidak ada riwayat pelanggaran untuk filter ini.</p>
            )}
          </div>

          {detail.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-line-200">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30">
                <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
              </button>
              <span className="text-xs text-ink-400">Halaman {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30">
                Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedStudent && (
        <StudentViolationModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </div>
  );
}
