import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Check, AlertTriangle, Wand2, UserCheck, X } from 'lucide-react';
import api from '../../../api/axios';
import TruncateText from '../../../components/TruncateText';

// Naikkan bagian angka DI UJUNG string NIS sebanyak `delta`, pertahankan
// prefix non-angka (kalau ada) & jumlah digit (leading zero tetap sama
// panjang) — mis. "2026001" + 1 -> "2026002", "0007" + 1 -> "0008". Kalau
// NIS awal tidak diakhiri angka sama sekali, kembalikan apa adanya (tidak
// bisa diurutkan otomatis, admin isi manual untuk baris itu).
function incrementNis(nis, delta) {
  const match = nis.match(/^(.*?)(\d+)$/);
  if (!match) return nis;
  const [, prefix, digits] = match;
  const next = (BigInt(digits) + BigInt(delta)).toString().padStart(digits.length, '0');
  return prefix + next;
}

/**
 * Versi massal dari tombol "Jadikan Siswa" per-baris di FormulirPpdbTab —
 * dipakai admin proses banyak pendaftar berstatus "Diterima" jadi siswa
 * aktif sekaligus (mis. awal tahun ajaran), daripada buka modal satu-satu.
 * classList/jurusanList diterima dari FormulirPpdbTab (sudah di-fetch di
 * sana) supaya tidak fetch ulang.
 *
 * Alur: tabel utama cuma buat CENTANG pendaftar (ringan, muat banyak baris
 * tanpa penuh input). Detail NIS/Kelas/Jurusan baru diisi di POPUP yang
 * muncul setelah klik "Jadikan Siswa Aktif" — supaya admin tidak harus
 * lihat puluhan kotak input kosong sebelum sempat pilih siapa saja yang
 * mau diproses.
 */
