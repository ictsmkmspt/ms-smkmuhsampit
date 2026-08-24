import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, FileDown, Plus, Trash2, Send, Pencil } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useSchoolProfile } from '../../context/SchoolProfileContext';
import PrintKembaliButton from '../../components/PrintKembaliButton';

const ASPEK_TETAP = [
  { key: 'skor_disiplin', label: 'Disiplin dan Kehadiran', indikator: 'Hadir tepat waktu, mematuhi jam kerja, dan tertib dalam kehadiran' },
  { key: 'skor_sikap', label: 'Sikap dan Etika Kerja', indikator: 'Sopan, jujur, amanah, bertanggung jawab, dan mematuhi aturan' },
  { key: 'skor_komunikasi', label: 'Komunikasi dan Kerja Sama', indikator: 'Berkomunikasi dengan baik dan mampu bekerja sama' },
  { key: 'skor_inisiatif', label: 'Inisiatif dan Adaptasi', indikator: 'Mau belajar, tanggap terhadap arahan, mampu menyesuaikan diri' },
  { key: 'skor_k3', label: 'K3 dan Kepatuhan SOP', indikator: 'Mematuhi prosedur keselamatan dan SOP yang berlaku' },
];

const SKOR_LABEL = { 1: '1 - Perlu Bimbingan', 2: '2 - Cukup', 3: '3 - Baik', 4: '4 - Sangat Baik' };

const skorAwal = { skor_disiplin: 3, skor_sikap: 3, skor_komunikasi: 3, skor_inisiatif: 3, skor_k3: 3 };
const kompetensiAwal = [{ nama_kompetensi: '', skor: 3 }];

