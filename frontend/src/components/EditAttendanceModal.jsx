import { useState } from 'react';
import { X, Save } from 'lucide-react';
import api from '../api/axios';

export default function EditAttendanceModal({ record, onClose, onSaved }) {
  const [status, setStatus] = useState(record.status === 'alpa' ? 'hadir' : record.status);
  const [timeIn, setTimeIn] = useState(record.time_in ? record.time_in.slice(0, 5) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.post('/attendance/update-status', {
        student_id: record.student.id,
        date: record.date,
        status,
        time_in: status !== 'alpa' ? timeIn : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-start justify-between p-5 border-b border-line-200">
          <div>
            <h3 className="font-display font-semibold text-ink-900">{record.student?.user?.name}</h3>
            <p className="text-xs text-ink-500 mt-0.5">{record.student?.class_room?.name || '-'} · {record.date}</p>
          </div>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Status Kehadiran</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="field-input text-ink-700"
            >
              <option value="hadir">Hadir</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Jam Masuk</label>
            <input
              type="time"
              value={timeIn}
              onChange={(e) => setTimeIn(e.target.value)}
              disabled={status === 'alpa'}
              className="field-input disabled:opacity-40 disabled:bg-mist-50"
            />
            {status === 'alpa' && (
              <p className="text-xs text-ink-400 mt-1">Jam masuk tidak berlaku untuk status Alpa.</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl py-2 transition"
            >
              <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              onClick={onClose}
              className="px-4 text-sm font-medium text-ink-500 hover:bg-mist-50 rounded-xl py-2 transition"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
