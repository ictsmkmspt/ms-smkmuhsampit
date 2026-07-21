import { useState, useEffect } from 'react';
import { HandHeart, CheckCircle2, AlertTriangle, ClipboardEdit } from 'lucide-react';
import BarcodeScanner from '../../../../components/BarcodeScanner';
import api from '../../../../api/axios';

export default function SholatZuhurSection() {
  const [classes, setClasses]             = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents]           = useState([]);
  const [statuses, setStatuses]           = useState({});   // { studentId: 'melaksanakan'|'berhalangan'|'tidak' }
  const [loadingId, setLoadingId]         = useState(null); // studentId + '-' + status
  const [messages, setMessages]           = useState({});

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); setStatuses({}); setMessages({}); return; }
    api.get('/students', { params: { class_room_id: selectedClass } }).then((res) => {
      setStudents(res.data);
      setMessages({});
      // Ambil rekap hari ini supaya status yang sudah dicatat (misal lewat scan)
      // langsung tampil di tabel, bukan cuma yang diklik manual di sesi ini.
      api.get('/prayer/report', { params: { class_room_id: selectedClass } }).then((rep) => {
        const map = {};
        rep.data.students.forEach((row) => {
          if (row.status) map[row.student.id] = row.status;
        });
        setStatuses(map);
      });
    });
  }, [selectedClass]);

  // Dipanggil BarcodeScanner tiap kali kamera berhasil membaca QR siswa.
  // Scan = otomatis "melaksanakan".
  const handleDecode = async (code) => {
    try {
      const res = await api.post('/prayer/scan', { code });
      if (res.data.student) {
        setStatuses((p) => ({ ...p, [res.data.student.id]: 'melaksanakan' }));
      }
      return { message: res.data.message, error: !!res.data.already_scanned };
    } catch (err) {
      return { message: err.response?.data?.message || 'Barcode tidak dikenali.', error: true };
    }
  };

  const handleAbsen = async (student, status) => {
    setLoadingId(student.id + '-' + status);
    try {
      const res = await api.post('/prayer/manual', { student_id: student.id, status });
      setStatuses((p) => ({ ...p, [student.id]: status }));
      setMessages((p) => ({ ...p, [student.id]: { text: res.data.message, error: false } }));
    } catch (err) {
      setMessages((p) => ({ ...p, [student.id]: { text: err.response?.data?.message || 'Gagal mencatat.', error: true } }));
    } finally {
      setLoadingId(null);
    }
  };

  const StatusBadge = ({ status }) => {
    if (status === 'melaksanakan') return <span className="badge-soft badge-brand">Melaksanakan</span>;
    if (status === 'berhalangan')  return <span className="badge-soft badge-honey">Berhalangan</span>;
    if (status === 'tidak')        return <span className="badge-soft badge-rose">Tidak Sholat</span>;
    return <span className="text-xs text-ink-300">Belum diabsen</span>;
  };

  return (
    <div>
      <p className="text-center text-sm text-ink-500 mb-4">Arahkan kamera ke QR siswa saat sholat Zuhur</p>
      <div className="max-w-md mx-auto">
        <BarcodeScanner onDecode={handleDecode} />
      </div>

      <div className="max-w-2xl mx-auto mt-6 surface-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardEdit className="w-4 h-4 text-brand-600 shrink-0" />
          <p className="text-sm font-semibold text-ink-700">Absen Sholat Zuhur Manual</p>
        </div>
        <p className="text-xs text-ink-400 mb-4">
          Pilih kelas, lalu klik Melaksanakan, Berhalangan, atau Tidak di samping nama siswa.
          Status di kolom ini selalu tampil apa adanya — siswa yang belum diabsen dibiarkan kosong, tidak otomatis dianggap "Tidak Sholat".
        </p>

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
                <th className="pb-2 font-medium text-center w-28">Status</th>
                <th className="pb-2 font-medium text-right w-56">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const status    = statuses[s.id];
                const done      = !!status;
                const msg       = messages[s.id];
                const isLoading = loadingId === s.id + '-melaksanakan'
                  || loadingId === s.id + '-berhalangan' || loadingId === s.id + '-tidak';

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
                    {/* Status selalu tampil, baik sudah diabsen atau belum */}
                    <td className="text-center">
                      <StatusBadge status={status} />
                    </td>
                    <td className="text-right">
                      {!done ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleAbsen(s, 'melaksanakan')}
                            disabled={isLoading}
                            className="text-[11px] leading-none font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-md px-1.5 py-1 transition disabled:opacity-40"
                          >
                            🕌 Melaksanakan
                          </button>
                          <button
                            onClick={() => handleAbsen(s, 'berhalangan')}
                            disabled={isLoading}
                            className="text-[11px] leading-none font-medium text-honey-700 bg-honey-50 hover:bg-honey-100 border border-honey-200 rounded-md px-1.5 py-1 transition disabled:opacity-40"
                          >
                            🤝 Berhalangan
                          </button>
                          <button
                            onClick={() => handleAbsen(s, 'tidak')}
                            disabled={isLoading}
                            className="text-[11px] leading-none font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md px-1.5 py-1 transition disabled:opacity-40"
                          >
                            🚫 Tidak
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
    </div>
  );
}
