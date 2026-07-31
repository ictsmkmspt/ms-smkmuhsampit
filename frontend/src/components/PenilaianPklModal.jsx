import { useEffect, useState } from 'react';
import { X, Star, Plus, Trash2, Send, FileDown, Pencil } from 'lucide-react';
import api from '../api/axios';

const ASPEK_TETAP = [
  { key: 'skor_disiplin', label: 'Disiplin dan Kehadiran', indikator: 'Hadir tepat waktu, mematuhi jam kerja, dan tertib dalam kehadiran' },
  { key: 'skor_sikap', label: 'Sikap dan Etika Kerja', indikator: 'Sopan, jujur, amanah, bertanggung jawab, dan mematuhi aturan' },
  { key: 'skor_komunikasi', label: 'Komunikasi dan Kerja Sama', indikator: 'Berkomunikasi dengan baik dan mampu bekerja sama' },
  { key: 'skor_inisiatif', label: 'Inisiatif dan Adaptasi', indikator: 'Mau belajar, tanggap terhadap arahan, mampu menyesuaikan diri' },
  { key: 'skor_k3', label: 'K3 dan Kepatuhan SOP', indikator: 'Mematuhi prosedur keselamatan dan SOP yang berlaku' },
];

const SKOR_LABEL = { 1: '1 - Perlu Bimbingan', 2: '2 - Cukup', 3: '3 - Baik', 4: '4 - Sangat Baik' };

const skorAwal = { skor_disiplin: 3, skor_sikap: 3, skor_komunikasi: 3, skor_inisiatif: 3, skor_k3: 3 };
const kompetensiAwal = [{ nama_kompetensi: '', skor: 3 }];

