import { useEffect, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';
import DateInput from '../../../components/DateInput';

const STATUS_LABEL = { mendaftar: 'Mendaftar', verifikasi: 'Verifikasi', diterima: 'Diterima', ditolak: 'Ditolak' };
const STATUS_BADGE = { mendaftar: 'badge-soft', verifikasi: 'badge-honey', diterima: 'badge-brand', ditolak: 'badge-soft' };

const FORM_KOSONG = {
  nama_lengkap: '', nisn: '', jenis_kelamin: '', tempat_lahir: '', tanggal_lahir: '',
  alamat: '', asal_sekolah: '', nama_orang_tua: '', no_hp_orang_tua: '', jurusan_pilihan: '',
};

export default function FormulirPpdbTab() {
  const [pendaftar, setPendaftar] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [savingId, setSavingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(FORM_KOSONG);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { page, setPage, totalPages, paginated: pendaftarHalaman } = usePagination(pendaftar, 40);

  const load = (status) => api.get('/ppdb', { params: { status: status || undefined } }).then((res) => setPendaftar(res.data));
  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const handleUpdateStatus = async (p, status) => {
    setSavingId(p.id);
    try {
      await api.put(`/ppdb/${p.id}`, { status, catatan: p.catatan || '' });
      load(statusFilter);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Hapus data pendaftar "${p.nama_lengkap}"?`)) return;
    await api.delete(`/ppdb/${p.id}`);
    load(statusFilter);
  };

  const batalForm = () => {
    setShowForm(false);
    setForm(FORM_KOSONG);
    setError('');
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/ppdb/manual', form);
      batalForm();
      load(statusFilter);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : 'Gagal menyimpan pendaftar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-ink-700">
          Pendaftaran PPDB dilakukan calon siswa lewat formulir publik (<code className="font-mono">/ppdb</code>, tanpa akun login), atau diinput manual di sini kalau calon siswa daftar langsung ke sekolah (offline) — keduanya masuk ke daftar yang sama di bawah.
        </p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" /> Tambah Pendaftar Offline
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAddManual} className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Tambah Pendaftar Offline</h2>
          <p className="text-xs text-ink-500 mb-4">Untuk calon siswa yang daftar langsung ke sekolah, bukan lewat formulir online.</p>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Nama Lengkap" value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} className="field-input sm:col-span-2" required />
            <input placeholder="NISN (opsional)" value={form.nisn} onChange={(e) => setForm({ ...form, nisn: e.target.value })} className="field-input" />
            <select value={form.jenis_kelamin} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })} className="field-input text-ink-700" required>
              <option value="">— Jenis Kelamin —</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
            <input placeholder="Tempat Lahir" value={form.tempat_lahir} onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })} className="field-input" />
            <DateInput placeholder="Tanggal Lahir" value={form.tanggal_lahir} onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })} className="field-input w-full" />
            <input placeholder="Alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="field-input sm:col-span-2" />
            <input placeholder="Asal Sekolah" value={form.asal_sekolah} onChange={(e) => setForm({ ...form, asal_sekolah: e.target.value })} className="field-input sm:col-span-2" />
            <input placeholder="Nama Orang Tua" value={form.nama_orang_tua} onChange={(e) => setForm({ ...form, nama_orang_tua: e.target.value })} className="field-input" />
            <input placeholder="No. HP Orang Tua" value={form.no_hp_orang_tua} onChange={(e) => setForm({ ...form, no_hp_orang_tua: e.target.value })} className="field-input" required />
            <input placeholder="Jurusan Pilihan (opsional)" value={form.jurusan_pilihan} onChange={(e) => setForm({ ...form, jurusan_pilihan: e.target.value })} className="field-input sm:col-span-2" />
          </div>
          <div className="flex gap-2 mt-4">
            <button disabled={saving} className="btn-primary">
              <Plus className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Pendaftar'}
            </button>
            <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
          </div>
        </form>
      )}

      <div className="surface-card p-5 flex items-center gap-3">
        <label className="text-sm font-medium text-ink-700">Filter Status</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field-input text-ink-700 w-48">
          <option value="">Semua</option>
          {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Pendaftar <span className="text-ink-500 font-sans font-normal text-sm">({pendaftar.length})</span></h2>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Kode</th>
              <th className="font-medium whitespace-nowrap px-2">Nama</th>
              <th className="font-medium whitespace-nowrap px-2">Asal Sekolah</th>
              <th className="font-medium whitespace-nowrap px-2">No. HP Ortu</th>
              <th className="font-medium whitespace-nowrap px-2">Jurusan</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Status</th>
              <th className="whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {pendaftarHalaman.map((p) => (
              <tr key={p.id} className="border-t border-line-200">
                <td className="py-2.5 font-mono text-xs text-ink-500 whitespace-nowrap px-2">{p.kode_pendaftaran}</td>
                <td className="text-ink-900 whitespace-nowrap px-2"><TruncateText text={p.nama_lengkap} /></td>
                <td className="text-ink-700 whitespace-nowrap px-2">{p.asal_sekolah || '-'}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{p.no_hp_orang_tua}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{p.jurusan_pilihan || '-'}</td>
                <td className="text-center whitespace-nowrap px-2">
                  <select
                    value={p.status}
                    disabled={savingId === p.id}
                    onChange={(e) => handleUpdateStatus(p, e.target.value)}
                    className={`badge-soft ${STATUS_BADGE[p.status]} border-0`}
                  >
                    {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </td>
                <td className="text-right whitespace-nowrap px-2"><button onClick={() => handleDelete(p)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {pendaftar.length === 0 && <tr><td colSpan="7" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada pendaftar PPDB.</td></tr>}
          </tbody>
        </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
