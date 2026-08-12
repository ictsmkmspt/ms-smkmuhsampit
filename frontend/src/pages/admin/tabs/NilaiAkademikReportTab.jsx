import { useEffect, useMemo, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';
import DailyGroupedBarChart from '../../../components/DailyGroupedBarChart';
import CategoryBarChart from '../../../components/CategoryBarChart';
import { fmtDMY } from '../../../utils/date';
import { useTahunAjaran, useTahunAjaranParam } from '../../../context/TahunAjaranContext';

const RENTANG_NILAI = [
  { name: '0-59', min: 0, max: 59, color: '#B9504F' },
  { name: '60-69', min: 60, max: 69, color: '#D9A52A' },
  { name: '70-79', min: 70, max: 79, color: '#F2B705' },
  { name: '80-89', min: 80, max: 89, color: '#3FB27F' },
  { name: '90-100', min: 90, max: 100, color: '#15803D' },
];

/**
 * Rekap Nilai Akademik — menu Laporan khusus Waka Kurikulum, baca-saja.
 * 4 tingkat: daftar Kelas → detail Kelas menampilkan rekap tiap Mapel
 * (rerata/tertinggi/terendah) → tombol "Detail Kegiatan" membuka daftar
 * kegiatan (nama_kegiatan + tanggal) yang sudah diinput guru untuk mapel
 * itu → klik 1 kegiatan menampilkan nilai tiap siswa di kegiatan tersebut.
 *
 * Semua nilai 1 kelas diambil sekali (tanpa filter subject_id) saat kelas
 * dipilih, lalu tiap tingkat berikutnya cuma menyaring data itu di memori
 * — tidak perlu request baru tiap pindah mapel/kegiatan.
 */
export default function NilaiAkademikReportTab() {
  const tahunParam = useTahunAjaranParam();
  const { isAktif: tahunAktif, selectedId: tahunAjaranId, list: tahunAjaranList } = useTahunAjaran();
  const tahunAjaranTerpilih = tahunAjaranList.find((t) => String(t.id) === String(tahunAjaranId));

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Nilai seluruh sekolah (semua kelas, tanpa filter) — cuma dipakai buat 2
  // grafik ringkasan di atas daftar kelas, terpisah dari classScores yang
  // dipakai tingkat 2-4 (nilai 1 kelas saja). Filter Kelas/Mapel di bawah
  // cuma menyaring data ini di memori, tidak perlu request baru.
  const [allScores, setAllScores] = useState([]);
  const [loadingAllScores, setLoadingAllScores] = useState(true);
  const [filterKelasId, setFilterKelasId] = useState('');
  const [filterMapelId, setFilterMapelId] = useState('');

  // Tugas Mengajar tahun ajaran aktif — dibandingkan dengan allScores buat
  // indikator kelengkapan pengisian nilai (siapa yang belum mengisi sama
  // sekali), bukan buat grafik performa.
  const [teachingAssignments, setTeachingAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  const [selectedKelas, setSelectedKelas] = useState(null);
  const [classScores, setClassScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(false);

  const [selectedMapel, setSelectedMapel] = useState(null);
  const [selectedKegiatan, setSelectedKegiatan] = useState(null);

  // Menandai request kelas paling baru, supaya kalau user klik Detail 2
  // kelas berturut-turut sebelum request pertama selesai, respons yang
  // datang belakangan (bukan yang diklik terakhir) tidak menimpa data yang
  // sedang ditampilkan.
  const requestIdRef = useRef(0);

  // Kelas cuma diambil sekali — daftar kelas struktural, tidak terikat
  // tahun ajaran mana pun (kelas yang sama dipakai lintas tahun ajaran).
  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data)).finally(() => setLoadingClasses(false));
  }, []);

  // Nilai + Tugas Mengajar ikut tahun ajaran yang dipilih di sidebar —
  // diambil ulang tiap kali tahunAjaranId berubah.
  useEffect(() => {
    setLoadingAllScores(true);
    api.get('/academic-scores/laporan', { params: tahunParam }).then((res) => setAllScores(res.data)).finally(() => setLoadingAllScores(false));
    setLoadingAssignments(true);
    api.get('/teaching-assignments', { params: tahunParam }).then((res) => setTeachingAssignments(res.data)).finally(() => setLoadingAssignments(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunAjaranId]);

  // Tugas Mengajar dianggap "sudah mengisi" kalau guru itu SENDIRI pernah
  // mencatat minimal 1 nilai untuk mapel+kelas itu (dicek dari recorded_by,
  // bukan cuma "ada nilai buat mapel+kelas ini") — supaya kasus 2 guru
  // berbagi mapel+kelas yang sama (team teaching) tetap dinilai per guru.
  const statusPengisian = useMemo(() => {
    const daftar = teachingAssignments.map((a) => ({
      ...a,
      sudah: allScores.some((s) =>
        s.subject?.id === a.subject_id &&
        s.student?.class_room?.id === a.class_room_id &&
        s.recorded_by?.id === a.teacher?.user?.id
      ),
    }));
    const belum = daftar.filter((a) => !a.sudah).sort((a, b) => (a.class_room?.name || '').localeCompare(b.class_room?.name || ''));
    return { total: daftar.length, sudah: daftar.length - belum.length, belum };
  }, [teachingAssignments, allScores]);

  // Mapel baru boleh dipilih setelah Kelas dipilih, dan opsinya cuma mapel
  // yang sudah ada nilainya di kelas itu — bukan semua mapel di sekolah.
  const mapelOptionsForKelas = useMemo(() => {
    if (!filterKelasId) return [];
    const map = new Map();
    allScores
      .filter((s) => s.student?.class_room?.id === Number(filterKelasId) && s.subject)
      .forEach((s) => map.set(s.subject.id, s.subject));
    return [...map.values()].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [allScores, filterKelasId]);

  const gantiFilterKelas = (kelasId) => {
    setFilterKelasId(kelasId);
    setFilterMapelId('');
  };

  const filteredAllScores = useMemo(() => {
    return allScores
      .filter((s) => !filterKelasId || s.student?.class_room?.id === Number(filterKelasId))
      .filter((s) => !filterMapelId || s.subject?.id === Number(filterMapelId));
  }, [allScores, filterKelasId, filterMapelId]);

  const perKelasStats = useMemo(() => {
    const map = new Map();
    filteredAllScores.forEach((s) => {
      const kelas = s.student?.class_room;
      if (!kelas) return;
      if (!map.has(kelas.id)) map.set(kelas.id, { name: kelas.name, nilai: [] });
      map.get(kelas.id).nilai.push(s.skor);
    });
    return [...map.values()]
      .map(({ name, nilai }) => ({
        name,
        rerata: +(nilai.reduce((a, b) => a + b, 0) / nilai.length).toFixed(1),
        tertinggi: Math.max(...nilai),
        terendah: Math.min(...nilai),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredAllScores]);

  const distribusiSiswa = useMemo(() => {
    const perSiswa = new Map();
    allScores.forEach((s) => {
      if (!s.student) return;
      if (!perSiswa.has(s.student.id)) perSiswa.set(s.student.id, []);
      perSiswa.get(s.student.id).push(s.skor);
    });
    const jumlah = RENTANG_NILAI.map(() => 0);
    perSiswa.forEach((nilai) => {
      const rerata = nilai.reduce((a, b) => a + b, 0) / nilai.length;
      const idx = RENTANG_NILAI.findIndex((r) => rerata >= r.min && rerata <= r.max);
      jumlah[idx === -1 ? RENTANG_NILAI.length - 1 : idx]++;
    });
    return RENTANG_NILAI.map((r, i) => ({ name: r.name, value: jumlah[i], color: r.color }));
  }, [allScores]);

  const bukaKelas = (c) => {
    setSelectedKelas(c);
    setSelectedMapel(null);
    setSelectedKegiatan(null);
  };

  // Nilai 1 kelas ini diambil ulang tiap kali kelasnya berganti ATAU tahun
  // ajaran yang dipilih di sidebar berubah — supaya kalau user ganti tahun
  // ajaran sambil sedang lihat detail 1 kelas, datanya ikut update tanpa
  // harus balik ke daftar kelas dulu.
  useEffect(() => {
    if (!selectedKelas) { setClassScores([]); return; }
    setLoadingScores(true);
    const requestId = ++requestIdRef.current;
    api.get('/academic-scores/laporan', { params: { class_room_id: selectedKelas.id, ...tahunParam } })
      .then((res) => {
        if (requestId === requestIdRef.current) setClassScores(res.data);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoadingScores(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKelas, tahunAjaranId]);

  const mapelStats = useMemo(() => {
    const map = new Map();
    classScores.forEach((s) => {
      if (!s.subject) return;
      if (!map.has(s.subject.id)) map.set(s.subject.id, { subject: s.subject, nilai: [] });
      map.get(s.subject.id).nilai.push(s.skor);
    });
    return [...map.values()]
      .map(({ subject, nilai }) => ({
        subject,
        rerata: (nilai.reduce((a, b) => a + b, 0) / nilai.length).toFixed(1),
        tertinggi: Math.max(...nilai),
        terendah: Math.min(...nilai),
        jumlah: nilai.length,
      }))
      .sort((a, b) => a.subject.nama.localeCompare(b.subject.nama));
  }, [classScores]);

  const kegiatanMapel = useMemo(() => {
    if (!selectedMapel) return [];
    const map = new Map();
    classScores.filter((s) => s.subject?.id === selectedMapel.id).forEach((s) => {
      const key = `${s.tanggal}||${s.nama_kegiatan}`;
      if (!map.has(key)) map.set(key, { tanggal: s.tanggal, nama_kegiatan: s.nama_kegiatan, nilai: [] });
      map.get(key).nilai.push(s.skor);
    });
    return [...map.values()]
      .map((k) => ({ ...k, rerata: (k.nilai.reduce((a, b) => a + b, 0) / k.nilai.length).toFixed(1), jumlah: k.nilai.length }))
      .sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : 0));
  }, [classScores, selectedMapel]);

  const siswaKegiatan = useMemo(() => {
    if (!selectedMapel || !selectedKegiatan) return [];
    return classScores
      .filter((s) => s.subject?.id === selectedMapel.id && s.tanggal === selectedKegiatan.tanggal && s.nama_kegiatan === selectedKegiatan.nama_kegiatan)
      .slice()
      .sort((a, b) => (a.student?.user?.name || '').localeCompare(b.student?.user?.name || ''));
  }, [classScores, selectedMapel, selectedKegiatan]);

  // Tingkat 4: siswa dalam 1 kegiatan
  if (selectedMapel && selectedKegiatan) {
    return (
      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-line-200">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-ink-900 truncate">{selectedKegiatan.nama_kegiatan}</h3>
            <p className="text-xs text-ink-500">{selectedKelas.name} &middot; {selectedMapel.nama} &middot; {fmtDMY(selectedKegiatan.tanggal)}</p>
          </div>
          <button
            onClick={() => setSelectedKegiatan(null)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5"
          >
            <Undo2 className="w-3.5 h-3.5" /> Kembali ke Daftar Kegiatan
          </button>
        </div>
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Siswa</th>
                <th className="font-medium text-right whitespace-nowrap px-2">Skor</th>
              </tr>
            </thead>
            <tbody>
              {siswaKegiatan.map((s) => (
                <tr key={s.id} className="border-t border-line-200">
                  <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={s.student?.user?.name} /></td>
                  <td className="text-right font-semibold text-ink-900 whitespace-nowrap px-2">{s.skor}</td>
                </tr>
              ))}
              {siswaKegiatan.length === 0 && (
                <tr><td colSpan="2" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Tidak ada nilai.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Tingkat 3: daftar kegiatan dalam 1 mapel
  if (selectedMapel) {
    return (
      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-line-200">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-ink-900 truncate">{selectedMapel.nama}</h3>
            <p className="text-xs text-ink-500">{selectedKelas.name} &middot; Daftar Kegiatan</p>
          </div>
          <button
            onClick={() => setSelectedMapel(null)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5"
          >
            <Undo2 className="w-3.5 h-3.5" /> Kembali ke Daftar Mapel
          </button>
        </div>
        {kegiatanMapel.length === 0 ? (
          <p className="text-sm text-ink-300 text-center py-8">Belum ada kegiatan nilai untuk mapel ini.</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Kegiatan</th>
                  <th className="font-medium whitespace-nowrap px-2">Tanggal</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Jumlah Siswa</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Rerata</th>
                  <th className="whitespace-nowrap px-2"></th>
                </tr>
              </thead>
              <tbody>
                {kegiatanMapel.map((k) => (
                  <tr key={`${k.tanggal}||${k.nama_kegiatan}`} className="border-t border-line-200">
                    <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={k.nama_kegiatan} maxWidth="14rem" /></td>
                    <td className="text-ink-500 text-xs whitespace-nowrap px-2">{fmtDMY(k.tanggal)}</td>
                    <td className="text-right text-ink-700 whitespace-nowrap px-2">{k.jumlah}</td>
                    <td className="text-right font-semibold text-ink-900 whitespace-nowrap px-2">{k.rerata}</td>
                    <td className="text-right whitespace-nowrap px-2">
                      <button onClick={() => setSelectedKegiatan(k)} className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 transition">
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Tingkat 2: rekap mapel dalam 1 kelas
  if (selectedKelas) {
    return (
      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-line-200">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-ink-900 truncate">{selectedKelas.name}</h3>
            <p className="text-xs text-ink-500">
              Rekap Nilai per Mata Pelajaran &middot; {tahunAktif ? 'tahun ajaran aktif' : `tahun ajaran ${tahunAjaranTerpilih?.nama || ''}`}
            </p>
          </div>
          <button
            onClick={() => setSelectedKelas(null)}
            className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5"
          >
            <Undo2 className="w-3.5 h-3.5" /> Kembali ke Daftar Kelas
          </button>
        </div>
        {loadingScores ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : mapelStats.length === 0 ? (
          <p className="text-sm text-ink-300 text-center py-8">Belum ada nilai tercatat untuk kelas ini.</p>
        ) : (
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 font-medium whitespace-nowrap px-2">Mata Pelajaran</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Rerata</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Tertinggi</th>
                  <th className="font-medium text-right whitespace-nowrap px-2">Terendah</th>
                  <th className="whitespace-nowrap px-2"></th>
                </tr>
              </thead>
              <tbody>
                {mapelStats.map((m) => (
                  <tr key={m.subject.id} className="border-t border-line-200">
                    <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={m.subject.nama} /></td>
                    <td className="text-right font-semibold text-ink-900 whitespace-nowrap px-2">{m.rerata}</td>
                    <td className="text-right text-emerald-600 whitespace-nowrap px-2">{m.tertinggi}</td>
                    <td className="text-right text-rose-600 whitespace-nowrap px-2">{m.terendah}</td>
                    <td className="text-right whitespace-nowrap px-2">
                      <button onClick={() => setSelectedMapel(m.subject)} className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 transition">
                        Detail Kegiatan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Tingkat 1: daftar kelas
  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-400">
        {tahunAktif
          ? 'Menampilkan nilai tahun ajaran aktif.'
          : `Menampilkan nilai tahun ajaran ${tahunAjaranTerpilih?.nama || ''}.`}
      </p>

      {!loadingAllScores && allScores.length > 0 && (
        <>
          <DailyGroupedBarChart
            title="Nilai Akademik per Kelas"
            subtitle="Rerata, nilai tertinggi, dan nilai terendah tiap kelas"
            filters={
              <>
                <div className="flex-1 min-w-[9rem]">
                  <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
                  <select value={filterKelasId} onChange={(e) => gantiFilterKelas(e.target.value)} className="field-input text-ink-700 text-sm">
                    <option value="">Semua Kelas</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[9rem]">
                  <label className="block text-xs font-medium text-ink-500 mb-1">Mata Pelajaran</label>
                  <select
                    value={filterMapelId}
                    onChange={(e) => setFilterMapelId(e.target.value)}
                    disabled={!filterKelasId || mapelOptionsForKelas.length === 0}
                    className="field-input text-ink-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Semua Mapel</option>
                    {mapelOptionsForKelas.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                  </select>
                </div>
              </>
            }
            labels={perKelasStats.map((k) => k.name)}
            series={[
              { name: 'Rerata', color: '#2a78d6', data: perKelasStats.map((k) => k.rerata) },
              { name: 'Tertinggi', color: '#15803D', data: perKelasStats.map((k) => k.tertinggi) },
              { name: 'Terendah', color: '#B9504F', data: perKelasStats.map((k) => k.terendah) },
            ]}
            showTableToggle
            showTotal={false}
            labelPrefix=""
            labelHeader="Kelas"
            emptyMessage="Tidak ada nilai untuk filter ini."
          />

          <CategoryBarChart
            title="Distribusi Nilai Seluruh Siswa"
            subtitle="Jumlah siswa berdasarkan rerata nilainya"
            categories={distribusiSiswa}
            showTableToggle
          />
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Rekap Nilai Akademik</h2>
          <p className="text-xs text-ink-500 mb-4">Pilih kelas untuk lihat rekap nilainya per mata pelajaran.</p>
          {loadingClasses ? (
            <p className="text-center text-ink-300 py-6">Memuat...</p>
          ) : classes.length === 0 ? (
            <p className="text-sm text-ink-300 text-center py-8">Belum ada kelas.</p>
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-line-200">
                    <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Kelas</th>
                    <th className="whitespace-nowrap px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((c) => (
                    <tr key={c.id} className="border-t border-line-200">
                      <td className="py-2.5 text-ink-900 whitespace-nowrap px-2">{c.name}</td>
                      <td className="text-right whitespace-nowrap px-2">
                        <button onClick={() => bukaKelas(c)} className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 transition">
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="surface-card p-5">
          <h3 className="font-display font-semibold text-ink-900 mb-1">Belum Mengisi Nilai</h3>
          <p className="text-xs text-ink-500 mb-4">Guru dengan tugas mengajar yang belum ada catatan nilainya sama sekali.</p>
          {loadingAssignments ? (
            <p className="text-center text-ink-300 py-6">Memuat...</p>
          ) : statusPengisian.belum.length === 0 ? (
            <p className="text-sm text-ink-300 text-center py-8">Semua tugas mengajar sudah mengisi nilai.</p>
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-line-200">
                    <th className="pb-2 font-medium whitespace-nowrap px-2">Guru</th>
                    <th className="font-medium whitespace-nowrap px-2">Kelas</th>
                    <th className="font-medium whitespace-nowrap px-2">Mata Pelajaran</th>
                  </tr>
                </thead>
                <tbody>
                  {statusPengisian.belum.map((a) => (
                    <tr key={a.id} className="border-t border-line-200">
                      <td className="py-2.5 text-ink-900 whitespace-nowrap px-2"><TruncateText text={a.teacher?.user?.name} /></td>
                      <td className="text-ink-700 whitespace-nowrap px-2">{a.class_room?.name || '-'}</td>
                      <td className="text-ink-700 whitespace-nowrap px-2"><TruncateText text={a.subject?.nama} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
