import { useEffect, useState } from 'react';
import { Power, Save, Upload, FileText, ExternalLink, Plus, CheckCircle2, Trash2, X } from 'lucide-react';
import api from '../../../api/axios';

const emptyInfo = { jadwal_pendaftaran: '', syarat_pendaftaran: '', biaya_pendaftaran: '', info_tambahan: '' };
const emptyPeriode = { nama: '', tanggal_mulai: '', tanggal_selesai: '', biaya_nominal_l: '', biaya_nominal_p: '' };
const rupiah = (n) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;

// Dipisah dari FormulirPpdbTab (daftar pendaftar) supaya tombol buka/tutup
// pendaftaran online — pengaturan, bukan data pendaftar — punya menu sendiri.
export default function PengaturanPpdbTab() {
  const [dibuka, setDibuka] = useState(true);
  const [info, setInfo] = useState(emptyInfo);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [templateUrl, setTemplateUrl] = useState(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState('');

  const loadPengaturan = () => api.get('/ppdb/pengaturan').then((res) => {
    setDibuka(res.data.dibuka);
    setInfo({
      jadwal_pendaftaran: res.data.jadwal_pendaftaran || '',
      syarat_pendaftaran: res.data.syarat_pendaftaran || '',
      biaya_pendaftaran: res.data.biaya_pendaftaran || '',
      info_tambahan: res.data.info_tambahan || '',
    });
    setTemplateUrl(res.data.template_pernyataan_url);
  });

  useEffect(() => { loadPengaturan().finally(() => setLoading(false)); }, []);

  // Periode/gelombang PPDB — SENGAJA terpisah dari tahun ajaran sekolah
  // (lihat PpdbPeriode model), karena masa pendaftaran siswa baru sering
  // tidak beriringan dengan tahun ajaran. Nominal biaya pendaftaran juga
  // pindah ke sini (per periode), bukan lagi 1 angka global.
  const [periodeList, setPeriodeList] = useState([]);
  const [periodeLoading, setPeriodeLoading] = useState(true);
  const [showTambahPeriode, setShowTambahPeriode] = useState(false);
  const [periodeForm, setPeriodeForm] = useState(emptyPeriode);
  const [periodeSaving, setPeriodeSaving] = useState(false);
  const [periodeError, setPeriodeError] = useState('');
  const [editPeriodeId, setEditPeriodeId] = useState(null);
  const [editForm, setEditForm] = useState(emptyPeriode);

  const loadPeriode = () => api.get('/ppdb-periode').then((res) => setPeriodeList(res.data));
  useEffect(() => { loadPeriode().finally(() => setPeriodeLoading(false)); }, []);

  const handleTambahPeriode = async (e) => {
    e.preventDefault();
    setPeriodeError('');
    setPeriodeSaving(true);
    try {
      await api.post('/ppdb-periode', {
        ...periodeForm,
        biaya_nominal_l: Number(periodeForm.biaya_nominal_l) || 0,
        biaya_nominal_p: Number(periodeForm.biaya_nominal_p) || 0,
      });
      setPeriodeForm(emptyPeriode);
      setShowTambahPeriode(false);
      loadPeriode();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setPeriodeError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menambah periode.');
    } finally {
      setPeriodeSaving(false);
    }
  };

  const bukaEditPeriode = (pr) => {
    setEditPeriodeId(pr.id);
    setEditForm({
      nama: pr.nama,
      tanggal_mulai: pr.tanggal_mulai || '',
      tanggal_selesai: pr.tanggal_selesai || '',
      biaya_nominal_l: pr.biaya_nominal_l || '',
      biaya_nominal_p: pr.biaya_nominal_p || '',
    });
    setPeriodeError('');
  };

  const handleSimpanEditPeriode = async (e) => {
    e.preventDefault();
    setPeriodeError('');
    setPeriodeSaving(true);
    try {
      await api.put(`/ppdb-periode/${editPeriodeId}`, {
        tanggal_mulai: editForm.tanggal_mulai || null,
        tanggal_selesai: editForm.tanggal_selesai || null,
        biaya_nominal_l: Number(editForm.biaya_nominal_l) || 0,
        biaya_nominal_p: Number(editForm.biaya_nominal_p) || 0,
      });
      setEditPeriodeId(null);
      loadPeriode();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setPeriodeError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setPeriodeSaving(false);
    }
  };

  const handleAktifkanPeriode = async (pr) => {
    if (!confirm(`Aktifkan periode "${pr.nama}"? Pendaftar baru mulai sekarang akan otomatis masuk periode ini.`)) return;
    await api.put(`/ppdb-periode/${pr.id}/aktifkan`);
    loadPeriode();
  };

  const handleHapusPeriode = async (pr) => {
    if (!confirm(`Hapus periode "${pr.nama}"?`)) return;
    try {
      await api.delete(`/ppdb-periode/${pr.id}`);
      loadPeriode();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus periode.');
    }
  };

  const handleUploadTemplate = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTemplateError('');
    setUploadingTemplate(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/ppdb/template-pernyataan', fd);
      setTemplateUrl(res.data.template_pernyataan_url);
    } catch (err) {
      setTemplateError(err.response?.data?.message || 'Gagal mengunggah template.');
    } finally {
      setUploadingTemplate(false);
      e.target.value = '';
    }
  };

  const handleToggle = async () => {
    setSaving(true);
    try {
      const res = await api.put('/ppdb/pengaturan', { dibuka: !dibuka, ...info });
      setDibuka(res.data.dibuka);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedAt(null);
    try {
      await api.put('/ppdb/pengaturan', { dibuka, ...info });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400">
        <p className="text-sm text-ink-700">
          Nyala/matikan formulir pendaftaran online (<code className="font-mono">/ppdb</code>) di sini. Saat dimatikan, calon siswa yang membuka halaman pendaftaran akan melihat pesan "pendaftaran ditutup" dan tidak bisa mengirim data. Info di bawah ini ditampilkan di halaman awal <code className="font-mono">/ppdb</code>.
        </p>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Status Pendaftaran Online</h2>
        {loading ? (
          <p className="text-ink-300">Memuat...</p>
        ) : (
          <button
            onClick={handleToggle}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              dibuka ? 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100' : 'bg-honey-50 text-honey-700 border border-honey-200 hover:bg-honey-100'
            }`}
          >
            <Power className="w-4 h-4" />
            {saving ? 'Menyimpan...' : dibuka ? 'Pendaftaran Online: Aktif' : 'Pendaftaran Online: Nonaktif'}
          </button>
        )}
      </div>

      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <h2 className="font-display font-semibold text-ink-900">Periode PPDB</h2>
          <button onClick={() => { setShowTambahPeriode(true); setPeriodeError(''); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Tambah Periode
          </button>
        </div>
        <p className="text-xs text-ink-500 mb-4">
          Periode/gelombang penerimaan siswa baru — SENGAJA terpisah dari tahun ajaran sekolah, karena masa PPDB sering tidak beriringan dengan tahun ajaran. Pendaftar baru otomatis masuk periode yang sedang aktif, termasuk nominal biaya pendaftarannya (dibedakan laki-laki/perempuan).
        </p>
        {periodeError && !editPeriodeId && !showTambahPeriode && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{periodeError}</p>}

        {periodeLoading ? (
          <p className="text-ink-300">Memuat...</p>
        ) : (
          <div className="space-y-2">
            {periodeList.map((pr) => (
              <div key={pr.id} className="border border-line-200 rounded-lg p-3">
                {editPeriodeId === pr.id ? (
                  <form onSubmit={handleSimpanEditPeriode} className="space-y-2.5">
                    <p className="text-sm font-medium text-ink-900">{pr.nama}</p>
                    {periodeError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{periodeError}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-ink-400 mb-1">Tanggal Mulai</label>
                        <input type="date" value={editForm.tanggal_mulai} onChange={(e) => setEditForm({ ...editForm, tanggal_mulai: e.target.value })} className="field-input w-full" />
                      </div>
                      <div>
                        <label className="block text-[11px] text-ink-400 mb-1">Tanggal Selesai</label>
                        <input type="date" value={editForm.tanggal_selesai} onChange={(e) => setEditForm({ ...editForm, tanggal_selesai: e.target.value })} className="field-input w-full" />
                      </div>
                      <div>
                        <label className="block text-[11px] text-ink-400 mb-1">Biaya Laki-laki (Rp)</label>
                        <input type="number" min="0" value={editForm.biaya_nominal_l} onChange={(e) => setEditForm({ ...editForm, biaya_nominal_l: e.target.value })} className="field-input w-full" placeholder="Mis. 500000" />
                      </div>
                      <div>
                        <label className="block text-[11px] text-ink-400 mb-1">Biaya Perempuan (Rp)</label>
                        <input type="number" min="0" value={editForm.biaya_nominal_p} onChange={(e) => setEditForm({ ...editForm, biaya_nominal_p: e.target.value })} className="field-input w-full" placeholder="Mis. 500000" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button disabled={periodeSaving} className="btn-primary text-sm">{periodeSaving ? 'Menyimpan...' : 'Simpan'}</button>
                      <button type="button" onClick={() => setEditPeriodeId(null)} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink-900">{pr.nama}</p>
                        {pr.status === 'aktif' && <span className="badge-soft badge-brand">Aktif</span>}
                      </div>
                      <p className="text-xs text-ink-500 mt-0.5">
                        {pr.tanggal_mulai || pr.tanggal_selesai ? `${pr.tanggal_mulai || '?'} s/d ${pr.tanggal_selesai || '?'} · ` : ''}
                        Laki-laki {rupiah(pr.biaya_nominal_l)} · Perempuan {rupiah(pr.biaya_nominal_p)} · {pr.pendaftars_count} pendaftar
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {pr.status !== 'aktif' && (
                        <button onClick={() => handleAktifkanPeriode(pr)} className="flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aktifkan
                        </button>
                      )}
                      <button onClick={() => bukaEditPeriode(pr)} className="text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                        Edit
                      </button>
                      {pr.status !== 'aktif' && pr.pendaftars_count === 0 && (
                        <button onClick={() => handleHapusPeriode(pr)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {periodeList.length === 0 && <p className="text-sm text-ink-300">Belum ada periode PPDB. Tambah 1 dulu supaya pendaftar baru punya periode.</p>}
          </div>
        )}
      </div>

      {showTambahPeriode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleTambahPeriode} className="surface-card p-5 w-full max-w-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-ink-900">Tambah Periode PPDB</h2>
              <button type="button" onClick={() => setShowTambahPeriode(false)} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>
            </div>
            {periodeError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{periodeError}</p>}
            <div className="space-y-3">
              <input placeholder="Nama Periode (mis. Gelombang 1 2026/2027)" value={periodeForm.nama} onChange={(e) => setPeriodeForm({ ...periodeForm, nama: e.target.value })} className="field-input w-full" required autoFocus />
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-ink-400 mb-1">Tanggal Mulai</label>
                  <input type="date" value={periodeForm.tanggal_mulai} onChange={(e) => setPeriodeForm({ ...periodeForm, tanggal_mulai: e.target.value })} className="field-input w-full" />
                </div>
                <div>
                  <label className="block text-[11px] text-ink-400 mb-1">Tanggal Selesai</label>
                  <input type="date" value={periodeForm.tanggal_selesai} onChange={(e) => setPeriodeForm({ ...periodeForm, tanggal_selesai: e.target.value })} className="field-input w-full" />
                </div>
                <div>
                  <label className="block text-[11px] text-ink-400 mb-1">Biaya Laki-laki (Rp)</label>
                  <input type="number" min="0" value={periodeForm.biaya_nominal_l} onChange={(e) => setPeriodeForm({ ...periodeForm, biaya_nominal_l: e.target.value })} className="field-input w-full" placeholder="Mis. 500000" />
                </div>
                <div>
                  <label className="block text-[11px] text-ink-400 mb-1">Biaya Perempuan (Rp)</label>
                  <input type="number" min="0" value={periodeForm.biaya_nominal_p} onChange={(e) => setPeriodeForm({ ...periodeForm, biaya_nominal_p: e.target.value })} className="field-input w-full" placeholder="Mis. 500000" />
                </div>
              </div>
            </div>
            <p className="text-xs text-ink-400 mt-3">Periode baru dibuat nonaktif — aktifkan lewat tombol "Aktifkan" setelah tersimpan kalau sudah siap dipakai.</p>
            <div className="flex gap-2 mt-4">
              <button disabled={periodeSaving} className="btn-primary">{periodeSaving ? 'Menyimpan...' : 'Simpan Periode'}</button>
              <button type="button" onClick={() => setShowTambahPeriode(false)} className="text-sm text-ink-500 hover:text-ink-700 px-3">Batal</button>
            </div>
          </form>
        </div>
      )}

      {!loading && (
        <div className="surface-card p-5">
          <h2 className="font-display font-semibold text-ink-900 mb-1">Template Surat Pernyataan (Fakta Integritas)</h2>
          <p className="text-xs text-ink-500 mb-4">
            File PDF kosong yang bisa diunduh calon siswa dari halaman formulir, diisi &amp; ditandatangani manual, lalu diunggah balik sebagai salah satu berkas persyaratan.
          </p>
          {templateError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{templateError}</p>}
          <div className="flex items-center gap-3 flex-wrap">
            {templateUrl && (
              <a href={templateUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-2">
                <FileText className="w-4 h-4" /> Lihat Template Saat Ini <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <label className="flex items-center gap-1.5 text-sm font-medium text-ink-700 border border-line-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-mist-50 transition">
              <Upload className="w-4 h-4" />
              {uploadingTemplate ? 'Mengunggah...' : templateUrl ? 'Ganti Template' : 'Unggah Template (PDF)'}
              <input type="file" accept=".pdf" className="hidden" onChange={handleUploadTemplate} disabled={uploadingTemplate} />
            </label>
          </div>
        </div>
      )}

      {!loading && (
        <form onSubmit={handleSaveInfo} className="surface-card p-5 space-y-4">
          <h2 className="font-display font-semibold text-ink-900">Info Halaman Awal PPDB</h2>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Jadwal Pendaftaran</label>
            <textarea
              value={info.jadwal_pendaftaran}
              onChange={(e) => setInfo({ ...info, jadwal_pendaftaran: e.target.value })}
              className="field-input w-full" rows={3}
              placeholder={'Contoh:\nGelombang 1: 1 Januari - 28 Februari 2026\nGelombang 2: 1 Maret - 30 April 2026'}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Syarat Berkas Pendaftaran</label>
            <textarea
              value={info.syarat_pendaftaran}
              onChange={(e) => setInfo({ ...info, syarat_pendaftaran: e.target.value })}
              className="field-input w-full" rows={4}
              placeholder={'Contoh:\n- Lulusan SMP/MTs atau sederajat\n- Fotokopi Ijazah & SKHU yang dilegalisir\n- Fotokopi Kartu Keluarga'}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Biaya Pendaftaran</label>
            <textarea
              value={info.biaya_pendaftaran}
              onChange={(e) => setInfo({ ...info, biaya_pendaftaran: e.target.value })}
              className="field-input w-full" rows={2}
              placeholder="Contoh: Gratis biaya formulir pendaftaran."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">Info Tambahan</label>
            <textarea
              value={info.info_tambahan}
              onChange={(e) => setInfo({ ...info, info_tambahan: e.target.value })}
              className="field-input w-full" rows={3}
              placeholder="Info lain yang perlu diketahui calon siswa/orang tua."
            />
          </div>
          <div className="flex items-center gap-3">
            <button disabled={saving} className="btn-primary">
              <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Info'}
            </button>
            {savedAt && <span className="text-xs text-brand-600">Tersimpan.</span>}
          </div>
        </form>
      )}
    </div>
  );
}
