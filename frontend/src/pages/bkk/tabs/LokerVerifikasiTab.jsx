import { useEffect, useRef, useState } from 'react';
import { Briefcase, Check, X, Building2, GraduationCap, Wallet, Users, Plus, Pencil, Trash2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';

const emptyForm = {
  iduka_id: '', nama_perusahaan_manual: '', email_manual: '', telepon_manual: '', alamat_manual: '',
  posisi: '', deskripsi: '', kualifikasi: '', gaji: '', jurusan_id: '', kuota: '', tanggal_tutup: '',
};

/**
 * Verifikasi lowongan kerja yang dipasang akun IDUKA — cuma menampilkan
 * lowongan berstatus "draf" (belum diputuskan). Setuju langsung tayang
 * publik; tolak wajib isi catatan revisi, dikembalikan ke IDUKA untuk
 * diperbaiki (bukan dihapus). Di bawahnya ada daftar loker yang SUDAH
 * tayang (status "dibuka"), dipaginasi supaya tidak panjang kalau banyak
 * — BKK juga bisa PASANG lowongan langsung dari sini (mis. perusahaan
 * telepon/datang langsung tanpa lewat pendaftaran mandiri IDUKA),
 * lewat JobVacancyController::storeBkk()/updateBkk()/destroyBkk().
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

  const [idukaList, setIdukaList] = useState([]);
  const [jurusanList, setJurusanList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('manual'); // 'manual' | 'mitra'
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [fotoFile, setFotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef(null);

  const load = () => api.get('/lowongan-verifikasi').then((res) => { setList(res.data); setLoading(false); });
  const loadAktif = () => api.get('/bkk/loker-aktif').then((res) => { setAktifList(res.data); setLoadingAktif(false); });
  useEffect(() => {
    load();
    loadAktif();
    api.get('/iduka').then((res) => setIdukaList(res.data));
    api.get('/jurusan').then((res) => setJurusanList(res.data));
  }, []);

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

  const batalForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    setFotoFile(null);
    setFormError('');
  };

  const startEdit = (d) => {
    setEditId(d.id);
    setFormMode(d.iduka_id ? 'mitra' : 'manual');
    setForm({
      iduka_id: d.iduka_id || '',
      nama_perusahaan_manual: d.nama_perusahaan_manual || '',
      email_manual: d.email_manual || '',
      telepon_manual: d.telepon_manual || '',
      alamat_manual: d.alamat_manual || '',
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

  const handleSubmitBkk = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (v !== '') formData.append(k, v); });
    if (fotoFile) formData.append('foto_brosur', fotoFile);

    try {
      if (editId) {
        formData.append('_method', 'PUT');
        await api.post(`/bkk/lowongan/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/bkk/lowongan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      batalForm();
      loadAktif();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setFormError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan lowongan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBkk = async (d) => {
    if (!confirm(`Hapus lowongan "${d.posisi}"? Semua lamaran yang masuk ikut terhapus.`)) return;
    try {
      await api.delete(`/bkk/lowongan/${d.id}`);
      loadAktif();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex gap-2">
        <Briefcase className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <p className="text-sm text-ink-700">
          Lowongan yang dipasang akun IDUKA MASUK KE SINI dulu (status "draf") — belum tayang di halaman publik /bursakerjakhusus sampai disetujui. Menolak wajib isi catatan supaya IDUKA tahu apa yang perlu diperbaiki.
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
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">
            Loker Aktif <span className="text-ink-500 font-sans font-normal text-sm">({aktifList.length})</span>
          </h2>
          {!showForm && (
            <div className="flex gap-2">
              <button onClick={() => { setForm(emptyForm); setEditId(null); setFormMode('manual'); setShowForm(true); }} className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> Pasang Lowongan
              </button>
              <button onClick={() => { setForm(emptyForm); setEditId(null); setFormMode('mitra'); setShowForm(true); }} className="flex items-center gap-1.5 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl px-4 py-2 transition">
                <Plus className="w-4 h-4" /> Pasang Lowongan Mitra
              </button>
            </div>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmitBkk} className="surface-card p-4 mb-4">
            {formError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{formError}</p>}
            <div className="space-y-3">
              {formMode === 'mitra' ? (
                <div>
                  <select value={form.iduka_id} onChange={(e) => setForm({ ...form, iduka_id: e.target.value })} className="field-input" required>
                    <option value="">Pilih perusahaan mitra...</option>
                    {idukaList.map((i) => <option key={i.id} value={i.id}>{i.nama_perusahaan}</option>)}
                  </select>
                  <p className="text-xs text-ink-400 mt-1.5">Lowongan ini akan ikut muncul di dashboard IDUKA terkait begitu perusahaannya login.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Nama perusahaan" value={form.nama_perusahaan_manual} onChange={(e) => setForm({ ...form, nama_perusahaan_manual: e.target.value })} className="field-input col-span-2" required />
                  <input placeholder="Email perusahaan (opsional)" type="email" value={form.email_manual} onChange={(e) => setForm({ ...form, email_manual: e.target.value })} className="field-input" />
                  <input placeholder="No. telepon perusahaan (opsional)" value={form.telepon_manual} onChange={(e) => setForm({ ...form, telepon_manual: e.target.value })} className="field-input" />
                  <input placeholder="Alamat perusahaan (opsional)" value={form.alamat_manual} onChange={(e) => setForm({ ...form, alamat_manual: e.target.value })} className="field-input col-span-2" />
                </div>
              )}

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
              <AlertCircle className="w-4 h-4 text-brand-500 shrink-0" />
              <p className="text-xs text-ink-500">Lowongan yang dipasang BKK langsung tayang publik, tidak perlu diverifikasi ulang.</p>
            </div>

            <div className="flex gap-2 mt-3">
              <button disabled={saving} className="btn-primary text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
              <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5">Batal</button>
            </div>
          </form>
        )}

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
                      <Building2 className="w-3.5 h-3.5" /> {d.nama_perusahaan_tampil || '-'}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-ink-500 mt-1.5">
                      {d.jurusan && <span className="flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> {d.jurusan.nama}</span>}
                      {d.gaji && <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> {d.gaji}</span>}
                      {d.kuota && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Kuota {d.kuota}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge-soft badge-brand">{d.applications_count || 0} pelamar</span>
                    <button onClick={() => startEdit(d)} title="Edit lowongan" className="text-ink-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg p-1.5 transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteBkk(d)} title="Hapus lowongan" className="text-ink-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
