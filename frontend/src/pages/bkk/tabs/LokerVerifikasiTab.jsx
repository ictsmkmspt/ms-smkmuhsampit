import { useEffect, useState } from 'react';
import { Briefcase, Check, X, Building2, GraduationCap, Wallet, Users } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';

/**
 * Verifikasi lowongan kerja yang dipasang akun IDUKA — cuma menampilkan
 * lowongan berstatus "draf" (belum diputuskan). Setuju langsung tayang
 * publik; tolak wajib isi catatan revisi, dikembalikan ke IDUKA untuk
 * diperbaiki (bukan dihapus). Di bawahnya ada daftar loker yang SUDAH
 * tayang (status "dibuka"), dipaginasi supaya tidak panjang kalau banyak.
 */
export default function LokerVerifikasiTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [tolakId, setTolakId] = useState(null);
  const [catatanTolak, setCatatanTolak] = useState('');

  const [aktifList, setAktifList] = useState([]);
  const [loadingAktif, setLoadingAktif] = useState(true);
  const { page, setPage, totalPages, paginated: aktifPaginated } = usePagination(aktifList, 5);

  const load = () => api.get('/lowongan-verifikasi').then((res) => { setList(res.data); setLoading(false); });
  const loadAktif = () => api.get('/bkk/loker-aktif').then((res) => { setAktifList(res.data); setLoadingAktif(false); });
  useEffect(() => { load(); loadAktif(); }, []);

  const handleSetujui = async (d) => {
    if (!confirm(`Setujui lowongan "${d.posisi}" dari ${d.iduka?.nama_perusahaan}? Lowongan akan langsung tayang di /lowongan dan alumni terkait dinotifikasi.`)) return;
    setProcessingId(d.id);
    try {
      await api.put(`/lowongan-verifikasi/${d.id}/setujui`);
      load();
      loadAktif();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyetujui lowongan.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleTolak = async (id) => {
    if (!catatanTolak.trim()) return;
    setProcessingId(id);
    try {
      await api.put(`/lowongan-verifikasi/${id}/tolak`, { catatan_revisi: catatanTolak });
      setTolakId(null);
      setCatatanTolak('');
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menolak lowongan.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <Briefcase className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Lowongan yang dipasang akun IDUKA MASUK KE SINI dulu (status "draf") — belum tayang di halaman publik /lowongan sampai disetujui. Menolak wajib isi catatan supaya IDUKA tahu apa yang perlu diperbaiki.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-ink-300 text-sm py-10">Memuat...</p>
      ) : list.length === 0 ? (
        <div className="surface-card p-10 text-center text-ink-300 text-sm">Tidak ada lowongan yang menunggu verifikasi.</div>
      ) : (
        <div className="space-y-4">
          {list.map((d) => (
            <div key={d.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <h3 className="font-display font-semibold text-ink-900">{d.posisi}</h3>
                  <p className="text-xs text-ink-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5" /> {d.iduka?.nama_perusahaan || '-'}
                  </p>
                </div>
                <span className="badge-soft badge-honey">Menunggu Verifikasi</span>
              </div>

              <p className="text-sm text-ink-700 whitespace-pre-line mb-3"><TruncateText text={d.deskripsi} maxWidth="100%" /></p>

              <div className="flex flex-wrap gap-3 text-xs text-ink-500 mb-4">
                {d.jurusan && (
                  <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {d.jurusan.nama}</span>
                )}
                {d.gaji && (
                  <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> {d.gaji}</span>
                )}
                {d.kuota && (
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Kuota {d.kuota}</span>
                )}
              </div>

              {tolakId === d.id ? (
                <div className="border-t border-line-200 pt-3">
                  <textarea
                    value={catatanTolak}
                    onChange={(e) => setCatatanTolak(e.target.value)}
                    placeholder="Catatan revisi untuk IDUKA (wajib diisi)..."
                    className="field-input text-sm w-full mb-2"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTolak(d.id)}
                      disabled={processingId === d.id || !catatanTolak.trim()}
                      className="text-xs font-medium text-white bg-honey-500 hover:bg-honey-700 disabled:opacity-50 rounded-lg px-3 py-1.5"
                    >
                      Kirim Penolakan
                    </button>
                    <button onClick={() => { setTolakId(null); setCatatanTolak(''); }} className="text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5">
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 border-t border-line-200 pt-3">
                  <button
                    onClick={() => handleSetujui(d)}
                    disabled={processingId === d.id}
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg px-3 py-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Setujui &amp; Tayangkan
                  </button>
                  <button
                    onClick={() => setTolakId(d.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-honey-700 border border-line-200 rounded-lg px-3 py-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pt-2">
        <h2 className="font-display font-semibold text-ink-900 mb-3">
          Loker Aktif <span className="text-ink-500 font-sans font-normal text-sm">({aktifList.length})</span>
        </h2>

        {loadingAktif ? (
          <p className="text-center text-ink-300 text-sm py-10">Memuat...</p>
        ) : aktifList.length === 0 ? (
          <div className="surface-card p-8 text-center text-ink-300 text-sm">Belum ada loker yang tayang.</div>
        ) : (
          <div className="surface-card p-2">
            <div className="divide-y divide-line-200">
              {aktifPaginated.map((d) => (
                <div key={d.id} className="p-3 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm text-ink-900 truncate">{d.posisi}</h3>
                    <p className="text-xs text-ink-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" /> {d.iduka?.nama_perusahaan || '-'}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-ink-500 mt-1.5">
                      {d.jurusan && <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {d.jurusan.nama}</span>}
                      {d.gaji && <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> {d.gaji}</span>}
                      {d.kuota && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Kuota {d.kuota}</span>}
                    </div>
                  </div>
                  <span className="badge-soft badge-brand shrink-0">{d.applications_count || 0} pelamar</span>
                </div>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} className="px-3" />
          </div>
        )}
      </div>
    </div>
  );
}
