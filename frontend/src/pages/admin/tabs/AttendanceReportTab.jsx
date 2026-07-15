import { useEffect, useState } from 'react';
import { Search, Trash2, Pencil, Printer } from 'lucide-react';
import api from '../../../api/axios';
import EditAttendanceModal from '../../../components/EditAttendanceModal';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function AttendanceReportTab() {
  const [report, setReport] = useState([]);
  const [classes, setClasses] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [classRoomId, setClassRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [showPrintPicker, setShowPrintPicker] = useState(false);
  const [printMonth, setPrintMonth] = useState(new Date().getMonth() + 1);
  const [printYear, setPrintYear] = useState(new Date().getFullYear());

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  const loadReport = () => {
    setLoading(true);
    const params = {};
    if (date) params.date = date;
    if (classRoomId) params.class_room_id = classRoomId;
    api.get('/attendance/report', { params })
      .then((res) => setReport(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReport(); }, []);

  const handlePrint = () => {
    if (!classRoomId) return;
    const url = `/print/absensi-bulanan?class_room_id=${classRoomId}&month=${printMonth}&year=${printYear}`;
    window.open(url, '_blank');
    setShowPrintPicker(false);
  };

  const handleDelete = async (r) => {
    if (!confirm(`Hapus data kehadiran ${r.student?.user?.name} pada ${r.date}? Siswa ini akan otomatis menjadi "alpa".`)) return;
    setDeletingId(r.id);
    try {
      await api.post('/attendance/update-status', {
        student_id: r.student.id,
        date: r.date,
        status: 'alpa',
      });
      loadReport();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus data kehadiran.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalHadir = report.filter((r) => r.status === 'hadir').length;
  const totalIzin = report.filter((r) => r.status === 'izin').length;
  const totalSakit = report.filter((r) => r.status === 'sakit').length;
  const totalAlpa = report.filter((r) => r.status === 'alpa').length;

  const badgeClass = (status) => {
    if (status === 'izin') return 'badge-honey';
    if (status === 'sakit') return 'badge-honey';
    if (status === 'alpa') return 'badge-rose';
    if (status === 'libur') return 'bg-mist-200 text-ink-500';
    return 'badge-brand';
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field-input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
          <select value={classRoomId} onChange={(e) => setClassRoomId(e.target.value)} className="field-input text-ink-700">
            <option value="">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={loadReport} className="btn-primary">
          <Search className="w-4 h-4" /> Tampilkan
        </button>

        <div className="relative">
          <button
            onClick={() => setShowPrintPicker((p) => !p)}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition"
          >
            <Printer className="w-4 h-4" /> Cetak Bulanan
          </button>

          {showPrintPicker && (
            <div className="absolute z-10 mt-2 bg-white border border-line-200 rounded-xl shadow-lg p-4 w-64">
              {!classRoomId ? (
                <p className="text-xs text-honey-700">Pilih kelas dulu di filter Kelas sebelum mencetak (cetak dilakukan per kelas).</p>
              ) : (
                <>
                  <label className="block text-xs font-medium text-ink-500 mb-1">Bulan</label>
                  <select
                    value={printMonth}
                    onChange={(e) => setPrintMonth(Number(e.target.value))}
                    className="field-input text-sm mb-3"
                  >
                    {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
                  </select>

                  <label className="block text-xs font-medium text-ink-500 mb-1">Tahun</label>
                  <input
                    type="number"
                    value={printYear}
                    onChange={(e) => setPrintYear(Number(e.target.value))}
                    className="field-input text-sm mb-3"
                  />

                  <button onClick={handlePrint} className="w-full btn-primary justify-center text-sm">
                    Buka Halaman Cetak
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <span className="badge-soft badge-brand">Hadir: {totalHadir}</span>
          <span className="badge-soft badge-honey">Izin: {totalIzin}</span>
          <span className="badge-soft badge-honey">Sakit: {totalSakit}</span>
          <span className="badge-soft badge-rose">Alpa: {totalAlpa}</span>
        </div>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">
          Rekap Absensi {date && <span className="text-ink-500 font-sans font-normal text-sm">— {date}</span>}
        </h2>
        {loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium">Nama Siswa</th>
                <th className="font-medium">Kelas</th>
                <th className="font-medium">Jam Masuk</th>
                <th className="font-medium">Status</th>
                <th className="font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {report.map((r) => (
                <tr key={r.id} className="border-t border-line-200">
                  <td className="py-2.5 text-ink-900">{r.student?.user?.name}</td>
                  <td className="text-ink-700">{r.student?.class_room?.name || '-'}</td>
                  <td className="font-mono text-xs text-ink-700">{r.time_in || '-'}</td>
                  <td>
                    <span className={`badge-soft ${badgeClass(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="text-right">
                    {r.status === 'libur' ? (
                      <span className="text-xs text-ink-300 italic">Hari libur</span>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setEditingRecord(r)}
                          className="text-ink-300 hover:text-brand-600"
                          title="Edit data kehadiran"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {r.status !== 'alpa' && (
                          <button
                            onClick={() => handleDelete(r)}
                            disabled={deletingId === r.id}
                            className="text-ink-300 hover:text-honey-700 disabled:opacity-40"
                            title="Hapus data kehadiran"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {report.length === 0 && (
                <tr><td colSpan="5" className="py-6 text-center text-ink-300">Tidak ada data absensi untuk filter ini.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {editingRecord && (
        <EditAttendanceModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={() => { setEditingRecord(null); loadReport(); }}
        />
      )}
    </div>
  );
}
