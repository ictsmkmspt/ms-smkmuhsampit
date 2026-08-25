import { useEffect, useState } from 'react';
import { CheckCircle2, Printer, X, CheckCircle, Info, CalendarPlus, Wallet, Trash2, History, Plus } from 'lucide-react';
import api from '../../api/axios';
import { BULAN, formatRupiah, Avatar } from './shared';
import { fmtDMY } from '../../utils/date';

const emptyTagihanForm = { nama_tagihan: '', nominal: '', keterangan: '' };

/**
 * Panel "riwayat tagihan 1 siswa" dengan tombol Bayar Lunas / Bayar Sebagian
 * / Cetak Nota per baris. Bisa gabungan SPP bulanan DAN Tagihan Lain (biaya
 * tidak tetap), atau cuma salah satunya lewat showSpp/showTagihanLain —
 * dipakai gabungan di menu Alumni (perlu lihat semua tunggakan sebelum
 * lulus), tapi dipisah jadi 2 kartu pencarian sendiri-sendiri di Dashboard
 * ("Cari & Bayar SPP Siswa" vs "Cari & Bayar Tagihan Lain Siswa") supaya TU
 * tidak salah bayar tagihan yang beda jenis. Kalau salah satu dimatikan,
 * request API-nya juga tidak dikirim sama sekali (bukan cuma disembunyikan).
 */
