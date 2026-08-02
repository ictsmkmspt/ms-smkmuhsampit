import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import api from '../../../api/axios';

export default function PengaturanTab() {
  const [nominalDefault, setNominalDefault] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/spp/settings')
      .then((res) => setNominalDefault(res.data.nominal_default))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/spp/settings', { nominal_default: Number(nominalDefault) });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan nominal default.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-ink-900 text-lg">Pengaturan SPP</h2>
        <p className="text-sm text-ink-500">Atur nominal SPP default yang otomatis dipakai saat membuat tagihan bulanan.</p>
      </div>

      <form onSubmit={handleSave} className="surface-card p-5 max-w-md">
        <label className="block text-xs font-medium text-ink-500 mb-1">Nominal SPP Default / Bulan</label>
        {loading ? (
          <p className="text-sm text-ink-300 py-2">Memuat...</p>
        ) : (
          <input
            type="number" value={nominalDefault}
            onChange={(e) => setNominalDefault(e.target.value)}
            className="field-input"
          />
        )}
        <p className="text-xs text-ink-500 mt-2 mb-4">
          Nominal ini otomatis dipakai saat membuat tagihan SPP bulan baru (termasuk yang dibuat otomatis tiap tanggal 1). Nominal per siswa masih bisa diubah satu-satu di menu Tagihan SPP (misal untuk potongan/beasiswa).
        </p>
        <button disabled={saving || loading} className="btn-primary disabled:opacity-60">
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        {saved && (
          <span className="ml-3 inline-flex items-center gap-1.5 text-sm text-brand-600">
            <CheckCircle className="w-4 h-4" /> Tersimpan
          </span>
        )}
      </form>
    </div>
  );
}
