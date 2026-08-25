import { useEffect, useState } from 'react';
import { Wallet, GraduationCap, Users, Building2, X, AlertCircle, Phone, Mail } from 'lucide-react';
import api from '../../api/axios';
import { fmtDMY } from '../../utils/date';

const STATUS_BADGE = {
  diajukan: { label: 'Diajukan', className: 'badge-honey' },
  diterima: { label: 'Diterima', className: 'badge-brand' },
  ditolak: { label: 'Ditolak', className: 'badge-rose' },
};

const TRACER_OPSI = [
  { value: 'bekerja', label: 'Sudah Bekerja' },
  { value: 'melanjutkan_kuliah', label: 'Melanjutkan Kuliah' },
  { value: 'wirausaha', label: 'Wirausaha' },
  { value: 'mencari_kerja', label: 'Masih Mencari Kerja' },
];

/**
 * Papan Loker — cuma tampil untuk siswa berstatus alumni (lulus), lihat
 * gating di SiswaDashboard.jsx. Daftar lowongan dibaca dari endpoint
 * publik yang sama dengan halaman /lowongan (statusnya "dibuka" saja).
 * Sub-menunya (Lowongan/Lamaran/Tracer Study) SENGAJA dikontrol dari luar
 * lewat prop `sub` — navigasinya sekarang di navbar bawah dashboard Siswa
 * (SiswaDashboard.jsx), bukan pill-tab internal komponen ini lagi.
 */
