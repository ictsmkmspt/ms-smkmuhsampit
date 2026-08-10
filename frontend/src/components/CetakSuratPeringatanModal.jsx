import { useState } from 'react';
import { X, FileDown } from 'lucide-react';
import api from '../api/axios';

/**
 * Form isian sebelum unduh Surat Peringatan (.docx) — nomor surat,
 * tempat/tanggal, nama & NIP Kepala Sekolah. Dipakai dari dashboard BK
 * maupun Rekap BK Admin/Waka Kesiswaan, jadi dibuat 1 komponen berbagi
 * daripada diduplikasi di 2 tempat. Isian selain nomor surat disimpan di
 * localStorage (pola sama seperti tanda tangan export Nilai) supaya
 * tidak perlu diketik ulang tiap mau buat surat berikutnya.
 */
export default function CetakSuratPeringatanModal({ kejadian, onClose }) {
  const [ttd, setTtd] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('surat_peringatan_ttd')) || {};
      return { ...saved, nomor_surat: '' };
    } catch {
      return { nomor_surat: '' };
    }
  });
  const [downloading, setDownloading] = useState(false);

  const handleUnduh = async () => {
    const { nomor_surat, ...disimpan } = ttd;
    localStorage.setItem('surat_peringatan_ttd', JSON.stringify(disimpan));

    setDownloading(true);
    try {
      const res = await api.get(`/sanksi-kejadian/${kejadian.id}/export-word`, {
        params: ttd,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Surat-Peringatan-${kejadian.student?.user?.name || 'Siswa'}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch {
      alert('Gagal membuat surat.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
          <h3 className="font-display font-semibold text-ink-900">Buat Surat Peringatan (Word)</h3>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto space-y-3">
          <p className="text-xs text-ink-500">
            Untuk <b>{kejadian.student?.user?.name}</b> &middot; {kejadian.sanksi_rule?.nama || '-'}
          </p>
          <input
            placeholder="Nomor Surat"
            value={ttd.nomor_surat || ''}
            onChange={(e) => setTtd({ ...ttd, nomor_surat: e.target.value })}
            className="field-input w-full"
          />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Tempat (mis. Sampit)" value={ttd.tempat || ''} onChange={(e) => setTtd({ ...ttd, tempat: e.target.value })} className="field-input" />
            <input placeholder="Tanggal (mis. 9 Agustus 2026)" value={ttd.tanggal || ''} onChange={(e) => setTtd({ ...ttd, tanggal: e.target.value })} className="field-input" />
          </div>
          <input placeholder="Nama Kepala Sekolah" value={ttd.kepsek_nama || ''} onChange={(e) => setTtd({ ...ttd, kepsek_nama: e.target.value })} className="field-input w-full" />
          <input placeholder="NIP Kepala Sekolah" value={ttd.kepsek_nip || ''} onChange={(e) => setTtd({ ...ttd, kepsek_nip: e.target.value })} className="field-input w-full" />

          <button onClick={handleUnduh} disabled={downloading} className="btn-primary w-full justify-center mt-2 disabled:opacity-50">
            <FileDown className="w-4 h-4" /> {downloading ? 'Membuat surat...' : 'Unduh Surat (.docx)'}
          </button>
        </div>
      </div>
    </div>
  );
}
