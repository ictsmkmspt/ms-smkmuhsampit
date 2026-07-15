import { useState, useEffect } from 'react';
import { UserX, CheckCircle2, AlertTriangle, ClipboardEdit } from 'lucide-react';
import BarcodeScanner from '../../../components/BarcodeScanner';
import api from '../../../api/axios';

export default function AbsensiTab() {
  const [alpaMessage, setAlpaMessage] = useState('');
  const [alpaError, setAlpaError]     = useState(false);
  const [processing, setProcessing]   = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [classes, setClasses]             = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents]           = useState([]);
  const [statuses, setStatuses]           = useState({});
  const [loadingId, setLoadingId]         = useState(null);
  const [messages, setMessages]           = useState({});

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); setStatuses({}); setMessages({}); return; }
    api.get('/students', { params: { class_room_id: selectedClass } }).then((res) => {
      setStudents(res.data);
      setStatuses({});
      setMessages({});
    });
  }, [selectedClass]);

  const handleAbsen = async (student, status) => {
    setLoadingId(student.id + '-' + status);
    try {
      const res = await api.post('/attendance/manual', { student_id: student.id, status });
      setStatuses((p) => ({ ...p, [student.id]: status }));
      setMessages((p) => ({ ...p, [student.id]: { text: res.data.message, error: false } }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal mencatat absensi.';
      const sudah = msg.toLowerCase().includes('sudah');
      setMessages((p) => ({ ...p, [student.id]: { text: msg, error: true } }));
      if (sudah) setStatuses((p) => ({ ...p, [student.id]: 'sudah' }));
    } finally {
      setLoadingId(null);
    }
  };

  const handleProcessAlpa = async () => {
    setProcessing(true);
    setAlpaMessage('');
    try {
      const res = await api.post('/attendance/process-alpa');
      setAlpaError(false);
      setAlpaMessage(res.data.message);
    } catch (err) {
      setAlpaError(true);
      setAlpaMessage(err.response?.data?.message || 'Gagal memproses alpa.');
    } finally {
      setProcessing(false);
      setConfirmOpen(false);
    }
  };

  const sudahAbsen = (id) => !!statuses[id];

  return (
    <div>
      <p className="text-center text-sm text-ink-500 mb-4">Arahkan kamera ke QR siswa</p>
      <div className="max-w-md mx-auto">
        <BarcodeScanner />
      </div>

      <div className="max-w-2xl mx-auto mt-6 surface-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardEdit className="w-4 h-4 text-brand-600 shrink-0" />
          <p className="text-sm font-semibold text-ink-700">Absensi Manual</p>
        </div>
        <p className="text-xs text-ink-400 mb-4">Pilih kelas lalu klik Hadir, Izin, atau Sakit di samping nama siswa.</p>

        <div className="mb-4">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="field-input text-ink-700"
          >
            <option value="">— Pilih Kelas —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {selectedClass && students.length === 0 && (
          <p className="text-sm text-ink-300 text-center py-4">Belum ada siswa di kelas ini.</p>
        )}

        {students.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium">Nama Siswa</th>
                <th className="pb-2 font-medium text-center w-24">Status</th>
                <th className="pb-2 font-medium text-right w-52">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const done      = sudahAbsen(s.id);
                const status    = statuses[s.id];
                const msg       = messages[s.id];
                const isLoading = loadingId === s.id + '-hadir' || loadingId === s.id + '-izin' || loadingId === s.id + '-sakit';

                return (
                  <tr key={s.id} className="border-t border-line-200">
                    <td className="py-2.5">
                      <p className="text-ink-900 font-medium">{s.user?.name}</p>
                      {msg && (
                        <p className={`text-xs mt-0.5 ${msg.error ? 'text-honey-700' : 'text-brand-600'}`}>
                          {msg.text}
                        </p>
                      )}
                    </td>
                    <td className="text-center">
                      {status === 'hadir' && <span className="badge-soft badge-brand">Hadir</span>}
                      {status === 'izin' && <span className="badge-soft badge-honey">Izin</span>}
                      {status === 'sakit' && <span className="badge-soft badge-honey">Sakit</span>}
                      {status === 'sudah' && <span className="badge-soft badge-rose">Sudah</span>}
                    </td>
                    <td className="text-right">
                      {!done ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleAbsen(s, 'hadir')}
                            disabled={isLoading}
                            className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg px-3 py-1.5 transition disabled:opacity-40"
                          >
                            ✅ Hadir
                          </button>
                          <button
                            onClick={() => handleAbsen(s, 'izin')}
                            disabled={isLoading}
                            className="text-xs font-medium text-honey-700 bg-honey-50 hover:bg-honey-100 border border-honey-200 rounded-lg px-3 py-1.5 transition disabled:opacity-40"
                          >
                            📄 Izin
                          </button>
                          <button
                            onClick={() => handleAbsen(s, 'sakit')}
                            disabled={isLoading}
                            className="text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg px-3 py-1.5 transition disabled:opacity-40"
                          >
                            🤒 Sakit
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-300">Tercatat</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="max-w-2xl mx-auto mt-4 surface-card p-4">
        <div className="flex items-start gap-2 mb-3">
          <UserX className="w-4 h-4 text-honey-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-ink-700">Proses Siswa Tidak Hadir (Alpa)</p>
            <p className="text-xs text-ink-400 mt-0.5">
              Jalankan ini setelah jam absen ditutup. Sistem akan menandai semua siswa yang belum absen hari ini sebagai "alpa" dan menambahkan poin pelanggarannya secara otomatis.
            </p>
          </div>
        </div>

        {!confirmOpen ? (
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full text-sm font-medium text-honey-700 bg-honey-50 hover:bg-honey-100 border border-honey-200 rounded-xl py-2 transition"
          >
            Proses Alpa Hari Ini
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-ink-500">Yakin? Tindakan ini akan menambah poin pelanggaran untuk siswa yang belum absen hari ini.</p>
            <div className="flex gap-2">
              <button
                onClick={handleProcessAlpa}
                disabled={processing}
                className="flex-1 text-sm font-medium text-white bg-honey-500 hover:bg-honey-700 disabled:opacity-50 rounded-xl py-2 transition"
              >
                {processing ? 'Memproses...' : 'Ya, Proses Sekarang'}
              </button>
              <button onClick={() => setConfirmOpen(false)} className="px-4 text-sm font-medium text-ink-500 hover:bg-mist-50 rounded-xl py-2 transition">
                Batal
              </button>
            </div>
          </div>
        )}

        {alpaMessage && (
          <div className={`mt-3 flex items-start gap-2 p-3 rounded-xl text-sm font-medium ${
            alpaError ? 'bg-honey-50 text-honey-700 border border-honey-200' : 'bg-brand-50 text-brand-700 border border-brand-100'
          }`}>
            {alpaError ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{alpaMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