export default function PenilaianPklModal({ placement, canIsi, showActions = true, onClose }) {
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState(undefined);
  const [isEditing, setIsEditing] = useState(false);

  const [skor, setSkor] = useState(skorAwal);
  const [kompetensi, setKompetensi] = useState(kompetensiAwal);
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const muatData = () => {
    setExisting(undefined);
    setLoading(true);
    return api.get(`/pkl-placements/${placement.id}/penilaian`)
      .then((res) => setExisting(res.data))
      .catch(() => setExisting(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { muatData(); }, [placement.id]); // eslint-disable-line

  const tambahBarisKompetensi = () => setKompetensi((k) => [...k, { nama_kompetensi: '', skor: 3 }]);
  const hapusBarisKompetensi = (i) => setKompetensi((k) => k.filter((_, idx) => idx !== i));
  const ubahKompetensi = (i, field, value) => {
    setKompetensi((k) => k.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  };

  const mulaiEdit = () => {
    setSkor({
      skor_disiplin: existing.skor_disiplin, skor_sikap: existing.skor_sikap,
      skor_komunikasi: existing.skor_komunikasi, skor_inisiatif: existing.skor_inisiatif,
      skor_k3: existing.skor_k3,
    });
    setKompetensi(
      existing.kompetensis?.length
        ? existing.kompetensis.map((k) => ({ nama_kompetensi: k.nama_kompetensi, skor: k.skor }))
        : kompetensiAwal
    );
    setCatatan(existing.catatan || '');
    setError('');
    setIsEditing(true);
  };

  const batalEdit = () => {
    setIsEditing(false);
    setSkor(skorAwal);
    setKompetensi(kompetensiAwal);
    setCatatan('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const kompetensiValid = kompetensi.filter((k) => k.nama_kompetensi.trim() !== '');
    if (kompetensiValid.length === 0) {
      setError('Isi minimal 1 kompetensi teknis.');
      return;
    }

    if (!isEditing && !confirm('Kirim penilaian ini sekarang?')) return;

    setSaving(true);
    try {
      const payload = { ...skor, catatan: catatan || null, kompetensi: kompetensiValid };
      const res = isEditing
        ? await api.put(`/pkl-placements/${placement.id}/penilaian`, payload)
        : await api.post(`/pkl-placements/${placement.id}/penilaian`, payload);
      setExisting(res.data.penilaian);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan penilaian.');
    } finally {
      setSaving(false);
    }
  };

  const handleHapus = async () => {
    if (!confirm('Hapus penilaian PKL siswa ini? Setelah dihapus, penilaian bisa diisi ulang dari awal.')) return;
    setDeleting(true);
    try {
      await api.delete(`/pkl-placements/${placement.id}/penilaian`);
      setExisting(null);
      batalEdit();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus penilaian.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportWord = async () => {
    const res = await api.get(`/pkl-placements/${placement.id}/penilaian/export-word`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Penilaian-PKL-${placement.student?.user?.name || 'siswa'}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const tampilkanForm = isEditing || (canIsi && !(existing && existing.nilai_akhir != null));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[75vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-line-200 shrink-0">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-brand-600" />
            <div>
              <h3 className="font-display font-semibold text-ink-900">Penilaian PKL</h3>
              <p className="text-xs text-ink-500 mt-0.5">{placement.student?.user?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {loading ? (
            <p className="text-center text-ink-300 py-6 text-sm">Memuat...</p>
          ) : !tampilkanForm && existing && existing.nilai_akhir != null ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-brand-50 border border-brand-200 px-4 py-3 text-center">
                <p className="text-xs text-brand-700">Nilai Akhir PKL</p>
                <p className="font-display text-3xl font-bold text-brand-700">{existing.nilai_akhir}</p>
              </div>

              <div className="space-y-2">
                {ASPEK_TETAP.map((a) => (
                  <div key={a.key} className="flex items-center justify-between text-sm border-b border-line-200 pb-2">
                    <span className="text-ink-700">{a.label}</span>
                    <span className="font-semibold text-ink-900">{existing[a.key]}</span>
                  </div>
                ))}
                {existing.kompetensis?.map((k) => (
                  <div key={k.id} className="flex items-center justify-between text-sm border-b border-line-200 pb-2">
                    <span className="text-ink-700">{k.nama_kompetensi}</span>
                    <span className="font-semibold text-ink-900">{k.skor}</span>
                  </div>
                ))}
              </div>

              {existing.catatan && (
                <div>
                  <p className="text-xs font-medium text-ink-500 mb-1">Catatan Instruktur</p>
                  <p className="text-sm text-ink-700">{existing.catatan}</p>
                </div>
              )}

              {showActions && (
                <button
                  onClick={handleExportWord}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-xl py-2.5"
                >
                  <FileDown className="w-4 h-4" /> Export ke Word
                </button>
              )}

              {showActions && canIsi && (
                <div className="flex gap-2">
                  <button
                    onClick={mulaiEdit}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl py-2.5"
                  >
                    <Pencil className="w-4 h-4" /> Edit Nilai
                  </button>
                  <button
                    onClick={handleHapus}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-honey-700 hover:bg-honey-50 disabled:opacity-50 border border-honey-200 rounded-xl py-2.5"
                  >
                    <Trash2 className="w-4 h-4" /> {deleting ? 'Menghapus...' : 'Hapus Nilai'}
                  </button>
                </div>
              )}
            </div>
          ) : tampilkanForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}

              <p className="text-xs text-ink-500 bg-mist-50 border border-line-200 rounded-lg px-3 py-2">
                Keterangan Skor: 4 = Sangat Baik | 3 = Baik | 2 = Cukup | 1 = Perlu Bimbingan
              </p>

              <div>
                <p className="text-xs font-medium text-ink-500 mb-2">Aspek Penilaian Umum</p>
                <div className="space-y-2">
                  {ASPEK_TETAP.map((a) => (
                    <div key={a.key}>
                      <label className="block text-sm text-ink-700 mb-0.5">{a.label}</label>
                      <p className="text-xs text-ink-400 mb-1">{a.indikator}</p>
                      <select
                        value={skor[a.key]}
                        onChange={(e) => setSkor({ ...skor, [a.key]: Number(e.target.value) })}
                        className="field-input text-sm text-ink-700"
                      >
                        {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{SKOR_LABEL[n]}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-ink-500">Kompetensi Teknis</p>
                  <button type="button" onClick={tambahBarisKompetensi} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                    <Plus className="w-3.5 h-3.5" /> Tambah Baris
                  </button>
                </div>
                <div className="space-y-2">
                  {kompetensi.map((k, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text" value={k.nama_kompetensi}
                        onChange={(e) => ubahKompetensi(i, 'nama_kompetensi', e.target.value)}
                        placeholder={`Kompetensi Teknis ${i + 1}`}
                        className="field-input text-sm flex-1"
                      />
                      <select
                        value={k.skor}
                        onChange={(e) => ubahKompetensi(i, 'skor', Number(e.target.value))}
                        className="field-input text-sm text-ink-700 w-16"
                      >
                        {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      {kompetensi.length > 1 && (
                        <button type="button" onClick={() => hapusBarisKompetensi(i)} className="text-ink-300 hover:text-honey-700 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Catatan Instruktur (opsional)</label>
                <textarea
                  value={catatan} onChange={(e) => setCatatan(e.target.value)}
                  className="field-input w-full min-h-[80px]" rows="3"
                />
              </div>

              <div className="flex gap-2">
                {isEditing && (
                  <button type="button" onClick={batalEdit} className="text-sm font-medium text-ink-500 hover:text-ink-700 px-4">
                    Batal
                  </button>
                )}
                <button disabled={saving} className="btn-primary flex-1 justify-center">
                  <Send className="w-4 h-4" /> {saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Kirim Penilaian'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-center text-ink-300 py-6 text-sm">Belum ada penilaian dari IDUKA untuk siswa ini.</p>
          )}
        </div>
      </div>
    </div>
  );
}
