import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, IdCard, Lock, Mail, Building2, GraduationCap, Search, LocateFixed } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSchoolProfile } from '../context/SchoolProfileContext';
import api from '../api/axios';
import LocationPickerMap from '../components/LocationPickerMap';

/**
 * Halaman login KHUSUS Alumni & IDUKA (/bursakerjakhusus/masuk) — terpisah
 * dari /login biasa yang tetap dipakai admin/guru/siswa aktif/wali. Alumni
 * masuk pakai NIS (bukan email/HP), IDUKA bisa daftar mandiri (menunggu
 * persetujuan BKK dulu sebelum bisa login, lihat
 * IdukaController::registerPublic()/setujui() di backend).
 */
export default function BursaLoginPage() {
  const [role, setRole] = useState('alumni'); // 'alumni' | 'iduka'
  const [mode, setMode] = useState('masuk'); // 'masuk' | 'daftar'
  const { profile } = useSchoolProfile();

  return (
    <div className="min-h-screen grid sm:grid-cols-2 bg-white">
      {/* Panel kiri */}
      <div className="hidden sm:flex flex-col justify-center bg-gradient-to-br from-brand-700 to-brand-900 text-white px-12 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-honey-400/10 blur-3xl" />
        {profile?.logo_url && (
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-8">
            <img src={profile.logo_url} alt="Logo" className="w-12 h-12 object-contain" />
          </div>
        )}
        <h1 className="font-display text-3xl font-bold mb-3 max-w-sm text-balance">Selamat Datang Kembali!</h1>
        <p className="text-brand-100 max-w-sm leading-relaxed">
          Portal Bursa Kerja Khusus {profile?.nama_sekolah || 'SMK Muhammadiyah Sampit'}. Temukan peluang karier terbaik untuk alumni, atau kelola rekrutmen perusahaan Anda dengan mudah dan terintegrasi.
        </p>
      </div>

      {/* Panel kanan */}
      <div className="flex flex-col justify-center px-6 sm:px-16 py-10">
        <div className="max-w-sm w-full mx-auto">
          <Link to="/bursakerjakhusus" className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600 transition w-fit mb-8">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
          </Link>

          <div className="flex gap-2 mb-6 bg-mist-50 rounded-xl p-1">
            <button
              onClick={() => { setRole('alumni'); setMode('masuk'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2.5 transition ${role === 'alumni' ? 'bg-white shadow-sm text-brand-700' : 'text-ink-500 hover:text-ink-700'}`}
            >
              <GraduationCap className="w-4 h-4" /> Alumni
            </button>
            <button
              onClick={() => { setRole('iduka'); setMode('masuk'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium rounded-lg py-2.5 transition ${role === 'iduka' ? 'bg-white shadow-sm text-brand-700' : 'text-ink-500 hover:text-ink-700'}`}
            >
              <Building2 className="w-4 h-4" /> Perusahaan
            </button>
          </div>

          {role === 'alumni' ? <AlumniPanel mode={mode} setMode={setMode} /> : <IdukaPanel mode={mode} setMode={setMode} />}
        </div>
      </div>
    </div>
  );
}

function dashboardPathForRole(role) {
  return role === 'iduka' ? '/iduka' : '/siswa';
}

function PasswordField({ value, onChange, label = 'Password', placeholder = '••••••••' }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-ink-500 mb-1">{label}</label>
      <div className="relative">
        <Lock className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field-input pl-9 pr-9"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          title={show ? 'Sembunyikan password' : 'Tampilkan password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function AlumniPanel({ mode, setMode }) {
  const [nis, setNis] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginNis } = useAuth();
  const navigate = useNavigate();

  const [namaLengkap, setNamaLengkap] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [nisn, setNisn] = useState('');
  const [cariError, setCariError] = useState('');
  const [cariResult, setCariResult] = useState(null);
  const [cariLoading, setCariLoading] = useState(false);

  const handleMasuk = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginNis(nis, password);
      navigate('/siswa');
    } catch (err) {
      setError(err.response?.data?.message || 'NIS atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  const handleCariNis = async (e) => {
    e.preventDefault();
    setCariError('');
    setCariResult(null);
    setCariLoading(true);
    try {
      const res = await api.post('/alumni/cari-nis', { nama_lengkap: namaLengkap, tanggal_lahir: tanggalLahir, nisn });
      setCariResult(res.data.nis);
    } catch (err) {
      setCariError(err.response?.data?.message || 'Data tidak ditemukan.');
    } finally {
      setCariLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">{mode === 'masuk' ? 'Masuk ke Akun' : 'Cari NIS Anda'}</h2>
      <p className="text-sm text-ink-500 mb-6">
        {mode === 'masuk' ? (
          <>Belum tahu NIS? <button onClick={() => { setCariResult(null); setCariError(''); setMode('daftar'); }} className="text-brand-600 hover:text-brand-700 font-medium">Cari NIS</button></>
        ) : (
          <>Sudah tahu NIS? <button onClick={() => setMode('masuk')} className="text-brand-600 hover:text-brand-700 font-medium">Masuk sekarang</button></>
        )}
      </p>

      {mode === 'masuk' ? (
        <form onSubmit={handleMasuk} className="space-y-3">
          {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">NIS</label>
            <div className="relative">
              <IdCard className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={nis} autoFocus onChange={(e) => setNis(e.target.value)} className="field-input pl-9" placeholder="Masukkan NIS" />
            </div>
          </div>
          <PasswordField value={password} onChange={setPassword} />
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      ) : cariResult ? (
        <div className="space-y-4">
          <div className="text-center bg-brand-50 rounded-xl p-5">
            <p className="text-xs text-ink-500 mb-1">NIS Anda</p>
            <p className="font-display text-2xl font-bold text-brand-700 tracking-wide">{cariResult}</p>
          </div>
          <button
            onClick={() => { setNis(cariResult); setMode('masuk'); }}
            className="btn-primary w-full justify-center"
          >
            Masuk pakai NIS ini
          </button>
        </div>
      ) : (
        <form onSubmit={handleCariNis} className="space-y-3">
          {cariError && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{cariError}</p>}
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Nama Lengkap</label>
            <input type="text" value={namaLengkap} autoFocus onChange={(e) => setNamaLengkap(e.target.value)} className="field-input" placeholder="Sesuai data sekolah" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Tanggal Lahir</label>
            <input type="date" value={tanggalLahir} onChange={(e) => setTanggalLahir(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">NISN</label>
            <input type="text" value={nisn} onChange={(e) => setNisn(e.target.value)} className="field-input" placeholder="Nomor Induk Siswa Nasional" />
          </div>
          <button type="submit" disabled={cariLoading} className="btn-primary w-full justify-center mt-2 gap-2">
            <Search className="w-4 h-4" /> {cariLoading ? 'Mencari...' : 'Cari NIS'}
          </button>
        </form>
      )}
    </div>
  );
}

function IdukaPanel({ mode, setMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const [namaPerusahaan, setNamaPerusahaan] = useState('');
  const [alamat, setAlamat] = useState('');
  const [telepon, setTelepon] = useState('');
  const [daftarEmail, setDaftarEmail] = useState('');
  const [daftarPassword, setDaftarPassword] = useState('');
  const [daftarPasswordConfirm, setDaftarPasswordConfirm] = useState('');
  const [daftarError, setDaftarError] = useState('');
  const [daftarLoading, setDaftarLoading] = useState(false);
  const [daftarSukses, setDaftarSukses] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [lokasiError, setLokasiError] = useState('');

  const handleLokasiSaya = () => {
    setLokasiError('');
    if (!navigator.geolocation) {
      setLokasiError('Perangkat/browser tidak mendukung deteksi lokasi.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLatitude(pos.coords.latitude); setLongitude(pos.coords.longitude); },
      () => setLokasiError('Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan, atau pilih langsung di peta.')
    );
  };

  const handleMasuk = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(dashboardPathForRole(user.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Email atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  const handleDaftar = async (e) => {
    e.preventDefault();
    setDaftarError('');
    if (!latitude || !longitude) {
      setDaftarError('Pilih lokasi perusahaan di peta terlebih dahulu.');
      return;
    }
    setDaftarLoading(true);
    try {
      await api.post('/iduka/daftar', {
        nama_perusahaan: namaPerusahaan,
        alamat, telepon,
        email: daftarEmail,
        password: daftarPassword,
        password_confirmation: daftarPasswordConfirm,
        latitude, longitude,
        radius_meter: 100,
      });
      setDaftarSukses(true);
    } catch (err) {
      const errors = err.response?.data?.errors;
      setDaftarError(errors ? Object.values(errors).flat().join(' ') : (err.response?.data?.message || 'Pendaftaran gagal.'));
    } finally {
      setDaftarLoading(false);
    }
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">{mode === 'masuk' ? 'Masuk sebagai Perusahaan' : 'Daftar sebagai Mitra'}</h2>
      <p className="text-sm text-ink-500 mb-6">
        {mode === 'masuk' ? (
          <>Belum punya akun? <button onClick={() => { setDaftarSukses(false); setDaftarError(''); setMode('daftar'); }} className="text-brand-600 hover:text-brand-700 font-medium">Daftar sekarang</button></>
        ) : (
          <>Sudah punya akun? <button onClick={() => setMode('masuk')} className="text-brand-600 hover:text-brand-700 font-medium">Masuk sekarang</button></>
        )}
      </p>

      {mode === 'masuk' ? (
        <form onSubmit={handleMasuk} className="space-y-3">
          {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="email" value={email} autoFocus onChange={(e) => setEmail(e.target.value)} className="field-input pl-9" placeholder="perusahaan@email.com" />
            </div>
          </div>
          <PasswordField value={password} onChange={setPassword} />
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
            {loading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      ) : daftarSukses ? (
        <div className="text-center bg-brand-50 rounded-xl p-5">
          <p className="text-sm text-brand-700 leading-relaxed">
            Pendaftaran berhasil dikirim. Akun Anda menunggu persetujuan tim BKK — Anda bisa masuk setelah disetujui.
          </p>
        </div>
      ) : (
        <form onSubmit={handleDaftar} className="space-y-3">
          {daftarError && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{daftarError}</p>}
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Nama Perusahaan</label>
            <input type="text" value={namaPerusahaan} autoFocus onChange={(e) => setNamaPerusahaan(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Alamat</label>
            <input type="text" value={alamat} onChange={(e) => setAlamat(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">No. Telepon</label>
            <input type="text" value={telepon} onChange={(e) => setTelepon(e.target.value)} className="field-input" />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Email</label>
            <input type="email" value={daftarEmail} onChange={(e) => setDaftarEmail(e.target.value)} className="field-input" />
          </div>
          <PasswordField value={daftarPassword} onChange={setDaftarPassword} />
          <PasswordField value={daftarPasswordConfirm} onChange={setDaftarPasswordConfirm} label="Konfirmasi Password" />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-ink-500">Lokasi Perusahaan</label>
              <button type="button" onClick={handleLokasiSaya} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                <LocateFixed className="w-3.5 h-3.5" /> Gunakan lokasi saya
              </button>
            </div>
            {lokasiError && <p className="text-xs text-rose-600 mb-1.5">{lokasiError}</p>}
            <LocationPickerMap
              latitude={latitude}
              longitude={longitude}
              onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
            />
            {latitude && longitude && (
              <p className="text-xs text-ink-500 mt-2">{latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
            )}
          </div>

          <button type="submit" disabled={daftarLoading} className="btn-primary w-full justify-center mt-2">
            {daftarLoading ? 'Mengirim...' : 'Daftar Sekarang'}
          </button>
        </form>
      )}
    </div>
  );
}
