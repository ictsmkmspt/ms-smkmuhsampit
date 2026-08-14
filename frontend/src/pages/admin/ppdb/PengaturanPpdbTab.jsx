import { useEffect, useState } from 'react';
import { Power } from 'lucide-react';
import api from '../../../api/axios';

// Dipisah dari FormulirPpdbTab (daftar pendaftar) supaya tombol buka/tutup
// pendaftaran online — pengaturan, bukan data pendaftar — punya menu sendiri.
export default function PengaturanPpdbTab() {
  const [dibuka, setDibuka] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/ppdb/pengaturan').then((res) => setDibuka(res.data.dibuka)).finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    setSaving(true);
    try {
      const res = await api.put('/ppdb/pengaturan', { dibuka: !dibuka });
      setDibuka(res.data.dibuka);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400">
        <p className="text-sm text-ink-700">
          Nyala/matikan formulir pendaftaran online (<code className="font-mono">/ppdb</code>) di sini. Saat dimatikan, calon siswa yang membuka halaman formulir akan melihat pesan "pendaftaran ditutup" dan tidak bisa mengirim data.
        </p>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Status Pendaftaran Online</h2>
        {loading ? (
          <p className="text-ink-300">Memuat...</p>
        ) : (
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              dibuka ? 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100' : 'bg-honey-50 text-honey-700 border border-honey-200 hover:bg-honey-100'
            }`}
          >
            <Power className="w-4 h-4" />
            {saving ? 'Menyimpan...' : dibuka ? 'Pendaftaran Online: Aktif' : 'Pendaftaran Online: Nonaktif'}
          </button>
        )}
      </div>
    </div>
  );
}
