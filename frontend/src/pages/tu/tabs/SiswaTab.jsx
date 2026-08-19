import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Save, ImagePlus, UserRound, Search } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import DateInput from '../../../components/DateInput';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';
import { namaKeEmailSekolah } from '../../../utils/email';

const FORM_KOSONG = {
  name: '', email: '', nis: '', nisn: '', jenis_kelamin: '', class_room_id: '',
  jurusan_id: '', tempat_lahir: '', tanggal_lahir: '', alamat: '',
};

// Kelola data siswa aktif untuk TU — bisa tambah/ubah/lihat detail & upload
// foto, TAPI TIDAK ada cetak (Kartu Pelajar/QR), reset password, hapus,
// atau import Excel massal — itu semua tetap wewenang Admin/Waka Kesiswaan
// saja. Endpoint store/update/foto sudah dibuka untuk TU (lihat routes/api.php).
export default function SiswaTab() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [jurusanList, setJurusanList] = useState([]);
  const [form, setForm] = useState(FORM_KOSONG);
  const [fotoFile, setFotoFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [uploadingFotoMassal, setUploadingFotoMassal] = useState(false);
  const [fotoMassalResult, setFotoMassalResult] = useState(null);
  const fotoMassalRef = useRef(null);

  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [editFotoFile, setEditFotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('');

  const emailManual = useRef(false);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => !filterKelas || String(s.class_room_id) === filterKelas)
      .filter((s) => !q
        || (s.user?.name || '').toLowerCase().includes(q)
        || (s.nis || '').toLowerCase().includes(q)
        || (s.nisn || '').toLowerCase().includes(q))
      .sort((a, b) => {
        const kelasA = a.class_room?.name || 'ZZZZZ';
        const kelasB = b.class_room?.name || 'ZZZZZ';
        if (kelasA !== kelasB) return kelasA.localeCompare(kelasB);
        return (a.user?.name || '').localeCompare(b.user?.name || '');
      });
  }, [students, query, filterKelas]);
  const { page, setPage, totalPages, paginated: sortedHalaman } = usePagination(sorted, 40);

  const loadStudents = () => api.get('/students').then((res) => setStudents(res.data));

  useEffect(() => {
    loadStudents();
    api.get('/classes').then((res) => setClasses(res.data));
    api.get('/jurusan').then((res) => setJurusanList(res.data));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/students', form);
      if (fotoFile) {
        const fd = new FormData();
        fd.append('foto', fotoFile);
        await api.post(`/students/${res.data.id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setForm(FORM_KOSONG);
      emailManual.current = false;
      setFotoFile(null);
      setShowForm(false);
      loadStudents();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : 'Gagal menambah siswa.');
    } finally {
      setLoading(false);
    }
  };

  const batalForm = () => {
    setShowForm(false);
    setForm(FORM_KOSONG);
    emailManual.current = false;
    setFotoFile(null);
    setError('');
  };

  const startEdit = (s) => {
    setEditId(s.id);
    setEditFotoFile(null);
    setEditData({
      name: s.user?.name || '',
      email: s.user?.email || '',
      nis: s.nis || '',
      nisn: s.nisn || '',
      jenis_kelamin: s.jenis_kelamin || '',
      class_room_id: s.class_room_id || '',
      jurusan_id: s.jurusan_id || '',
      tempat_lahir: s.tempat_lahir || '',
      tanggal_lahir: s.tanggal_lahir || '',
      alamat: s.alamat || '',
    });
  };

  const handleSaveEdit = async (id) => {
    setSaving(true);
    try {
      await api.put(`/students/${id}`, editData);
      if (editFotoFile) {
        const fd = new FormData();
        fd.append('foto', editFotoFile);
        await api.post(`/students/${id}/foto`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setEditId(null);
      setEditFotoFile(null);
      loadStudents();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      alert(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleFotoMassalClick = () => fotoMassalRef.current?.click();

  const handleFotoMassalChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFotoMassal(true);
    setFotoMassalResult(null);

    const formData = new FormData();
    for (const file of files) formData.append('files[]', file);

    try {
      const res = await api.post('/students/foto-massal', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFotoMassalResult(res.data);
      loadStudents();
    } catch (err) {
      setFotoMassalResult({
        message: err.response?.data?.message || 'Gagal mengunggah foto.',
        gagal: [],
      });
    } finally {
      setUploadingFotoMassal(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-ink-900 text-lg">Siswa</h2>
        <p className="text-sm text-ink-500">Kelola data siswa aktif — tambah, ubah, lihat detail, dan upload foto.</p>
      </div>

      {fotoMassalResult && (
        <div className="surface-card p-5">
          <p className={`text-sm font-medium ${fotoMassalResult.gagal?.length > 0 ? 'text-honey-700' : 'text-brand-600'}`}>
            {fotoMassalResult.message}
          </p>
          {fotoMassalResult.gagal?.length > 0 && (
            <div className="table-scroll">
              <table className="w-full text-sm mt-3">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-line-200">
                    <th className="pb-2 font-medium whitespace-nowrap px-2">File</th>
                    <th className="font-medium whitespace-nowrap px-2">Alasan Gagal</th>
                  </tr>
                </thead>
                <tbody>
                  {fotoMassalResult.gagal.map((g, i) => (
                    <tr key={i} className="border-t border-line-200">
                      <td className="py-2 text-ink-900 whitespace-nowrap px-2"><TruncateText text={g.file} maxWidth="12rem" /></td>
                      <td className="text-honey-700 whitespace-nowrap px-2"><TruncateText text={g.alasan} maxWidth="16rem" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Tambah Siswa Baru</h2>
          <p className="text-xs text-ink-500 mb-4">Password akun otomatis dibuat "123456" — wajib diganti siswa saat login pertama.</p>
          {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nama" value={form.name} onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({ ...f, name, email: emailManual.current ? f.email : namaKeEmailSekolah(name) }));
            }} className="field-input" required />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => { emailManual.current = true; setForm({ ...form, email: e.target.value }); }} className="field-input" required autoComplete="off" />
            <input placeholder="NIS" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} className="field-input" required />
            <input placeholder="NISN (opsional)" value={form.nisn} onChange={(e) => setForm({ ...form, nisn: e.target.value })} className="field-input" />
            <select value={form.jenis_kelamin} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })} className="field-input text-ink-700">
              <option value="">— Jenis Kelamin —</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
            <select value={form.class_room_id} onChange={(e) => setForm({ ...form, class_room_id: e.target.value })} className="field-input text-ink-700">
              <option value="">— Pilih Kelas (opsional) —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.jurusan_id} onChange={(e) => setForm({ ...form, jurusan_id: e.target.value })} className="field-input text-ink-700">
              <option value="">— Pilih Jurusan (opsional) —</option>
              {jurusanList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
            </select>
            <input placeholder="Tempat Lahir (opsional)" value={form.tempat_lahir} onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })} className="field-input" />
            <div>
              <label className="block text-[11px] text-ink-500 mb-1">Tanggal Lahir (opsional)</label>
              <DateInput value={form.tanggal_lahir} onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })} className="field-input w-full" />
            </div>
            <input placeholder="Alamat (opsional)" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="field-input col-span-2" />
          </div>
          <div className="mt-3">
            <label className="flex items-center gap-1.5 text-xs font-medium text-ink-500 mb-1.5"><ImagePlus className="w-3.5 h-3.5" /> Foto Siswa (opsional)</label>
            <input type="file" accept="image/*" onChange={(e) => setFotoFile(e.target.files[0] || null)} className="text-sm" />
          </div>
          <div className="flex gap-2 mt-4">
            <button disabled={loading} className="btn-primary">
              <Plus className="w-4 h-4" /> {loading ? 'Menyimpan...' : 'Tambah Siswa'}
            </button>
            <button type="button" onClick={batalForm} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
          </div>
        </form>
      )}

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h3 className="font-display font-semibold text-ink-900">
            Daftar Siswa <span className="text-ink-500 font-sans font-normal text-sm">({sorted.length}/{students.length})</span>
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleFotoMassalClick}
              disabled={uploadingFotoMassal}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 disabled:opacity-50 border border-line-200 rounded-xl px-4 py-2 transition"
              title="Nama file harus sesuai NIS siswa, mis. 40263136.jpg"
            >
              <ImagePlus className="w-4 h-4" /> {uploadingFotoMassal ? 'Mengunggah...' : 'Upload Foto Massal (nama file = NIS)'}
            </button>
            <input
              ref={fotoMassalRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFotoMassalChange}
              className="hidden"
            />
            {!showForm && (
              <button onClick={() => { setForm(FORM_KOSONG); emailManual.current = false; setFotoFile(null); setError(''); setShowForm(true); }} className="btn-primary shrink-0">
                <Plus className="w-4 h-4" /> Tambah Siswa
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[12rem]">
            <Search className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama / NIS / NISN..."
              className="field-input pl-9 w-full"
            />
          </div>
          <select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)} className="field-input text-ink-700 w-44">
            <option value="">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="table-scroll">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium whitespace-nowrap px-2">Nama</th>
                <th className="font-medium whitespace-nowrap px-2">NISN</th>
                <th className="font-medium whitespace-nowrap px-2">NIS</th>
                <th className="font-medium whitespace-nowrap px-2">Kelas</th>
                <th className="text-right whitespace-nowrap px-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows = [];
                sortedHalaman.forEach((s) => {
                  if (editId === s.id) {
                    rows.push(
                      <tr key={s.id} className="border-t border-line-200 bg-mist-50">
                        <td colSpan="5" className="py-3 whitespace-nowrap px-2">
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Nama" />
                            <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Email" type="email" />
                            <input value={editData.nis} onChange={(e) => setEditData({ ...editData, nis: e.target.value })} className="field-input py-1.5 text-sm" placeholder="NIS" />
                            <input value={editData.nisn} onChange={(e) => setEditData({ ...editData, nisn: e.target.value })} className="field-input py-1.5 text-sm" placeholder="NISN (opsional)" />
                            <select value={editData.jenis_kelamin} onChange={(e) => setEditData({ ...editData, jenis_kelamin: e.target.value })} className="field-input py-1.5 text-sm text-ink-700">
                              <option value="">— Jenis Kelamin —</option>
                              <option value="L">Laki-laki</option>
                              <option value="P">Perempuan</option>
                            </select>
                            <select value={editData.class_room_id} onChange={(e) => setEditData({ ...editData, class_room_id: e.target.value })} className="field-input py-1.5 text-sm text-ink-700">
                              <option value="">— Belum Ada Kelas —</option>
                              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select value={editData.jurusan_id} onChange={(e) => setEditData({ ...editData, jurusan_id: e.target.value })} className="field-input py-1.5 text-sm text-ink-700">
                              <option value="">— Belum Ada Jurusan —</option>
                              {jurusanList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                            </select>
                            <input value={editData.tempat_lahir} onChange={(e) => setEditData({ ...editData, tempat_lahir: e.target.value })} className="field-input py-1.5 text-sm" placeholder="Tempat Lahir" />
                            <DateInput value={editData.tanggal_lahir} onChange={(e) => setEditData({ ...editData, tanggal_lahir: e.target.value })} className="field-input py-1.5 text-sm w-full" />
                            <input value={editData.alamat} onChange={(e) => setEditData({ ...editData, alamat: e.target.value })} className="field-input py-1.5 text-sm col-span-2" placeholder="Alamat" />
                          </div>
                          <div className="mb-2">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-ink-500 mb-1"><ImagePlus className="w-3.5 h-3.5" /> Ganti Foto (kosongkan kalau tidak diubah)</label>
                            <input type="file" accept="image/*" onChange={(e) => setEditFotoFile(e.target.files[0] || null)} className="text-sm" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveEdit(s.id)} disabled={saving} className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5">
                              <Save className="w-3.5 h-3.5" /> {saving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                            <button onClick={() => setEditId(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-1.5">Batal</button>
                          </div>
                        </td>
                      </tr>
                    );
                    return;
                  }
                  rows.push(
                    <tr key={s.id} className="border-t border-line-200">
                      <td className="py-2.5 text-ink-900 whitespace-nowrap px-2">
                        <div className="flex items-center gap-2">
                          {s.foto_url ? (
                            <img src={s.foto_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                          ) : (
                            <UserRound className="w-6 h-6 text-ink-300 shrink-0" />
                          )}
                          <TruncateText text={s.user?.name} />
                        </div>
                      </td>
                      <td className="text-ink-700 whitespace-nowrap px-2">{s.nisn || '-'}</td>
                      <td className="text-ink-700 whitespace-nowrap px-2">{s.nis}</td>
                      <td className="text-ink-700 whitespace-nowrap px-2">{s.class_room?.name || '-'}</td>
                      <td className="text-right whitespace-nowrap px-2">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => window.open(`/print/buku-induk/${s.id}`, '_blank')} className="text-ink-400 hover:text-brand-600 text-xs border border-line-200 rounded-lg px-2 py-1" title="Detail (Buku Induk)">
                            Detail
                          </button>
                          <button onClick={() => startEdit(s)} className="text-ink-400 hover:text-brand-600 text-xs border border-line-200 rounded-lg px-2 py-1">
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
                return rows;
              })()}
              {students.length === 0 && (
                <tr><td colSpan="5" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada siswa.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
