import { useEffect, useState } from 'react';
import { Search, Pencil, Check, X, RefreshCw, Trash2, Receipt, Info, CheckCircle, Printer } from 'lucide-react';
import api from '../../../api/axios';
import { BULAN, formatRupiah, Avatar } from '../shared';
import TruncateText from '../../../components/TruncateText';

export default function TagihanTab() {
  const now = new Date();
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [classRoomId, setClassRoomId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [classes, setClasses] = useState([]);
  const [spps, setSpps] = useState([]);
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingBulan, setDeletingBulan] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editNominal, setEditNominal] = useState('');
  const [savingId, setSavingId] = useState(null);

  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }

  const notify = (type, message) => {
    setFeedback({ type, message });
    if (type === 'success') setTimeout(() => setFeedback((f) => (f?.message === message ? null : f)), 4000);
  };

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
  }, []);

  const loadSpp = () => {
    setLoading(true);
    const params = { bulan, tahun };
    if (classRoomId) params.class_room_id = classRoomId;
    if (status) params.status = status;
    if (search) params.search = search;
    api.get('/spp', { params })
      .then((res) => { setSpps(res.data.data); setTotalSiswa(res.data.total_siswa); })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya load sekali saat mount, perubahan filter dipicu manual lewat tombol Tampilkan
  useEffect(() => { loadSpp(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/spp/generate', { bulan, tahun });
      notify('success', res.data.message);
      loadSpp();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal membuat tagihan SPP.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteBulan = async () => {
    if (spps.length === 0) return;
    if (!confirm(`Hapus SEMUA ${spps.length} tagihan SPP bulan ${BULAN[bulan - 1]} ${tahun}? Aksi ini tidak bisa dibatalkan.`)) return;
    setDeletingBulan(true);
    try {
      const res = await api.delete('/spp/bulan', { params: { bulan, tahun } });
      notify('success', res.data.message);
      loadSpp();
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal menghapus tagihan SPP bulan ini.');
    } finally {
      setDeletingBulan(false);
    }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditNominal(s.nominal);
  };

  const saveNominal = async (s) => {
    setSavingId(s.id);
    try {
      const res = await api.put(`/spp/${s.id}`, { nominal: Number(editNominal) });
      setSpps((prev) => prev.map((x) => (x.id === s.id ? res.data : x)));
      setEditingId(null);
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal menyimpan nominal.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Hapus tagihan SPP ${s.student?.user?.name} bulan ${BULAN[s.bulan - 1]} ${s.tahun}? Aksi ini tidak bisa dibatalkan.`)) return;
    setSavingId(s.id);
    try {
      await api.delete(`/spp/${s.id}`);
      setSpps((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal menghapus tagihan SPP.');
    } finally {
      setSavingId(null);
    }
  };

  const toggleStatus = async (s) => {
    const next = s.status === 'lunas' ? 'belum_bayar' : 'lunas';
    if (next === 'belum_bayar' && !confirm(`Tandai SPP ${s.student?.user?.name} bulan ini jadi "Belum Bayar" lagi?`)) return;
    setSavingId(s.id);
    try {
      const res = await api.put(`/spp/${s.id}/status`, { status: next });
      setSpps((prev) => prev.map((x) => (x.id === s.id ? res.data : x)));
      if (next === 'lunas') notify('success', `Pembayaran SPP ${s.student?.user?.name} tercatat lunas.`);
    } catch (err) {
      notify('error', err.response?.data?.message || 'Gagal mengubah status pembayaran.');
    } finally {
      setSavingId(null);
    }
  };

  const totalLunas = spps.filter((s) => s.status === 'lunas').length;
  const totalBelum = spps.filter((s) => s.status === 'belum_bayar').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-ink-900 text-lg">Tagihan SPP</h2>
        <p className="text-sm text-ink-500">Buat tagihan bulanan, ubah nominal per siswa, dan catat status pembayaran.</p>
      </div>

      {feedback && (
        <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm ${
          feedback.type === 'success' ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
          <p className="flex-1">{feedback.message}</p>
          <button onClick={() => setFeedback(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="surface-card p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Bulan</label>
          <select value={bulan} onChange={(e) => setBulan(Number(e.target.value))} className="field-input text-ink-700">
            {BULAN.map((b, i) => <option key={i} value={i + 1}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Tahun</label>
          <input type="number" value={tahun} onChange={(e) => setTahun(Number(e.target.value))} className="field-input w-24" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
          <select value={classRoomId} onChange={(e) => setClassRoomId(e.target.value)} className="field-input text-ink-700">
            <option value="">Semua Kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-500 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field-input text-ink-700">
            <option value="">Semua Status</option>
            <option value="lunas">Lunas</option>
            <option value="belum_bayar">Belum Bayar</option>
          </select>
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-xs font-medium text-ink-500 mb-1">Cari Nama/NIS</label>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="field-input" placeholder="Cari siswa..."
          />
        </div>
        <button onClick={loadSpp} className="btn-primary">
          <Search className="w-4 h-4" /> Tampilkan
        </button>
        <div className="ml-auto flex gap-2">
          <span className="badge-soft badge-brand">Lunas: {totalLunas}</span>
          <span className="badge-soft badge-rose">Belum Bayar: {totalBelum}</span>
        </div>
      </div>

      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-display font-semibold text-ink-900">
            SPP {BULAN[bulan - 1]} {tahun}
          </h3>
          <div className="flex gap-2">
            <button onClick={handleGenerate} disabled={generating} className="btn-primary text-sm disabled:opacity-60">
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Memproses...' : 'Buat Tagihan Bulan Ini'}
            </button>
            {spps.length > 0 && (
              <button
                onClick={handleDeleteBulan}
                disabled={deletingBulan}
                className="flex items-center gap-1.5 text-sm font-medium text-honey-700 bg-honey-50 hover:bg-honey-100 border border-honey-200 disabled:opacity-60 rounded-xl px-4 py-2 transition"
              >
                <Trash2 className="w-4 h-4" />
                {deletingBulan ? 'Menghapus...' : 'Hapus Semua Tagihan Bulan Ini'}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-ink-300 py-6">Memuat...</p>
        ) : spps.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 rounded-full bg-mist-50 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-ink-300" />
            </div>
            <p className="text-sm font-medium text-ink-700 mb-1">Belum ada tagihan SPP untuk {BULAN[bulan - 1]} {tahun}</p>
            <p className="text-xs text-ink-500 mb-4">
              Total siswa aktif: {totalSiswa}. Klik tombol di bawah untuk membuat tagihan otomatis pakai nominal default.
            </p>
            <button onClick={handleGenerate} disabled={generating} className="btn-primary text-sm disabled:opacity-60 mx-auto">
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Memproses...' : 'Buat Tagihan Bulan Ini'}
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium">Nama Siswa</th>
                <th className="font-medium">Kelas</th>
                <th className="font-medium">Nominal</th>
                <th className="font-medium">Status</th>
                <th className="font-medium">Tgl Bayar</th>
                <th className="font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {spps.map((s) => (
                <tr key={s.id} className="border-t border-line-200">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.student?.user?.name} />
                      <span className="text-ink-900 min-w-0"><TruncateText text={s.student?.user?.name} /></span>
                    </div>
                  </td>
                  <td className="text-ink-700">{s.student?.class_room?.name || '-'}</td>
                  <td className="text-ink-700">
                    {editingId === s.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" value={editNominal} autoFocus
                          onChange={(e) => setEditNominal(e.target.value)}
                          className="field-input w-28 py-1 text-sm"
                        />
                        <button onClick={() => saveNominal(s)} disabled={savingId === s.id} className="text-brand-600 hover:text-brand-700">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-ink-300 hover:text-ink-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(s)} className="flex items-center gap-1.5 hover:text-brand-600 group">
                        {formatRupiah(s.nominal)}
                        <Pencil className="w-3 h-3 text-ink-300 group-hover:text-brand-600" />
                      </button>
                    )}
                  </td>
                  <td>
                    <span className={`badge-soft ${s.status === 'lunas' ? 'badge-brand' : 'badge-rose'}`}>
                      {s.status === 'lunas' ? 'Lunas' : 'Belum Bayar'}
                    </span>
                  </td>
                  <td className="text-ink-700 text-xs">{s.tanggal_bayar || '-'}</td>
                  <td className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => toggleStatus(s)}
                        disabled={savingId === s.id}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-40 ${
                          s.status === 'lunas'
                            ? 'text-ink-500 border-line-200 hover:bg-mist-50'
                            : 'text-white bg-[#15803D] border-transparent hover:bg-[#116530]'
                        }`}
                      >
                        {s.status === 'lunas' ? 'Batalkan' : 'Tandai Lunas'}
                      </button>
                      {s.status === 'lunas' && (
                        <button
                          onClick={() => window.open(`/print/spp-nota?spp_id=${s.id}`, '_blank')}
                          title="Cetak nota pembayaran"
                          className="text-ink-300 hover:text-brand-600"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={savingId === s.id}
                        title="Hapus tagihan ini"
                        className="text-ink-300 hover:text-honey-700 disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
