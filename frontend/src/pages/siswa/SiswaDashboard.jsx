import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  LogOut, Clock, ChevronDown, UserCog, ChevronLeft, ChevronRight,
  Award, AlertTriangle, Home, ClipboardCheck, NotebookPen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import PklSiswaView from './PklSiswaView';
import EditProfileModal from '../../components/EditProfileModal';
import LeaderboardPrestasi from '../../components/LeaderboardPrestasi';

const PAGE_SIZE = 5;

export default function SiswaDashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [qrImage, setQrImage] = useState('');

  const [poinHistory, setPoinHistory] = useState([]);
  const [poinPage, setPoinPage] = useState(1);
  const [absensiPage, setAbsensiPage] = useState(1);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditProfil, setShowEditProfil] = useState(false);
  const menuRef = useRef(null);

  // Sub-menu dipakai cuma saat sedang PKL: 'beranda' | 'absensi' | 'jurnal'
  const [pklTab, setPklTab] = useState('beranda');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [pklPlacement, setPklPlacement] = useState(undefined); // undefined = belum dicek, null = tidak PKL
  // Sengaja mencakup status "selesai" juga (bukan cuma "aktif") — supaya
  // siswa yang PKL-nya sudah berakhir tetap bisa buka menu Absensi & Jurnal
  // Kegiatan untuk lihat riwayat lamanya, cuma tombol "buat baru"-nya saja
  // yang otomatis ditolak backend karena penempatannya sudah tidak aktif.
  const isPkl = !!(pklPlacement && Object.keys(pklPlacement).length > 0);

  useEffect(() => {
    api.get('/my-pkl-placement').then((res) => setPklPlacement(res.data));
  }, []);

  useEffect(() => {
    // Data "Beranda" (profil, QR, riwayat absensi & poin sekolah) sekarang
    // selalu diambil, walaupun sedang PKL — supaya menu "Beranda" tetap
    // bisa diakses siswa PKL lewat navbar bawah.
    if (pklPlacement === undefined) return;

    api.get('/my-profile').then((res) => setProfile(res.data));
    api.get('/my-attendances').then((res) => setHistory(res.data));

    Promise.all([api.get('/my-violations'), api.get('/my-achievements')]).then(([v, a]) => {
      const gabungan = [
        ...v.data.map((item) => ({ ...item, jenis: 'pelanggaran', nama: item.violation_type?.name })),
        ...a.data.map((item) => ({ ...item, jenis: 'prestasi', nama: item.achievement_type?.name })),
      ].sort((x, y) => y.date.localeCompare(x.date));
      setPoinHistory(gabungan);
    });
  }, [pklPlacement]); // eslint-disable-line

  useEffect(() => {
    if (!profile?.barcode_code) return;

    QRCode.toDataURL(profile.barcode_code, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#22344A',
        light: '#FFFFFF',
      },
    }).then(setQrImage);
  }, [profile]);

  const initial = user.name?.charAt(0)?.toUpperCase() || '?';

  const absensiTotalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const absensiPaginated = history.slice((absensiPage - 1) * PAGE_SIZE, absensiPage * PAGE_SIZE);

  const poinTotalPages = Math.max(1, Math.ceil(poinHistory.length / PAGE_SIZE));
  const poinPaginated = poinHistory.slice((poinPage - 1) * PAGE_SIZE, poinPage * PAGE_SIZE);

  // Belum tahu status PKL-nya (masih loading) — tampilkan header saja dulu supaya tidak "kedip"
  // dari tampilan QR ke tampilan PKL begitu datanya datang.
  if (pklPlacement === undefined) {
    return (
      <div className="min-h-screen bg-mist-50 p-6">
        <div className="flex justify-between items-end max-w-md mx-auto mb-6">
          <div>
            <p className="text-xs text-ink-500">Siswa</p>
            <h1 className="font-display text-lg font-semibold text-ink-900">{user.name}</h1>
          </div>
          <button onClick={logout} className="flex items-center gap-1 text-sm font-semibold text-ink-700 hover:text-brand-600 transition">
            Profil <ChevronDown className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-ink-300 text-sm mt-10">Memuat...</p>
      </div>
    );
  }

  const berandaContent = (
    <>
      <div className="max-w-md mx-auto mb-6 rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(34,52,74,0.08)] border border-line-200">
        <div className="bg-brand-600 px-5 pt-5 pb-7 text-white">
          <p className="text-[10px] uppercase tracking-widest text-brand-100 mb-3">
            Kartu Absensi Siswa
          </p>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center font-display font-semibold text-lg">
              {initial}
            </div>

            <div>
              <p className="font-display font-semibold leading-tight">{user.name}</p>

              <p className="text-xs text-brand-100">
                NIS {profile?.nis || '—'} · {profile?.class_room?.name || 'Belum ada kelas'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative bg-honey-50 h-0">
          <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-mist-50" />
          <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-mist-50" />
          <div className="absolute top-0 left-3 right-3 border-t-2 border-dashed border-honey-300" />
        </div>

        <div className="bg-honey-50 px-5 py-6 flex flex-col items-center">

          {qrImage && (
            <div className="bg-white p-3 rounded-xl border border-honey-200">
              <img
                src={qrImage}
                alt="QR Code"
                width={160}
                height={160}
              />
            </div>
          )}

          <p className="font-mono text-xs text-ink-700 mt-3 tracking-wide">
            {profile?.barcode_code}
          </p>

          <p className="text-[11px] text-ink-500 mt-1">
            Tunjukkan QR ini ke guru saat absen
          </p>

        </div>
      </div>

      {/* Riwayat Poin — total di atas, daftar riwayat gabungan prestasi & pelanggaran di bawah */}
      <div className="surface-card max-w-md mx-auto p-4 mb-6">
        <h2 className="font-display font-semibold text-sm text-ink-900 mb-3">
          Riwayat Poin
        </h2>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg bg-brand-50 border border-brand-200 px-2 py-1.5 text-center">
            <p className="font-display text-sm font-bold text-brand-700">{profile?.total_prestasi ?? 0}</p>
            <p className="text-[10px] text-brand-700">Poin Prestasi</p>
          </div>
          <div className="rounded-lg bg-honey-50 border border-honey-200 px-2 py-1.5 text-center">
            <p className="font-display text-sm font-bold text-honey-700">{profile?.total_poin ?? 0}</p>
            <p className="text-[10px] text-honey-700">Poin Pelanggaran</p>
          </div>
        </div>

        <ul className="divide-y divide-line-200">
          {poinPaginated.map((item) => (
            <li key={`${item.jenis}-${item.id}`} className="py-2.5 flex items-center justify-between text-sm gap-2">
              <div className="min-w-0">
                <p className="text-ink-900 truncate">{item.nama || '-'}</p>
                <p className="text-xs text-ink-500">{item.date}</p>
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium shrink-0 ${
                item.jenis === 'prestasi' ? 'text-brand-700' : 'text-honey-700'
              }`}>
                {item.jenis === 'prestasi' ? <Award className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {item.jenis === 'prestasi' ? '+' : '-'}{item.poin}
              </span>
            </li>
          ))}

          {poinHistory.length === 0 && (
            <li className="py-4 text-center text-sm text-ink-300">
              Belum ada riwayat poin.
            </li>
          )}
        </ul>

        {poinHistory.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-line-200">
            <button
              onClick={() => setPoinPage((p) => Math.max(1, p - 1))}
              disabled={poinPage === 1}
              className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
            </button>
            <span className="text-xs text-ink-400">Halaman {poinPage} / {poinTotalPages}</span>
            <button
              onClick={() => setPoinPage((p) => Math.min(poinTotalPages, p + 1))}
              disabled={poinPage === poinTotalPages}
              className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30"
            >
              Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="surface-card max-w-md mx-auto p-4">
        <h2 className="font-display font-semibold text-sm text-ink-900 mb-3">
          Riwayat Absensi
        </h2>

        <ul className="divide-y divide-line-200">
          {absensiPaginated.map((h) => (
            <li key={h.id} className="py-2.5 flex items-center justify-between text-sm">
              <span className="text-ink-700">{h.date}</span>

              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-ink-500">
                  <Clock className="w-3.5 h-3.5" /> {h.time_in}
                </span>

                <span
                  className={`badge-soft ${
                    h.status === 'alpa'
                      ? 'badge-rose'
                      : h.status === 'izin' || h.status === 'sakit'
                      ? 'badge-honey'
                      : 'badge-brand'
                  }`}
                >
                  {h.status}
                </span>
              </span>
            </li>
          ))}

          {history.length === 0 && (
            <li className="py-4 text-center text-sm text-ink-300">
              Belum ada riwayat absensi.
            </li>
          )}
        </ul>

        {history.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-line-200">
            <button
              onClick={() => setAbsensiPage((p) => Math.max(1, p - 1))}
              disabled={absensiPage === 1}
              className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
            </button>
            <span className="text-xs text-ink-400">Halaman {absensiPage} / {absensiTotalPages}</span>
            <button
              onClick={() => setAbsensiPage((p) => Math.min(absensiTotalPages, p + 1))}
              disabled={absensiPage === absensiTotalPages}
              className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30"
            >
              Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto mt-6">
        <LeaderboardPrestasi />
      </div>
    </>
  );

  const PKL_TABS = [
    { key: 'beranda', label: 'Beranda', icon: Home },
    { key: 'absensi', label: 'Absensi', icon: ClipboardCheck },
    { key: 'jurnal', label: 'Jurnal Kegiatan', icon: NotebookPen },
  ];

  return (
    <div className={`min-h-screen bg-mist-50 p-6 ${isPkl ? 'pb-24' : ''}`}>
      <div className="flex justify-between items-end max-w-md mx-auto mb-6">
        <div>
          <p className="text-xs text-ink-500">Siswa</p>
          <h1 className="font-display text-lg font-semibold text-ink-900">{user.name}</h1>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1 text-sm font-semibold text-ink-700 hover:text-brand-600 transition"
          >
            Profil
            <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-44 surface-card overflow-hidden">
              <button
                onClick={() => { setShowEditProfil(true); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-ink-700 hover:bg-mist-50 transition"
              >
                <UserCog className="w-4 h-4" /> Edit Profil
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-ink-700 hover:bg-mist-50 transition"
              >
                <LogOut className="w-4 h-4" /> Keluar
              </button>
            </div>
          )}
        </div>
      </div>

      {isPkl ? (
        pklTab === 'beranda' ? berandaContent : <PklSiswaView placement={pklPlacement} tab={pklTab} />
      ) : (
        berandaContent
      )}

      {isPkl && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line-200 z-40">
          <div className="max-w-md mx-auto flex">
            {PKL_TABS.map((t) => {
              const Icon = t.icon;
              const isActive = pklTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setPklTab(t.key)}
                  className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition ${
                    isActive ? 'text-brand-600' : 'text-ink-400 hover:text-ink-600'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                  <span className="text-[10px] font-medium tracking-wide">{t.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 w-8 h-0.5 bg-brand-600 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showEditProfil && (
        <EditProfileModal onClose={() => setShowEditProfil(false)} />
      )}
    </div>
  );
}
