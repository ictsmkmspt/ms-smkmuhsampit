import { useRef, useState } from 'react';
import { Download, Upload, DatabaseBackup, AlertTriangle } from 'lucide-react';
import api from '../../../api/axios';
import { useSchoolProfile } from '../../../context/SchoolProfileContext';

export default function BackupTab() {
  const { profile } = useSchoolProfile();
  const fileInputRef = useRef(null);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const [file, setFile] = useState(null);
  const [konfirmasi, setKonfirmasi] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  const handleDownload = async () => {
    setDownloadError('');
    setDownloading(true);
    try {
      const res = await api.get('/system/backup', { responseType: 'blob' });
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : 'backup-database.sql';

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Gagal membuat backup. Coba lagi, atau hubungi teknisi kalau terus gagal.');
    } finally {
      setDownloading(false);
    }
  };

  const namaSekolah = profile.nama_sekolah || '';
  const konfirmasiCocok = konfirmasi.trim() !== '' && konfirmasi.trim() === namaSekolah.trim();

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setRestoreError('');
    setRestoreSuccess('');
  };

  const handleRestore = async () => {
    if (!file || !konfirmasiCocok) return;
    if (!confirm(
      `PERINGATAN: Ini akan MENGHAPUS TOTAL seluruh data sekolah saat ini dan menggantinya dengan isi file "${file.name}".\n\n` +
      `Aksi ini TIDAK BISA DIBATALKAN dari sini. Sistem akan membuat backup pengaman di server sebelum menimpa, tapi tetap pastikan file yang Anda upload benar.\n\n` +
      `Lanjutkan impor sekarang?`
    )) return;

    setRestoreError('');
    setRestoreSuccess('');
    setRestoring(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('konfirmasi_nama_sekolah', konfirmasi.trim());

    try {
      const res = await api.post('/system/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRestoreSuccess(res.data.message);
      setFile(null);
      setKonfirmasi('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setRestoreError(err.response?.data?.message || 'Gagal mengimpor database.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="surface-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <DatabaseBackup className="w-4 h-4 text-brand-600" />
        <h2 className="font-display font-semibold text-ink-900">Backup &amp; Impor Database</h2>
      </div>

      {/* Backup */}
      <div>
        <p className="text-sm font-medium text-ink-700 mb-1">Backup</p>
        <p className="text-xs text-ink-500 mb-3">
          Unduh salinan lengkap database sekolah saat ini (semua data: siswa, guru, absensi, SPP, dst). Simpan file ini di tempat aman.
        </p>
        {downloadError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{downloadError}</p>}
        <button
          onClick={handleDownload} disabled={downloading}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-xl px-4 py-2 transition disabled:opacity-60"
        >
          <Download className="w-4 h-4" /> {downloading ? 'Membuat backup...' : 'Download Backup'}
        </button>
      </div>

      {/* Impor */}
      <div className="pt-4 border-t border-line-200">
        <p className="text-sm font-medium text-ink-700 mb-1">Impor (Timpa Total Database)</p>

        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 mb-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700">
            <b>Berbahaya.</b> Ini akan MENGHAPUS SEMUA data sekolah yang ada sekarang dan menggantinya total dengan isi file backup yang diupload. Tidak bisa dibatalkan dari halaman ini. Pastikan file-nya benar sebelum lanjut.
          </p>
        </div>

        {restoreError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{restoreError}</p>}
        {restoreSuccess && <p className="text-sm text-brand-700 bg-brand-50 border border-brand-100 rounded-lg px-3 py-2 mb-3">{restoreSuccess}</p>}

        <div className="space-y-3">
          <input
            ref={fileInputRef} type="file" accept=".sql,.sqlite"
            onChange={handleFileChange}
            className="field-input text-sm"
          />

          <div>
            <label className="block text-xs font-medium text-ink-500 mb-1">
              Ketik ulang nama sekolah (<b>{namaSekolah}</b>) untuk konfirmasi
            </label>
            <input
              value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value)}
              className="field-input"
              placeholder={namaSekolah}
            />
          </div>

          <button
            onClick={handleRestore}
            disabled={!file || !konfirmasiCocok || restoring}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-xl px-4 py-2 transition"
          >
            <Upload className="w-4 h-4" /> {restoring ? 'Mengimpor...' : 'Timpa Database Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}
