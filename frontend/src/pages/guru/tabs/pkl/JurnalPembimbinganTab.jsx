import { useEffect, useState } from 'react';
import { Plus, Printer, CheckCircle2 } from 'lucide-react';
import api from '../../../../api/axios';

/**
 * Jurnal Pembimbing PKL untuk guru — beda dari "Siswa Bimbingan" (yang per
 * siswa). Ini catatan kunjungan/aktivitas bimbingan guru ke SEBUAH DUDI,
 * mencakup semua siswa bimbingannya di DUDI itu sekaligus. Wajib diverifikasi
 * (diparaf) oleh Instruktur DUDI.
 */
export default function JurnalPembimbinganTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [dudiOptions, setDudiOptions] = useState([]);
  const [selectedDudi, setSelectedDudi] = useState('');

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
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
        if (p.dudi && !seen.has(p.dudi.id)) {
          seen.add(p.dudi.id);
          unik.push(p.dudi);
        }
      });
      setDudiOptions(unik);
      if (unik.length === 1) setSelectedDudi(String(unik[0].id));
    });
  }, []);

  const loadEntries = () => {
    setLoading(true);
    return api.get('/pkl-pembimbingan').then((res) => setEntries(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadEntries(); }, []);

  const handleTambah = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/pkl-pembimbingan', {
        dudi_id: selectedDudi,
        date: tanggal,
        aktivitas,
        catatan: catatan || null,
      });
      setAktivitas('');
      setCatatan('');
      setShowForm(false);
      loadEntries();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan catatan.');
    } finally {
      setSaving(false);
    }
  };

  const handleCetak = () => {
    if (!selectedDudi) return;
    const dudi = dudiOptions.find((d) => String(d.id) === String(selectedDudi));
    window.open(`/print/pkl-pembimbingan?dudi_id=${selectedDudi}&dudi_nama=${encodeURIComponent(dudi?.nama_perusahaan || '')}`, '_blank');
  };

  const handleCetakEntry = (entryId) => {
    window.open(`/print/pkl-pembimbingan?entry_id=${entryId}`, '_blank');
  };

  const filtered = selectedDudi ? entries.filter((e) => String(e.dudi_id) === String(selectedDudi)) : entries;

  return (
    <div className="space-y-6">
      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-display font-semibold text-ink-900">Jurnal Pembimbing PKL</h2>
          <select
            value={selectedDudi}
            onChange={(e) => setSelectedDudi(e.target.value)}
            className="field-input text-sm text-ink-700 w-56"
          >
            <option value="">— Pilih IDUKA —</option>
            {dudiOptions.map((d) => (
              <option key={d.id} value={d.id}>{d.nama_perusahaan}</option>
            ))}
          </select>
        </div>

        {!selectedDudi ? (
          <p className="text-sm text-ink-400 text-center py-6">Pilih IDUKA dulu untuk menambah atau melihat catatan bimbingan.</p>
        ) : (
          <>
            {!showForm ? (
              <div className="flex gap-3 mb-4">
                <button onClick={() => setShowForm(true)} className="btn-primary">
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
              <form onSubmit={handleTambah} className="space-y-2 mb-4 border border-line-200 rounded-xl p-4">
                {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
                <input
                  type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)}
                  max={today} className="field-input text-sm" required
                />
                <textarea
                  value={aktivitas} onChange={(e) => setAktivitas(e.target.value)}
                  className="field-input w-full text-sm" rows="2"
                  placeholder="Aktivitas pembimbingan (contoh: Kunjungan monitoring ke IDUKA)"
                  required
                />
                <textarea
                  value={catatan} onChange={(e) => setCatatan(e.target.value)}
                  className="field-input w-full text-sm" rows="2"
                  placeholder="Catatan / temuan / masalah (opsional)"
                />
                <div className="flex gap-2">
                  <button disabled={saving} className="text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-4 py-2 disabled:opacity-50">
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="text-sm font-medium text-ink-500 hover:text-ink-700 px-2">
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
                      <p className="text-ink-500 text-xs font-medium mb-1">{e.date}</p>
                      <button
                        onClick={() => handleCetakEntry(e.id)}
                        className="text-ink-400 hover:text-brand-600 shrink-0"
                        title="Cetak kunjungan ini"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
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