export default function LokerTab({ sub, biodataLengkap, onNavigateBiodata }) {
  const [list, setList] = useState([]);
  const [lamaran, setLamaran] = useState([]);
  const [tracer, setTracer] = useState(undefined); // undefined = belum dimuat, null = belum pernah isi
  const [tracerForm, setTracerForm] = useState({ status_saat_ini: 'mencari_kerja', nama_perusahaan: '', masa_tunggu_bulan: '' });
  const [savingTracer, setSavingTracer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [applying, setApplying] = useState(false);

  const loadLowongan = () => api.get('/lowongan').then((res) => setList(res.data.data || res.data));
  const loadLamaran = () => api.get('/my-lamaran').then((res) => setLamaran(res.data));
  const loadTracer = () => api.get('/my-tracer-study').then((res) => {
    setTracer(res.data);
    if (res.data) {
      setTracerForm({
        status_saat_ini: res.data.status_saat_ini,
        nama_perusahaan: res.data.nama_perusahaan || '',
        masa_tunggu_bulan: res.data.masa_tunggu_bulan ?? '',
      });
    }
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([loadLowongan(), loadLamaran(), loadTracer()]).finally(() => setLoading(false));
  }, []);

  const handleSubmitTracer = async (e) => {
    e.preventDefault();
    setSavingTracer(true);
    try {
      const payload = { ...tracerForm, masa_tunggu_bulan: tracerForm.masa_tunggu_bulan || null };
      const res = await api.post('/tracer-study', payload);
      setTracer(res.data);
      alert('Terima kasih, isian tracer study kamu tersimpan.');
    } catch (err) {
      const msgs = err.response?.data?.errors;
      alert(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan.');
    } finally {
      setSavingTracer(false);
    }
  };

  const sudahMelamar = (jobVacancyId) => lamaran.some((l) => l.job_vacancy_id === jobVacancyId);

  const handleLamar = async (jobVacancy) => {
    if (!confirm(`Lamar posisi "${jobVacancy.posisi}" di ${jobVacancy.nama_perusahaan_tampil}?`)) return;
    setApplying(true);
    try {
      await api.post(`/lowongan/${jobVacancy.id}/lamar`);
      await loadLamaran();
      setDetail(null);
      alert('Lamaran berhasil dikirim.');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengirim lamaran.');
    } finally {
      setApplying(false);
    }
  };

  const handleBatal = async (l) => {
    if (!confirm('Batalkan lamaran ini?')) return;
    try {
      await api.delete(`/lamaran/${l.id}`);
      loadLamaran();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membatalkan lamaran.');
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {loading ? (
        <p className="text-center text-ink-300 text-sm py-10">Memuat...</p>
      ) : sub === 'tracer' ? (
        <form onSubmit={handleSubmitTracer} className="surface-card p-4 space-y-3">
          <div>
            <h3 className="font-display font-semibold text-sm text-ink-900 mb-1">Tracer Study</h3>
            <p className="text-xs text-ink-500">Survei singkat sekolah untuk memantau keberadaan alumni. Bisa diisi ulang kapan saja kalau statusmu berubah.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Status Kamu Sekarang</label>
            <select
              value={tracerForm.status_saat_ini}
              onChange={(e) => setTracerForm({ ...tracerForm, status_saat_ini: e.target.value })}
              className="field-input text-sm"
            >
              {TRACER_OPSI.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {(tracerForm.status_saat_ini === 'bekerja' || tracerForm.status_saat_ini === 'wirausaha') && (
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Nama Perusahaan/Usaha</label>
              <input
                value={tracerForm.nama_perusahaan}
                onChange={(e) => setTracerForm({ ...tracerForm, nama_perusahaan: e.target.value })}
                className="field-input text-sm"
              />
            </div>
          )}

          {tracerForm.status_saat_ini === 'bekerja' && (
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Lama Menunggu Sebelum Dapat Kerja (bulan)</label>
              <input
                type="number" min="0"
                value={tracerForm.masa_tunggu_bulan}
                onChange={(e) => setTracerForm({ ...tracerForm, masa_tunggu_bulan: e.target.value })}
                className="field-input text-sm"
              />
            </div>
          )}

          <button disabled={savingTracer} className="btn-primary w-full justify-center">
            {savingTracer ? 'Menyimpan...' : tracer ? 'Perbarui Isian' : 'Simpan Isian'}
          </button>
        </form>
      ) : sub === 'terbuka' ? (
        <div className="space-y-3">
          {!biodataLengkap && (
            <button
              type="button"
              onClick={() => onNavigateBiodata?.()}
              className="surface-card p-3 border-l-4 border-l-honey-400 flex items-center gap-2 w-full text-left"
            >
              <AlertCircle className="w-4 h-4 text-honey-500 shrink-0" />
              <p className="text-sm text-ink-700">Lengkapi biodata dulu sebelum bisa melamar. Ketuk untuk buka menu Biodata.</p>
            </button>
          )}
          {list.length === 0 ? (
            <div className="surface-card p-8 text-center text-ink-300 text-sm">Belum ada lowongan yang tayang.</div>
          ) : (
            <div className="space-y-3">
            {list.map((d) => (
              <button key={d.id} onClick={() => setDetail(d)} className="surface-card p-4 w-full text-left hover:shadow-md transition flex gap-3">
                {d.foto_brosur_url ? (
                  <img src={d.foto_brosur_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-mist-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-ink-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-semibold text-sm text-ink-900 truncate">{d.posisi}</h3>
                  <p className="text-xs text-ink-500 flex items-center gap-1 mt-0.5 truncate">
                    <Building2 className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{d.nama_perusahaan_tampil}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-ink-500">
                    {d.gaji && <span className="flex items-center gap-1 text-brand-700 font-medium"><Wallet className="w-3.5 h-3.5" /> {d.gaji}</span>}
                    {d.jurusan && <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {d.jurusan.nama}</span>}
                    {d.kuota && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {d.kuota} orang</span>}
                  </div>
                  {sudahMelamar(d.id) && (
                    <span className="badge-soft badge-brand mt-2 inline-block">Sudah dilamar</span>
                  )}
                </div>
              </button>
            ))}
            </div>
          )}
        </div>
      ) : lamaran.length === 0 ? (
        <div className="surface-card p-8 text-center text-ink-300 text-sm">Belum pernah melamar lowongan.</div>
      ) : (
        <div className="space-y-3">
          {lamaran.map((l) => (
            <div key={l.id} className="surface-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display font-semibold text-sm text-ink-900">{l.job_vacancy?.posisi}</h3>
                  <p className="text-xs text-ink-500">{l.job_vacancy?.nama_perusahaan_tampil}</p>
                </div>
                <span className={`badge-soft shrink-0 ${STATUS_BADGE[l.status].className}`}>{STATUS_BADGE[l.status].label}</span>
              </div>
              <p className="text-xs text-ink-400 mt-1.5">Dilamar {fmtDMY(l.created_at)}</p>
              {l.status === 'diajukan' && (
                <button onClick={() => handleBatal(l)} className="text-xs font-medium text-honey-700 hover:text-honey-800 mt-2">
                  Batalkan Lamaran
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setDetail(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
              <h3 className="font-display font-semibold text-ink-900">{detail.posisi}</h3>
              <button onClick={() => setDetail(null)} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              {detail.foto_brosur_url && (
                <img src={detail.foto_brosur_url} alt={detail.posisi} className="w-full rounded-xl border border-line-200" />
              )}
              <p className="text-sm text-ink-700 flex items-center gap-1.5"><Building2 className="w-4 h-4 text-ink-400" /> {detail.nama_perusahaan_tampil}</p>
              {detail.gaji && <p className="text-sm text-ink-700 flex items-center gap-1.5"><Wallet className="w-4 h-4 text-ink-400" /> {detail.gaji}</p>}
              {detail.jurusan && <p className="text-sm text-ink-700 flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-ink-400" /> {detail.jurusan.nama}</p>}
              {detail.kuota && <p className="text-sm text-ink-700 flex items-center gap-1.5"><Users className="w-4 h-4 text-ink-400" /> Kuota {detail.kuota} orang</p>}

              <div>
                <h4 className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">Deskripsi</h4>
                <p className="text-sm text-ink-700 whitespace-pre-line">{detail.deskripsi}</p>
              </div>
              {detail.kualifikasi && (
                <div>
                  <h4 className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1">Kualifikasi</h4>
                  <p className="text-sm text-ink-700 whitespace-pre-line">{detail.kualifikasi}</p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-line-200 shrink-0">
              {detail.sumber === 'bkk' ? (
                <div className="space-y-2">
                  {detail.telepon_tampil && (
                    <a href={`tel:${detail.telepon_tampil}`} className="btn-primary w-full justify-center gap-2">
                      <Phone className="w-4 h-4" /> {detail.telepon_tampil}
                    </a>
                  )}
                  {detail.email_tampil && (
                    <a href={`mailto:${detail.email_tampil}`} className="btn-primary w-full justify-center gap-2">
                      <Mail className="w-4 h-4" /> {detail.email_tampil}
                    </a>
                  )}
                  {!detail.telepon_tampil && !detail.email_tampil && (
                    <p className="text-sm text-ink-400 text-center">Kontak perusahaan belum tersedia.</p>
                  )}
                  <p className="text-xs text-ink-400 text-center">Lowongan ini dipasang BKK — hubungi perusahaan langsung untuk melamar.</p>
                </div>
              ) : sudahMelamar(detail.id) ? (
                <button disabled className="btn-primary w-full justify-center opacity-50">Sudah Dilamar</button>
              ) : !biodataLengkap ? (
                <button
                  type="button"
                  onClick={() => onNavigateBiodata?.()}
                  className="w-full flex items-center justify-center gap-2 bg-honey-500 hover:bg-honey-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition"
                >
                  Lengkapi Biodata Dulu
                </button>
              ) : (
                <button onClick={() => handleLamar(detail)} disabled={applying} className="btn-primary w-full justify-center">
                  {applying ? 'Mengirim...' : 'Lamar Sekarang'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
