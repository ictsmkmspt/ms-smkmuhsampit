import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, ChevronRight, ChevronLeft } from 'lucide-react';
import api from '../../../api/axios';
import { formatRupiah, Avatar } from '../shared';
import StudentSppPanel from '../StudentSppPanel';

export default function AlumniTab() {
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassName, setSelectedClassName] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const loadAlumni = () => {
    setLoading(true);
    api.get('/spp/alumni').then((res) => setAlumni(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { loadAlumni(); }, []);

  // Kelompokkan tunggakan alumni per kelas asal, biar TU bisa nagih per
  // angkatan (mis. "XII DKV 2026") tanpa harus scroll semua alumni sekaligus.
  const kelasList = useMemo(() => {
    const map = new Map();
    for (const a of alumni) {
      const nama = a.student.class_room?.name || 'Tanpa Kelas Asal';
      if (!map.has(nama)) map.set(nama, { nama, alumni: [], total: 0 });
      const entry = map.get(nama);
      entry.alumni.push(a);
      entry.total += a.total_tunggakan;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [alumni]);

  const selectedKelas = kelasList.find((k) => k.nama === selectedClassName);

  const backToClasses = () => {
    setSelectedClassName(null);
    setSelectedStudent(null);
  };

  const backToStudentList = () => {
    setSelectedStudent(null);
    loadAlumni();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-ink-900 text-lg">Alumni</h2>
        <p className="text-sm text-ink-500">Kelas alumni yang masih punya tunggakan SPP dari sebelum lulus.</p>
      </div>

      <div className="surface-card p-5">
        {selectedStudent ? (
          <StudentSppPanel student={selectedStudent} onClose={backToStudentList} onPaid={loadAlumni} />
        ) : selectedKelas ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-line-200">
              <div>
                <h3 className="font-display font-semibold text-ink-900">{selectedKelas.nama}</h3>
                <p className="text-xs text-ink-500">{selectedKelas.alumni.length} alumni bertunggakan · {formatRupiah(selectedKelas.total)}</p>
              </div>
              <button onClick={backToClasses} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5">
                <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Kelas
              </button>
            </div>

            <ul className="divide-y divide-line-200">
              {selectedKelas.alumni.map((a) => (
                <li key={a.student.id}>
                  <button
                    onClick={() => setSelectedStudent(a.student)}
                    className="w-full flex items-center gap-3 py-3 text-left hover:bg-mist-50 transition rounded-lg px-2 -mx-2"
                  >
                    <Avatar name={a.student.user?.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{a.student.user?.name}</p>
                      <p className="text-xs text-ink-500">NIS {a.student.nis} · {a.jumlah_tunggakan} bulan belum bayar</p>
                    </div>
                    <span className="text-sm font-display font-semibold text-honey-700 shrink-0">{formatRupiah(a.total_tunggakan)}</span>
                    <ChevronRight className="w-4 h-4 text-ink-300 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : kelasList.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-mist-50 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6 text-ink-300" />
            </div>
            <p className="text-sm font-medium text-ink-700 mb-1">Tidak ada tunggakan alumni</p>
            <p className="text-xs text-ink-500">Semua alumni sudah lunas, atau belum ada siswa yang diluluskan.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line-200">
            {kelasList.map((k) => (
              <li key={k.nama}>
                <button
                  onClick={() => setSelectedClassName(k.nama)}
                  className="w-full flex items-center gap-3 py-3 text-left hover:bg-mist-50 transition rounded-lg px-2 -mx-2"
                >
                  <div className="w-9 h-9 rounded-full bg-mist-50 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4 text-ink-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{k.nama}</p>
                    <p className="text-xs text-ink-500">{k.alumni.length} alumni bertunggakan</p>
                  </div>
                  <span className="text-sm font-display font-semibold text-honey-700 shrink-0">{formatRupiah(k.total)}</span>
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
