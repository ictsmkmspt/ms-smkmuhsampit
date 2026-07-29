import { useEffect, useState } from 'react';
import { NotebookPen, CheckCircle2, BellRing, Printer } from 'lucide-react';
import api from '../../../api/axios';
import { useAuth } from '../../../context/AuthContext';

export default function DudiJurnalPembimbinganTab() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);

  const [all, setAll] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const loadPending = () => {
    setLoadingPending(true);
    return api.get('/pkl-pembimbingan', { params: { only_pending: 1 } })
      .then((res) => setPending(res.data))
      .finally(() => setLoadingPending(false));
  };
  const loadAll = () => {
    setLoadingAll(true);
    return api.get('/pkl-pembimbingan')
      .then((res) => setAll(res.data))
      .finally(() => setLoadingAll(false));
  };

  useEffect(() => {
    loadPending();
    loadAll();
  }, []);

  const handleVerifikasi = async (id) => {
    setVerifyingId(id);
    try {
      await api.post(`/pkl-pembimbingan/${id}/verifikasi`);
      setPending((p) => p.filter((e) => e.id !== id));
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memverifikasi.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleCetak = () => {
    window.open(`/print/pkl-pembimbingan?dudi_nama=${encodeURIComponent(user.name)}`, '_blank');
  };

  const handleCetakEntry = (entryId) => {
    window.open(`/print/pkl-pembimbingan?entry_id=${entryId}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <NotebookPen className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Catatan kunjungan/aktivitas bimbingan dari guru pembimbing sekolah. Verifikasi (paraf) tiap catatan untuk menyatakan sudah disetujui.
        </p>
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BellRing className="w-4 h-4 text-honey-500" />
          <h2 className="font-display font-semibold text-ink-900">
            Menunggu Verifikasi <span className="text-ink-500 font-sans font-normal text-sm">({pending.length})</span>
          </h2>
        </div>

        {loadingPending ? (
          <p className="text-center text-ink-300 py-6 text-sm">Memuat...</p>
        ) : pending.length === 0 ? (
          <p className="text-center text-ink-300 py-6 text-sm">Tidak ada catatan bimbingan yang menunggu verifikasi.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((e) => (
              <div key={e.id} className="border border-line-200 rounded-lg px-3 py-2.5 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-ink-900 font-medium">{e.teacher?.user?.name}</p>
                    <p className="text-xs text-ink-500">{e.date}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCetakEntry(e.id)}
                      className="text-ink-400 hover:text-brand-600"
                      title="Cetak kunjungan ini"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleVerifikasi(e.id)}
                      disabled={verifyingId === e.id}
                      className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg px-3 py-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> {verifyingId === e.id ? 'Memproses...' : 'Verifikasi'}
                    </button>
                  </div>
                </div>
                <p className="text-ink-800 mt-2">{e.aktivitas}</p>
                {e.catatan && <p className="text-xs text-ink-600 mt-1">Catatan: {e.catatan}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-ink-900">
            Semua Catatan Bimbingan <span className="text-ink-500 font-sans font-normal text-sm">({all.length})</span>
          </h2>
          <button
            onClick={handleCetak}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600 border border-line-200 rounded-lg px-3 py-1.5"
          >
            <Printer className="w-4 h-4" /> Cetak Jurnal
          </button>
        </div>

        {loadingAll ? (
          <p className="text-center text-ink-300 py-6 text-sm">Memuat...</p>
        ) : all.length === 0 ? (
          <p className="text-center text-ink-300 py-6 text-sm">Belum ada catatan bimbingan.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {all.map((e) => (
              <div key={e.id} className="border border-line-200 rounded-lg px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-ink-900 font-medium">{e.teacher?.user?.name} <span className="text-ink-400 font-normal text-xs">· {e.date}</span></p>
                  <div className="flex items-center gap-2 shrink-0">
                    {e.verified_at && (
                      <span className="flex items-center gap-1 text-xs text-brand-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Diverifikasi
                      </span>
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
                <p className="text-ink-800 mt-1">{e.aktivitas}</p>
                {e.catatan && <p className="text-xs text-ink-600 mt-1">Catatan: {e.catatan}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
