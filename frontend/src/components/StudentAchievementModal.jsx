import { useEffect, useState } from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import api from '../api/axios';
import TruncateText from './TruncateText';
import { useTahunAjaranParam } from '../context/TahunAjaranContext';

export default function StudentAchievementModal({ student, onClose, onChanged, readOnly = false }) {
  const tahunParam = useTahunAjaranParam();
  const [achievementTypes, setAchievementTypes] = useState([]);
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [typeId, setTypeId]         = useState('');
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading]       = useState(false);

  const [editingId, setEditingId]   = useState(null);
  const [editTypeId, setEditTypeId] = useState('');
  const [editNote, setEditNote]     = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    api.get('/achievement-types').then((res) => setAchievementTypes(res.data));
  }, []);

  const loadAchievements = () => {
    setLoading(true);
    const params = { ...tahunParam };
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (typeId) params.achievement_type_id = typeId;

    return api.get(`/students/${student.id}/achievements`, { params })
      .then((res) => setAchievements(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAchievements(); }, [student.id]); // eslint-disable-line

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditTypeId(a.achievement_type_id || '');
    setEditNote(a.note || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTypeId('');
    setEditNote('');
  };

  const saveEdit = async (id) => {
    if (!editTypeId) return;
    setSaving(true);
    try {
      await api.put(`/achievements/${id}`, {
        achievement_type_id: editTypeId,
        note: editNote || null,
      });
      cancelEdit();
      await loadAchievements();
      onChanged?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui catatan prestasi.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a) => {
    if (!confirm(`Hapus catatan prestasi "${a.achievement_type?.name || '-'}" tanggal ${a.date}? Poin akan dikembalikan.`)) return;
    try {
      await api.delete(`/achievements/${a.id}`);
      await loadAchievements();
      onChanged?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus catatan prestasi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-line-200">
          <div>
            <h3 className="font-display font-semibold text-ink-900">{student.user?.name}</h3>
            <p className="text-xs text-ink-500 mt-0.5">{student.class_room?.name || '-'} · Riwayat Prestasi</p>
          </div>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-wrap gap-3 items-end border-b border-line-200">
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Dari Tanggal</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="field-input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Sampai Tanggal</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="field-input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Jenis Prestasi</label>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="field-input text-sm">
              <option value="">Semua Jenis</option>
              {achievementTypes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button onClick={loadAchievements} className="btn-primary text-sm">Terapkan Filter</button>
        </div>

        <div className="overflow-y-auto p-5">
          {loading ? (
            <p className="text-center text-ink-300 py-6">Memuat...</p>
          ) : achievements.length === 0 ? (
            <p className="text-center text-ink-300 py-6">Tidak ada riwayat prestasi untuk filter ini.</p>
          ) : (
            <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Tanggal</th>
                  <th className="font-medium whitespace-nowrap px-2">Jenis Prestasi</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Poin</th>
                  {!readOnly && <th className="font-medium text-right whitespace-nowrap px-2">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {achievements.map((a) => (
                  editingId === a.id ? (
                    <tr key={a.id} className="border-t border-line-200 bg-mist-50">
                      <td colSpan="4" className="py-3 whitespace-nowrap px-2">
                        <div className="flex flex-wrap gap-2 items-end">
                          <select
                            value={editTypeId}
                            onChange={(e) => setEditTypeId(e.target.value)}
                            className="field-input text-sm"
                          >
                            <option value="">Pilih jenis...</option>
                            {achievementTypes.map((t) => (
                              <option key={t.id} value={t.id}>{t.name} ({t.poin} poin)</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="Catatan (opsional)"
                            className="field-input text-sm flex-1 min-w-[140px]"
                          />
                          <button
                            onClick={() => saveEdit(a.id)}
                            disabled={saving || !editTypeId}
                            className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-2 disabled:opacity-50"
                          >
                            Simpan
                          </button>
                          <button onClick={cancelEdit} className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-2">
                            Batal
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={a.id} className="border-t border-line-200">
                      <td className="py-2.5 text-ink-700 align-top whitespace-nowrap px-2">{a.date}</td>
                      <td className="text-ink-900 align-top whitespace-nowrap px-2">
                        {a.achievement_type?.name || '-'}
                        {a.note && <p className="text-xs text-ink-400 mt-0.5"><TruncateText text={a.note} maxWidth="16rem" /></p>}
                      </td>
                      <td className="text-right text-brand-700 font-medium align-top whitespace-nowrap px-2">+{a.poin}</td>
                      {!readOnly && (
                        <td className="text-right align-top whitespace-nowrap px-2">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startEdit(a)} className="text-ink-400 hover:text-brand-600" title="Ubah">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(a)} className="text-ink-400 hover:text-rose-600" title="Hapus">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
