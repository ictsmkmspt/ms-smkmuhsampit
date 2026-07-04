import { useState, useEffect } from 'react';
import { ClipboardEdit, AlertTriangle, CheckCircle2, PlusCircle } from 'lucide-react';
import BarcodeScanner from '../../../components/BarcodeScanner';
import api from '../../../api/axios';

export default function PoinPelanggaranTab() {
  const [violationTypes, setViolationTypes] = useState([]);

  // --- Bagian Scan QR ---
  const [scannedStudent, setScannedStudent] = useState(null);
  const [scanTypeId, setScanTypeId]         = useState('');
  const [scanNote, setScanNote]             = useState('');
  const [scanMessage, setScanMessage]       = useState('');
  const [scanError, setScanError]           = useState(false);
  const [scanSubmitting, setScanSubmitting] = useState(false);

  // --- Bagian Tabel Siswa per Kelas ---
  const [classes, setClasses]             = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents]           = useState([]);
  const [rowTypeId, setRowTypeId]         = useState({}); // { studentId: violationTypeId }
  const [rowLoading, setRowLoading]       = useState(null);
  const [rowMessage, setRowMessage]       = useState({}); // { studentId: { text, error } }

  useEffect(() => {
    api.get('/violation-types').then((res) => setViolationTypes(res.data));
    api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); setRowMessage({}); return; }
    api.get('/students', { params: { class_room_id: selectedClass } }).then((res) => setStudents(res.data));
  }, [selectedClass]);

  // Dipanggil oleh BarcodeScanner setiap kali kamera berhasil membaca kode.
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
      return { message: err.response?.data?.message || 'Barcode tidak dikenali.', error: true };
    }
  };

  const handleSubmitScanViolation = async () => {
    if (!scannedStudent || !scanTypeId) return;
    setScanSubmitting(true);
    setScanMessage('');
    try {
      const res = await api.post('/attendance/record-manual', {
        student_id: scannedStudent.id,
        violation_type_id: scanTypeId,
        note: scanNote || undefined,
      });
      setScanError(false);
      setScanMessage(res.data.message);
      setScannedStudent(null);
      setScanTypeId('');
      setScanNote('');
    } catch (err) {
      setScanError(true);
      setScanMessage(err.response?.data?.message || 'Gagal mencatat pelanggaran.');
    } finally {
      setScanSubmitting(false);
    }
  };

  // Tambah poin manual dari baris tabel siswa.
  const handleAddPoinRow = async (student) => {
    const typeId = rowTypeId[student.id];
    if (!typeId) return;
    setRowLoading(student.id);
    try {
      const res = await api.post('/attendance/record-manual', {
        student_id: student.id,
        violation_type_id: typeId,
      });
      setRowMessage((p) => ({ ...p, [student.id]: { text: res.data.message, error: false } }));

      const tipe = violationTypes.find((v) => String(v.id) === String(typeId));
      setStudents((prev) => prev.map((s) =>
        s.id === student.id ? { ...s, total_poin: (s.total_poin || 0) + (tipe?.poin || 0) } : s
      ));
    } catch (err) {
      setRowMessage((p) => ({ ...p, [student.id]: { text: err.response?.data?.message || 'Gagal mencatat.', error: true } }));
    } finally {
      setRowLoading(null);
    }
  };

  return (
    <div>
      {/* === Scan QR === */}
      <p className="text-center text-sm text-ink-500 mb-4">Arahkan kamera ke QR/barcode siswa</p>
      <div className="max-w-md mx-auto">
        <BarcodeScanner onDecode={handleDecode} />
      </div>

      {scannedStudent && (
        <div className="max-w-md mx-auto mt-4 surface-card p-4">
          <p className="text-sm font-semibold text-ink-700 mb-1">{scannedStudent.user?.name}</p>
          <p className="text-xs text-ink-400 mb-3">{scannedStudent.class_room?.name || '-'} · NIS {scannedStudent.nis}</p>

          <label className="block text-xs font-medium text-ink-500 mb-1">Jenis Pelanggaran</label>
          <select
            value={scanTypeId}
            onChange={(e) => setScanTypeId(e.target.value)}
            className="field-input text-ink-700 mb-3"
          >
            <option value="">— Pilih Jenis Pelanggaran —</option>
            {violationTypes.map((v) => (
              <option key={v.id} value={v.id}>{v.name} ({v.poin} poin)</option>
            ))}
          </select>

          <input
            type="text"
            value={scanNote}
            onChange={(e) => setScanNote(e.target.value)}
            placeholder="Catatan (opsional)"
            className="field-input text-ink-700 mb-3"
          />

          <div className="flex gap-2">
            <button
              onClick={handleSubmitScanViolation}
              disabled={!scanTypeId || scanSubmitting}
              className="flex-1 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl py-2 transition"
            >
              {scanSubmitting ? 'Menyimpan...' : 'Catat Pelanggaran'}
            </button>
            <button
              onClick={() => setScannedStudent(null)}
              className="px-4 text-sm font-medium text-ink-500 hover:bg-mist-50 rounded-xl py-2 transition"
            >
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

      {/* === Tabel Siswa per Kelas (input manual) === */}
      <div className="max-w-2xl mx-auto mt-8 surface-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardEdit className="w-4 h-4 text-brand-600 shrink-0" />
          <p className="text-sm font-semibold text-ink-700">Tambah Poin Pelanggaran Manual</p>
        </div>
        <p className="text-xs text-ink-400 mb-4">Pilih kelas, lalu pilih jenis pelanggaran untuk siswa yang dituju.</p>

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
                <th className="pb-2 font-medium text-center w-20">Poin</th>
                <th className="pb-2 font-medium text-right w-64">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const msg = rowMessage[s.id];
                return (
                  <tr key={s.id} className="border-t border-line-200">
                    <td className="py-2.5">
                      <p className="text-ink-900 font-medium">{s.user?.name}</p>
                      {msg && (
                        <p className={`text-xs mt-0.5 ${msg.error ? 'text-honey-700' : 'text-brand-600'}`}>{msg.text}</p>
                      )}
                    </td>
                    <td className="text-center">
                      <span className="badge-soft badge-honey">{s.total_poin || 0}</span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <select
                          value={rowTypeId[s.id] || ''}
                          onChange={(e) => setRowTypeId((p) => ({ ...p, [s.id]: e.target.value }))}
                          className="text-xs border border-line-200 rounded-lg px-2 py-1.5 text-ink-700"
                        >
                          <option value="">Pilih...</option>
                          {violationTypes.map((v) => (
                            <option key={v.id} value={v.id}>{v.name} ({v.poin})</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAddPoinRow(s)}
                          disabled={!rowTypeId[s.id] || rowLoading === s.id}
                          className="flex items-center gap-1 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-40 rounded-lg px-3 py-1.5 transition"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> {rowLoading === s.id ? '...' : 'Tambah'}
                        </button>
                      </div>
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
