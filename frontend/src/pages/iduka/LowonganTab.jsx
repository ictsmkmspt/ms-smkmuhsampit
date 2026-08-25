import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Image as ImageIcon, Users, XCircle, AlertCircle, Check, X, FileUser, ArrowLeft, UserRound } from 'lucide-react';
import api from '../../api/axios';
import { fmtDMY } from '../../utils/date';

const emptyForm = {
  posisi: '', deskripsi: '', kualifikasi: '', gaji: '', jurusan_id: '', kuota: '', tanggal_tutup: '',
};

const STATUS_BADGE = {
  draf: { label: 'Menunggu Verifikasi', className: 'badge-honey' },
  dibuka: { label: 'Tayang', className: 'badge-brand' },
  ditutup: { label: 'Ditutup', className: 'badge-rose' },
};

/**
 * "Lowongan Saya" — akun IDUKA pasang & kelola lowongan kerja miliknya
 * sendiri. Lowongan baru berstatus "draf" (menunggu Waka Humas verifikasi),
 * jadi belum langsung tayang di /lowongan begitu disimpan di sini.
 */
export default function LowonganTab() {
  const [list, setList] = useState([]);
  const [jurusanList, setJurusanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [fotoFile, setFotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const [editId, setEditId] = useState(null);
  const [pelamarOf, setPelamarOf] = useState(null); // JobVacancy sedang dilihat pelamarnya

  const load = () => api.get('/iduka/lowongan').then((res) => { setList(res.data); setLoading(false); });
  useEffect(() => {
    load();
    api.get('/jurusan').then((res) => setJurusanList(res.data));
  }, []);

  const batalForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    setFotoFile(null);
    setError('');
  };

  const startEdit = (d) => {
    setEditId(d.id);
    setForm({
      posisi: d.posisi,
      deskripsi: d.deskripsi,
      kualifikasi: d.kualifikasi || '',
      gaji: d.gaji || '',
      jurusan_id: d.jurusan_id || '',
      kuota: d.kuota || '',
      tanggal_tutup: d.tanggal_tutup || '',
    });
    setFotoFile(null);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== '') formData.append(k, v); });
    if (fotoFile) formData.append('foto_brosur', fotoFile);

    try {
      if (editId) {
        formData.append('_method', 'PUT');
        await api.post(`/iduka/lowongan/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/iduka/lowongan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      batalForm();
      load();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan lowongan.');
    } finally {
      setSaving(false);
    }
  };

  const handleTutup = async (d) => {
    if (!confirm(`Tutup lowongan "${d.posisi}"? Lowongan tidak akan menerima lamaran baru lagi.`)) return;
    try {
      await api.put(`/iduka/lowongan/${d.id}/tutup`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menutup lowongan.');
    }
  };

  const handleDelete = async (d) => {
    if (!confirm(`Hapus lowongan "${d.posisi}"? Semua lamaran yang masuk ikut terhapus.`)) return;
    try {
      await api.delete(`/iduka/lowongan/${d.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus.');
    }
  };

  // Daftar pelamar dibuka sebagai HALAMAN sendiri (ganti seluruh isi tab
  // ini), BUKAN popup — supaya lebih leluasa dibaca, sama seperti alasan
  // tombol Detail per pelamar dibuka tab baru.
  if (pelamarOf) {
    return <PelamarPage jobVacancy={pelamarOf} onBack={() => { setPelamarOf(null); load(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-ink-900">Lowongan Saya</h2>
        {!showForm && (
          <button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(true); }} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Pasang Lowongan
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="surface-card p-4">
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
          <div className="space-y-3">
            <input placeholder="Posisi/jabatan yang dibutuhkan" value={form.posisi} onChange={(e) => setForm({ ...form, posisi: e.target.value })} className="field-input" required />
            <textarea placeholder="Deskripsi pekerjaan" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} className="field-input" rows={3} required />
            <textarea placeholder="Kualifikasi/persyaratan (opsional)" value={form.kualifikasi} onChange={(e) => setForm({ ...form, kualifikasi: e.target.value })} className="field-input" rows={2} />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Gaji (opsional, mis. Rp 2.500.000)" value={form.gaji} onChange={(e) => setForm({ ...form, gaji: e.target.value })} className="field-input" />
              <input type="number" min="1" placeholder="Kuota (opsional)" value={form.kuota} onChange={(e) => setForm({ ...form, kuota: e.target.value })} className="field-input" />
              <select value={form.jurusan_id} onChange={(e) => setForm({ ...form, jurusan_id: e.target.value })} className="field-input">
                <option value="">Semua jurusan</option>
                {jurusanList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
              </select>
              <input type="date" value={form.tanggal_tutup} onChange={(e) => setForm({ ...form, tanggal_tutup: e.target.value })} className="field-input" placeholder="Batas lamar (opsional)" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer border border-dashed border-line-300 rounded-lg px-3 py-2.5 hover:border-brand-400 transition">
                <ImageIcon className="w-4 h-4 text-ink-400" />
                {fotoFile ? fotoFile.name : 'Unggah foto/brosur lowongan (opsional)'}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFotoFile(e.target.files[0] || null)} />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line-200">
            <AlertCircle className="w-4 h-4 text-honey-500 shrink-0" />
            <p className="text-xs text-ink-500">Lowongan {editId ? 'yang diubah wajib diverifikasi ulang' : 'baru menunggu diverifikasi'} Waka Humas sebelum tayang publik.</p>
          </div>

          <div className="flex gap-2 mt-3">
            <button disabled={saving} className="btn-primary text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-center text-ink-300 text-sm py-10">Memuat...</p>
      ) : list.length === 0 ? (
        <div className="surface-card p-8 text-center text-ink-300 text-sm">Belum ada lowongan yang dipasang.</div>
      ) : (
        <div className="space-y-3">
          {list.map((d) => {
            const badge = STATUS_BADGE[d.status];
            return (
              <div key={d.id} className="surface-card p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-display font-semibold text-ink-900 text-sm">{d.posisi}</h3>
                  <span className={`badge-soft ${badge.className} shrink-0`}>{badge.label}</span>
                </div>
                <p className="text-xs text-ink-500 mb-2">
                  {d.applications_count || 0} pelamar{d.tanggal_tutup ? ` · Batas ${fmtDMY(d.tanggal_tutup)}` : ''}
                </p>

                {d.status === 'draf' && d.catatan_revisi && (
                  <p className="text-xs text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-2.5 py-1.5 mb-2">
                    Perlu revisi: {d.catatan_revisi}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-line-200">
                  <button onClick={() => setPelamarOf(d)} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 border border-line-200 rounded-lg px-2.5 py-1.5">
                    <Users className="w-3.5 h-3.5" /> Pelamar
                  </button>
                  <button onClick={() => startEdit(d)} className="text-xs font-medium text-ink-500 hover:text-brand-600 border border-line-200 rounded-lg px-2.5 py-1.5">
                    Edit
                  </button>
                  {d.status === 'dibuka' && (
                    <button onClick={() => handleTutup(d)} className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-honey-700 border border-line-200 rounded-lg px-2.5 py-1.5">
                      <XCircle className="w-3.5 h-3.5" /> Tutup
                    </button>
                  )}
                  <button onClick={() => handleDelete(d)} className="ml-auto text-ink-400 hover:text-honey-700 hover:bg-honey-50 rounded-lg p-1.5 transition" title="Hapus lowongan">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PelamarPage({ jobVacancy, onBack }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [tolakId, setTolakId] = useState(null);
  const [catatanTolak, setCatatanTolak] = useState('');
  const [zoomFoto, setZoomFoto] = useState(null); // { url, nama } sedang diperbesar

  const load = () => api.get(`/iduka/lowongan/${jobVacancy.id}/pelamar`).then((res) => { setList(res.data); setLoading(false); });
  useEffect(() => { load(); }, []); // eslint-disable-line

  const handleTerima = async (application) => {
    setProcessingId(application.id);
    try {
      await api.put(`/iduka/lamaran/${application.id}`, { status: 'diterima' });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui status.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleTolak = async (applicationId) => {
    setProcessingId(applicationId);
    try {
      await api.put(`/iduka/lamaran/${applicationId}`, { status: 'ditolak', catatan: catatanTolak.trim() || undefined });
      setTolakId(null);
      setCatatanTolak('');
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memperbarui status.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
      </div>

      <div>
        <h2 className="font-display font-semibold text-ink-900">Pelamar</h2>
        <p className="text-sm text-ink-500">{jobVacancy.posisi}</p>
      </div>

      {loading ? (
        <p className="text-center text-ink-300 text-sm py-10">Memuat...</p>
      ) : list.length === 0 ? (
        <div className="surface-card p-8 text-center text-ink-300 text-sm">Belum ada pelamar.</div>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <div key={a.id} className="surface-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => a.student?.foto_url && setZoomFoto({ url: a.student.foto_url, nama: a.student?.user?.name })}
                    className={`w-10 h-10 rounded-full overflow-hidden shrink-0 bg-mist-100 flex items-center justify-center ${a.student?.foto_url ? 'cursor-zoom-in' : 'cursor-default'}`}
                    title={a.student?.foto_url ? 'Perbesar foto' : undefined}
                  >
                    {a.student?.foto_url ? (
                      <img src={a.student.foto_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserRound className="w-5 h-5 text-ink-300" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{a.student?.user?.name || '-'}</p>
                    <p className="text-xs text-ink-500 truncate">{a.student?.jurusan?.nama || '-'} · {fmtDMY(a.created_at)}</p>
                  </div>
                </div>
                <span className={`badge-soft shrink-0 ${
                  a.status === 'diterima' ? 'badge-brand' : a.status === 'ditolak' ? 'badge-rose' : 'badge-honey'
                }`}>
                  {a.status === 'diterima' ? 'Diterima' : a.status === 'ditolak' ? 'Ditolak' : 'Diajukan'}
                </span>
              </div>

              {a.status === 'ditolak' && a.catatan && (
                <p className="text-xs text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-2.5 py-1.5 mt-2.5">
                  Catatan: {a.catatan}
                </p>
              )}

              <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-line-200">
                <button
                  onClick={() => window.open(`/iduka/pelamar/${a.id}`, '_blank')}
                  className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 border border-line-200 rounded-lg px-2.5 py-1.5"
                >
                  <FileUser className="w-3.5 h-3.5" /> Detail
                </button>
                {a.status === 'diajukan' && tolakId !== a.id && (
                  <>
                    <button
                      onClick={() => handleTerima(a)}
                      disabled={processingId === a.id}
                      className="flex items-center gap-1 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg px-2.5 py-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Terima
                    </button>
                    <button
                      onClick={() => { setTolakId(a.id); setCatatanTolak(''); }}
                      className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-honey-700 border border-line-200 rounded-lg px-2.5 py-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Tolak
                    </button>
                  </>
                )}
              </div>

              {tolakId === a.id && (
                <div className="mt-2.5 pt-2.5 border-t border-line-200">
                  <textarea
                    value={catatanTolak}
                    onChange={(e) => setCatatanTolak(e.target.value)}
                    placeholder="Catatan untuk pelamar (opsional)..."
                    className="field-input text-sm w-full mb-2"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTolak(a.id)}
                      disabled={processingId === a.id}
                      className="text-xs font-medium text-white bg-honey-500 hover:bg-honey-700 disabled:opacity-50 rounded-lg px-3 py-1.5"
                    >
                      Kirim Penolakan
                    </button>
                    <button onClick={() => setTolakId(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5">
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {zoomFoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" onClick={() => setZoomFoto(null)}>
          <div className="absolute inset-0 bg-ink-900/70" />
          <div className="relative max-w-md w-full">
            <button
              onClick={() => setZoomFoto(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={zoomFoto.url} alt={zoomFoto.nama} className="w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
            {zoomFoto.nama && <p className="text-center text-white/90 text-sm mt-2">{zoomFoto.nama}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
