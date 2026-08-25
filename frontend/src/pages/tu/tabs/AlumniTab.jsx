import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, ChevronRight, ChevronLeft, Printer } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
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

  // Kelompokkan alumni per kelas asal (termasuk yang sudah lunas, bukan
  // cuma yang masih bertunggakan), biar TU bisa lihat & nagih per angkatan
  // (mis. "XII DKV 2026") tanpa harus scroll semua alumni sekaligus. Nama
  // kelas & alumni di dalamnya diurutkan abjad — backend (/spp/alumni)
  // sudah mengembalikan alumni terurut abjad, jadi urutan di dalam tiap
  // kelas otomatis ikut abjad juga tanpa perlu sort ulang di sini.
  const kelasList = useMemo(() => {
    const map = new Map();
    for (const a of alumni) {
      const nama = a.student.class_room?.name || 'Tanpa Kelas Asal';
      if (!map.has(nama)) map.set(nama, { nama, alumni: [], total: 0, bertunggakan: 0 });
      const entry = map.get(nama);
      entry.alumni.push(a);
      entry.total += a.total_tunggakan;
      if (a.total_tunggakan > 0) entry.bertunggakan += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [alumni]);

  const totalTunggakanSemua = kelasList.reduce((sum, k) => sum + k.total, 0);

  const cetakSemuaAlumni = () => window.open('/print/laporan-tunggakan-alumni', '_blank');
  const cetakKelasIni = (namaKelas) => window.open(`/print/laporan-tunggakan-alumni?kelas=${encodeURIComponent(namaKelas)}`, '_blank');

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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-semibold text-ink-900 text-lg">Alumni</h2>
          <p className="text-sm text-ink-500">Daftar alumni per kelas asal beserta tunggakan SPP dari sebelum lulus (kalau ada).</p>
        </div>
        {!selectedStudent && !selectedKelas && kelasList.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-ink-500">Total Tunggakan Alumni</p>
              <p className="text-sm font-display font-semibold text-honey-700">{formatRupiah(totalTunggakanSemua)}</p>
            </div>
            <button
              onClick={cetakSemuaAlumni}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-3 py-2 transition"
            >
              <Printer className="w-4 h-4" /> Cetak Semua Alumni
            </button>
          </div>
        )}
      </div>

      <div className="surface-card p-5">
        {selectedStudent ? (
          <>
            <div className="flex justify-end mb-3">
              <button
                onClick={() => window.open(`/print/tagihan-belum-bayar?student_id=${selectedStudent.id}`, '_blank')}
                className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-brand-600 border border-line-200 rounded-lg px-2 py-1"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Surat Tagihan
              </button>
            </div>
            <StudentSppPanel student={selectedStudent} onClose={backToStudentList} onPaid={loadAlumni} showBayarDimuka={false} allowAddTagihan />
          </>
        ) : selectedKelas ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-line-200">
              <div>
                <h3 className="font-display font-semibold text-ink-900">{selectedKelas.nama}</h3>
                <p className="text-xs text-ink-500">
                  {selectedKelas.alumni.length} alumni · {selectedKelas.bertunggakan} bertunggakan · {formatRupiah(selectedKelas.total)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => cetakKelasIni(selectedKelas.nama)}
                  className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-brand-600 border border-line-200 rounded-lg px-3 py-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Kelas Ini
                </button>
                <button onClick={backToClasses} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5">
                  <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar Kelas
                </button>
              </div>
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
                      <p className="text-sm font-medium text-ink-900"><TruncateText text={a.student.user?.name} clickable={false} /></p>
                      <p className="text-xs text-ink-500">
                        NIS {a.student.nis}
                        {a.jumlah_tunggakan > 0 && ` · ${a.jumlah_tunggakan} bulan SPP`}
                        {a.jumlah_tunggakan_lain > 0 && ` · ${a.jumlah_tunggakan_lain} tagihan lain`}
                      </p>
                    </div>
                    {a.total_tunggakan > 0 ? (
                      <span className="text-sm font-display font-semibold text-honey-700 shrink-0">{formatRupiah(a.total_tunggakan)}</span>
                    ) : (
                      <span className="badge-soft badge-brand shrink-0">Lunas</span>
                    )}
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
            <p className="text-sm font-medium text-ink-700 mb-1">Belum ada alumni</p>
            <p className="text-xs text-ink-500">Belum ada siswa yang diluluskan.</p>
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
                    <p className="text-sm font-medium text-ink-900"><TruncateText text={k.nama} clickable={false} /></p>
                    <p className="text-xs text-ink-500">{k.alumni.length} alumni · {k.bertunggakan} bertunggakan</p>
                  </div>
                  {k.total > 0 ? (
                    <span className="text-sm font-display font-semibold text-honey-700 shrink-0">{formatRupiah(k.total)}</span>
                  ) : (
                    <span className="badge-soft badge-brand shrink-0">Lunas</span>
                  )}
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
