import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';

const STATUS_LABEL = { mendaftar: 'Mendaftar', verifikasi: 'Verifikasi', diterima: 'Diterima', ditolak: 'Ditolak' };
const STATUS_BADGE = { mendaftar: 'badge-soft', verifikasi: 'badge-honey', diterima: 'badge-brand', ditolak: 'badge-soft' };

export default function FormulirPpdbTab() {
  const [pendaftar, setPendaftar] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [savingId, setSavingId] = useState(null);

  const load = (status) => api.get('/ppdb', { params: { status: status || undefined } }).then((res) => setPendaftar(res.data));
  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const handleUpdateStatus = async (p, status) => {
    setSavingId(p.id);
    try {
      await api.put(`/ppdb/${p.id}`, { status, catatan: p.catatan || '' });
      load(statusFilter);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Hapus data pendaftar "${p.nama_lengkap}"?`)) return;
    await api.delete(`/ppdb/${p.id}`);
    load(statusFilter);
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400">
        <p className="text-sm text-ink-700">
          Pendaftaran PPDB dilakukan calon siswa lewat formulir publik (<code className="font-mono">/ppdb</code>, tanpa akun login). Halaman ini untuk verifikasi & memutuskan status tiap pendaftar.
        </p>
      </div>

      <div className="surface-card p-5 flex items-center gap-3">
        <label className="text-sm font-medium text-ink-700">Filter Status</label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field-input text-ink-700 w-48">
          <option value="">Semua</option>
          {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      <div className="surface-card p-5">
        <h2 className="font-display font-semibold text-ink-900 mb-4">Daftar Pendaftar <span className="text-ink-500 font-sans font-normal text-sm">({pendaftar.length})</span></h2>
        <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-500 border-b border-line-200">
              <th className="pb-2 font-medium whitespace-nowrap px-2">Kode</th>
              <th className="font-medium whitespace-nowrap px-2">Nama</th>
              <th className="font-medium whitespace-nowrap px-2">Asal Sekolah</th>
              <th className="font-medium whitespace-nowrap px-2">No. HP Ortu</th>
              <th className="font-medium whitespace-nowrap px-2">Jurusan</th>
              <th className="font-medium text-center whitespace-nowrap px-2">Status</th>
              <th className="whitespace-nowrap px-2"></th>
            </tr>
          </thead>
          <tbody>
            {pendaftar.map((p) => (
              <tr key={p.id} className="border-t border-line-200">
                <td className="py-2.5 font-mono text-xs text-ink-500 whitespace-nowrap px-2">{p.kode_pendaftaran}</td>
                <td className="text-ink-900 whitespace-nowrap px-2"><TruncateText text={p.nama_lengkap} /></td>
                <td className="text-ink-700 whitespace-nowrap px-2">{p.asal_sekolah || '-'}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{p.no_hp_orang_tua}</td>
                <td className="text-ink-700 whitespace-nowrap px-2">{p.jurusan_pilihan || '-'}</td>
                <td className="text-center whitespace-nowrap px-2">
                  <select
                    value={p.status}
                    disabled={savingId === p.id}
                    onChange={(e) => handleUpdateStatus(p, e.target.value)}
                    className={`badge-soft ${STATUS_BADGE[p.status]} border-0`}
                  >
                    {Object.entries(STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </td>
                <td className="text-right whitespace-nowrap px-2"><button onClick={() => handleDelete(p)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {pendaftar.length === 0 && <tr><td colSpan="7" className="py-6 text-center text-ink-300 whitespace-nowrap px-2">Belum ada pendaftar PPDB.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
