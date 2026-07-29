import { useEffect, useState } from 'react';
import { X, MessageSquare, Printer } from 'lucide-react';
import api from '../api/axios';

/**
 * Panel jurnal kegiatan PKL 1 penempatan — dipakai bersama Guru (lihat saja)
 * dan DUDI (lihat + isi kolom Catatan lewat prop canIsiCatatan).
 */
export default function PklJournalModal({ placement, onClose, canIsiCatatan = false }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [catatanText, setCatatanText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    return api.get(`/pkl-placements/${placement.id}/jurnal`)
      .then((res) => setEntries(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [placement.id]); // eslint-disable-line

  const startCatatan = (entry) => {
    setEditingId(entry.id);
    setCatatanText(entry.catatan || '');
  };

  const handleSimpanCatatan = async (id) => {
    setSaving(true);
    try {
      await api.put(`/pkl-jurnal/${id}/catatan`, { catatan: catatanText });
      setEditingId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan catatan.');
    } finally {
      setSaving(false);
    }
  };

  const handleCetak = () => {
    window.open(`/print/pkl-jurnal-kegiatan?placement_id=${placement.id}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-line-200">
          <div>
            <h3 className="font-display font-semibold text-ink-900">{placement.student?.user?.name}</h3>
            <p className="text-xs text-ink-500 mt-0.5">Jurnal Kegiatan · {placement.dudi?.nama_perusahaan || '-'}</p>
          </div>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 border-b border-line-200">
          <button
            onClick={handleCetak}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600"
          >
            <Printer className="w-4 h-4" /> Cetak Jurnal Kegiatan
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-3">
          {loading ? (
            <p className="text-center text-ink-300 py-6">Memuat...</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-ink-300 py-6">Belum ada kegiatan yang diisi siswa.</p>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="border border-line-200 rounded-lg px-3 py-2.5 text-sm">
                <p className="text-ink-500 text-xs font-medium mb-1">{e.date}</p>
                <p className="text-ink-900">{e.kegiatan}</p>

                {editingId === e.id ? (
                  <div className="mt-2 pt-2 border-t border-line-200 space-y-2">
                    <textarea
                      value={catatanText} onChange={(ev) => setCatatanText(ev.target.value)}
                      className="field-input w-full text-sm" rows="2"
                      placeholder="Tulis catatan/tanggapan untuk kegiatan ini"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSimpanCatatan(e.id)}
                        disabled={saving}
                        className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 disabled:opacity-50"
                      >
                        {saving ? 'Menyimpan...' : 'Simpan Catatan'}
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-1.5">
                        Batal
                      </button>
                    </div>
                  </div>
                ) : e.catatan ? (
                  <div className="flex items-start justify-between gap-2 mt-2 pt-2 border-t border-line-200">
                    <div className="flex gap-1.5 text-xs text-brand-700">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <p><span className="font-medium">Catatan:</span> {e.catatan}</p>
                    </div>
                    {canIsiCatatan && (
                      <button onClick={() => startCatatan(e)} className="text-xs text-ink-400 hover:text-brand-600 shrink-0">Ubah</button>
                    )}
                  </div>
                ) : canIsiCatatan ? (
                  <button
                    onClick={() => startCatatan(e)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 mt-2 pt-2 border-t border-line-200 w-full text-left"
                  >
                    + Tambah catatan
                  </button>
                ) : (
                  <p className="text-xs text-ink-300 mt-2 pt-2 border-t border-line-200">Belum ada catatan dari instruktur.</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