export default function JadikanSiswaMassalPpdbTab({ classList, jurusanList, onBack, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [pendaftarList, setPendaftarList] = useState([]);
  const [rows, setRows] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasil, setHasil] = useState(null);
  const [nisAwal, setNisAwal] = useState('');
  const [kelasSemua, setKelasSemua] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    api.get('/ppdb', { params: { status: 'diterima' } }).then((res) => {
      const belumSiswa = res.data.filter((p) => !p.student_id);
      setPendaftarList(belumSiswa);
      const init = {};
      belumSiswa.forEach((p) => {
        // Cocokkan jurusan_pilihan (teks bebas dari formulir) ke jurusan
        // resmi kalau namanya persis sama — pola sama seperti
        // openJadikanSiswa() versi 1-per-1 di FormulirPpdbTab.
        const cocok = jurusanList.find((j) => j.nama.toLowerCase() === (p.jurusan_pilihan || '').trim().toLowerCase());
        init[p.id] = { selected: false, nis: '', email: '', class_room_id: '', jurusan_id: cocok?.id ? String(cocok.id) : '' };
      });
      setRows(init);
    }).finally(() => setLoading(false));
  }, [jurusanList]);

  const [jurusanFilter, setJurusanFilter] = useState('');

  // Cuma buat TAMPILAN & "centang semua" (isi NIS/Kelas massal tetap ikut
  // baris yang sudah dicentang lewat filter jurusan lain sebelumnya —
  // lihat terpilihList yang sengaja dihitung dari `pendaftarList` utuh,
  // bukan dari daftar tersaring ini).
  const pendaftarTersaring = useMemo(
    () => jurusanFilter ? pendaftarList.filter((p) => (p.jurusan_pilihan || '').trim().toLowerCase() === jurusanFilter.trim().toLowerCase()) : pendaftarList,
    [pendaftarList, jurusanFilter]
  );

  const selectedIds = useMemo(() => Object.keys(rows).filter((id) => rows[id].selected), [rows]);
  const terpilihList = useMemo(() => pendaftarList.filter((p) => rows[p.id]?.selected), [pendaftarList, rows]);
  const semuaTerpilih = pendaftarTersaring.length > 0 && pendaftarTersaring.every((p) => rows[p.id]?.selected);

  const toggleSemua = (checked) => {
    setRows((prev) => {
      const next = { ...prev };
      pendaftarTersaring.forEach((p) => { next[p.id] = { ...next[p.id], selected: checked }; });
      return next;
    });
  };

  const updateRow = (id, patch) => setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  // Admin ketik NIS PERTAMA secara manual (mis. "2026001"), sisanya untuk
  // pendaftar terpilih diisi otomatis berurutan naik 1 — daripada ketik
  // NIS satu-satu. Menimpa NIS yang mungkin sudah diketik, supaya urutannya
  // selalu rapi dari nomor yang baru diketik.
  const handleIsiNisOtomatis = () => {
    setError('');
    const awal = nisAwal.trim();
    if (!awal) {
      setError('Isi dulu NIS pertama sebelum "Isi Otomatis".');
      return;
    }
    setRows((prev) => {
      const next = { ...prev };
      terpilihList.forEach((p, i) => {
        next[p.id] = { ...next[p.id], nis: incrementNis(awal, i) };
      });
      return next;
    });
  };

  const bukaPopup = () => {
    setError('');
    setHasil(null);
    setKelasSemua('');
    setShowPopup(true);
  };

  // Pilih 1 kelas di sini, langsung diterapkan ke SEMUA pendaftar terpilih
  // sekaligus (biasanya memang dijadikan siswa 1 rombel/kelas yang sama) —
  // masih bisa diganti manual per baris kalau ada yang beda kelas.
  const handlePilihKelasSemua = (classRoomId) => {
    setKelasSemua(classRoomId);
    if (!classRoomId) return;
    setRows((prev) => {
      const next = { ...prev };
      terpilihList.forEach((p) => {
        next[p.id] = { ...next[p.id], class_room_id: classRoomId };
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    setError('');
    const items = terpilihList.map((p) => ({
      ppdb_pendaftar_id: p.id,
      nis: (rows[p.id].nis || '').trim(),
      email: (rows[p.id].email || '').trim() || undefined,
      class_room_id: rows[p.id].class_room_id,
      jurusan_id: rows[p.id].jurusan_id || undefined,
    }));

    if (items.length === 0) {
      setError('Pilih minimal 1 pendaftar.');
      return;
    }
    if (items.some((it) => !it.nis || !it.class_room_id)) {
      setError('NIS dan Kelas wajib diisi untuk semua pendaftar yang dicentang.');
      return;
    }
    const nisSet = new Set(items.map((it) => it.nis));
    if (nisSet.size !== items.length) {
      setError('Ada NIS yang sama dipakai lebih dari 1 pendaftar yang dicentang.');
      return;
    }
    if (!confirm(`Proses ${items.length} pendaftar jadi siswa aktif sekaligus? Ini membuat akun baru untuk masing-masing dan tidak bisa dibatalkan otomatis (harus dihapus manual satu-satu lewat Master Data > Siswa kalau ada yang keliru).`)) return;

    setSaving(true);
    try {
      const res = await api.post('/ppdb/jadikan-siswa-massal', { items });
      setHasil(res.data.hasil);
      const berhasilIds = res.data.hasil.filter((h) => h.sukses).map((h) => h.ppdb_pendaftar_id);
      setPendaftarList((prev) => prev.filter((p) => !berhasilIds.includes(p.id)));
      onSaved?.();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal memproses.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="surface-card p-4 border-l-4 border-l-brand-400 flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm text-ink-700">
          Proses beberapa pendaftar berstatus <strong>Diterima</strong> jadi siswa aktif sekaligus — centang yang mau diproses, klik "Jadikan Siswa Aktif", lalu isi NIS &amp; Kelas masing-masing. Password akun otomatis dibuat default (123456).
        </p>
        {onBack && (
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5 shrink-0">
            <ChevronLeft className="w-3.5 h-3.5" /> Kembali ke Daftar
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-ink-300">Memuat...</p>
      ) : pendaftarList.length === 0 ? (
        <div className="surface-card p-5 text-center text-sm text-ink-400">
          Tidak ada pendaftar berstatus "Diterima" yang belum dijadikan siswa.
        </div>
      ) : (
        <div className="surface-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <label className="text-sm font-medium text-ink-700">Jurusan</label>
              <select value={jurusanFilter} onChange={(e) => setJurusanFilter(e.target.value)} className="field-input text-ink-700 w-56">
                <option value="">Semua Jurusan</option>
                {jurusanList.map((j) => <option key={j.id} value={j.nama}>{j.nama}</option>)}
              </select>
              <p className="text-sm text-ink-500">{selectedIds.length} dari {pendaftarList.length} pendaftar dicentang.</p>
            </div>
            <button
              type="button" onClick={bukaPopup} disabled={selectedIds.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserCheck className="w-4 h-4" /> Jadikan Siswa Aktif {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </button>
          </div>

          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 border-b border-line-200">
                  <th className="pb-2 px-2"><input type="checkbox" checked={semuaTerpilih} onChange={(e) => toggleSemua(e.target.checked)} /></th>
                  <th className="font-medium whitespace-nowrap px-2">Nama</th>
                  <th className="font-medium whitespace-nowrap px-2">Jurusan Pilihan</th>
                  <th className="font-medium whitespace-nowrap px-2">Hasil</th>
                </tr>
              </thead>
              <tbody>
                {pendaftarTersaring.map((p) => {
                  const row = rows[p.id] || {};
                  const hasilBaris = hasil?.find((h) => h.ppdb_pendaftar_id === p.id);
                  return (
                    <tr key={p.id} className="border-t border-line-200">
                      <td className="py-2 px-2"><input type="checkbox" checked={!!row.selected} onChange={(e) => updateRow(p.id, { selected: e.target.checked })} /></td>
                      <td className="text-ink-900 whitespace-nowrap px-2"><TruncateText text={p.nama_lengkap} /></td>
                      <td className="text-ink-500 whitespace-nowrap px-2"><TruncateText text={p.jurusan_pilihan || '—'} /></td>
                      <td className="px-2 whitespace-nowrap">
                        {hasilBaris && (hasilBaris.sukses ? (
                          <span className="text-xs text-brand-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Berhasil</span>
                        ) : (
                          <span className="text-xs text-honey-700 flex items-center gap-1" title={hasilBaris.pesan}><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> <TruncateText text={hasilBaris.pesan} /></span>
                        ))}
                      </td>
                    </tr>
                  );
                })}
                {pendaftarTersaring.length === 0 && (
                  <tr><td colSpan="4" className="py-6 text-center text-ink-300">Tidak ada pendaftar di jurusan ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="surface-card p-5 w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display font-semibold text-ink-900">Jadikan Siswa Aktif — {terpilihList.length} Pendaftar Terpilih</h2>
              <button type="button" onClick={() => setShowPopup(false)} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-ink-500 mb-4">Isi NIS &amp; Kelas tiap pendaftar, lalu kirim semua sekaligus.</p>

            {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

            <div className="flex items-end gap-2.5 flex-wrap mb-4 bg-mist-50 border border-line-200 rounded-lg p-3 shrink-0">
              <div>
                <label className="block text-[11px] text-ink-400 mb-1">NIS Pertama</label>
                <input value={nisAwal} onChange={(e) => setNisAwal(e.target.value)} placeholder="mis. 2026001" className="field-input w-40" />
              </div>
              <button type="button" onClick={handleIsiNisOtomatis} className="flex items-center gap-1.5 text-sm font-medium text-brand-700 bg-white hover:bg-brand-50 border border-brand-200 rounded-xl px-3.5 py-2">
                <Wand2 className="w-4 h-4" /> Isi Otomatis
              </button>
              <div>
                <label className="block text-[11px] text-ink-400 mb-1">Kelas (Semua)</label>
                <select value={kelasSemua} onChange={(e) => handlePilihKelasSemua(e.target.value)} className="field-input w-40 text-ink-700">
                  <option value="">— Pilih Kelas —</option>
                  {classList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <p className="text-xs text-ink-400 self-center">NIS diisi berurutan naik dari nomor pertama; Kelas langsung diterapkan ke semua pendaftar di bawah begitu dipilih — keduanya masih bisa diganti manual per baris.</p>
            </div>

            <div className="table-scroll overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink-500 border-b border-line-200">
                    <th className="pb-2 px-2">Nama</th>
                    <th className="font-medium whitespace-nowrap px-2">NIS</th>
                    <th className="font-medium whitespace-nowrap px-2">Kelas</th>
                    <th className="font-medium whitespace-nowrap px-2">Jurusan</th>
                    <th className="font-medium whitespace-nowrap px-2">Hasil</th>
                  </tr>
                </thead>
                <tbody>
                  {terpilihList.map((p) => {
                    const row = rows[p.id] || {};
                    const hasilBaris = hasil?.find((h) => h.ppdb_pendaftar_id === p.id);
                    return (
                      <tr key={p.id} className="border-t border-line-200">
                        <td className="py-2 text-ink-900 whitespace-nowrap px-2"><TruncateText text={p.nama_lengkap} /></td>
                        <td className="px-2">
                          <input value={row.nis || ''} onChange={(e) => updateRow(p.id, { nis: e.target.value })} className="field-input w-28" placeholder="NIS" />
                        </td>
                        <td className="px-2">
                          <select value={row.class_room_id || ''} onChange={(e) => updateRow(p.id, { class_room_id: e.target.value })} className="field-input w-32 text-ink-700">
                            <option value="">— Kelas —</option>
                            {classList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className="px-2">
                          <select value={row.jurusan_id || ''} onChange={(e) => updateRow(p.id, { jurusan_id: e.target.value })} className="field-input w-32 text-ink-700">
                            <option value="">— Jurusan —</option>
                            {jurusanList.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                          </select>
                        </td>
                        <td className="px-2 whitespace-nowrap">
                          {hasilBaris && (hasilBaris.sukses ? (
                            <span className="text-xs text-brand-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Berhasil</span>
                          ) : (
                            <span className="text-xs text-honey-700 flex items-center gap-1" title={hasilBaris.pesan}><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> <TruncateText text={hasilBaris.pesan} /></span>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-2 mt-4 shrink-0">
              <button onClick={handleSubmit} disabled={saving || terpilihList.length === 0} className="btn-primary">
                {saving ? 'Memproses...' : `Proses ${terpilihList.length} Siswa`}
              </button>
              <button type="button" onClick={() => setShowPopup(false)} className="text-sm text-ink-500 hover:text-ink-700 px-3">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
