import { useEffect, useState } from 'react';
import { Users, GraduationCap, School, Building2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../api/axios';
import CategoryBarChart from '../../../components/CategoryBarChart';
import DailyGroupedBarChart from '../../../components/DailyGroupedBarChart';

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Palet kategorikal tetap (urutan tidak berubah walau data difilter) untuk
// memberi warna pada tipe pelanggaran/prestasi apa pun yang terdaftar admin.
// "Lainnya" (tipe di luar cap backend) selalu abu-abu netral, bukan hue.
const WARNA_KATEGORIKAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const WARNA_LAINNYA = '#6E8094';

function warnaiKategoriTipe(daftar) {
  let idx = 0;
  return (daftar || []).map((c) => {
    if (c.name === 'Lainnya') return { name: c.name, value: c.jumlah, color: WARNA_LAINNYA };
    const color = WARNA_KATEGORIKAL[idx % WARNA_KATEGORIKAL.length];
    idx += 1;
    return { name: c.name, value: c.jumlah, color };
  });
}

function hariIniIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Geser tanggal (string YYYY-MM-DD) sebanyak `delta` hari, dihitung lewat
// komponen tanggal lokal (bukan Date/UTC langsung) supaya tidak meleset
// sehari akibat konversi zona waktu.
function geserTanggal(tanggalIso, delta) {
  const [y, m, d] = tanggalIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function formatTanggalIndo(tanggalIso) {
  const [y, m, d] = tanggalIso.split('-').map(Number);
  return `${d} ${NAMA_BULAN[m - 1]} ${y}`;
}

const STAT_DEFS = [
  { key: 'siswa', label: 'Total Siswa', icon: Users, color: '#0B1B3A' },
  { key: 'guru', label: 'Total Guru', icon: GraduationCap, color: '#15803D' },
  { key: 'kelas', label: 'Total Kelas', icon: School, color: '#F2B705' },
  { key: 'dudi', label: 'Total IDUKA', icon: Building2, color: '#3FB27F' },
];

export default function DashboardHomeTab() {
  const [stats, setStats] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const sekarang = new Date();
  const [tanggalGrafik, setTanggalGrafik] = useState(hariIniIso());
  const [bulanAbsensi, setBulanAbsensi] = useState(sekarang.getMonth() + 1);
  const [tahunAbsensi, setTahunAbsensi] = useState(sekarang.getFullYear());
  const [kelasGrafik, setKelasGrafik] = useState('');
  const [kelasList, setKelasList] = useState([]);
  const [grafik, setGrafik] = useState(null);
  const [loadingGrafik, setLoadingGrafik] = useState(true);

  useEffect(() => {
    api.get('/classes').then((res) => setKelasList(res.data)).catch(() => setKelasList([]));
  }, []);

  useEffect(() => {
    setLoadingGrafik(true);
    api.get('/dashboard/grafik', {
      params: {
        tanggal: tanggalGrafik,
        bulan: bulanAbsensi,
        tahun: tahunAbsensi,
        class_room_id: kelasGrafik || undefined,
      },
    })
      .then((res) => setGrafik(res.data))
      .catch(() => setGrafik(null))
      .finally(() => setLoadingGrafik(false));
  }, [tanggalGrafik, bulanAbsensi, tahunAbsensi, kelasGrafik]);

  function gantiBulanAbsensi(delta) {
    let b = bulanAbsensi + delta;
    let t = tahunAbsensi;
    if (b > 12) { b = 1; t += 1; }
    if (b < 1) { b = 12; t -= 1; }
    setBulanAbsensi(b);
    setTahunAbsensi(t);
  }

  useEffect(() => {
    const sumber = {
      siswa: () => api.get('/students').then((r) => r.data.length),
      guru:  () => api.get('/teachers').then((r) => r.data.length),
      kelas: () => api.get('/classes').then((r) => r.data.length),
      dudi:  () => api.get('/dudi').then((r) => r.data.length),
    };

    const entries = Object.entries(sumber);

    Promise.allSettled(entries.map(([, fn]) => fn())).then((hasil) => {
      const nilai = {};
      const gagal = {};
      hasil.forEach((r, i) => {
        const key = entries[i][0];
        if (r.status === 'fulfilled') {
          nilai[key] = r.value;
        } else {
          gagal[key] = r.reason?.response?.data?.message || r.reason?.message || 'Gagal memuat.';
          console.error(`Dashboard: gagal ambil data "${key}"`, r.reason);
        }
      });
      setStats(nilai);
      setErrors(gagal);
      setLoading(false);
    });
  }, []);

  const adaError = Object.keys(errors).length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-900">Ringkasan</h2>
        <p className="text-sm text-ink-500 mt-1">Gambaran umum data sekolah saat ini.</p>
      </div>

      {adaError && (
        <div className="surface-card p-4 border-l-4 border-l-honey-400 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-honey-500 shrink-0 mt-0.5" />
          <div className="text-sm text-ink-700">
            <p className="font-medium mb-1">Sebagian data gagal dimuat:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {Object.entries(errors).map(([key, msg]) => (
                <li key={key}>
                  <span className="font-medium">{STAT_DEFS.find((s) => s.key === key)?.label || key}</span>: {msg}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_DEFS.map((s) => {
          const Icon = s.icon;
          const gagalAmbil = errors[s.key] !== undefined;
          const value = loading ? '—' : gagalAmbil ? '!' : (stats[s.key] ?? 0);
          return (
            <div key={s.key} className="surface-card p-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${s.color}1A` }}
              >
                <Icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <p className="font-display text-2xl font-bold text-ink-900">{value}</p>
              <p className="text-xs text-ink-500 mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="surface-card p-5 border-l-4 border-l-brand-400">
        <p className="text-sm text-ink-700">
          Selamat datang di panel admin. Gunakan menu di samping untuk mengelola data siswa, guru, kelas, wali murid, laporan absensi/poin, penempatan PKL, dan pengaturan sistem.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display font-semibold text-ink-900">Grafik</h2>
        <div className="flex items-center gap-2">
          <select
            value={kelasGrafik}
            onChange={(e) => setKelasGrafik(e.target.value)}
            className="field-input text-sm text-ink-700 py-1.5"
          >
            <option value="">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 bg-white border border-line-200 rounded-xl px-1 py-1">
            <button onClick={() => setTanggalGrafik((t) => geserTanggal(t, -1))} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-500 hover:bg-mist-50" title="Hari sebelumnya">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={tanggalGrafik}
              onChange={(e) => e.target.value && setTanggalGrafik(e.target.value)}
              className="text-sm font-medium text-ink-900 px-2 text-center bg-transparent border-none focus:outline-none"
            />
            <button onClick={() => setTanggalGrafik((t) => geserTanggal(t, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-500 hover:bg-mist-50" title="Hari berikutnya">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loadingGrafik ? (
        <p className="text-center text-ink-300 py-6">Memuat grafik...</p>
      ) : !grafik ? (
        <p className="text-center text-ink-300 py-6">Gagal memuat data grafik.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CategoryBarChart
              title="Pelanggaran"
              subtitle={`Komposisi jenis pelanggaran, ${formatTanggalIndo(tanggalGrafik)}`}
              showTableToggle
              categories={warnaiKategoriTipe(grafik.pelanggaran)}
            />
            <CategoryBarChart
              title="Prestasi"
              subtitle={`Komposisi jenis prestasi, ${formatTanggalIndo(tanggalGrafik)}`}
              showTableToggle
              categories={warnaiKategoriTipe(grafik.prestasi)}
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <div className="flex items-center gap-1 bg-white border border-line-200 rounded-xl px-1 py-1">
              <button onClick={() => gantiBulanAbsensi(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-500 hover:bg-mist-50" title="Bulan sebelumnya">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-ink-900 px-2 min-w-[8rem] text-center">{NAMA_BULAN[bulanAbsensi - 1]} {tahunAbsensi}</span>
              <button onClick={() => gantiBulanAbsensi(1)} className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-500 hover:bg-mist-50" title="Bulan berikutnya">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <DailyGroupedBarChart
            title="Absensi Bulanan"
            subtitle={`Komposisi kehadiran siswa per tanggal, ${NAMA_BULAN[grafik.bulan - 1]} ${grafik.tahun}`}
            showTableToggle
            labels={grafik.absensi.hadir.map((_, i) => i + 1)}
            series={[
              { name: 'Hadir', color: '#15803D', data: grafik.absensi.hadir },
              { name: 'Izin', color: '#2a78d6', data: grafik.absensi.izin },
              { name: 'Sakit', color: '#D9A52A', data: grafik.absensi.sakit },
              { name: 'Alpa', color: '#B9504F', data: grafik.absensi.alpa },
            ]}
          />
        </div>
      )}
    </div>
  );
}