export default function StudentSppPanel({ student, onClose, onPaid, showSpp = true, showTagihanLain = true, showBayarDimuka = true, allowAddTagihan = false }) {
  const [spp, setSpp] = useState(null);
  const [tagihanLain, setTagihanLain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddTagihan, setShowAddTagihan] = useState(false);
  const [tagihanForm, setTagihanForm] = useState(emptyTagihanForm);
  const [savingTagihan, setSavingTagihan] = useState(false);
  const [tagihanFormError, setTagihanFormError] = useState('');
  const [editingTagihanId, setEditingTagihanId] = useState(null);
  const [editTagihanForm, setEditTagihanForm] = useState(emptyTagihanForm);
  const [savingEditTagihan, setSavingEditTagihan] = useState(false);
  const [editTagihanError, setEditTagihanError] = useState('');
  const [deletingTagihanId, setDeletingTagihanId] = useState(null);
  const [payingId, setPayingId] = useState(null); // `${type}-${id}` yang sedang diproses (bayar lunas)
  const [payingDimuka, setPayingDimuka] = useState(false);
  const [partialTarget, setPartialTarget] = useState(null); // `${type}-${id}` yang lagi buka form bayar sebagian
  const [partialAmount, setPartialAmount] = useState('');
  const [payingPartial, setPayingPartial] = useState(false);
  const [riwayatTarget, setRiwayatTarget] = useState(null); // `${type}-${id}` yang lagi buka riwayat cicilan
  const [riwayatData, setRiwayatData] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);
  const [deletingPembayaranId, setDeletingPembayaranId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const notify = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') setTimeout(() => setFeedback((f) => (f?.message === message ? null : f)), 4000);
  };

  const loadAll = () => {
    setLoading(true);
    const calls = [];
    if (showSpp) calls.push(api.get(`/spp/siswa/${student.id}`).then((res) => setSpp(res.data.spp)));
    if (showTagihanLain) calls.push(api.get(`/tagihan-lain/siswa/${student.id}`).then((res) => setTagihanLain(res.data.tagihan)));
    Promise.all(calls)
      .catch(() => notify('error', 'Gagal memuat riwayat tagihan siswa ini.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, [student.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const endpointFor = (type, id) => (type === 'spp' ? `/spp/${id}` : `/tagihan-lain/${id}`);
  const labelFor = (type, item) => (type === 'spp' ? `${BULAN[item.bulan - 1]} ${item.tahun}` : item.nama_tagihan);
  const printUrlFor = (type, id) => (type === 'spp' ? `/print/spp-nota?spp_id=${id}` : `/print/tagihan-lain-nota?tagihan_id=${id}`);

  const applyUpdate = (type, updated) => {
    if (type === 'spp') {
      setSpp((prev) => (prev || []).map((x) => (x.id === updated.id ? updated : x)));
    } else {
      setTagihanLain((prev) => (prev || []).map((x) => (x.id === updated.id ? updated : x)));
    }
  };

  const bayarLunas = async (type, item) => {
    if (!confirm(`Tandai "${labelFor(type, item)}" atas nama ${student.user?.name} sebagai LUNAS?`)) return;
    setPayingId(`${type}-${item.id}`);
    try {
      const res = await api.put(`${endpointFor(type, item.id)}/status`, { status: 'lunas' });
      applyUpdate(type, res.data);
      notify('success', `Pembayaran "${labelFor(type, item)}" tercatat lunas.`);
      onPaid?.();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal mencatat pembayaran.');
    } finally {
      setPayingId(null);
    }
  };

  const openPartial = (type, item) => {
    setPartialTarget(`${type}-${item.id}`);
    setPartialAmount('');
  };

  const submitPartial = async (type, item) => {
    const jumlah = Number(partialAmount);
    if (!jumlah || jumlah < 1) return;
    setPayingPartial(true);
    try {
      const res = await api.put(`${endpointFor(type, item.id)}/bayar-sebagian`, { jumlah });
      applyUpdate(type, res.data);
      setPartialTarget(null);
      setPartialAmount('');
      notify('success', `Pembayaran sebagian Rp${jumlah.toLocaleString('id-ID')} untuk "${labelFor(type, item)}" tercatat.`);
      onPaid?.();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal mencatat pembayaran sebagian.');
    } finally {
      setPayingPartial(false);
    }
  };

  // Riwayat cicilan 1 tagihan — dipakai TU untuk koreksi kalau ada baris
  // "Bayar Sebagian" yang salah input jumlahnya.
  const toggleRiwayat = async (type, item) => {
    const key = `${type}-${item.id}`;
    if (riwayatTarget === key) {
      setRiwayatTarget(null);
      return;
    }
    setRiwayatTarget(key);
    setLoadingRiwayat(true);
    try {
      const res = await api.get(`${endpointFor(type, item.id)}/pembayaran`);
      setRiwayatData(res.data);
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal memuat riwayat pembayaran.');
      setRiwayatTarget(null);
    } finally {
      setLoadingRiwayat(false);
    }
  };

  const hapusPembayaran = async (type, item, pembayaranId) => {
    if (!confirm('Hapus baris cicilan ini? Nominal terbayar & status tagihan akan dihitung ulang otomatis.')) return;
    setDeletingPembayaranId(pembayaranId);
    try {
      const res = await api.delete(`${endpointFor(type, item.id)}/pembayaran/${pembayaranId}`);
      applyUpdate(type, res.data);
      setRiwayatData((prev) => prev.filter((p) => p.id !== pembayaranId));
      onPaid?.();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal menghapus baris cicilan.');
    } finally {
      setDeletingPembayaranId(null);
    }
  };

  const statusBadge = (status) => {
    if (status === 'lunas') return <span className="badge-soft badge-brand">Lunas</span>;
    if (status === 'sebagian') return <span className="badge-soft badge-honey">Sebagian</span>;
    return <span className="badge-soft badge-rose">Belum Bayar</span>;
  };

  const renderRow = (type, item) => {
    const key = `${type}-${item.id}`;
    const sisa = item.nominal - (item.jumlah_dibayar || 0);
    const belumLunas = item.status !== 'lunas';

    return (
      <li key={key} className="py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{labelFor(type, item)}</p>
            <p className="text-xs text-ink-500">
              {formatRupiah(item.nominal)}
              {item.status === 'sebagian' && (
                <span className="text-honey-700"> · sudah dibayar {formatRupiah(item.jumlah_dibayar)}, sisa {formatRupiah(sisa)}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {item.status === 'lunas' ? (
              <>
                {statusBadge(item.status)}
                <button
                  onClick={() => window.open(printUrlFor(type, item.id), '_blank')}
                  className="flex items-center gap-1.5 text-xs font-medium text-ink-700 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-lg px-3 py-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Nota
                </button>
                <button
                  onClick={() => toggleRiwayat(type, item)}
                  title="Riwayat cicilan (buat koreksi salah input)"
                  className={`shrink-0 p-1.5 rounded-lg border transition ${
                    riwayatTarget === key ? 'text-brand-600 border-brand-200 bg-brand-50' : 'text-ink-400 border-line-200 hover:text-brand-600'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                {item.status === 'sebagian' && statusBadge(item.status)}
                <button
                  onClick={() => openPartial(type, item)}
                  disabled={payingId === key}
                  className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 disabled:opacity-60 rounded-lg px-3 py-1.5 transition"
                >
                  Cicil
                </button>
                <button
                  onClick={() => bayarLunas(type, item)}
                  disabled={payingId === key}
                  className="text-xs font-medium text-white bg-[#15803D] hover:bg-[#116530] disabled:opacity-60 rounded-lg px-4 py-1.5 transition"
                >
                  {payingId === key ? 'Memproses...' : 'Lunas'}
                </button>
                {item.status === 'sebagian' && (
                  <button
                    onClick={() => toggleRiwayat(type, item)}
                    title="Riwayat cicilan (buat koreksi salah input)"
                    className={`shrink-0 p-1.5 rounded-lg border transition ${
                      riwayatTarget === key ? 'text-brand-600 border-brand-200 bg-brand-50' : 'text-ink-400 border-line-200 hover:text-brand-600'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
            {type === 'lain' && allowAddTagihan && (
              <>
                <button
                  onClick={() => openEditTagihan(item)}
                  className="text-xs font-medium text-ink-500 hover:text-brand-600 hover:bg-mist-50 rounded-lg px-2 py-1.5 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteTagihan(item)}
                  disabled={deletingTagihanId === item.id}
                  title="Hapus tagihan ini"
                  className="shrink-0 p-1.5 text-ink-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-40 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {type === 'lain' && editingTagihanId === item.id && (
          <form onSubmit={(e) => handleEditTagihan(e, item.id)} className="mt-2 bg-mist-50 border border-line-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-ink-700">Edit Tagihan</p>
              <button type="button" onClick={() => setEditingTagihanId(null)} className="text-ink-400 hover:text-ink-600"><X className="w-3.5 h-3.5" /></button>
            </div>
            {editTagihanError && <p className="text-xs text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-2">{editTagihanError}</p>}
            <div className="grid sm:grid-cols-2 gap-2 mb-2">
              <input placeholder="Nama tagihan" value={editTagihanForm.nama_tagihan} onChange={(e) => setEditTagihanForm({ ...editTagihanForm, nama_tagihan: e.target.value })} className="field-input text-sm py-1.5" required />
              <input type="number" min={0} placeholder="Nominal" value={editTagihanForm.nominal} onChange={(e) => setEditTagihanForm({ ...editTagihanForm, nominal: e.target.value })} className="field-input text-sm py-1.5" required />
              <input placeholder="Keterangan (opsional)" value={editTagihanForm.keterangan} onChange={(e) => setEditTagihanForm({ ...editTagihanForm, keterangan: e.target.value })} className="field-input text-sm py-1.5 sm:col-span-2" />
            </div>
            <div className="flex gap-2">
              <button disabled={savingEditTagihan} className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg px-3 py-1.5 transition">
                {savingEditTagihan ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button type="button" onClick={() => setEditingTagihanId(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-1.5">Batal</button>
            </div>
          </form>
        )}

        {partialTarget === key && belumLunas && (
          <div className="mt-2 flex items-center gap-2 bg-mist-50 border border-line-200 rounded-lg p-2">
            <input
              type="number" autoFocus min={1} max={sisa}
              value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)}
              placeholder={`Maks ${formatRupiah(sisa)}`}
              className="field-input py-1 text-sm flex-1"
            />
            <button
              onClick={() => submitPartial(type, item)}
              disabled={payingPartial || !partialAmount}
              className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg px-3 py-1.5"
            >
              {payingPartial ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button onClick={() => setPartialTarget(null)} className="text-xs font-medium text-ink-500 hover:text-ink-700 px-2 py-1.5">
              Batal
            </button>
          </div>
        )}

        {riwayatTarget === key && (
          <div className="mt-2 bg-mist-50 border border-line-200 rounded-lg p-3">
            <p className="text-xs font-medium text-ink-500 mb-2">Riwayat Cicilan — {labelFor(type, item)}</p>
            {loadingRiwayat ? (
              <p className="text-xs text-ink-400 text-center py-3">Memuat...</p>
            ) : riwayatData.length === 0 ? (
              <p className="text-xs text-ink-400 text-center py-3">Belum ada baris cicilan tercatat.</p>
            ) : (
              <ul className="divide-y divide-line-200">
                {riwayatData.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0 text-xs">
                      <span className="font-medium text-ink-900">{formatRupiah(p.jumlah)}</span>
                      <span className="text-ink-400"> · {fmtDMY(p.tanggal_bayar)}</span>
                      {p.keterangan && <span className="text-ink-400"> · {p.keterangan}</span>}
                      {p.dicatat_oleh?.name && <span className="text-ink-300"> · dicatat {p.dicatat_oleh.name}</span>}
                    </div>
                    <button
                      onClick={() => hapusPembayaran(type, item, p.id)}
                      disabled={deletingPembayaranId === p.id}
                      title="Hapus baris ini (salah input)"
                      className="shrink-0 text-ink-300 hover:text-honey-700 disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </li>
    );
  };

  const tunggakanSpp = (spp || []).filter((s) => s.status !== 'lunas');
  const tunggakanLain = (tagihanLain || []).filter((t) => t.status !== 'lunas');
  const totalTunggakan =
    tunggakanSpp.reduce((sum, s) => sum + (s.nominal - (s.jumlah_dibayar || 0)), 0) +
    tunggakanLain.reduce((sum, t) => sum + (t.nominal - (t.jumlah_dibayar || 0)), 0);

  // Bulan berikutnya yang belum ada tagihannya sama sekali (dihitung dari
  // catatan terakhir siswa ini, atau bulan berjalan kalau belum ada riwayat
  // sama sekali) — dipakai buat opsi "Bayar di Muka".
  const now = new Date();
  let nextBulan = now.getMonth() + 1;
  let nextTahun = now.getFullYear();
  if (spp && spp.length > 0) {
    nextBulan = spp[0].bulan + 1;
    nextTahun = spp[0].tahun;
    if (nextBulan > 12) { nextBulan = 1; nextTahun += 1; }
  }

  const bayarDimuka = async () => {
    if (!confirm(`Buat & catat pembayaran di muka SPP ${BULAN[nextBulan - 1]} ${nextTahun} untuk ${student.user?.name}? Tagihan bulan ini belum dibuat untuk siswa lain.`)) return;
    setPayingDimuka(true);
    try {
      const res = await api.post('/spp/bayar-dimuka', { student_id: student.id, bulan: nextBulan, tahun: nextTahun });
      setSpp((prev) => [res.data, ...(prev || [])]);
      notify('success', `Pembayaran di muka SPP ${BULAN[nextBulan - 1]} ${nextTahun} tercatat.`);
      onPaid?.();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal mencatat pembayaran di muka.');
    } finally {
      setPayingDimuka(false);
    }
  };

  // Buat tagihan lain BARU untuk siswa ini — dipakai menu Alumni buat
  // menagih biaya pasca-lulus (mis. legalisir ijazah, transkrip) yang
  // tidak berkaitan dengan tunggakan SPP sebelum lulus.
  const handleAddTagihan = async (e) => {
    e.preventDefault();
    setTagihanFormError('');
    if (!tagihanForm.nama_tagihan.trim()) { setTagihanFormError('Nama tagihan wajib diisi.'); return; }
    if (tagihanForm.nominal === '' || Number(tagihanForm.nominal) < 0) { setTagihanFormError('Nominal wajib diisi.'); return; }
    setSavingTagihan(true);
    try {
      const res = await api.post('/tagihan-lain', {
        student_id: student.id,
        nama_tagihan: tagihanForm.nama_tagihan,
        nominal: Number(tagihanForm.nominal),
        keterangan: tagihanForm.keterangan || undefined,
      });
      setTagihanLain((prev) => [res.data, ...(prev || [])]);
      setTagihanForm(emptyTagihanForm);
      setShowAddTagihan(false);
      notify('success', `Tagihan "${res.data.nama_tagihan}" berhasil dibuat.`);
      onPaid?.();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setTagihanFormError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal membuat tagihan.');
    } finally {
      setSavingTagihan(false);
    }
  };

  const openEditTagihan = (t) => {
    setEditTagihanError('');
    setEditingTagihanId(t.id);
    setEditTagihanForm({ nama_tagihan: t.nama_tagihan, nominal: t.nominal, keterangan: t.keterangan || '' });
  };

  const handleEditTagihan = async (e, id) => {
    e.preventDefault();
    setEditTagihanError('');
    if (!editTagihanForm.nama_tagihan.trim()) { setEditTagihanError('Nama tagihan wajib diisi.'); return; }
    if (editTagihanForm.nominal === '' || Number(editTagihanForm.nominal) < 0) { setEditTagihanError('Nominal wajib diisi.'); return; }
    setSavingEditTagihan(true);
    try {
      const res = await api.put(`/tagihan-lain/${id}`, {
        nama_tagihan: editTagihanForm.nama_tagihan,
        nominal: Number(editTagihanForm.nominal),
        keterangan: editTagihanForm.keterangan || null,
      });
      setTagihanLain((prev) => (prev || []).map((x) => (x.id === id ? res.data : x)));
      setEditingTagihanId(null);
      notify('success', `Tagihan "${res.data.nama_tagihan}" berhasil diperbarui.`);
      onPaid?.();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setEditTagihanError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSavingEditTagihan(false);
    }
  };

  const handleDeleteTagihan = async (t) => {
    if (!confirm(`Hapus tagihan "${t.nama_tagihan}" atas nama ${student.user?.name}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setDeletingTagihanId(t.id);
    try {
      await api.delete(`/tagihan-lain/${t.id}`);
      setTagihanLain((prev) => (prev || []).filter((x) => x.id !== t.id));
      notify('success', `Tagihan "${t.nama_tagihan}" dihapus.`);
      onPaid?.();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal menghapus tagihan.');
    } finally {
      setDeletingTagihanId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-line-200">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={student.user?.name} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">{student.user?.name}</p>
            <p className="text-xs text-ink-500">{student.class_room?.name || '-'} · NIS {student.nis}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="shrink-0 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5">
            Kembali
          </button>
        )}
      </div>

      {feedback && (
        <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm mb-4 ${
          feedback.type === 'success' ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
          <p className="flex-1">{feedback.message}</p>
          <button onClick={() => setFeedback(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-ink-300 py-6 text-sm">Memuat riwayat tagihan...</p>
      ) : (
        <>
          {showSpp && showBayarDimuka && (
            <div className="mb-4 pb-4 border-b border-line-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <CalendarPlus className="w-4 h-4 text-ink-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-ink-500">Bayar SPP di Muka</p>
                  <p className="text-sm text-ink-700 truncate">{BULAN[nextBulan - 1]} {nextTahun} · belum ditagih</p>
                </div>
              </div>
              <button
                onClick={bayarDimuka}
                disabled={payingDimuka}
                className="shrink-0 text-xs font-medium text-white bg-[#15803D] hover:bg-[#116530] disabled:opacity-60 rounded-lg px-4 py-1.5 transition"
              >
                {payingDimuka ? 'Memproses...' : 'Bayar di Muka'}
              </button>
            </div>
          )}

          {totalTunggakan > 0 ? (
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-ink-500">
                Total Tunggakan{showSpp && showTagihanLain ? ' (SPP + Tagihan Lain)' : showSpp ? ' SPP' : ' Tagihan Lain'}
              </p>
              <p className="text-lg font-display font-semibold text-honey-700">{formatRupiah(totalTunggakan)}</p>
            </div>
          ) : (
            <div className="text-center py-4 mb-1">
              <CheckCircle2 className="w-8 h-8 text-brand-500 mx-auto mb-2" />
              <p className="text-sm text-ink-700">Semua tagihan {student.user?.name} sudah lunas.</p>
            </div>
          )}

          {showSpp && (
            <div className="mb-4">
              <p className="text-xs font-medium text-ink-500 mb-1">SPP</p>
              {(spp || []).length === 0 ? (
                <p className="text-sm text-ink-400 text-center py-3">Belum ada tagihan SPP.</p>
              ) : (
                <ul className="divide-y divide-line-200">{spp.map((s) => renderRow('spp', s))}</ul>
              )}
            </div>
          )}

          {showTagihanLain && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-ink-500 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Tagihan Lain</p>
                {allowAddTagihan && !showAddTagihan && (
                  <button
                    onClick={() => { setTagihanForm(emptyTagihanForm); setTagihanFormError(''); setShowAddTagihan(true); }}
                    className="flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-2.5 py-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Tagihan
                  </button>
                )}
              </div>

              {showAddTagihan && (
                <form onSubmit={handleAddTagihan} className="bg-mist-50 border border-line-200 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-ink-700">Tagihan Baru untuk {student.user?.name}</p>
                    <button type="button" onClick={() => setShowAddTagihan(false)} className="text-ink-400 hover:text-ink-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                  {tagihanFormError && <p className="text-xs text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-2">{tagihanFormError}</p>}
                  <div className="grid sm:grid-cols-2 gap-2 mb-2">
                    <input placeholder="Nama tagihan (mis. Legalisir Ijazah)" value={tagihanForm.nama_tagihan} onChange={(e) => setTagihanForm({ ...tagihanForm, nama_tagihan: e.target.value })} className="field-input text-sm py-1.5" required />
                    <input type="number" min={0} placeholder="Nominal" value={tagihanForm.nominal} onChange={(e) => setTagihanForm({ ...tagihanForm, nominal: e.target.value })} className="field-input text-sm py-1.5" required />
                    <input placeholder="Keterangan (opsional)" value={tagihanForm.keterangan} onChange={(e) => setTagihanForm({ ...tagihanForm, keterangan: e.target.value })} className="field-input text-sm py-1.5 sm:col-span-2" />
                  </div>
                  <button disabled={savingTagihan} className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60 rounded-lg px-3 py-1.5 transition">
                    {savingTagihan ? 'Menyimpan...' : 'Simpan Tagihan'}
                  </button>
                </form>
              )}

              {(tagihanLain || []).length === 0 ? (
                <p className="text-sm text-ink-400 text-center py-3">Belum ada tagihan lain.</p>
              ) : (
                <ul className="divide-y divide-line-200">{tagihanLain.map((t) => renderRow('lain', t))}</ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
