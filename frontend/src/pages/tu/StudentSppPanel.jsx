import { useEffect, useState } from 'react';
import { CheckCircle2, Printer, X, CheckCircle, Info, CalendarPlus } from 'lucide-react';
import api from '../../api/axios';
import { BULAN, formatRupiah, Avatar } from './shared';

/**
 * Panel "riwayat SPP 1 siswa" dengan tombol Bayar / Cetak Nota per baris.
 * Dipakai di 2 tempat: Dashboard (setelah cari siswa) dan menu Alumni
 * (setelah klik 1 alumni dari daftar tunggakan) — supaya logic bayar &
 * tampilannya tidak dobel ditulis.
 */
export default function StudentSppPanel({ student, onClose, onPaid }) {
  const [spp, setSpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [payingDimuka, setPayingDimuka] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const notify = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') setTimeout(() => setFeedback((f) => (f?.message === message ? null : f)), 4000);
  };

  useEffect(() => {
    setLoading(true);
    api.get(`/spp/siswa/${student.id}`)
      .then((res) => setSpp(res.data.spp))
      .catch(() => notify('error', 'Gagal memuat riwayat SPP siswa ini.'))
      .finally(() => setLoading(false));
  }, [student.id]);

  const bayar = async (s) => {
    if (!confirm(`Tandai SPP ${BULAN[s.bulan - 1]} ${s.tahun} atas nama ${student.user?.name} sebagai LUNAS?`)) return;
    setPayingId(s.id);
    try {
      const res = await api.put(`/spp/${s.id}/status`, { status: 'lunas' });
      setSpp((prev) => prev.map((x) => (x.id === s.id ? res.data : x)));
      notify('success', `Pembayaran SPP ${BULAN[s.bulan - 1]} ${s.tahun} tercatat lunas.`);
      onPaid?.();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal mencatat pembayaran.');
    } finally {
      setPayingId(null);
    }
  };

  const tunggakan = (spp || []).filter((s) => s.status === 'belum_bayar');
  const totalTunggakan = tunggakan.reduce((sum, s) => sum + Number(s.nominal || 0), 0);

  // Bulan berikutnya yang belum ada tagihannya sama sekali (dihitung dari
  // catatan terakhir siswa ini, atau bulan berjalan kalau belum ada riwayat
  // sama sekali) — dipakai buat opsi "Bayar di Muka".
  const now = new Date();
  let nextBulan = now.getMonth() + 1;
  let nextTahun = now.getFullYear();
  if (spp && spp.length > 0) {
    nextBulan = spp[0].bulan + 1;
    nextTahun = spp[0].tahun;
    if (nextBulan > 12) { nextBulan = 1; nextTahun += 1; }
  }

  const bayarDimuka = async () => {
    if (!confirm(`Buat & catat pembayaran di muka SPP ${BULAN[nextBulan - 1]} ${nextTahun} untuk ${student.user?.name}? Tagihan bulan ini belum dibuat untuk siswa lain.`)) return;
    setPayingDimuka(true);
    try {
      const res = await api.post('/spp/bayar-dimuka', { student_id: student.id, bulan: nextBulan, tahun: nextTahun });
      setSpp((prev) => [res.data, ...(prev || [])]);
      notify('success', `Pembayaran di muka SPP ${BULAN[nextBulan - 1]} ${nextTahun} tercatat.`);
      onPaid?.();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal mencatat pembayaran di muka.');
    } finally {
      setPayingDimuka(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-line-200">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={student.user?.name} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{student.user?.name}</p>
            <p className="text-xs text-ink-500">{student.class_room?.name || '-'} · NIS {student.nis}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="shrink-0 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5">
            Kembali
          </button>
        )}
      </div>

      {feedback && (
        <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm mb-4 ${
          feedback.type === 'success' ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
          <p className="flex-1">{feedback.message}</p>
          <button onClick={() => setFeedback(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-ink-300 py-6 text-sm">Memuat riwayat SPP...</p>
      ) : (
        <>
          {(spp || []).length === 0 ? (
            <p className="text-sm text-ink-500 text-center py-4">Belum ada tagihan SPP untuk siswa ini.</p>
          ) : (
            <>
              {tunggakan.length > 0 ? (
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-ink-500">Total Tunggakan</p>
                  <p className="text-lg font-display font-semibold text-honey-700">{formatRupiah(totalTunggakan)}</p>
                </div>
              ) : (
                <div className="text-center py-4 mb-1">
                  <CheckCircle2 className="w-8 h-8 text-brand-500 mx-auto mb-2" />
                  <p className="text-sm text-ink-700">Semua SPP {student.user?.name} sudah lunas.</p>
                </div>
              )}
              <ul className="divide-y divide-line-200">
                {spp.map((s) => (
                  <li key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{BULAN[s.bulan - 1]} {s.tahun}</p>
                      <p className="text-xs text-ink-500">{formatRupiah(s.nominal)}</p>
                    </div>
                    {s.status === 'lunas' ? (
                      <div className="flex items-center gap-2">
                        <span className="badge-soft badge-brand">Lunas</span>
                        <button
                          onClick={() => window.open(`/print/spp-nota?spp_id=${s.id}`, '_blank')}
                          className="flex items-center gap-1.5 text-xs font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-lg px-3 py-1.5 transition"
                        >
                          <Printer className="w-3.5 h-3.5" /> Cetak Nota
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => bayar(s)}
                        disabled={payingId === s.id}
                        className="text-xs font-medium text-white bg-[#15803D] hover:bg-[#116530] disabled:opacity-60 rounded-lg px-4 py-1.5 transition"
                      >
                        {payingId === s.id ? 'Memproses...' : 'Bayar'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-4 pt-4 border-t border-line-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <CalendarPlus className="w-4 h-4 text-ink-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-ink-500">Bayar di Muka</p>
                <p className="text-sm text-ink-700 truncate">{BULAN[nextBulan - 1]} {nextTahun} · belum ditagih</p>
              </div>
            </div>
            <button
              onClick={bayarDimuka}
              disabled={payingDimuka}
              className="shrink-0 text-xs font-medium text-white bg-[#15803D] hover:bg-[#116530] disabled:opacity-60 rounded-lg px-4 py-1.5 transition"
            >
              {payingDimuka ? 'Memproses...' : 'Bayar di Muka'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
