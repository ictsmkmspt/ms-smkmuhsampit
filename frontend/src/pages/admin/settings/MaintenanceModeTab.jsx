import { useEffect, useState } from 'react';
import { Power, AlertTriangle } from 'lucide-react';
import api from '../../../api/axios';

/**
 * Nyala/matikan mode maintenance seluruh sistem — begitu nyala, SEMUA role
 * selain admin ditolak akses (bahkan tidak bisa login sama sekali) dan
 * melihat halaman "Sedang Dalam Pemeliharaan" (lihat MaintenanceGate di
 * App.jsx & middleware CheckMaintenanceMode di backend). Cuma admin yang
 * bisa membuka menu ini, sengaja tidak dibagikan ke Waka mana pun.
 */
export default function MaintenanceModeTab() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/maintenance-status').then((res) => setEnabled(res.data.enabled)).finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    if (!enabled && !confirm('Nyalakan mode maintenance? Semua orang selain Anda (admin) TIDAK BISA login/pakai sistem sampai dimatikan lagi.')) {
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/maintenance-status', { enabled: !enabled });
      setEnabled(res.data.enabled);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-honey-400 flex gap-2">
        <AlertTriangle className="w-4 h-4 text-honey-600 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Saat dinyalakan, <b>semua role selain admin</b> (guru, siswa, wali, TU, DUDI, staf ruang, dst) akan melihat
          halaman "Sedang Dalam Pemeliharaan" dan tidak bisa login sama sekali. Cuma akun admin yang tetap bisa masuk
          untuk kerja dan untuk mematikan mode ini lagi.
        </p>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Status Mode Maintenance</h2>
        {loading ? (
          <p className="text-ink-300">Memuat...</p>
        ) : (
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              enabled ? 'bg-honey-50 text-honey-700 border border-honey-200 hover:bg-honey-100' : 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100'
            }`}
          >
            <Power className="w-4 h-4" />
            {saving ? 'Menyimpan...' : enabled ? 'Maintenance: Nyala' : 'Maintenance: Mati (normal)'}
          </button>
        )}
      </div>
    </div>
  );
}
