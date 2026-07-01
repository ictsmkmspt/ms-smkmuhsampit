import { useEffect, useState } from 'react';
import { Save, Clock, Info, AlertOctagon } from 'lucide-react';
import api from '../../../api/axios';

export default function SettingsTab() {
  const [form, setForm] = useState({
    jam_masuk_mulai: '06:00',
    jam_masuk_batas: '07:30',
    jam_masuk_tutup: '09:00',
    poin_telat: '5',
    poin_alpa: '10',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/settings').then((res) => {
      const map = {};
      res.data.forEach((s) => { map[s.key] = s.value; });
      setForm((prev) => ({ ...prev, ...map }));
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    setLoading(true);
    try {
      await api.put('/settings', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  const jamFields = [
    { key: 'jam_masuk_mulai', label: 'Jam Mulai Absen',   desc: 'Sebelum jam ini, barcode tidak bisa di-scan (absen belum dibuka)' },
    { key: 'jam_masuk_batas', label: 'Batas Tepat Waktu', desc: 'Siswa yang scan sebelum jam ini dianggap HADIR, setelahnya TELAT' },
    { key: 'jam_masuk_tutup', label: 'Jam Tutup Absen',   desc: 'Setelah jam ini, barcode tidak bisa di-scan lagi (absen ditutup)' },
  ];

  const { jam_masuk_mulai, jam_masuk_batas, jam_masuk_tutup } = form;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="surface-card p-5 border-l-4 border-l-brand-400">
        <div className="flex gap-2 mb-3">
          <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-ink-700">Cara kerja pengaturan jam</p>
        </div>
        <div className="flex items-center gap-0 text-xs text-ink-500 flex-wrap gap-y-2">
          <span className="bg-mist-50 border border-line-200 rounded-lg px-2.5 py-1.5 font-mono font-medium text-ink-700">{jam_masuk_mulai}</span>
          <span className="mx-2">→ absen dibuka →</span>
          <span className="bg-brand-100 border border-brand-200 rounded-lg px-2.5 py-1.5 font-medium text-brand-700">HADIR</span>
          <span className="mx-2">→</span>
          <span className="bg-mist-50 border border-line-200 rounded-lg px-2.5 py-1.5 font-mono font-medium text-ink-700">{jam_masuk_batas}</span>
          <span className="mx-2">→ lewat batas →</span>
          <span className="bg-honey-100 border border-honey-200 rounded-lg px-2.5 py-1.5 font-medium text-honey-700">TELAT</span>
          <span className="mx-2">→</span>
          <span className="bg-mist-50 border border-line-200 rounded-lg px-2.5 py-1.5 font-mono font-medium text-ink-700">{jam_masuk_tutup}</span>
          <span className="mx-2">→ absen ditutup</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="surface-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-ink-900">Pengaturan Jam Masuk</h2>
          {jamFields.map(({ key, label, desc }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-ink-700 mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1.5 text-ink-400" />
                {label}
              </label>
              <input
                type="time"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="field-input w-40"
                required
              />
              <p className="mt-1 text-xs text-ink-400">{desc}</p>
            </div>
          ))}
        </div>

        <div className="surface-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-ink-900">Poin Pelanggaran</h2>
          <p className="text-xs text-ink-500 -mt-2">
            Poin akan otomatis ditambahkan ke total poin siswa setiap kali terjadi pelanggaran.
          </p>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              <AlertOctagon className="w-3.5 h-3.5 inline mr-1.5 text-honey-500" />
              Poin Terlambat
            </label>
            <input
              type="number" min="0" max="100"
              value={form.poin_telat}
              onChange={(e) => setForm({ ...form, poin_telat: e.target.value })}
              className="field-input w-32"
              required
            />
            <p className="mt-1 text-xs text-ink-400">Diberikan setiap kali siswa scan barcode setelah batas tepat waktu.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1">
              <AlertOctagon className="w-3.5 h-3.5 inline mr-1.5 text-honey-700" />
              Poin Tidak Hadir (Alpa)
            </label>
            <input
              type="number" min="0" max="100"
              value={form.poin_alpa}
              onChange={(e) => setForm({ ...form, poin_alpa: e.target.value })}
              className="field-input w-32"
              required
            />
            <p className="mt-1 text-xs text-ink-400">Diberikan untuk siswa yang sama sekali tidak scan barcode (lihat tombol "Proses Alpa" di halaman Guru).</p>
          </div>
        </div>

        <div>
          <button type="submit" disabled={loading} className="btn-primary">
            <Save className="w-4 h-4" />
            {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
          {saved && <span className="ml-3 text-sm text-brand-600 font-medium">✓ Tersimpan!</span>}
        </div>
      </form>
    </div>
  );
}
