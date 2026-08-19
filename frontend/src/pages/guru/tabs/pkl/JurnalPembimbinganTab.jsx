import { useEffect, useState } from 'react';
import { Plus, Printer, CheckCircle2, Trash2 } from 'lucide-react';
import api from '../../../../api/axios';
import DateInput from '../../../../components/DateInput';
import { fmtDMY } from '../../../../utils/date';

export default function JurnalPembimbinganTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [idukaOptions, setIdukaOptions] = useState([]);
  const [selectedIduka, setSelectedIduka] = useState('');
  const [jadwalOptions, setJadwalOptions] = useState([]);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tanggal, setTanggal] = useState(today);
  const [aktivitas, setAktivitas] = useState('');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/pkl-placements/my-bimbingan').then((res) => {
      const unik = [];
      const seen = new Set();
      res.data.forEach((p) => {
        if (p.iduka && !seen.has(p.iduka.id)) {
          seen.add(p.iduka.id);
          unik.push(p.iduka);
        }
      });
      setIdukaOptions(unik);
      if (unik.length === 1) setSelectedIduka(String(unik[0].id));
    });
  }, []);

  // Pilihan "Aktivitas" diambil dari Jadwal Monitoring PKL yang ditetapkan
  // admin/Waka Kurikulum (menu PKL > Jadwal Monitoring), bukan diketik bebas
  // lagi — supaya catatan kunjungan guru konsisten dengan jadwal resminya.
  useEffect(() => {
    api.get('/pkl-monitoring-jadwal').then((res) => setJadwalOptions(res.data));
  }, []);

  const loadEntries = () => {
    setLoading(true);
    return api.get('/pkl-pembimbingan').then((res) => setEntries(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadEntries(); }, []);

  const bukaFormTambah = () => {
    setEditingId(null);
    setTanggal(today);
    setAktivitas('');
    setCatatan('');
    setError('');
    setShowForm(true);
  };

  const bukaFormEdit = (e) => {
    setEditingId(e.id);
    setTanggal(e.date);
    setAktivitas(e.aktivitas);
    setCatatan(e.catatan || '');
    setError('');
    setShowForm(true);
  };

  const tutupForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/pkl-pembimbingan/${editingId}`, { date: tanggal, aktivitas, catatan: catatan || null });
      } else {
        await api.post('/pkl-pembimbingan', { iduka_id: selectedIduka, date: tanggal, aktivitas, catatan: catatan || null });
      }
      tutupForm();
      loadEntries();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan catatan.');
    } finally {
      setSaving(false);
    }
  };

  const handleHapus = async (id) => {
    if (!confirm('Hapus catatan bimbingan ini?')) return;
    try {
      await api.delete(`/pkl-pembimbingan/${id}`);
      loadEntries();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus catatan.');
    }
  };

  const handleCetak = () => {
    if (!selectedIduka) return;
    const iduka = idukaOptions.find((d) => String(d.id) === String(selectedIduka));
    window.open(`/print/pkl-pembimbingan?iduka_id=${selectedIduka}&iduka_nama=${encodeURIComponent(iduka?.nama_perusahaan || '')}`, '_blank');
  };

  const handleCetakEntry = (entryId) => {
    window.open(`/print/pkl-pembimbingan?entry_id=${entryId}`, '_blank');
  };

  const filtered = selectedIduka ? entries.filter((e) => String(e.iduka_id) === String(selectedIduka)) : entries;

  return (
    <div className="space-y-6">
      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-display font-semibold text-ink-900">Jurnal Pembimbing PKL</h2>
          <select
            value={selectedIduka}
            onChange={(e) => setSelectedIduka(e.target.value)}
            className="field-input text-sm text-ink-700 w-56"
          >
            <option value="">— Pilih IDUKA —</option>
            {idukaOptions.map((d) => (
              <option key={d.id} value={d.id}>{d.nama_perusahaan}</option>
            ))}
          </select>
        </div>

        {!selectedIduka ? (
          <p className="text-sm text-ink-400 text-center py-6">Pilih IDUKA dulu untuk menambah atau melihat catatan bimbingan.</p>
        ) : (
          <>
            {!showForm ? (
              <div className="flex gap-3 mb-4">
                <button onClick={bukaFormTambah} className="btn-primary">
                  <Plus className="w-4 h-4" /> Tambah Catatan Kunjungan
                </button>
                <button
                  onClick={handleCetak}
                  className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-lg px-4 py-2.5"
                >
                  <Printer className="w-4 h-4" /> Cetak Jurnal
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2 mb-4 border border-line-200 rounded-xl p-4">
                {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
                <DateInput
                  value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                  max={today} className="field-input text-sm" required
                />
                <select
                  value={aktivitas} onChange={(e) => setAktivitas(e.target.value)}
                  className="field-input w-full text-sm text-ink-700"
                  required
                >
                  <option value="">— Pilih Aktivitas (dari Jadwal Monitoring) —</option>
                  {jadwalOptions.map((j) => (
                    <option key={j.id} value={j.judul}>{j.judul}</option>
                  ))}
                  {aktivitas && !jadwalOptions.some((j) => j.judul === aktivitas) && (
                    <option value={aktivitas}>{aktivitas}</option>
                  )}
                </select>
                <textarea
                  value={catatan} onChange={(e) => setCatatan(e.target.value)}
                  className="field-input w-full text-sm" rows="2"
                  placeholder="Catatan / temuan / masalah (opsional)"
                />
                <div className="flex gap-2">
                  <button disabled={saving} className="text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-4 py-2 disabled:opacity-50">
                    {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan'}
                  </button>
                  <button type="button" onClick={tutupForm} className="text-sm font-medium text-ink-500 hover:text-ink-700 px-2">
                    Batal
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <p className="text-center text-ink-300 py-6 text-sm">Memuat...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-ink-300 py-6 text-sm">Belum ada catatan bimbingan untuk IDUKA ini.</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((e) => (
                  <div key={e.id} className="border border-line-200 rounded-lg px-3 py-2.5 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-ink-500 text-xs font-medium mb-1">{fmtDMY(e.date)}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {!e.verified_at && (
                          <>
                            <button onClick={() => bukaFormEdit(e)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">
                              Edit
                            </button>
                            <button onClick={() => handleHapus(e.id)} className="text-ink-400 hover:text-honey-700" title="Hapus catatan">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleCetakEntry(e.id)}
                          className="text-ink-400 hover:text-brand-600"
                          title="Cetak kunjungan ini"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-ink-900">{e.aktivitas}</p>
                    {e.catatan && <p className="text-xs text-ink-600 mt-1">Catatan: {e.catatan}</p>}
                    <div className="mt-2 pt-2 border-t border-line-200">
                      {e.verified_at ? (
                        <span className="flex items-center gap-1 text-xs text-brand-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Diparaf Instruktur IDUKA
                        </span>
                      ) : (
                        <span className="text-xs text-ink-300">Belum diparaf IDUKA</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
