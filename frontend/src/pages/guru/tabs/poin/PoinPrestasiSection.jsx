import { useState, useEffect } from 'react';
import { ClipboardEdit, AlertTriangle, CheckCircle2, PlusCircle } from 'lucide-react';
import BarcodeScanner from '../../../../components/BarcodeScanner';
import StudentAchievementModal from '../../../../components/StudentAchievementModal';
import TruncateText from '../../../../components/TruncateText';
import api from '../../../../api/axios';

export default function PoinPrestasiSection() {
  const [achievementTypes, setAchievementTypes] = useState([]);

  const [scannedStudent, setScannedStudent] = useState(null);
  const [scanTypeId, setScanTypeId]         = useState('');
  const [scanNote, setScanNote]             = useState('');
  const [scanMessage, setScanMessage]       = useState('');
  const [scanError, setScanError]           = useState(false);
  const [scanSubmitting, setScanSubmitting] = useState(false);

  const [classes, setClasses]             = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents]           = useState([]);
  const [rowTypeId, setRowTypeId]         = useState({});
  const [rowLoading, setRowLoading]       = useState(null);
  const [rowMessage, setRowMessage]       = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    api.get('/achievement-types').then((res) => setAchievementTypes(res.data));
    api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); setRowMessage({}); return; }
    api.get('/students', { params: { class_room_id: selectedClass } }).then((res) => setStudents(res.data));
  }, [selectedClass]);

  const reloadStudents = () => {
    if (!selectedClass) return;
    api.get('/students', { params: { class_room_id: selectedClass } }).then((res) => setStudents(res.data));
  };

  const handleDecode = async (code) => {
    try {
      const res = await api.get(`/students/barcode/${code}`);
      setScannedStudent(res.data);
      setScanTypeId('');
      setScanNote('');
      setScanMessage('');
      return { message: `Siswa ditemukan: ${res.data.user.name}`, error: false };
    } catch (err) {
      setScannedStudent(null);
      return { message: err.response?.data?.message || 'QR Code tidak dikenali.', error: true };
    }
  };

  const handleSubmitScan = async () => {
    if (!scannedStudent || !scanTypeId) return;
    setScanSubmitting(true);
    setScanMessage('');
    try {
      const res = await api.post('/achievements/record', {
        student_id: scannedStudent.id,
        achievement_type_id: scanTypeId,
        note: scanNote || undefined,
      });
      setScanError(false);
      setScanMessage(res.data.message);
      setScannedStudent(null);
      setScanTypeId('');
      setScanNote('');
    } catch (err) {
      setScanError(true);
      setScanMessage(err.response?.data?.message || 'Gagal mencatat prestasi.');
    } finally {
      setScanSubmitting(false);
    }
  };

  const handleAddPoinRow = async (student) => {
    const typeId = rowTypeId[student.id];
    if (!typeId) return;
    setRowLoading(student.id);
    try {
      const res = await api.post('/achievements/record', {
        student_id: student.id,
        achievement_type_id: typeId,
      });
      setRowMessage((p) => ({ ...p, [student.id]: { text: res.data.message, error: false } }));
      const tipe = achievementTypes.find((a) => String(a.id) === String(typeId));
      setStudents((prev) => prev.map((s) =>
        s.id === student.id ? { ...s, total_prestasi: (s.total_prestasi || 0) + (tipe?.poin || 0) } : s
      ));
    } catch (err) {
      setRowMessage((p) => ({ ...p, [student.id]: { text: err.response?.data?.message || 'Gagal mencatat.', error: true } }));
    } finally {
      setRowLoading(null);
    }
  };

  return (
    <div>
      <p className="text-center text-sm text-ink-500 mb-4">Arahkan kamera ke QR Code siswa</p>
      <div className="max-w-md mx-auto">
        <BarcodeScanner onDecode={handleDecode} />
      </div>

      {scannedStudent && (
        <div className="max-w-md mx-auto mt-4 surface-card p-4">
          <p className="text-sm font-semibold text-ink-700 mb-1">{scannedStudent.user?.name}</p>
          <p className="text-xs text-ink-400 mb-3">{scannedStudent.class_room?.name || '-'} · NIS {scannedStudent.nis}</p>

          <label className="block text-xs font-medium text-ink-500 mb-1">Jenis Prestasi</label>
          <select value={scanTypeId} onChange={(e) => setScanTypeId(e.target.value)} className="field-input text-ink-700 mb-3">
            <option value="">— Pilih Jenis Prestasi —</option>
            {achievementTypes.map((a) => (
              <option key={a.id} value={a.id}>{a.name} (+{a.poin} poin)</option>
            ))}
          </select>

          <input type="text" value={scanNote} onChange={(e) => setScanNote(e.target.value)}
            placeholder="Catatan (opsional)" className="field-input text-ink-700 mb-3" />

          <div className="flex gap-2">
            <button onClick={handleSubmitScan} disabled={!scanTypeId || scanSubmitting}
              className="flex-1 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl py-2 transition">
              {scanSubmitting ? 'Menyimpan...' : 'Catat Prestasi'}
            </button>
            <button onClick={() => setScannedStudent(null)}
              className="px-4 text-sm font-medium text-ink-500 hover:bg-mist-50 rounded-xl py-2 transition">
              Batal
            </button>
          </div>
        </div>
      )}

      {scanMessage && !scannedStudent && (
        <div className={`max-w-md mx-auto mt-4 flex items-start gap-2 p-3 rounded-xl text-sm font-medium ${
          scanError ? 'bg-honey-50 text-honey-700 border border-honey-200' : 'bg-brand-50 text-brand-700 border border-brand-100'
        }`}>
          {scanError ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{scanMessage}</span>
        </div>
      )}

      <div className="max-w-2xl mx-auto mt-8 surface-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardEdit className="w-4 h-4 text-brand-600 shrink-0" />
          <p className="text-sm font-semibold text-ink-700">Tambah Poin Prestasi Manual</p>
        </div>
        <p className="text-xs text-ink-400 mb-4">Pilih kelas, lalu pilih jenis prestasi untuk siswa yang dituju.</p>

        <div className="mb-4">
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="field-input text-ink-700">
            <option value="">— Pilih Kelas —</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {selectedClass && students.length === 0 && (
          <p className="text-sm text-ink-300 text-center py-4">Belum ada siswa di kelas ini.</p>
        )}

        {students.length > 0 && (
          <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Siswa</th>
                <th className="pb-2 font-medium text-center w-24 whitespace-nowrap px-2">Poin Prestasi</th>
                <th className="pb-2 font-medium text-right w-64 whitespace-nowrap px-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const msg = rowMessage[s.id];
                return (
                  <tr key={s.id} className="border-t border-line-200">
                    <td className="py-2.5 whitespace-nowrap px-2">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="text-ink-900 font-medium hover:text-brand-600 hover:underline transition text-left"
                      >
                        <TruncateText text={s.user?.name} clickable={false} />
                      </button>
                      {msg && <p className={`text-xs mt-0.5 ${msg.error ? 'text-honey-700' : 'text-brand-600'}`}>{msg.text}</p>}
                    </td>
                    <td className="text-center whitespace-nowrap px-2">
                      <button onClick={() => setSelectedStudent(s)} title="Lihat/edit riwayat poin">
                        <span className="badge-soft badge-brand hover:brightness-95 transition">{s.total_prestasi || 0}</span>
                      </button>
                    </td>
                    <td className="text-right whitespace-nowrap px-2">
                      <div className="flex justify-end gap-2">
                        <select value={rowTypeId[s.id] || ''} onChange={(e) => setRowTypeId((p) => ({ ...p, [s.id]: e.target.value }))}
                          className="text-xs border border-line-200 rounded-lg px-2 py-1.5 text-ink-700">
                          <option value="">Pilih...</option>
                          {achievementTypes.map((a) => (
                            <option key={a.id} value={a.id}>{a.name} (+{a.poin})</option>
                          ))}
                        </select>
                        <button onClick={() => handleAddPoinRow(s)} disabled={!rowTypeId[s.id] || rowLoading === s.id}
                          className="flex items-center gap-1 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 rounded-lg px-3 py-1.5 transition">
                          <PlusCircle className="w-3.5 h-3.5" /> {rowLoading === s.id ? '...' : 'Tambah'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {selectedStudent && (
        <StudentAchievementModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onChanged={reloadStudents}
        />
      )}
    </div>
  );
}
