import { useEffect, useState } from 'react';
import { GraduationCap, ChevronRight, ChevronLeft, Trash2, KeyRound } from 'lucide-react';
import api from '../../../api/axios';
import { useAuth } from '../../../context/AuthContext';
import { fmtDMY } from '../../../utils/date';

export default function WaliAlumniTab() {
  const { user } = useAuth();
  // Waka Humas cuma boleh lihat menu ini — hapus/reset password wali tetap
  // eksklusif milik Kesiswaan, backend-nya juga sudah menolak Humas di
  // kedua endpoint tersebut.
  const canEdit = user.role === 'admin' || user.role === 'waka_kesiswaan';
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [parents, setParents] = useState([]);
  const [loadingParents, setLoadingParents] = useState(true);

  const [selectedClass, setSelectedClass] = useState(null);

  const loadClasses = () => {
    setLoadingClasses(true);
    api.get('/classes', { params: { status: 'lulus' } }).then((res) => setClasses(res.data)).finally(() => setLoadingClasses(false));
  };
  const loadParents = () => {
    setLoadingParents(true);
    api.get('/parents').then((res) => setParents(res.data)).finally(() => setLoadingParents(false));
  };

  useEffect(() => { loadClasses(); loadParents(); }, []);

  // Wali "milik" 1 kelas alumni = wali yang punya minimal 1 anak berstatus
  // lulus DAN anak itu dari kelas tersebut — datanya diambil dari daftar
  // wali yang sama seperti Master Data > Wali Siswa, cuma disortir per
  // kelas di sini, persis seperti pola Alumni Siswa.
  const waliUntukKelas = (classId) => parents.filter((p) =>
    p.children?.some((c) => c.class_room_id === classId && c.status === 'lulus')
  );

  const openClass = (c) => setSelectedClass(c);

  const backToClasses = () => {
    setSelectedClass(null);
    loadClasses();
    loadParents();
  };

  const handleDeleteParent = async (id, name) => {
    if (!confirm(`Hapus akun wali "${name}"? Semua hubungan ke anak juga akan terhapus.`)) return;
    await api.delete(`/parents/${id}`);
    loadParents();
  };

  const handleResetPassword = async (id, name) => {
    if (!confirm(`Reset password akun wali "${name}" ke default (123456)?`)) return;
    try {
      const res = await api.put(`/parents/${id}/reset-password`);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mereset password.');
    }
  };

  const loading = loadingClasses || loadingParents;
  const waliDiKelasIni = selectedClass ? waliUntukKelas(selectedClass.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-ink-900 text-lg">Wali Siswa Alumni</h2>
        <p className="text-sm text-ink-500">Wali dari siswa yang sudah lulus, disortir per kelas — sama seperti Alumni Siswa. Data tidak pernah hilang, otomatis muncul di sini begitu kelasnya diluluskan lewat Master Data &gt; Kelas.</p>
      </div>

      <div className="surface-card p-5">
        {selectedClass ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-line-200">
              <div>
                <h3 className="font-display font-semibold text-ink-900">{selectedClass.name}</h3>
                <p className="text-xs text-ink-500">{waliDiKelasIni.length} wali</p>
              </div>
              <button onClick={backToClasses} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5">
                <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Kelas
              </button>
            </div>

            {loadingParents ? (
              <p className="text-center text-ink-300 py-6">Memuat...</p>
            ) : waliDiKelasIni.length === 0 ? (
              <p className="text-center text-ink-300 py-6">Tidak ada wali alumni di kelas ini.</p>
            ) : (
              <div className="space-y-4">
                {waliDiKelasIni.map((p) => (
                  <div key={p.id} className="border border-line-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-ink-900">{p.name}</p>
                        <p className="text-xs text-ink-500">{p.phone}</p>
                      </div>
                      {canEdit && (
                        <div className="flex gap-2">
                          <button onClick={() => handleResetPassword(p.id, p.name)} className="text-ink-400 hover:text-brand-600" title="Reset Password ke default (123456)">
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteParent(p.id, p.name)} className="text-ink-300 hover:text-honey-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.children.filter((c) => c.class_room_id === selectedClass.id).map((c) => (
                        <span key={c.id} className="flex items-center gap-1.5 text-xs bg-mist-50 border border-line-200 rounded-lg px-2.5 py-1.5">
                          <span className="text-ink-900 font-medium">{c.user?.name}</span>
                          {c.pivot?.hubungan && <span className="text-ink-400">({c.pivot.hubungan})</span>}
                          {c.tanggal_lulus && <span className="text-ink-400">· Lulus {fmtDMY(c.tanggal_lulus)}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : loading ? (
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
                    <p className="text-sm font-medium text-ink-900">{c.name}</p>
                    <p className="text-xs text-ink-500">{waliUntukKelas(c.id).length} wali</p>
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
