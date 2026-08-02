import { useEffect, useState } from 'react';
import { NotebookPen, Printer, MessageSquare, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../api/axios';

/**
 * Jurnal Kegiatan PKL untuk siswa — beda dari absensi (jam masuk/pulang).
 * Siswa bisa menambah LEBIH DARI 1 kegiatan dalam tanggal yang sama (misal
 * beda jam/tugas). Kolom "Catatan" cuma bisa diisi IDUKA, siswa hanya bisa
 * membacanya di sini. Kegiatan yang BELUM dikomentari IDUKA masih bisa
 * diedit/dihapus siswa sendiri.
 */
export default function PklJurnalTab({ placement }) {
  const pklSelesai = placement.status !== 'aktif';
  const today = new Date().toISOString().slice(0, 10);
  const [tanggal, setTanggal] = useState(today);
  const [kegiatan, setKegiatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editTanggal, setEditTanggal] = useState('');
  const [editKegiatan, setEditKegiatan] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadHistory = () => {
    setLoadingHistory(true);
    return api.get('/my-pkl-jurnal')
      .then((res) => setHistory(res.data))
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { loadHistory(); }, []);

  const handleTambah = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await api.post('/pkl-jurnal', { date: tanggal, kegiatan });
      setMessage({ type: 'ok', text: res.data.message });
      setKegiatan('');
      loadHistory();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menyimpan kegiatan.' });
    } finally {
      setSaving(false);
    }
  };

  const mulaiEdit = (h) => {
    setEditingId(h.id);
    setEditTanggal(h.date);
    setEditKegiatan(h.kegiatan);
  };

  const batalEdit = () => setEditingId(null);

  const simpanEdit = async (id) => {
    setSavingEdit(true);
    try {
      await api.put(`/pkl-jurnal/${id}`, { date: editTanggal, kegiatan: editKegiatan });
      setEditingId(null);
      loadHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSavingEdit(false);
    }
  };

  const hapusKegiatan = async (id) => {
    if (!confirm('Hapus catatan kegiatan ini?')) return;
    try {
      await api.delete(`/pkl-jurnal/${id}`);
      loadHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus kegiatan.');
    }
  };

  const handleCetak = () => {
    window.open(`/print/pkl-jurnal-kegiatan?placement_id=${placement.id}`, '_blank');
  };

  // Kelompokkan riwayat per tanggal supaya kegiatan yang lebih dari 1 dalam
  // sehari tampil menyatu di bawah 1 judul tanggal, bukan terpisah-pisah.
  const grouped = history.reduce((acc, h) => {
    (acc[h.date] ||= []).push(h);
    return acc;
  }, {});
  const tanggalUrut = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <NotebookPen className="w-4 h-4 text-brand-600" />
          <h2 className="font-display font-semibold text-ink-900">Tambah Kegiatan</h2>
        </div>

        {pklSelesai ? (
          <p className="flex items-center gap-1.5 text-sm text-ink-500 bg-mist-50 border border-line-200 rounded-lg px-3 py-2.5">
            PKL Anda sudah berstatus <b className="mx-1">Selesai</b> — tidak bisa menambah kegiatan baru lagi. Riwayat lama masih bisa dilihat di bawah.
          </p>
        ) : (
          <>
            {message && (
              <p className={`text-sm rounded-lg px-3 py-2 mb-3 ${
                message.type === 'ok'
                  ? 'text-brand-700 bg-brand-50 border border-brand-200'
                  : 'text-honey-700 bg-honey-50 border border-honey-200'
              }`}>
                {message.text}
              </p>
            )}

            <form onSubmit={handleTambah} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal</label>
                <input
                  type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                  max={today} className="field-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Kegiatan / Pekerjaan yang Dilakukan</label>
                <textarea
                  value={kegiatan} onChange={(e) => setKegiatan(e.target.value)}
                  className="field-input w-full min-h-[100px]" rows="4"
                  placeholder="Contoh: Membantu instalasi jaringan LAN di ruang TU"
                  required
                />
                <p className="text-xs text-ink-400 mt-1">Bisa diisi lebih dari 1 kali untuk tanggal yang sama — setiap kegiatan tersimpan sebagai baris terpisah.</p>
              </div>
              <button disabled={saving} className="btn-primary w-full justify-center">
                <Plus className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Tambah Kegiatan'}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-ink-900">Riwayat Kegiatan</h2>
          <button
            onClick={handleCetak}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" /> Cetak
          </button>
        </div>
        {loadingHistory ? (
          <p className="text-center text-ink-300 py-6 text-sm">Memuat...</p>
        ) : tanggalUrut.length === 0 ? (
          <p className="text-center text-ink-300 py-6 text-sm">Belum ada kegiatan yang diisi.</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {tanggalUrut.map((tgl) => (
              <div key={tgl}>
                <p className="text-ink-500 text-xs font-medium mb-1.5">{tgl}</p>
                <div className="space-y-2">
                  {grouped[tgl].map((h) => (
                    <div key={h.id} className="border border-line-200 rounded-lg px-3 py-2.5 text-sm">
                      {editingId === h.id ? (
                        <div className="space-y-2">
                          <input
                            type="date" value={editTanggal} onChange={(e) => setEditTanggal(e.target.value)}
                            max={today} className="field-input text-sm"
                          />
                          <textarea
                            value={editKegiatan} onChange={(e) => setEditKegiatan(e.target.value)}
                            className="field-input w-full text-sm" rows="3"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => simpanEdit(h.id)} disabled={savingEdit} className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5 disabled:opacity-50">
                              {savingEdit ? 'Menyimpan...' : 'Simpan'}
                            </button>
                            <button onClick={batalEdit} className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-1.5">
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-ink-900">{h.kegiatan}</p>
                            {!h.catatan && (
                              <div className="flex items-center gap-2 shrink-0">
                                <button onClick={() => mulaiEdit(h)} className="text-ink-400 hover:text-brand-600" title="Edit kegiatan">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => hapusKegiatan(h.id)} className="text-ink-400 hover:text-honey-700" title="Hapus kegiatan">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          {h.catatan && (
                            <div className="flex gap-1.5 mt-2 pt-2 border-t border-line-200 text-xs text-brand-700">
                              <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <p><span className="font-medium">Catatan Instruktur:</span> {h.catatan}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
