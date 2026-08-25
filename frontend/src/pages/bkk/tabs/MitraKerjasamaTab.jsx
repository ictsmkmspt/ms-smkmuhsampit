import { useEffect, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import api from '../../../api/axios';

const JENIS_LABEL = { pkl: 'PKL Saja', rekrutmen: 'Rekrutmen Saja', keduanya: 'PKL & Rekrutmen' };
const JENIS_BADGE = { pkl: 'badge-soft', rekrutmen: 'badge-honey', keduanya: 'badge-brand' };

/**
 * Mitra & Kerja Sama — data jenis kerja sama + dokumen MoU per IDUKA.
 * Data master perusahaan (nama/alamat/GPS) tetap dikelola Waka Humas lewat
 * Kelola IDUKA, di sini BKK cuma mengubah 2 field ini lewat
 * BkkController::updateKerjasama().
 */
export default function MitraKerjasamaTab() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [jenis, setJenis] = useState('keduanya');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/iduka').then((res) => { setList(res.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const startEdit = (d) => {
    setEditId(d.id);
    setJenis(d.jenis_kerjasama || 'keduanya');
    setFile(null);
  };

  const handleSave = async (id) => {
    setSaving(true);
    const formData = new FormData();
    formData.append('_method', 'PUT');
    formData.append('jenis_kerjasama', jenis);
    if (file) formData.append('dokumen_mou', file);
    try {
      await api.post(`/bkk/iduka/${id}/kerjasama`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-center text-ink-300 text-sm py-10">Memuat...</p>
      ) : list.length === 0 ? (
        <div className="surface-card p-8 text-center text-ink-300 text-sm">Belum ada IDUKA terdaftar.</div>
      ) : (
        <div className="space-y-3">
          {list.map((d) => (
            <div key={d.id} className="surface-card p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-display font-semibold text-sm text-ink-900">{d.nama_perusahaan}</h3>
                <span className={`badge-soft shrink-0 ${JENIS_BADGE[d.jenis_kerjasama]}`}>{JENIS_LABEL[d.jenis_kerjasama]}</span>
              </div>
              <p className="text-xs text-ink-500">{d.alamat || '-'}</p>

              {d.dokumen_mou_url && (
                <a href={d.dokumen_mou_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 mt-2">
                  <FileText className="w-3.5 h-3.5" /> Lihat Dokumen MoU
                </a>
              )}

              {editId === d.id ? (
                <div className="mt-3 pt-3 border-t border-line-200 space-y-2">
                  <select value={jenis} onChange={(e) => setJenis(e.target.value)} className="field-input text-sm">
                    <option value="pkl">PKL Saja</option>
                    <option value="rekrutmen">Rekrutmen Saja</option>
                    <option value="keduanya">PKL & Rekrutmen</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer border border-dashed border-line-300 rounded-lg px-3 py-2 hover:border-brand-400 transition">
                    <Upload className="w-4 h-4 text-ink-400" />
                    {file ? file.name : 'Unggah dokumen MoU (PDF, opsional)'}
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(d.id)} disabled={saving} className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-3 py-1.5">
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                    <button onClick={() => setEditId(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5">Batal</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => startEdit(d)} className="text-xs font-medium text-ink-500 hover:text-brand-600 border border-line-200 rounded-lg px-2.5 py-1.5 mt-3">
                  Edit Kerja Sama
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
