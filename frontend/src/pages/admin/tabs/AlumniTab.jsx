import { useEffect, useRef, useState } from 'react';
import { GraduationCap, ChevronRight, ChevronLeft, Undo2, Plus, UserPlus, X, Upload, Download, Trash2 } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import { useAuth } from '../../../context/AuthContext';
import { fmtDMY } from '../../../utils/date';

const emptyNewStudent = { name: '', email: '', nis: '', nisn: '', tanggal_lulus: '' };

export default function AlumniTab() {
  const { user } = useAuth();
  // Waka Humas cuma boleh lihat menu Alumni (buat keperluan Hubin/tracking
  // alumni) — "Kembalikan ke Aktif" dan "Aktifkan Kelas Ini" tetap eksklusif
  // milik Kesiswaan, backend-nya juga sudah menolak Humas di kedua endpoint.
  const canEdit = user.role === 'admin' || user.role === 'waka_kesiswaan';
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [showAddClass, setShowAddClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [savingClass, setSavingClass] = useState(false);
  const [classError, setClassError] = useState('');

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState(emptyNewStudent);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentError, setStudentError] = useState('');

  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [jurusanList, setJurusanList] = useState([]);
  const [editStudent, setEditStudent] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const loadClasses = () => {
    setLoadingClasses(true);
    api.get('/classes', { params: { status: 'lulus' } }).then((res) => setClasses(res.data)).finally(() => setLoadingClasses(false));
  };

  useEffect(() => {
    loadClasses();
    api.get('/jurusan').then((res) => setJurusanList(res.data));
  }, []);

  const openClass = (c) => {
    setSelectedClass(c);
    setLoadingStudents(true);
    api.get('/students', { params: { class_room_id: c.id, status: 'lulus' } })
      .then((res) => setStudents(res.data))
      .finally(() => setLoadingStudents(false));
  };

  const backToClasses = () => {
    setSelectedClass(null);
    setStudents([]);
    setShowAddStudent(false);
    setEditStudent(null);
    setImportResult(null);
    loadClasses();
  };

  const handleAktifkanKelas = async (c) => {
    if (!confirm(`Aktifkan kembali kelas "${c.name}" beserta ${c.students_count ?? 0} siswa di dalamnya? Kelas ini akan muncul lagi di Master Data > Kelas.`)) return;
    try {
      const res = await api.post(`/classes/${c.id}/aktifkan`);
      alert(res.data.message);
      backToClasses();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengaktifkan kelas ini.');
    }
  };

  // Bikin kelas alumni LANGSUNG (status "lulus") — beda dari alur
  // luluskan() 1 kelas aktif di Master Data > Kelas, ini buat
  // mengarsipkan angkatan lama yang belum pernah tercatat sebagai kelas
  // aktif di sistem ini sama sekali.
  const handleAddClass = async (e) => {
    e.preventDefault();
    setClassError('');
    setSavingClass(true);
    try {
      await api.post('/classes', { name: newClassName, status: 'lulus' });
      setNewClassName('');
      setShowAddClass(false);
      loadClasses();
    } catch (err) {
      setClassError(err.response?.data?.errors?.name?.[0] || err.response?.data?.message || 'Gagal menambah kelas alumni.');
    } finally {
      setSavingClass(false);
    }
  };

  // Tambah 1 alumni LANGSUNG ke kelas alumni yang sedang dibuka — dipakai
  // buat catat lulusan lama yang belum pernah jadi siswa aktif di sistem
  // ini. Password otomatis dibuat default (123456).
  const handleAddStudent = async (e) => {
    e.preventDefault();
    setStudentError('');
    setSavingStudent(true);
    try {
      await api.post('/students', {
        ...newStudent,
        class_room_id: selectedClass.id,
        status: 'lulus',
      });
      setNewStudent(emptyNewStudent);
      setShowAddStudent(false);
      openClass(selectedClass);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setStudentError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah alumni.');
    } finally {
      setSavingStudent(false);
    }
  };

  // Import alumni dari Excel — semua baris masuk ke kelas alumni yang
  // sedang dibuka (selectedClass), lihat AlumniImport di backend.
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('class_room_id', selectedClass.id);
    try {
      const res = await api.post('/students/import-alumni', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      openClass(selectedClass);
    } catch (err) {
      setImportResult({ message: err.response?.data?.message || 'Gagal mengimport file.', gagal: [] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const openEditStudent = (s) => {
    setShowAddStudent(false);
    setEditError('');
    setEditStudent({
      id: s.id,
      name: s.user?.name || '',
      email: s.user?.email || '',
      nis: s.nis || '',
      nisn: s.nisn || '',
      jurusan_id: s.jurusan_id || '',
      tanggal_lulus: s.tanggal_lulus || '',
    });
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    setEditError('');
    setSavingEdit(true);
    try {
      await api.put(`/students/${editStudent.id}/ringkas`, editStudent);
      setEditStudent(null);
      openClass(selectedClass);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setEditError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteStudent = async (s) => {
    if (!confirm(`Hapus alumni "${s.user?.name}" beserta akunnya? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await api.delete(`/students/${s.id}`);
      openClass(selectedClass);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus alumni ini.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-semibold text-ink-900 text-lg">Alumni Siswa</h2>
          <p className="text-sm text-ink-500">Kelas yang sudah diluluskan. Data & riwayatnya tetap tersimpan, hanya disembunyikan dari Master Data &gt; Kelas.</p>
        </div>
        {canEdit && !selectedClass && !showAddClass && (
          <button onClick={() => { setNewClassName(''); setClassError(''); setShowAddClass(true); }} className="btn-primary text-sm shrink-0">
            <Plus className="w-4 h-4" /> Tambah Kelas Alumni
          </button>
        )}
      </div>

      {canEdit && !selectedClass && showAddClass && (
        <form onSubmit={handleAddClass} className="surface-card p-4">
          {classError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{classError}</p>}
          <div className="flex gap-3">
            <input
              placeholder="Nama kelas alumni (contoh: 2019 XII TKJ 1)"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              className="field-input flex-1"
              required
            />
            <div className="flex gap-2 shrink-0">
              <button disabled={savingClass} className="btn-primary whitespace-nowrap">
                {savingClass ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" onClick={() => setShowAddClass(false)} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
            </div>
          </div>
        </form>
      )}

      <div className="surface-card p-5">
        {selectedClass ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-line-200 flex-wrap">
              <div>
                <h3 className="font-display font-semibold text-ink-900">{selectedClass.name}</h3>
                <p className="text-xs text-ink-500">{selectedClass.students_count ?? 0} alumni</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {canEdit && !showAddStudent && (
                  <button
                    onClick={() => { setEditStudent(null); setNewStudent(emptyNewStudent); setStudentError(''); setShowAddStudent(true); }}
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Tambah Siswa
                  </button>
                )}
                {canEdit && (
                  <a
                    href="/api/students/import-alumni/template"
                    onClick={(e) => { e.preventDefault(); api.get('/students/import-alumni/template', { responseType: 'blob' }).then((res) => {
                      const url = URL.createObjectURL(new Blob([res.data]));
                      const a = document.createElement('a');
                      a.href = url; a.download = 'template_import_alumni.xlsx'; a.click();
                      URL.revokeObjectURL(url);
                    }); }}
                    className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Template
                  </a>
                )}
                {canEdit && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5 disabled:opacity-60"
                  >
                    <Upload className="w-3.5 h-3.5" /> {importing ? 'Mengimport...' : 'Import Excel'}
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" />
                {canEdit && (
                  <button
                    onClick={() => handleAktifkanKelas(selectedClass)}
                    className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#15803D] hover:bg-[#116530] rounded-lg px-3 py-1.5"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> Aktifkan Kelas Ini
                  </button>
                )}
                <button onClick={backToClasses} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5">
                  <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Kelas
                </button>
              </div>
            </div>

            {importResult && (
              <div className="bg-mist-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-ink-900">{importResult.message}</p>
                  <button type="button" onClick={() => setImportResult(null)} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>
                </div>
                {importResult.gagal?.length > 0 && (
                  <ul className="text-xs text-honey-700 space-y-1 mt-2 max-h-40 overflow-y-auto">
                    {importResult.gagal.map((g, i) => (
                      <li key={i}>Baris {g.baris} ({g.kolom}): {g.alasan}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {editStudent && (
              <form onSubmit={handleEditStudent} className="bg-mist-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-ink-900">Edit Alumni</p>
                  <button type="button" onClick={() => setEditStudent(null)} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>
                </div>
                {editError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{editError}</p>}
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <input placeholder="Nama lengkap" value={editStudent.name} onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })} className="field-input" required />
                  <input type="email" placeholder="Email (opsional)" value={editStudent.email} onChange={(e) => setEditStudent({ ...editStudent, email: e.target.value })} className="field-input" />
                  <input placeholder="NIS" value={editStudent.nis} onChange={(e) => setEditStudent({ ...editStudent, nis: e.target.value })} className="field-input" required />
                  <input placeholder="NISN (opsional)" value={editStudent.nisn} onChange={(e) => setEditStudent({ ...editStudent, nisn: e.target.value })} className="field-input" />
                  <select value={editStudent.jurusan_id} onChange={(e) => setEditStudent({ ...editStudent, jurusan_id: e.target.value })} className="field-input">
                    <option value="">Jurusan (opsional)</option>
                    {jurusanList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                  </select>
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal Lulus</label>
                    <input type="date" value={editStudent.tanggal_lulus} onChange={(e) => setEditStudent({ ...editStudent, tanggal_lulus: e.target.value })} className="field-input" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button disabled={savingEdit} className="btn-primary text-sm">{savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
                  <button type="button" onClick={() => setEditStudent(null)} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
                </div>
              </form>
            )}

            {showAddStudent && (
              <form onSubmit={handleAddStudent} className="bg-mist-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-ink-900">Tambah Siswa ke "{selectedClass.name}"</p>
                  <button type="button" onClick={() => setShowAddStudent(false)} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>
                </div>
                {studentError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{studentError}</p>}
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  <input placeholder="Nama lengkap" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} className="field-input" required />
                  <input type="email" placeholder="Email (opsional)" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} className="field-input" />
                  <input placeholder="NIS" value={newStudent.nis} onChange={(e) => setNewStudent({ ...newStudent, nis: e.target.value })} className="field-input" required />
                  <input placeholder="NISN (opsional)" value={newStudent.nisn} onChange={(e) => setNewStudent({ ...newStudent, nisn: e.target.value })} className="field-input" />
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal Lulus</label>
                    <input type="date" value={newStudent.tanggal_lulus} onChange={(e) => setNewStudent({ ...newStudent, tanggal_lulus: e.target.value })} className="field-input" required />
                  </div>
                </div>
                <p className="text-xs text-ink-400 mb-3">Password akun otomatis dibuat default (123456). Alumni login pakai NIS, jadi email boleh dikosongkan.</p>
                <button disabled={savingStudent} className="btn-primary text-sm">{savingStudent ? 'Menyimpan...' : 'Simpan'}</button>
              </form>
            )}

            {loadingStudents ? (
              <p className="text-center text-ink-300 py-6">Memuat...</p>
            ) : students.length === 0 ? (
              <p className="text-center text-ink-300 py-6">Tidak ada alumni di kelas ini.</p>
            ) : (
              <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-line-200">
                    <th className="pb-2 font-medium whitespace-nowrap px-2">Nama</th>
                    <th className="font-medium whitespace-nowrap px-2">NIS</th>
                    <th className="font-medium whitespace-nowrap px-2">Jurusan</th>
                    <th className="font-medium whitespace-nowrap px-2">Tanggal Lulus</th>
                    {canEdit && <th className="font-medium whitespace-nowrap px-2 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-t border-line-200">
                      <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={s.user?.name} /></td>
                      <td className="text-ink-700 whitespace-nowrap px-2">{s.nis}</td>
                      <td className="text-ink-700 whitespace-nowrap px-2">{s.jurusan?.nama || '—'}</td>
                      <td className="text-ink-700 whitespace-nowrap px-2">{fmtDMY(s.tanggal_lulus)}</td>
                      {canEdit && (
                        <td className="whitespace-nowrap px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEditStudent(s)} className="px-2 py-1 text-xs font-medium text-ink-500 hover:text-brand-600 hover:bg-mist-50 rounded-lg transition">
                              Edit
                            </button>
                            <button onClick={() => handleDeleteStudent(s)} title="Hapus" className="p-1.5 text-ink-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </>
        ) : loadingClasses ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : classes.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-mist-50 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6 text-ink-300" />
            </div>
            <p className="text-sm font-medium text-ink-700 mb-1">Belum ada kelas alumni</p>
            <p className="text-xs text-ink-500">Kelas yang diluluskan lewat Master Data &gt; Kelas akan muncul di sini.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line-200">
            {classes.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => openClass(c)}
                  className="w-full flex items-center gap-3 py-3 text-left hover:bg-mist-50 transition rounded-lg px-2 -mx-2"
                >
                  <div className="w-9 h-9 rounded-full bg-mist-50 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4 text-ink-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900"><TruncateText text={c.name} clickable={false} /></p>
                    <p className="text-xs text-ink-500">{c.students_count ?? 0} alumni</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-300 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
