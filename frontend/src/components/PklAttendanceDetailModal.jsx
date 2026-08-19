import { useEffect, useState } from 'react';
import { X, PenSquare, CheckCircle2, Printer, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import api from '../api/axios';
import DateInput from './DateInput';
import { fmtDMY } from '../utils/date';

const STATUS_LABEL = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alpa: 'Alpa' };
const STATUS_BADGE = { hadir: 'badge-brand', izin: 'badge-honey', sakit: 'badge-honey', alpa: 'badge-rose' };
const PAGE_SIZE = 5;

/**
 * Panel riwayat absensi PKL 1 penempatan, dipakai bersama oleh dashboard Guru
 * (Bimbingan PKL) dan IDUKA (Siswa Magang) — jadi cukup ditulis sekali.
 * Dilengkapi form koreksi manual, tombol verifikasi (khusus IDUKA/admin lewat
 * prop canVerify), tombol cetak jurnal, dan paginasi 5 data per halaman.
 */
export default function PklAttendanceDetailModal({ placement, onClose, canVerify = false, showCetak = true }) {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', status: 'hadir', time_in: '', time_out: '', catatan_koreksi: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    return api.get(`/pkl-placements/${placement.id}/attendances`)
      .then((res) => setAttendances(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [placement.id]); // eslint-disable-line

  const handleKoreksi = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/pkl-attendances/koreksi', {
        pkl_placement_id: placement.id,
        date: form.date,
        status: form.status,
        time_in: form.time_in || null,
        time_out: form.time_out || null,
        catatan_koreksi: form.catatan_koreksi || null,
      });
      setForm({ date: '', status: 'hadir', time_in: '', time_out: '', catatan_koreksi: '' });
      setShowForm(false);
      setPage(1);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan koreksi.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifikasi = async (id) => {
    setVerifyingId(id);
    try {
      await api.post(`/pkl-attendances/${id}/verifikasi`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memverifikasi absensi.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleCetak = () => {
    window.open(`/print/pkl-jurnal?placement_id=${placement.id}`, '_blank');
  };

  const handleHapus = async (id) => {
    if (!confirm('Hapus baris absensi ini?')) return;
    try {
      await api.delete(`/pkl-attendances/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus absensi.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(attendances.length / PAGE_SIZE));
  const paginated = attendances.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-line-200">
          <div>
            <h3 className="font-display font-semibold text-ink-900">{placement.student?.user?.name}</h3>
            <p className="text-xs text-ink-500 mt-0.5">
              {placement.student?.class_room?.name || '-'} · {placement.iduka?.nama_perusahaan || '-'}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 border-b border-line-200 flex flex-wrap items-center gap-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              <PenSquare className="w-4 h-4" /> Koreksi / tambah absensi manual
            </button>
          ) : (
            <form onSubmit={handleKoreksi} className="space-y-2 w-full">
              {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <DateInput
                  value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="field-input text-sm" required
                />
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="field-input text-sm">
                  <option value="hadir">Hadir</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="alpa">Alpa</option>
                </select>
                <input
                  type="time" value={form.time_in} onChange={(e) => setForm({ ...form, time_in: e.target.value })}
                  className="field-input text-sm" placeholder="Jam masuk"
                />
                <input
                  type="time" value={form.time_out} onChange={(e) => setForm({ ...form, time_out: e.target.value })}
                  className="field-input text-sm" placeholder="Jam pulang"
                />
              </div>
              <input
                type="text" value={form.catatan_koreksi} onChange={(e) => setForm({ ...form, catatan_koreksi: e.target.value })}
                className="field-input text-sm w-full" placeholder="Alasan koreksi (opsional)"
              />
              <div className="flex gap-2">
                <button disabled={saving} className="text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg px-4 py-2 disabled:opacity-50">
                  {saving ? 'Menyimpan...' : 'Simpan Koreksi'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="text-sm font-medium text-ink-500 hover:text-ink-700 px-2">
                  Batal
                </button>
              </div>
            </form>
          )}

          {showCetak && (
            <button
              onClick={handleCetak}
              className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-600 ml-auto"
            >
              <Printer className="w-4 h-4" /> Cetak Jurnal
            </button>
          )}
        </div>

        <div className="overflow-y-auto p-5">
          {loading ? (
            <p className="text-center text-ink-300 py-6">Memuat...</p>
          ) : attendances.length === 0 ? (
            <p className="text-center text-ink-300 py-6">Belum ada riwayat absensi.</p>
          ) : (
            <>
              <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-line-200">
                    <th className="pb-2 font-medium whitespace-nowrap px-2">Tanggal</th>
                    <th className="font-medium whitespace-nowrap px-2">Masuk</th>
                    <th className="font-medium whitespace-nowrap px-2">Pulang</th>
                    <th className="font-medium whitespace-nowrap px-2">Status</th>
                    <th className="font-medium text-right whitespace-nowrap px-2">Verifikasi</th>
                    <th className="pb-2 whitespace-nowrap px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((a) => (
                    <tr key={a.id} className="border-t border-line-200 align-top">
                      <td className="py-2.5 text-ink-700 whitespace-nowrap px-2">{fmtDMY(a.date)}</td>
                      <td className="text-ink-900 whitespace-nowrap px-2">{a.time_in ? a.time_in.slice(0, 5) : '-'}</td>
                      <td className="text-ink-900 whitespace-nowrap px-2">{a.time_out ? a.time_out.slice(0, 5) : '-'}</td>
                      <td className="whitespace-nowrap px-2">
                        <span className={`badge-soft ${STATUS_BADGE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                        {a.corrected_by && <p className="text-[10px] text-ink-400 mt-1">dikoreksi manual</p>}
                      </td>
                      <td className="text-right whitespace-nowrap px-2">
                        {a.verified_at ? (
                          <span className="flex items-center justify-end gap-1 text-xs text-brand-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                          </span>
                        ) : canVerify ? (
                          <button
                            onClick={() => handleVerifikasi(a.id)}
                            disabled={verifyingId === a.id}
                            className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg px-2.5 py-1"
                          >
                            {verifyingId === a.id ? '...' : 'Verifikasi'}
                          </button>
                        ) : (
                          <span className="text-xs text-ink-300">Belum diverifikasi</span>
                        )}
                      </td>
                      <td className="text-right whitespace-nowrap px-2">
                        {!a.verified_at && (
                          <button onClick={() => handleHapus(a.id)} className="text-ink-300 hover:text-honey-700" title="Hapus baris ini">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {attendances.length > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-line-200">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-ink-500"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                  </button>
                  <span className="text-xs text-ink-400">Halaman {page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-ink-500"
                  >
                    Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
