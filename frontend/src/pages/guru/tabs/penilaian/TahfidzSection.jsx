import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../../../../api/axios';
import TruncateText from '../../../../components/TruncateText';
import DateInput from '../../../../components/DateInput';
import { fmtDMY } from '../../../../utils/date';

const hariIniIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const KOSONG_SATU = { surah: '', ayat_mulai: '', ayat_selesai: '', tanggal: hariIniIso(), keterangan: '' };

/**
 * Tahfidz (hafalan Al-Quran) — dicatat per surah + rentang ayat yang
 * benar-benar dihafal. Murni catatan progres + keterangan, tanpa skor.
 *
 * Alurnya langsung per siswa: pilih kelas → tabel siswa dengan kolom
 * "Riwayat Terakhir" langsung kelihatan → klik siswa untuk lihat seluruh
 * riwayat hafalannya + tambah catatan baru langsung untuknya.
 */
export default function TahfidzSection() {
  const [classes, setClasses] = useState([]);
  const [surahList, setSurahList] = useState([]);
  const [kelasFilter, setKelasFilter] = useState('');
  const [roster, setRoster] = useState([]);
  const [classScores, setClassScores] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [siswaHistory, setSiswaHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [satuForm, setSatuForm] = useState(KOSONG_SATU);
  const [satuSaving, setSatuSaving] = useState(false);
  const [satuError, setSatuError] = useState('');

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ surah: '', ayat_mulai: '', ayat_selesai: '', keterangan: '', tanggal: '' });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    api.get('/classes').then((res) => setClasses(res.data));
    api.get('/quran-surah').then((res) => setSurahList(res.data));
  }, []);

  const namaSurah = (nomor) => surahList.find((s) => s.nomor === Number(nomor))?.nama || `Surah #${nomor}`;

  // Ref penanda request kelas/siswa paling baru — dipakai karena
  // loadClassScores/loadSiswaHistory juga dipanggil langsung dari
  // refreshAfterMutation (bukan cuma dari efek di bawah), supaya respons
  // yang datang belakangan tidak menimpa data kelas/siswa yang sudah
  // berpindah duluan.
  const classReqRef = useRef(0);
  const siswaReqRef = useRef(0);

  const loadClassScores = (classId) => {
    const reqId = ++classReqRef.current;
    api.get('/tahfidz-scores', { params: { class_room_id: classId } }).then((res) => {
      if (reqId === classReqRef.current) setClassScores(res.data);
    });
  };

  useEffect(() => {
    if (!kelasFilter) { setRoster([]); setClassScores([]); return; }
    let cancelled = false;
    setSelectedSiswa(null);
    setLoadingRoster(true);
    api.get('/students', { params: { class_room_id: kelasFilter } })
      .then((res) => { if (!cancelled) setRoster(res.data); })
      .finally(() => { if (!cancelled) setLoadingRoster(false); });
    loadClassScores(kelasFilter);
    return () => { cancelled = true; };
  }, [kelasFilter]);

  const latestFor = useMemo(() => {
    const map = new Map();
    classScores.forEach((row) => {
      const current = map.get(row.student_id);
      if (!current || row.tanggal > current.tanggal || (row.tanggal === current.tanggal && row.id > current.id)) {
        map.set(row.student_id, row);
      }
    });
    return map;
  }, [classScores]);

  const loadSiswaHistory = (studentId) => {
    setLoadingHistory(true);
    const reqId = ++siswaReqRef.current;
    api.get('/tahfidz-scores', { params: { student_id: studentId } })
      .then((res) => { if (reqId === siswaReqRef.current) setSiswaHistory(res.data); })
      .finally(() => { if (reqId === siswaReqRef.current) setLoadingHistory(false); });
  };

  const selectSiswa = (s) => {
    setSelectedSiswa(s);
    setSatuForm(KOSONG_SATU);
    setSatuError('');
    loadSiswaHistory(s.id);
  };

  const refreshAfterMutation = (studentId) => {
    loadClassScores(kelasFilter);
    loadSiswaHistory(studentId);
  };

  const bukaEdit = (row) => {
    setEditing(row);
    setEditForm({ surah: row.surah, ayat_mulai: row.ayat_mulai, ayat_selesai: row.ayat_selesai, keterangan: row.keterangan || '', tanggal: row.tanggal });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.put(`/tahfidz-scores/${editing.id}`, editForm);
      setEditing(null);
      refreshAfterMutation(selectedSiswa.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Hapus catatan Tahfidz ${row.student?.user?.name || selectedSiswa?.user?.name} (${namaSurah(row.surah)} ${row.ayat_mulai}-${row.ayat_selesai})?`)) return;
    await api.delete(`/tahfidz-scores/${row.id}`);
    refreshAfterMutation(selectedSiswa.id);
  };

  const handleTambahSatu = async (e) => {
    e.preventDefault();
    setSatuError('');
    if (!satuForm.surah || !satuForm.ayat_mulai || !satuForm.ayat_selesai) { setSatuError('Isi surah, ayat mulai, dan ayat selesai.'); return; }
    setSatuSaving(true);
    try {
      await api.post('/tahfidz-scores/bulk', {
        tanggal: satuForm.tanggal,
        entries: [{
          student_id: selectedSiswa.id,
          surah: Number(satuForm.surah),
          ayat_mulai: Number(satuForm.ayat_mulai),
          ayat_selesai: Number(satuForm.ayat_selesai),
          keterangan: satuForm.keterangan || undefined,
        }],
      });
      setSatuForm(KOSONG_SATU);
      refreshAfterMutation(selectedSiswa.id);
    } catch (err) {
      const msgs = err.response?.data?.errors;
      setSatuError(msgs ? Object.values(msgs).flat().join(', ') : err.response?.data?.message || 'Gagal menyimpan catatan.');
    } finally {
      setSatuSaving(false);
    }
  };

  if (selectedSiswa) {
    return (
      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-line-200">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-ink-900 truncate">{selectedSiswa.user?.name}</h3>
            <p className="text-xs text-ink-500">{selectedSiswa.class_room?.name || '-'} &middot; NIS {selectedSiswa.nis}</p>
          </div>
          <button onClick={() => setSelectedSiswa(null)} className="shrink-0 text-xs font-medium text-ink-500 hover:text-ink-700 border border-line-200 rounded-lg px-3 py-1.5">
            Kembali ke Daftar
          </button>
        </div>

        <form onSubmit={handleTambahSatu} className="bg-mist-50 border border-line-200 rounded-xl p-3 mb-4 space-y-2">
          <p className="text-xs font-medium text-ink-500">Tambah Catatan Baru</p>
          {satuError && <p className="text-xs text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-2 py-1.5">{satuError}</p>}
          <select value={satuForm.surah} onChange={(e) => setSatuForm({ ...satuForm, surah: e.target.value })} className="field-input text-sm w-full">
            <option value="">— Pilih Surah —</option>
            {surahList.map((sr) => <option key={sr.nomor} value={sr.nomor}>{sr.nomor}. {sr.nama}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min="1" placeholder="Ayat Mulai" value={satuForm.ayat_mulai} onChange={(e) => setSatuForm({ ...satuForm, ayat_mulai: e.target.value })} className="field-input text-sm" />
            <input type="number" min="1" placeholder="Ayat Selesai" value={satuForm.ayat_selesai} onChange={(e) => setSatuForm({ ...satuForm, ayat_selesai: e.target.value })} className="field-input text-sm" />
            <DateInput value={satuForm.tanggal} onChange={(e) => setSatuForm({ ...satuForm, tanggal: e.target.value })} className="field-input text-sm" required />
            <input placeholder="Keterangan (opsional)" value={satuForm.keterangan} onChange={(e) => setSatuForm({ ...satuForm, keterangan: e.target.value })} className="field-input text-sm" />
          </div>
          <button disabled={satuSaving} className="btn-primary text-sm w-full justify-center">{satuSaving ? 'Menyimpan...' : 'Simpan Catatan'}</button>
        </form>

        {loadingHistory ? (
          <p className="text-center text-ink-300 py-6 text-sm">Memuat riwayat...</p>
        ) : siswaHistory.length === 0 ? (
          <p className="text-center text-ink-300 py-6 text-sm">Belum ada catatan Tahfidz untuk siswa ini.</p>
        ) : (
          <ul className="divide-y divide-line-200">
            {siswaHistory.map((row) => (
              editing?.id === row.id ? (
                <li key={row.id} className="py-3">
                  <form onSubmit={handleSaveEdit} className="space-y-2">
                    <select value={editForm.surah} onChange={(e) => setEditForm({ ...editForm, surah: e.target.value })} className="field-input text-sm w-full" required>
                      <option value="">— Pilih Surah —</option>
                      {surahList.map((sr) => <option key={sr.nomor} value={sr.nomor}>{sr.nomor}. {sr.nama}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" min="1" placeholder="Ayat Mulai" value={editForm.ayat_mulai} onChange={(e) => setEditForm({ ...editForm, ayat_mulai: e.target.value })} className="field-input text-sm" required />
                      <input type="number" min="1" placeholder="Ayat Selesai" value={editForm.ayat_selesai} onChange={(e) => setEditForm({ ...editForm, ayat_selesai: e.target.value })} className="field-input text-sm" required />
                    </div>
                    <DateInput value={editForm.tanggal} onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })} className="field-input text-sm w-full" required />
                    <input placeholder="Keterangan (opsional)" value={editForm.keterangan} onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })} className="field-input text-sm w-full" />
                    <div className="flex gap-2">
                      <button disabled={editSaving} className="btn-primary text-sm flex-1 justify-center">{editSaving ? 'Menyimpan...' : 'Simpan'}</button>
                      <button type="button" onClick={() => setEditing(null)} className="text-sm px-3 text-ink-500 hover:text-ink-700">Batal</button>
                    </div>
                  </form>
                </li>
              ) : (
                <li key={row.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-900">{namaSurah(row.surah)} : {row.ayat_mulai}-{row.ayat_selesai}</p>
                    <p className="text-xs text-ink-500">{fmtDMY(row.tanggal)}{row.keterangan ? ` · ${row.keterangan}` : ''}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => bukaEdit(row)} className="text-xs text-ink-500 hover:text-brand-600 font-medium border border-line-200 rounded-lg px-2 py-1">Edit</button>
                    <button onClick={() => handleDelete(row)} className="text-ink-300 hover:text-honey-700"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </li>
              )
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="surface-card p-5">
      <div className="mb-4">
        <label className="block text-xs font-medium text-ink-500 mb-1">Kelas</label>
        <select value={kelasFilter} onChange={(e) => setKelasFilter(e.target.value)} className="field-input text-ink-700 text-sm max-w-xs">
          <option value="">— Pilih Kelas —</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {!kelasFilter ? (
        <p className="text-sm text-ink-300 text-center py-8">Pilih kelas untuk melihat daftar siswa.</p>
      ) : loadingRoster ? (
        <p className="text-sm text-ink-300 text-center py-8">Memuat...</p>
      ) : roster.length === 0 ? (
        <p className="text-sm text-ink-300 text-center py-8">Belum ada siswa di kelas ini.</p>
      ) : (
        <div className="table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium whitespace-nowrap px-2">Nama Siswa</th>
                <th className="font-medium whitespace-nowrap px-2">Riwayat Terakhir</th>
                <th className="whitespace-nowrap px-2"></th>
              </tr>
            </thead>
            <tbody>
              {roster.map((s) => {
                const last = latestFor.get(s.id);
                return (
                  <tr key={s.id} className="border-t border-line-200">
                    <td className="py-2.5 whitespace-nowrap px-2 text-ink-900"><TruncateText text={s.user?.name} /></td>
                    <td className="whitespace-nowrap px-2">
                      {last ? (
                        <span className="text-ink-700">{namaSurah(last.surah)} : {last.ayat_mulai}-{last.ayat_selesai} <span className="text-xs text-ink-400">({fmtDMY(last.tanggal)})</span></span>
                      ) : (
                        <span className="text-xs text-ink-400">Belum ada catatan</span>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap px-2">
                      <button onClick={() => selectSiswa(s)} className="text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-1.5 transition">
                        Tambah Catatan
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
