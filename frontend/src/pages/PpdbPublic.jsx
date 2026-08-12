import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Search, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';
import { useSchoolProfile } from '../context/SchoolProfileContext';
import DateInput from '../components/DateInput';

const STATUS_LABEL = { mendaftar: 'Mendaftar', verifikasi: 'Sedang Diverifikasi', diterima: 'Diterima', ditolak: 'Ditolak' };
const STATUS_BADGE = { mendaftar: 'badge-soft', verifikasi: 'badge-honey', diterima: 'badge-brand', ditolak: 'badge-soft' };

const FORM_KOSONG = {
  nama_lengkap: '', nisn: '', jenis_kelamin: 'L', tempat_lahir: '', tanggal_lahir: '',
  alamat: '', asal_sekolah: '', nama_orang_tua: '', no_hp_orang_tua: '', jurusan_pilihan: '',
};

export default function PpdbPublic() {
  const { profile } = useSchoolProfile();
  const [mode, setMode] = useState('daftar'); // 'daftar' | 'status'
  const [dibuka, setDibuka] = useState(true);
  const [form, setForm] = useState(FORM_KOSONG);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [kodeBerhasil, setKodeBerhasil] = useState('');

  const [kodeCek, setKodeCek] = useState('');
  const [hasilCek, setHasilCek] = useState(null);
  const [errorCek, setErrorCek] = useState('');
  const [loadingCek, setLoadingCek] = useState(false);

  useEffect(() => {
    api.get('/ppdb/pengaturan').then((res) => setDibuka(res.data.dibuka)).catch(() => {});
  }, []);

  const handleDaftar = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/ppdb/daftar', form);
      setKodeBerhasil(res.data.kode_pendaftaran);
      setForm(FORM_KOSONG);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal mengirim pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  const handleCekStatus = async (e) => {
    e.preventDefault();
    setErrorCek(''); setHasilCek(null); setLoadingCek(true);
    try {
      const res = await api.get(`/ppdb/status/${encodeURIComponent(kodeCek.trim())}`);
      setHasilCek(res.data);
    } catch (err) {
      setErrorCek(err.response?.data?.message || 'Kode pendaftaran tidak ditemukan.');
    } finally {
      setLoadingCek(false);
    }
  };

  const bukaCekStatus = (kode) => {
    setMode('status');
    setKodeCek(kode);
    setKodeBerhasil('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1B3A] px-4 py-10 relative overflow-hidden">
      <div
        className="absolute top-10 left-6 w-40 h-40 opacity-30 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #F2B705 1.5px, transparent 1.5px)', backgroundSize: '14px 14px' }}
      />
      <div
        className="absolute bottom-10 right-6 w-40 h-40 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #3FB27F 1.5px, transparent 1.5px)', backgroundSize: '14px 14px' }}
      />

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#F2B705] via-[#15803D] to-[#0B1B3A]" />

          <div className="p-8">
            <div className="flex flex-col items-center mb-6">
              {profile.logo_url && <img src={profile.logo_url} alt="Logo Sekolah" className="w-16 h-16 object-contain mb-3" />}
              <h1 className="font-display text-lg font-bold text-[#0B1B3A] text-center">{profile.nama_sekolah.toUpperCase()}</h1>
              <p className="text-xs text-ink-500 mt-1">Penerimaan Peserta Didik Baru (PPDB)</p>
              <span className="mt-3 h-1 w-10 rounded-full bg-[#F2B705]" />
            </div>

            <div className="flex gap-1 bg-mist-50 rounded-lg p-1 mb-5">
              <button
                type="button"
                onClick={() => setMode('daftar')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${mode === 'daftar' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
              >
                <UserPlus className="w-4 h-4" /> Daftar
              </button>
              <button
                type="button"
                onClick={() => setMode('status')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${mode === 'status' ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-500 hover:text-ink-700'}`}
              >
                <Search className="w-4 h-4" /> Cek Status
              </button>
            </div>

            {mode === 'daftar' ? (
              kodeBerhasil ? (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-brand-600 mx-auto" />
                  <p className="text-sm text-ink-700">Pendaftaran berhasil! Simpan kode pendaftaran di bawah ini untuk mengecek status.</p>
                  <p className="font-mono text-lg font-bold tracking-wider bg-mist-50 border border-line-200 rounded-lg py-3">{kodeBerhasil}</p>
                  <button onClick={() => bukaCekStatus(kodeBerhasil)} className="btn-primary w-full justify-center">Cek Status Sekarang</button>
                </div>
              ) : !dibuka ? (
                <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-3 text-center">
                  Pendaftaran online sedang ditutup. Silakan hubungi pihak sekolah untuk informasi lebih lanjut.
                </p>
              ) : (
                <form onSubmit={handleDaftar} className="space-y-3">
                  {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
                  <input placeholder="Nama Lengkap" value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} className="field-input w-full" required />
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="NISN (opsional)" value={form.nisn} onChange={(e) => setForm({ ...form, nisn: e.target.value })} className="field-input" />
                    <select value={form.jenis_kelamin} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })} className="field-input text-ink-700">
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Tempat Lahir" value={form.tempat_lahir} onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })} className="field-input" />
                    <DateInput placeholder="Tanggal Lahir" value={form.tanggal_lahir} onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })} className="field-input" />
                  </div>
                  <textarea placeholder="Alamat" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="field-input w-full" rows={2} />
                  <input placeholder="Asal Sekolah" value={form.asal_sekolah} onChange={(e) => setForm({ ...form, asal_sekolah: e.target.value })} className="field-input w-full" />
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Nama Orang Tua" value={form.nama_orang_tua} onChange={(e) => setForm({ ...form, nama_orang_tua: e.target.value })} className="field-input" />
                    <input placeholder="No. HP Orang Tua" value={form.no_hp_orang_tua} onChange={(e) => setForm({ ...form, no_hp_orang_tua: e.target.value })} className="field-input" required />
                  </div>
                  <input placeholder="Jurusan Pilihan (opsional)" value={form.jurusan_pilihan} onChange={(e) => setForm({ ...form, jurusan_pilihan: e.target.value })} className="field-input w-full" />
                  <button disabled={loading} className="btn-primary w-full justify-center">{loading ? 'Mengirim...' : 'Kirim Pendaftaran'}</button>
                </form>
              )
            ) : (
              <div className="space-y-3">
                <form onSubmit={handleCekStatus} className="flex gap-2">
                  <input placeholder="Kode Pendaftaran (contoh: PPDB-26-ABCDEF)" value={kodeCek} onChange={(e) => setKodeCek(e.target.value)} className="field-input flex-1 font-mono" required />
                  <button disabled={loadingCek} className="btn-primary whitespace-nowrap">{loadingCek ? '...' : 'Cek'}</button>
                </form>
                {errorCek && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{errorCek}</p>}
                {hasilCek && (
                  <div className="surface-card p-4 space-y-2">
                    <p className="text-sm text-ink-500">Nama Pendaftar</p>
                    <p className="text-ink-900 font-medium">{hasilCek.nama_lengkap}</p>
                    <p className="text-sm text-ink-500 mt-2">Status</p>
                    <span className={`badge-soft ${STATUS_BADGE[hasilCek.status]}`}>{STATUS_LABEL[hasilCek.status]}</span>
                    {hasilCek.catatan && (
                      <>
                        <p className="text-sm text-ink-500 mt-2">Catatan</p>
                        <p className="text-ink-700 text-sm">{hasilCek.catatan}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <p className="text-center text-xs text-ink-400 mt-6">
              Staf sekolah? <Link to="/login" className="text-brand-600 hover:underline">Masuk di sini</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
