import { Fragment, useEffect, useRef, useState } from 'react';
import { Search, Pencil, Check, X, Trash2, Receipt, Info, CheckCircle, Printer, Plus, Users, User, UsersRound } from 'lucide-react';
import api from '../../../api/axios';
import { formatRupiah, Avatar } from '../shared';
import TruncateText from '../../../components/TruncateText';
import Pagination from '../../../components/Pagination';
import usePagination from '../../../hooks/usePagination';

const emptyForm = { nama_tagihan: '', nominal: '', keterangan: '' };

/**
 * Pengganti <select> polos buat pilih 1 siswa — daftar siswa se-sekolah bisa
 * ratusan baris, jadi ketik nama/NIS buat cari langsung lebih cepat daripada
 * scroll satu-satu di dropdown native.
 */
function StudentSearchSelect({ students, value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = students.find((s) => String(s.id) === String(value));

  useEffect(() => {
    if (!open) return;
    const tutupKalauDiluar = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', tutupKalauDiluar);
    return () => document.removeEventListener('mousedown', tutupKalauDiluar);
  }, [open]);

  const q = query.trim().toLowerCase();
  const hasil = (q
    ? students.filter((s) => s.user?.name?.toLowerCase().includes(q) || s.nis?.toLowerCase().includes(q))
    : students
  ).slice(0, 50);

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        value={open ? query : (selected ? `${selected.user?.name} · ${selected.class_room?.name || 'Tanpa kelas'}` : '')}
        onChange={(e) => { setQuery(e.target.value); if (value) onChange(''); }}
        onFocus={() => { setOpen(true); setQuery(''); }}
        placeholder="Ketik nama atau NIS siswa..."
        className="field-input text-ink-700 w-full"
      />
      {open && (
        <div className="absolute z-40 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-line-200 rounded-xl shadow-lg py-1">
          {hasil.length === 0 ? (
            <p className="text-xs text-ink-400 px-3 py-2">Tidak ada siswa cocok.</p>
          ) : (
            hasil.map((s) => (
              <button
                key={s.id} type="button"
                onClick={() => { onChange(String(s.id)); setQuery(''); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-mist-50 flex items-center justify-between gap-2"
              >
                <span className="text-ink-900 min-w-0 truncate">{s.user?.name}</span>
                <span className="text-ink-400 text-xs shrink-0">{s.nis ? `NIS ${s.nis} · ` : ''}{s.class_room?.name || 'Tanpa kelas'}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TagihanLainTab() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [daftarNama, setDaftarNama] = useState([]);

  const [tahunAjaranList, setTahunAjaranList] = useState([]);
  const [tahunAjaranId, setTahunAjaranId] = useState('');
  const [namaFilter, setNamaFilter] = useState('');
  const [classRoomId, setClassRoomId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingNama, setDeletingNama] = useState(false);

  const [target, setTarget] = useState('satu'); // 'satu' | 'kelas' | 'pilih' | 'semua'
  const [studentId, setStudentId] = useState('');
  const [bulkClassRoomIds, setBulkClassRoomIds] = useState([]);
  const [bulkJenisKelamin, setBulkJenisKelamin] = useState(''); // '' | 'L' | 'P' — dipakai kalau biaya beda antara siswa laki-laki & perempuan
  const [pickedIds, setPickedIds] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editNominal, setEditNominal] = useState('');
  const [savingId, setSavingId] = useState(null);

  const [partialId, setPartialId] = useState(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [payingPartial, setPayingPartial] = useState(false);

  const [feedback, setFeedback] = useState(null);

  const notify = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') setTimeout(() => setFeedback((f) => (f?.message === message ? null : f)), 4000);
  };

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
    api.get('/students').then((res) => setStudents(res.data));
    api.get('/tahun-ajaran').then((res) => {
      setTahunAjaranList(res.data);
      const aktif = res.data.find((t) => t.status === 'aktif');
      if (aktif) setTahunAjaranId(String(aktif.id));
    });
  }, []);

  const loadList = () => {
    setLoading(true);
    const params = {};
    if (tahunAjaranId) params.tahun_ajaran_id = tahunAjaranId;
    if (namaFilter) params.nama_tagihan = namaFilter;
    if (classRoomId) params.class_room_id = classRoomId;
    if (status) params.status = status;
    if (search) params.search = search;
    api.get('/tagihan-lain', { params })
      .then((res) => { setList(res.data.data); setDaftarNama(res.data.daftar_nama_tagihan); })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya load sekali saat mount, perubahan filter dipicu manual lewat tombol Tampilkan
  useEffect(() => { loadList(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.nama_tagihan.trim()) { setFormError('Nama tagihan wajib diisi.'); return; }
    if (form.nominal === '' || Number(form.nominal) < 0) { setFormError('Nominal wajib diisi.'); return; }

    if (target === 'semua' && !confirm(`Buat tagihan "${form.nama_tagihan.trim()}" untuk ${jumlahSiswaSemua} siswa aktif${bulkJenisKelamin ? ` (${bulkJenisKelamin === 'L' ? 'laki-laki' : 'perempuan'} saja)` : ''}?`)) {
      return;
    }

    setSaving(true);
    try {
      if (target === 'satu') {
        if (!studentId) { setFormError('Pilih siswa dulu.'); setSaving(false); return; }
        await api.post('/tagihan-lain', { student_id: studentId, ...form, nominal: Number(form.nominal) });
        notify('success', 'Tagihan berhasil dibuat.');
      } else {
        const payload = { ...form, nominal: Number(form.nominal) };
        if (target === 'semua') {
          payload.semua_siswa = true;
          if (bulkJenisKelamin) payload.jenis_kelamin = bulkJenisKelamin;
        } else if (target === 'kelas') {
          if (bulkClassRoomIds.length === 0) { setFormError('Pilih minimal 1 kelas dulu.'); setSaving(false); return; }
          payload.class_room_ids = bulkClassRoomIds;
          if (bulkJenisKelamin) payload.jenis_kelamin = bulkJenisKelamin;
        } else {
          if (pickedIds.length === 0) { setFormError('Pilih minimal 1 siswa.'); setSaving(false); return; }
          payload.student_ids = pickedIds;
        }
        const res = await api.post('/tagihan-lain/bulk', payload);
        notify('success', res.data.message);
      }
      setForm(emptyForm);
      setStudentId('');
      setBulkClassRoomIds([]);
      setBulkJenisKelamin('');
      setPickedIds([]);
      loadList();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setFormError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal membuat tagihan.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditNominal(t.nominal);
  };

  const saveNominal = async (t) => {
    setSavingId(t.id);
    try {
      const res = await api.put(`/tagihan-lain/${t.id}`, { nominal: Number(editNominal) });
      setList((prev) => prev.map((x) => (x.id === t.id ? res.data : x)));
      setEditingId(null);
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal menyimpan nominal.');
    } finally {
      setSavingId(null);
    }
  };

  const openPartial = (t) => {
    setPartialId(t.id);
    setPartialAmount('');
  };

  const submitPartial = async (t) => {
    const jumlah = Number(partialAmount);
    if (!jumlah || jumlah < 1) return;
    setPayingPartial(true);
    try {
      const res = await api.put(`/tagihan-lain/${t.id}/bayar-sebagian`, { jumlah });
      setList((prev) => prev.map((x) => (x.id === t.id ? res.data : x)));
      setPartialId(null);
      setPartialAmount('');
      notify('success', `Pembayaran sebagian Rp${jumlah.toLocaleString('id-ID')} untuk "${t.nama_tagihan}" tercatat.`);
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal mencatat pembayaran sebagian.');
    } finally {
      setPayingPartial(false);
    }
  };

  const toggleStatus = async (t) => {
    const next = t.status === 'lunas' ? 'belum_bayar' : 'lunas';
    if (next === 'belum_bayar' && !confirm(`Tandai tagihan "${t.nama_tagihan}" atas nama ${t.student?.user?.name} jadi "Belum Bayar" lagi?`)) return;
    setSavingId(t.id);
    try {
      const res = await api.put(`/tagihan-lain/${t.id}/status`, { status: next });
      setList((prev) => prev.map((x) => (x.id === t.id ? res.data : x)));
      if (next === 'lunas') notify('success', `Pembayaran "${t.nama_tagihan}" atas nama ${t.student?.user?.name} tercatat lunas.`);
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal mengubah status pembayaran.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (t) => {
    if (!confirm(`Hapus tagihan "${t.nama_tagihan}" atas nama ${t.student?.user?.name}?`)) return;
    setSavingId(t.id);
    try {
      await api.delete(`/tagihan-lain/${t.id}`);
      setList((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal menghapus tagihan.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteByNama = async () => {
    if (!namaFilter) return;
    const belumBayarCount = list.filter((t) => t.status === 'belum_bayar').length;
    if (!confirm(`Hapus ${belumBayarCount} tagihan "${namaFilter}" yang belum dibayar${classRoomId ? ' (kelas terpilih)' : ''}? Tagihan yang sudah lunas/dicicil tidak akan ikut terhapus. Aksi ini tidak bisa dibatalkan.`)) return;
    setDeletingNama(true);
    try {
      const res = await api.delete('/tagihan-lain/nama', {
        params: {
          nama_tagihan: namaFilter,
          tahun_ajaran_id: tahunAjaranId || undefined,
          class_room_id: classRoomId || undefined,
        },
      });
      notify('success', res.data.message);
      loadList();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal menghapus tagihan.');
    } finally {
      setDeletingNama(false);
    }
  };

  const togglePicked = (id) => {
    setPickedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleClass = (id) => {
    setBulkClassRoomIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const cocokJenisKelamin = (s) => !bulkJenisKelamin || s.jenis_kelamin === bulkJenisKelamin;
  const jumlahSiswaKelasTerpilih = students.filter((s) => bulkClassRoomIds.includes(s.class_room_id) && cocokJenisKelamin(s)).length;
  const jumlahSiswaSemua = students.filter(cocokJenisKelamin).length;

  const { page, setPage, totalPages, paginated: listHalaman } = usePagination(list, 40);

  const totalLunas = list.filter((t) => t.status === 'lunas').length;
  const totalSebagian = list.filter((t) => t.status === 'sebagian').length;
  const totalBelum = list.filter((t) => t.status === 'belum_bayar').length;

  const statusBadgeClass = (status) => {
    if (status === 'lunas') return 'badge-brand';
    if (status === 'sebagian') return 'badge-honey';
    return 'badge-rose';
  };
  const statusLabel = (status) => {
    if (status === 'lunas') return 'Lunas';
    if (status === 'sebagian') return 'Sebagian';
    return 'Belum Bayar';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-ink-900 text-lg">Tagihan Lain</h2>
        <p className="text-sm text-ink-500">Biaya di luar SPP bulanan yang sifatnya tidak tetap — study tour, seragam, ujian praktik, dan sejenisnya.</p>
      </div>

      {feedback && (
        <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm ${
          feedback.type === 'success' ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
          <p className="flex-1">{feedback.message}</p>
          <button onClick={() => setFeedback(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="surface-card p-5">
        <h3 className="font-display font-semibold text-ink-900 mb-1">Buat Tagihan Baru</h3>
        <p className="text-xs text-ink-500 mb-4">
          Tagihan baru selalu masuk tahun ajaran aktif ({tahunAjaranList.find((t) => t.status === 'aktif')?.nama || '...'}), berapa pun tahun ajaran yang sedang ditampilkan di filter di bawah.
        </p>
        {formError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{formError}</p>}

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button" onClick={() => setTarget('satu')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${target === 'satu' ? 'bg-brand-600 text-white border-transparent' : 'text-ink-600 border-line-200 hover:bg-mist-50'}`}
          >
            <User className="w-3.5 h-3.5" /> 1 Siswa
          </button>
          <button
            type="button" onClick={() => setTarget('kelas')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${target === 'kelas' ? 'bg-brand-600 text-white border-transparent' : 'text-ink-600 border-line-200 hover:bg-mist-50'}`}
          >
            <Users className="w-3.5 h-3.5" /> Pilih Kelas
          </button>
          <button
            type="button" onClick={() => setTarget('pilih')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${target === 'pilih' ? 'bg-brand-600 text-white border-transparent' : 'text-ink-600 border-line-200 hover:bg-mist-50'}`}
          >
            <Users className="w-3.5 h-3.5" /> Pilih Beberapa Siswa
          </button>
          <button
            type="button" onClick={() => setTarget('semua')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${target === 'semua' ? 'bg-brand-600 text-white border-transparent' : 'text-ink-600 border-line-200 hover:bg-mist-50'}`}
          >
            <UsersRound className="w-3.5 h-3.5" /> Semua Siswa
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {target === 'satu' && (
            <StudentSearchSelect students={students} value={studentId} onChange={setStudentId} />
          )}

          {target === 'kelas' && (
            <div className="border border-line-200 rounded-xl p-3 max-h-48 overflow-y-auto">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                    <input type="checkbox" checked={bulkClassRoomIds.includes(c.id)} onChange={() => toggleClass(c.id)} />
                    <span className="text-ink-900">{c.name}</span>
                  </label>
                ))}
              </div>
              {classes.length === 0 && <p className="text-xs text-ink-400">Belum ada data kelas.</p>}
              {bulkClassRoomIds.length > 0 && (
                <p className="text-xs text-brand-600 pt-1 border-t border-line-200 mt-1">
                  {bulkClassRoomIds.length} kelas dipilih · {jumlahSiswaKelasTerpilih} siswa{bulkJenisKelamin ? (bulkJenisKelamin === 'L' ? ' laki-laki' : ' perempuan') : ''}
                </p>
              )}
            </div>
          )}

          {(target === 'kelas' || target === 'semua') && (
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">
                Jenis Kelamin <span className="font-normal text-ink-400">(opsional, kalau nominal beda laki-laki/perempuan)</span>
              </label>
              <div className="flex gap-2">
                {[{ v: '', l: 'Semua' }, { v: 'L', l: 'Laki-laki' }, { v: 'P', l: 'Perempuan' }].map((o) => (
                  <button
                    key={o.v} type="button" onClick={() => setBulkJenisKelamin(o.v)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition ${bulkJenisKelamin === o.v ? 'bg-brand-600 text-white border-transparent' : 'text-ink-600 border-line-200 hover:bg-mist-50'}`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {target === 'pilih' && (
            <div className="border border-line-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
              {students.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                  <input type="checkbox" checked={pickedIds.includes(s.id)} onChange={() => togglePicked(s.id)} />
                  <span className="text-ink-900">{s.user?.name}</span>
                  <span className="text-ink-400 text-xs">· {s.class_room?.name || 'Tanpa kelas'}</span>
                </label>
              ))}
              {students.length === 0 && <p className="text-xs text-ink-400">Belum ada data siswa.</p>}
              {pickedIds.length > 0 && <p className="text-xs text-brand-600 pt-1 border-t border-line-200 mt-1">{pickedIds.length} siswa dipilih</p>}
            </div>
          )}

          {target === 'semua' && (
            <div className="flex items-start gap-2 bg-mist-50 border border-line-200 rounded-xl p-3">
              <UsersRound className="w-4 h-4 text-ink-400 shrink-0 mt-0.5" />
              <p className="text-xs text-ink-600">
                Tagihan ini akan dibuat untuk <b>semua siswa aktif{bulkJenisKelamin ? ` ${bulkJenisKelamin === 'L' ? 'laki-laki' : 'perempuan'}` : ''}</b> ({jumlahSiswaSemua} siswa), tanpa terkecuali kelas.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Nama Tagihan (mis. Study Tour 2026)" value={form.nama_tagihan}
              onChange={(e) => setForm({ ...form, nama_tagihan: e.target.value })}
              className="field-input col-span-2" list="daftar-nama-tagihan"
            />
            <datalist id="daftar-nama-tagihan">
              {daftarNama.map((n) => <option key={n} value={n} />)}
            </datalist>
            <input
              type="number" placeholder="Nominal" value={form.nominal}
              onChange={(e) => setForm({ ...form, nominal: e.target.value })}
              className="field-input"
            />
            <input
              placeholder="Keterangan (opsional)" value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              className="field-input"
            />
          </div>

          <button disabled={saving} className="btn-primary">
            <Plus className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Buat Tagihan'}
          </button>
        </form>
      </div>

      <div className="surface-card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Tahun Ajaran</label>
          <select value={tahunAjaranId} onChange={(e) => setTahunAjaranId(e.target.value)} className="field-input text-ink-700">
            {tahunAjaranList.map((t) => (
              <option key={t.id} value={t.id}>{t.nama}{t.status === 'aktif' ? ' (Aktif)' : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-xs font-medium text-ink-500 mb-1">Nama Tagihan</label>
          <select value={namaFilter} onChange={(e) => setNamaFilter(e.target.value)} className="field-input text-ink-700 w-full">
            <option value="">Semua Nama Tagihan</option>
            {daftarNama.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
          <select value={classRoomId} onChange={(e) => setClassRoomId(e.target.value)} className="field-input text-ink-700">
            <option value="">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input text-ink-700">
            <option value="">Semua Status</option>
            <option value="lunas">Lunas</option>
            <option value="sebagian">Sebagian</option>
            <option value="belum_bayar">Belum Bayar</option>
          </select>
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-xs font-medium text-ink-500 mb-1">Cari Nama/NIS</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="field-input" placeholder="Cari siswa..." />
        </div>
        <button onClick={loadList} className="btn-primary">
          <Search className="w-4 h-4" /> Tampilkan
        </button>
        <div className="ml-auto flex gap-2">
          <span className="badge-soft badge-brand">Lunas: {totalLunas}</span>
          <span className="badge-soft badge-honey">Sebagian: {totalSebagian}</span>
          <span className="badge-soft badge-rose">Belum Bayar: {totalBelum}</span>
        </div>
      </div>

      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-display font-semibold text-ink-900">
            Daftar Tagihan <span className="text-ink-500 font-sans font-normal text-sm">({list.length})</span>
          </h3>
          {namaFilter && list.length > 0 && (
            <button
              onClick={handleDeleteByNama}
              disabled={deletingNama}
              className="flex items-center gap-1.5 text-sm font-medium text-honey-700 bg-honey-50 hover:bg-honey-100 border border-honey-200 disabled:opacity-60 rounded-xl px-4 py-2 transition"
            >
              <Trash2 className="w-4 h-4" />
              {deletingNama ? 'Menghapus...' : `Hapus Semua "${namaFilter}"`}
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : list.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-mist-50 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-ink-300" />
            </div>
            <p className="text-sm font-medium text-ink-700">Belum ada tagihan untuk filter ini.</p>
          </div>
        ) : (
          <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Siswa</th>
                <th className="font-medium whitespace-nowrap px-2">Kelas</th>
                <th className="font-medium whitespace-nowrap px-2">Tagihan</th>
                <th className="font-medium whitespace-nowrap px-2">Nominal</th>
                <th className="font-medium whitespace-nowrap px-2">Status</th>
                <th className="font-medium text-right whitespace-nowrap px-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {listHalaman.map((t) => (
                <Fragment key={t.id}>
                <tr className="border-t border-line-200">
                  <td className="py-2.5 whitespace-nowrap px-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={t.student?.user?.name} />
                      <span className="text-ink-900 min-w-0"><TruncateText text={t.student?.user?.name} /></span>
                    </div>
                  </td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{t.student?.class_room?.name || '-'}</td>
                  <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={t.nama_tagihan} maxWidth="10rem" /></td>
                  <td className="text-ink-700 whitespace-nowrap px-2">
                    {editingId === t.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" value={editNominal} autoFocus
                          onChange={(e) => setEditNominal(e.target.value)}
                          className="field-input w-28 py-1 text-sm"
                        />
                        <button onClick={() => saveNominal(t)} disabled={savingId === t.id} className="text-brand-600 hover:text-brand-700">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-ink-300 hover:text-ink-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(t)} className="flex items-center gap-1.5 hover:text-brand-600 group">
                        {formatRupiah(t.nominal)}
                        <Pencil className="w-3 h-3 text-ink-300 group-hover:text-brand-600" />
                      </button>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2">
                    <span className={`badge-soft ${statusBadgeClass(t.status)}`}>
                      {statusLabel(t.status)}
                    </span>
                    {t.status === 'sebagian' && (
                      <p className="text-xs text-ink-400 mt-0.5">sisa {formatRupiah(t.nominal - t.jumlah_dibayar)}</p>
                    )}
                  </td>
                  <td className="text-right whitespace-nowrap px-2">
                    <div className="flex justify-end items-center gap-2">
                      {t.status !== 'lunas' && (
                        <button
                          onClick={() => openPartial(t)}
                          disabled={savingId === t.id}
                          className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 disabled:opacity-40 rounded-lg px-3 py-1.5 transition"
                        >
                          Bayar Sebagian
                        </button>
                      )}
                      <button
                        onClick={() => toggleStatus(t)}
                        disabled={savingId === t.id}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-40 ${
                          t.status === 'lunas'
                            ? 'text-ink-500 border-line-200 hover:bg-mist-50'
                            : 'text-white bg-[#15803D] border-transparent hover:bg-[#116530]'
                        }`}
                      >
                        {t.status === 'lunas' ? 'Batalkan' : 'Tandai Lunas'}
                      </button>
                      {t.status === 'lunas' && (
                        <button
                          onClick={() => window.open(`/print/tagihan-lain-nota?tagihan_id=${t.id}`, '_blank')}
                          title="Cetak nota pembayaran"
                          className="text-ink-300 hover:text-brand-600"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(t)}
                        disabled={savingId === t.id}
                        title="Hapus tagihan ini"
                        className="text-ink-300 hover:text-honey-700 disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {partialId === t.id && (
                  <tr className="bg-mist-50">
                    <td colSpan="6" className="py-2 px-2 whitespace-nowrap">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-ink-500 mr-auto">
                          Bayar sebagian "{t.nama_tagihan}" {t.student?.user?.name} — sisa {formatRupiah(t.nominal - t.jumlah_dibayar)}
                        </span>
                        <input
                          type="number" autoFocus min={1} max={t.nominal - t.jumlah_dibayar}
                          value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)}
                          placeholder="Jumlah bayar" className="field-input w-40 py-1 text-sm"
                        />
                        <button
                          onClick={() => submitPartial(t)}
                          disabled={payingPartial || !partialAmount}
                          className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg px-3 py-1.5"
                        >
                          {payingPartial ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <button onClick={() => setPartialId(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-1.5">
                          Batal
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        )}
        {!loading && list.length > 0 && <Pagination page={page} totalPages={totalPages} onChange={setPage} />}
      </div>
    </div>
  );
}
