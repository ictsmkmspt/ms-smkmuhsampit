import { useState } from 'react';
import { Download, FileBarChart } from 'lucide-react';
import api from '../../../api/axios';

/**
 * Ekspor Excel daftar alumni yang sudah diterima kerja lewat sistem ini —
 * dipakai BKK melaporkan penempatan ke Disnaker (Permenaker No. 39/2016).
 */
export default function LaporanPenempatanTab() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/bkk/laporan-penempatan', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'laporan-penempatan-bkk.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh laporan.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="surface-card p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
          <FileBarChart className="w-7 h-7 text-brand-600" />
        </div>
        <h2 className="font-display text-lg font-semibold text-ink-900 mb-2">Laporan Penempatan Alumni</h2>
        <p className="text-sm text-ink-500 max-w-sm mx-auto mb-5">
          Ekspor daftar alumni yang sudah diterima kerja lewat sistem ini (format kolom mengikuti kebutuhan pelaporan ke Disnaker).
        </p>
        <button onClick={handleDownload} disabled={downloading} className="btn-primary mx-auto">
          <Download className="w-4 h-4" /> {downloading ? 'Mengunduh...' : 'Unduh Excel'}
        </button>
      </div>
    </div>
  );
}
