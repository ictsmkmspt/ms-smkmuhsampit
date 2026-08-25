import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { fmtDMY } from '../../../utils/date';

const STATUS_LABEL = {
  bekerja: 'Bekerja',
  melanjutkan_kuliah: 'Melanjutkan Kuliah',
  wirausaha: 'Wirausaha',
  mencari_kerja: 'Mencari Kerja',
};

const STATUS_BADGE = {
  bekerja: 'badge-brand',
  melanjutkan_kuliah: 'badge-soft',
  wirausaha: 'badge-honey',
  mencari_kerja: 'badge-rose',
};

/**
 * Rekap Tracer Study — SEMUA alumni ditampilkan (bukan cuma yang sudah
 * isi), supaya kelihatan siapa yang belum. Isian sendiri dilakukan alumni
 * lewat menu Loker di dashboard Siswa (LokerTab.jsx).
 */
const STATUS_URUTAN = ['bekerja', 'melanjutkan_kuliah', 'wirausaha', 'mencari_kerja'];

export default function TracerStudyBkkTab() {
  const [list, setList] = useState([]);
  // Selalu SEMUA jurusan (cuma ikut filter angkatan, bukan jurusanId) —
  // dipakai buat tabel breakdown per jurusan supaya bisa dibandingkan
  // sisi-sisi, bukan cuma jurusan yang sedang difilter di tabel utama.
  const [fullList, setFullList] = useState([]);
  const [jurusanList, setJurusanList] = useState([]);
  const [jurusanId, setJurusanId] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = {};
    if (jurusanId) params.jurusan_id = jurusanId;
    if (angkatan) params.angkatan = angkatan;
    api.get('/bkk/tracer', { params }).then((res) => { setList(res.data); setLoading(false); });
  };

  useEffect(() => { load(); }, [jurusanId, angkatan]); // eslint-disable-line
  useEffect(() => { api.get('/jurusan').then((res) => setJurusanList(res.data)); }, []);
  useEffect(() => {
    const params = {};
    if (angkatan) params.angkatan = angkatan;
    api.get('/bkk/tracer', { params }).then((res) => setFullList(res.data));
  }, [angkatan]);

  const sudahIsi = list.filter((s) => s.tracer_study).length;
  const persenIsi = list.length ? Math.round((sudahIsi / list.length) * 100) : 0;
  const bekerja = list.filter((s) => s.tracer_study?.status_saat_ini === 'bekerja').length;
  const persenTerserap = list.length ? Math.round((bekerja / list.length) * 100) : 0;

  // Sebaran status (bekerja/kuliah/wirausaha/masih mencari) atas tampilan
  // yang sedang difilter — pelengkap "% Terserap Kerja" di atas yang cuma
  // menyorot 1 status saja.
  const statusBreakdown = STATUS_URUTAN.map((key) => ({
    key,
    label: STATUS_LABEL[key],
    jumlah: list.filter((s) => s.tracer_study?.status_saat_ini === key).length,
  }));

  // Rekap per jurusan — dari fullList (tidak ikut filter jurusanId) supaya
  // semua jurusan bisa dibandingkan sekaligus, biar BKK cepat lihat
  // jurusan mana yang keterserapan kerjanya paling rendah.
  const perJurusan = (() => {
    const map = new Map();
    for (const s of fullList) {
      const nama = s.jurusan?.nama || 'Tanpa Jurusan';
      if (!map.has(nama)) map.set(nama, { nama, total: 0, sudahIsi: 0, bekerja: 0 });
      const entry = map.get(nama);
      entry.total += 1;
      if (s.tracer_study) entry.sudahIsi += 1;
      if (s.tracer_study?.status_saat_ini === 'bekerja') entry.bekerja += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  })();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="surface-card p-4 text-center">
          <p className="font-display text-2xl font-bold text-brand-600">{persenIsi}%</p>
          <p className="text-xs text-ink-500 mt-0.5">Sudah Isi Tracer ({sudahIsi}/{list.length})</p>
        </div>
        <div className="surface-card p-4 text-center">
          <p className="font-display text-2xl font-bold text-brand-600">{persenTerserap}%</p>
          <p className="text-xs text-ink-500 mt-0.5">Terserap Kerja</p>
        </div>
      </div>

      {list.length > 0 && (
        <div className="surface-card p-4">
          <p className="text-xs font-medium text-ink-500 mb-2">Sebaran Status</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statusBreakdown.map((s) => (
              <div key={s.key} className="text-center">
                <p className="font-display text-lg font-semibold text-ink-900">{s.jumlah}</p>
                <p className="text-xs text-ink-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {perJurusan.length > 1 && (
        <div className="surface-card p-4">
          <p className="text-xs font-medium text-ink-500 mb-2">Rekap per Jurusan{angkatan ? ` — Angkatan ${angkatan}` : ''}</p>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-1.5 font-medium whitespace-nowrap px-2">Jurusan</th>
                  <th className="font-medium whitespace-nowrap px-2">Alumni</th>
                  <th className="font-medium whitespace-nowrap px-2">Sudah Isi</th>
                  <th className="font-medium whitespace-nowrap px-2">Bekerja</th>
                </tr>
              </thead>
              <tbody>
                {perJurusan.map((j) => (
                  <tr key={j.nama} className="border-t border-line-200">
                    <td className="py-1.5 text-ink-900 whitespace-nowrap px-2">{j.nama}</td>
                    <td className="text-ink-700 whitespace-nowrap px-2">{j.total}</td>
                    <td className="text-ink-700 whitespace-nowrap px-2">{j.sudahIsi}/{j.total} ({j.total ? Math.round((j.sudahIsi / j.total) * 100) : 0}%)</td>
                    <td className="text-ink-700 whitespace-nowrap px-2">{j.bekerja}/{j.total} ({j.total ? Math.round((j.bekerja / j.total) * 100) : 0}%)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select value={jurusanId} onChange={(e) => setJurusanId(e.target.value)} className="field-input text-sm w-auto">
          <option value="">Semua Jurusan</option>
          {jurusanList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
        </select>
        <input type="number" placeholder="Angkatan (tahun lulus)" value={angkatan} onChange={(e) => setAngkatan(e.target.value)} className="field-input text-sm w-auto" />
      </div>

      {loading ? (
        <p className="text-center text-ink-300 text-sm py-10">Memuat...</p>
      ) : list.length === 0 ? (
        <div className="surface-card p-8 text-center text-ink-300 text-sm">Belum ada data alumni.</div>
      ) : (
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium whitespace-nowrap px-2">Nama</th>
                <th className="font-medium whitespace-nowrap px-2">Jurusan</th>
                <th className="font-medium whitespace-nowrap px-2">Lulus</th>
                <th className="font-medium whitespace-nowrap px-2">Status</th>
                <th className="font-medium whitespace-nowrap px-2">Perusahaan/Kampus</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-line-200">
                  <td className="py-2 text-ink-900 whitespace-nowrap px-2">{s.user?.name || '-'}</td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{s.jurusan?.nama || '-'}</td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{fmtDMY(s.tanggal_lulus)}</td>
                  <td className="whitespace-nowrap px-2">
                    {s.tracer_study ? (
                      <span className={`badge-soft ${STATUS_BADGE[s.tracer_study.status_saat_ini]}`}>
                        {STATUS_LABEL[s.tracer_study.status_saat_ini]}
                      </span>
                    ) : (
                      <span className="badge-soft badge-rose">Belum Isi</span>
                    )}
                  </td>
                  <td className="text-ink-700 whitespace-nowrap px-2">{s.tracer_study?.nama_perusahaan || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