// Halaman "Penilaian PKL" — detail nilai 1 siswa PKL, dibuka lewat menu
// BARU (window.open, lihat PenilaianIdukaTab.jsx & IdukaPenilaianTab.jsx),
// BUKAN modal/popup di dalam dashboard, meniru pola PrintBukuInduk.jsx.
// Dipakai 2 peran: guru/admin cuma BACA (lihat hasil penilaian IDUKA),
// IDUKA bisa ISI/UBAH/HAPUS nilai langsung di halaman ini.
export default function PrintPenilaianPkl() {
  const { id } = useParams();
  const { user } = useAuth();
  const { profile } = useSchoolProfile();
  const canIsi = user.role === 'iduka';

  const [placement, setPlacement] = useState(null);
  const [penilaian, setPenilaian] = useState(undefined);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [skor, setSkor] = useState(skorAwal);
  const [kompetensi, setKompetensi] = useState(kompetensiAwal);
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');

  const muatData = () => {
    setPenilaian(undefined);
    return Promise.all([
      api.get(`/pkl-placements/${id}`),
      api.get(`/pkl-placements/${id}/penilaian`),
    ])
      .then(([resPlacement, resPenilaian]) => {
        setPlacement(resPlacement.data);
        setPenilaian(resPenilaian.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Gagal memuat data penilaian.'));
  };

  useEffect(() => { muatData(); }, [id]); // eslint-disable-line

  const tambahBarisKompetensi = () => setKompetensi((k) => [...k, { nama_kompetensi: '', skor: 3 }]);
  const hapusBarisKompetensi = (i) => setKompetensi((k) => k.filter((_, idx) => idx !== i));
  const ubahKompetensi = (i, field, value) => {
    setKompetensi((k) => k.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  };

  const mulaiEdit = () => {
    setSkor({
      skor_disiplin: penilaian.skor_disiplin, skor_sikap: penilaian.skor_sikap,
      skor_komunikasi: penilaian.skor_komunikasi, skor_inisiatif: penilaian.skor_inisiatif,
      skor_k3: penilaian.skor_k3,
    });
    setKompetensi(
      penilaian.kompetensis?.length
        ? penilaian.kompetensis.map((k) => ({ nama_kompetensi: k.nama_kompetensi, skor: k.skor }))
        : kompetensiAwal
    );
    setCatatan(penilaian.catatan || '');
    setFormError('');
    setIsEditing(true);
  };

  const batalEdit = () => {
    setIsEditing(false);
    setSkor(skorAwal);
    setKompetensi(kompetensiAwal);
    setCatatan('');
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const kompetensiValid = kompetensi.filter((k) => k.nama_kompetensi.trim() !== '');
    if (kompetensiValid.length === 0) {
      setFormError('Isi minimal 1 kompetensi teknis.');
      return;
    }

    if (!isEditing && !confirm('Kirim penilaian ini sekarang?')) return;

    setSaving(true);
    try {
      const payload = { ...skor, catatan: catatan || null, kompetensi: kompetensiValid };
      const res = isEditing
        ? await api.put(`/pkl-placements/${id}/penilaian`, payload)
        : await api.post(`/pkl-placements/${id}/penilaian`, payload);
      setPenilaian(res.data.penilaian);
      setIsEditing(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan penilaian.');
    } finally {
      setSaving(false);
    }
  };

  const handleHapus = async () => {
    if (!confirm('Hapus penilaian PKL siswa ini? Setelah dihapus, penilaian bisa diisi ulang dari awal.')) return;
    setDeleting(true);
    try {
      await api.delete(`/pkl-placements/${id}/penilaian`);
      setPenilaian(null);
      batalEdit();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus penilaian.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportWord = async () => {
    const res = await api.get(`/pkl-placements/${id}/penilaian/export-word`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Penilaian-PKL-${placement?.student?.user?.name || 'siswa'}.docx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  if (error) return <div className="p-8 text-center text-rose-600">{error}</div>;
  if (!placement || penilaian === undefined) return <div className="p-8 text-center text-ink-400">Memuat data...</div>;

  const sudahSelesaiPkl = placement.status === 'selesai';
  const bolehUbahHapus = canIsi && !sudahSelesaiPkl;
  const tampilkanForm = canIsi && (isEditing || !(penilaian && penilaian.nilai_akhir != null));

  return (
    <div className="p-6 bg-mist-50 min-h-screen">
      <div className="no-print flex items-center justify-between mb-6 max-w-3xl mx-auto">
        <h1 className="font-display text-lg font-semibold text-ink-900">Penilaian PKL — {placement.student?.user?.name}</h1>
        <div className="flex items-center gap-2">
          <PrintKembaliButton />
          {penilaian && !tampilkanForm && (
            <button
              onClick={handleExportWord}
              className="flex items-center gap-2 bg-white text-ink-700 border border-line-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-mist-50"
            >
              <FileDown className="w-4 h-4" /> Export ke Word
            </button>
          )}
          {!tampilkanForm && (
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
            >
              <Printer className="w-4 h-4" /> Print / Simpan PDF
            </button>
          )}
        </div>
      </div>

      {tampilkanForm ? (
        <div className="no-print surface-card p-5 max-w-3xl mx-auto">
          <p className="text-xs text-ink-500 mb-4">
            Isi penilaian akhir untuk siswa <b>{placement.student?.user?.name}</b>. Setelah dikirim, nilai masih bisa diedit atau dihapus lagi kalau ada yang perlu diperbaiki — selama PKL siswa belum ditandai selesai oleh sekolah.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{formError}</p>}

            <p className="text-xs text-ink-500 bg-mist-50 border border-line-200 rounded-lg px-3 py-2">
              Keterangan Skor: 4 = Sangat Baik | 3 = Baik | 2 = Cukup | 1 = Perlu Bimbingan
            </p>

            <div>
              <p className="text-xs font-medium text-ink-500 mb-2">Aspek Penilaian Umum</p>
              <div className="space-y-2">
                {ASPEK_TETAP.map((a) => (
                  <div key={a.key}>
                    <label className="block text-sm text-ink-700 mb-0.5">{a.label}</label>
                    <p className="text-xs text-ink-400 mb-1">{a.indikator}</p>
                    <select
                      value={skor[a.key]}
                      onChange={(e) => setSkor({ ...skor, [a.key]: Number(e.target.value) })}
                      className="field-input text-sm text-ink-700"
                    >
                      {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{SKOR_LABEL[n]}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-ink-500">Kompetensi Teknis</p>
                <button type="button" onClick={tambahBarisKompetensi} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                  <Plus className="w-3.5 h-3.5" /> Tambah Baris
                </button>
              </div>
              <div className="space-y-2">
                {kompetensi.map((k, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text" value={k.nama_kompetensi}
                      onChange={(e) => ubahKompetensi(i, 'nama_kompetensi', e.target.value)}
                      placeholder={`Kompetensi Teknis ${i + 1}`}
                      className="field-input text-sm flex-1"
                    />
                    <select
                      value={k.skor}
                      onChange={(e) => ubahKompetensi(i, 'skor', Number(e.target.value))}
                      className="field-input text-sm text-ink-700 w-16"
                    >
                      {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    {kompetensi.length > 1 && (
                      <button type="button" onClick={() => hapusBarisKompetensi(i)} className="text-ink-300 hover:text-honey-700 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Catatan Instruktur (opsional)</label>
              <textarea
                value={catatan} onChange={(e) => setCatatan(e.target.value)}
                className="field-input w-full min-h-[80px]" rows="3"
              />
            </div>

            <div className="flex gap-2">
              {isEditing && (
                <button type="button" onClick={batalEdit} className="text-sm font-medium text-ink-500 hover:text-ink-700 px-4">
                  Batal
                </button>
              )}
              <button disabled={saving} className="btn-primary flex-1 justify-center">
                <Send className="w-4 h-4" /> {saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Kirim Penilaian'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="lembar max-w-3xl mx-auto bg-white">
            <div className="lembar-header">
              {profile?.logo_url && <img src={profile.logo_url} alt="" className="lembar-logo" />}
              <div>
                <p className="lembar-sekolah">{profile?.nama_sekolah}</p>
                <p className="lembar-judul">PENILAIAN PRAKTIK KERJA LAPANGAN</p>
              </div>
            </div>

            <div className="lembar-body">
              <table className="lembar-tabel lembar-tabel-full">
                <tbody>
                  <tr><td className="lembar-label">Nama Siswa</td><td>{placement.student?.user?.name}</td></tr>
                  <tr><td className="lembar-label">Kelas</td><td>{placement.student?.class_room?.name || '-'}</td></tr>
                  <tr><td className="lembar-label">Tempat PKL (IDUKA)</td><td>{placement.iduka?.nama_perusahaan || '-'}</td></tr>
                  <tr><td className="lembar-label">Guru Pembimbing</td><td>{placement.guru_pembimbing?.user?.name || '-'}</td></tr>
                </tbody>
              </table>

              {!penilaian ? (
                <p className="text-center text-ink-300 py-10 text-sm">Belum ada penilaian dari IDUKA untuk siswa ini.</p>
              ) : (
                <>
                  <div className="nilai-akhir-box">
                    <p className="nilai-akhir-label">Nilai Akhir PKL</p>
                    <p className="nilai-akhir-angka">{penilaian.nilai_akhir}</p>
                  </div>

                  <div className="aspek-section">
                    <p className="aspek-judul">Aspek Penilaian Umum</p>
                    {ASPEK_TETAP.map((a) => (
                      <div key={a.key} className="aspek-row">
                        <span>{a.label}</span>
                        <span className="aspek-skor">{penilaian[a.key]}</span>
                      </div>
                    ))}
                  </div>

                  {penilaian.kompetensis?.length > 0 && (
                    <div className="aspek-section">
                      <p className="aspek-judul">Kompetensi Teknis</p>
                      {penilaian.kompetensis.map((k) => (
                        <div key={k.id} className="aspek-row">
                          <span>{k.nama_kompetensi}</span>
                          <span className="aspek-skor">{k.skor}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {penilaian.catatan && (
                    <div className="catatan-section">
                      <p className="aspek-judul">Catatan Instruktur</p>
                      <p className="catatan-isi">{penilaian.catatan}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {penilaian && canIsi && (
            <div className="no-print max-w-3xl mx-auto mt-4">
              {sudahSelesaiPkl ? (
                <p className="text-xs text-ink-400 text-center bg-mist-50 border border-line-200 rounded-lg px-3 py-2">
                  Nilai terkunci karena PKL siswa ini sudah ditandai selesai.
                </p>
              ) : bolehUbahHapus && (
                <div className="flex gap-2">
                  <button
                    onClick={mulaiEdit}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl py-2.5"
                  >
                    <Pencil className="w-4 h-4" /> Edit Nilai
                  </button>
                  <button
                    onClick={handleHapus}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-honey-700 hover:bg-honey-50 disabled:opacity-50 border border-honey-200 rounded-xl py-2.5"
                  >
                    <Trash2 className="w-4 h-4" /> {deleting ? 'Menghapus...' : 'Hapus Nilai'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        .lembar {
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          overflow: hidden;
        }
        .lembar-header {
          background: #0B1B3A;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .lembar-logo { width: 40px; height: 40px; object-fit: contain; background: #fff; border-radius: 6px; padding: 3px; }
        .lembar-sekolah { color: #fff; font-size: 13px; font-weight: 700; }
        .lembar-judul { color: #F2B705; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; margin-top: 2px; }
        .lembar-body { padding: 24px; }
        .lembar-tabel { width: 100%; font-size: 13px; border-collapse: collapse; }
        .lembar-tabel td, .lembar-tabel th { padding: 5px 8px; text-align: left; vertical-align: top; }
        .lembar-tabel-full { margin-bottom: 20px; }
        .lembar-tabel-full td { border-bottom: 1px solid #F1F5F9; }
        .lembar-label { color: #64748b; font-weight: 600; width: 40%; }

        .nilai-akhir-box {
          text-align: center;
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 20px;
        }
        .nilai-akhir-label { font-size: 12px; color: #1D4ED8; }
        .nilai-akhir-angka { font-size: 32px; font-weight: 800; color: #1D4ED8; }

        .aspek-section { margin-bottom: 18px; }
        .aspek-judul { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px; }
        .aspek-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          color: #334155;
          border-bottom: 1px solid #F1F5F9;
          padding: 6px 0;
        }
        .aspek-skor { font-weight: 700; color: #0f172a; }

        .catatan-section { margin-bottom: 4px; }
        .catatan-isi { font-size: 13px; color: #334155; line-height: 1.5; }

        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #fff; }
          .lembar { border: none; }
          .lembar, .lembar * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        @page { size: A4 portrait; margin: 14mm; }
      `}</style>
    </div>
  );
}
