import { useEffect, useState } from 'react';
import { GraduationCap, ChevronRight, ChevronLeft, RotateCcw, Undo2 } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';

export default function AlumniTab() {
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const loadClasses = () => {
    setLoadingClasses(true);
    api.get('/classes', { params: { status: 'lulus' } }).then((res) => setClasses(res.data)).finally(() => setLoadingClasses(false));
  };

  useEffect(() => { loadClasses(); }, []);

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
    loadClasses();
  };

  const handleKembalikan = async (s) => {
    if (!confirm(`Kembalikan "${s.user?.name}" jadi siswa aktif lagi?`)) return;
    await api.put(`/students/${s.id}/kembalikan-aktif`);
    setStudents((prev) => prev.filter((x) => x.id !== s.id));
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-ink-900 text-lg">Alumni</h2>
        <p className="text-sm text-ink-500">Kelas yang sudah diluluskan. Data & riwayatnya tetap tersimpan, hanya disembunyikan dari Master Data &gt; Kelas.</p>
      </div>

      <div className="surface-card p-5">
        {selectedClass ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-line-200">
              <div>
                <h3 className="font-display font-semibold text-ink-900">{selectedClass.name}</h3>
                <p className="text-xs text-ink-500">{selectedClass.students_count ?? 0} alumni</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAktifkanKelas(selectedClass)}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#15803D] hover:bg-[#116530] rounded-lg px-3 py-1.5"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Aktifkan Kelas Ini
                </button>
                <button onClick={backToClasses} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5">
                  <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Kelas
                </button>
              </div>
            </div>

            {loadingStudents ? (
              <p className="text-center text-ink-300 py-6">Memuat...</p>
            ) : students.length === 0 ? (
              <p className="text-center text-ink-300 py-6">Tidak ada alumni di kelas ini.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-line-200">
                    <th className="pb-2 font-medium">Nama</th>
                    <th className="font-medium">NIS</th>
                    <th className="font-medium">Tanggal Lulus</th>
                    <th className="font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-t border-line-200">
                      <td className="py-2.5 text-ink-900"><TruncateText text={s.user?.name} /></td>
                      <td className="text-ink-700">{s.nis}</td>
                      <td className="text-ink-700">{s.tanggal_lulus || '-'}</td>
                      <td className="text-right">
                        <button
                          onClick={() => handleKembalikan(s)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-brand-600 border border-line-200 rounded-lg px-3 py-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Kembalikan ke Aktif
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
