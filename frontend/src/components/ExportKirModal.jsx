import { useEffect, useState } from 'react';
import { X, FileSpreadsheet } from 'lucide-react';
import api from '../api/axios';

/**
 * Form isian sebelum ekspor Kartu Inventaris Ruangan (KIR) ke Excel —
 * dipakai dari AssetsTab (Admin/Waka Sarpras/Teknisi, pilih ruang bebas)
 * maupun InventarisTab (Kepala Bengkel, ruang sudah tetap jadi tanggung
 * jawabnya sendiri, backend yang membatasi lewat RestrictsToOwnRoom).
 * Provinsi/Kabupaten/Unit/nama Waka Sarpras disimpan di localStorage
 * (jarang berubah); nama Kepala Ruangan TIDAK disimpan karena beda tiap
 * ruang — otomatis diisi dari data penanggung jawab ruang (bisa diubah).
 */
export default function ExportKirModal({ rooms, fixedRoomId, onClose }) {
  const [roomId, setRoomId] = useState(fixedRoomId ? String(fixedRoomId) : '');
  const [form, setForm] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('kir_export_form')) || {};
      return { ...saved, tanggal: '', kepala_ruang_nama: '', kepala_ruang_nbm: '' };
    } catch {
      return { tanggal: '', kepala_ruang_nama: '', kepala_ruang_nbm: '' };
    }
  });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const room = rooms.find((r) => String(r.id) === String(roomId));
    if (room?.teacher?.user?.name) {
      setForm((f) => (f.kepala_ruang_nama ? f : { ...f, kepala_ruang_nama: room.teacher.user.name }));
    }
  }, [roomId, rooms]);

  const handleUnduh = async () => {
    if (!roomId) {
      alert('Pilih ruang dulu.');
      return;
    }
    const { tanggal, kepala_ruang_nama, kepala_ruang_nbm, ...disimpan } = form;
    localStorage.setItem('kir_export_form', JSON.stringify(disimpan));

    setDownloading(true);
    try {
      const res = await api.get('/assets/export-kir', {
        params: { room_id: roomId, ...form },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'KIR.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuat KIR.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-line-200 shrink-0">
          <h3 className="font-display font-semibold text-ink-900">Export Kartu Inventaris Ruangan</h3>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto space-y-3">
          {!fixedRoomId && (
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="field-input w-full text-ink-700">
              <option value="">Pilih ruang...</option>
              {rooms.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Provinsi" value={form.provinsi || ''} onChange={(e) => setForm({ ...form, provinsi: e.target.value })} className="field-input" />
            <input placeholder="Kabupaten" value={form.kabupaten || ''} onChange={(e) => setForm({ ...form, kabupaten: e.target.value })} className="field-input" />
          </div>
          <input placeholder="Unit (kosongkan = nama sekolah)" value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="field-input w-full" />
          <input placeholder="Tanggal (mis. 9 Agustus 2026)" value={form.tanggal || ''} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="field-input w-full" />

          <div className="pt-2 border-t border-line-200">
            <p className="text-xs font-medium text-ink-500 mb-2">Waka Sarpras</p>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Nama" value={form.waka_sarpras_nama || ''} onChange={(e) => setForm({ ...form, waka_sarpras_nama: e.target.value })} className="field-input" />
              <input placeholder="NBM" value={form.waka_sarpras_nbm || ''} onChange={(e) => setForm({ ...form, waka_sarpras_nbm: e.target.value })} className="field-input" />
            </div>
          </div>

          <div className="pt-2 border-t border-line-200">
            <p className="text-xs font-medium text-ink-500 mb-2">Kepala Ruangan</p>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Nama" value={form.kepala_ruang_nama || ''} onChange={(e) => setForm({ ...form, kepala_ruang_nama: e.target.value })} className="field-input" />
              <input placeholder="NBM" value={form.kepala_ruang_nbm || ''} onChange={(e) => setForm({ ...form, kepala_ruang_nbm: e.target.value })} className="field-input" />
            </div>
          </div>

          <button onClick={handleUnduh} disabled={downloading} className="btn-primary w-full justify-center mt-2 disabled:opacity-50">
            <FileSpreadsheet className="w-4 h-4" /> {downloading ? 'Membuat file...' : 'Unduh Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
