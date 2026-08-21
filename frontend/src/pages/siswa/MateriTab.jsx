import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Eye, ChevronLeft, ChevronDown, ListChecks } from 'lucide-react';
import api from '../../api/axios';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

// Materi bacaan siswa — dikelompokkan per TP (Tujuan Pembelajaran), klik
// buka detail (hits bertambah otomatis di backend tiap dibuka). Materi
// yang punya latihan terlampir menampilkan tombol langsung mengerjakan.
// Mapel & TP selalu tampil apa adanya (tidak di-collapse) — yang
// di-minimize cuma daftar Materi di dalam tiap TP, mulai tertutup begitu
// halaman dibuka, supaya kalau banyak guru menulis materi daftarnya
// tidak langsung sangat panjang.
export default function MateriTab() {
  const navigate = useNavigate();
  const [materiList, setMateriList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [starting, setStarting] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    api.get('/my-cbt-materi').then((res) => setMateriList(res.data)).finally(() => setLoading(false));
  }, []);

  const subjectOptions = useMemo(() => {
    const map = new Map();
    materiList.forEach((m) => { if (m.subject) map.set(m.subject.id, m.subject); });
    return [...map.values()].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [materiList]);

  // Dikelompokkan 2 tingkat: Mapel dulu (tersortir A-Z), baru TP di
  // dalamnya — konsisten dengan pengelompokan TP di sisi guru.
  const dikelompokkan = useMemo(() => {
    const mapelMap = new Map();
    materiList
      .filter((m) => !subjectFilter || m.subject_id === Number(subjectFilter))
      .forEach((m) => {
        const mapel = m.subject?.nama || 'Umum';
        if (!mapelMap.has(mapel)) mapelMap.set(mapel, new Map());
        const tpMap = mapelMap.get(mapel);
        const tpNama = m.tp?.judul || 'Belum dikelompokkan';
        if (!tpMap.has(tpNama)) tpMap.set(tpNama, []);
        tpMap.get(tpNama).push(m);
      });
    return [...mapelMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mapel, tpMap]) => [mapel, [...tpMap.entries()]]);
  }, [materiList, subjectFilter]);

  // Kunci per TP (bukan per mapel) — mapel bisa punya beberapa TP dengan
  // judul yang kebetulan sama, jadi digabung dengan nama mapelnya supaya
  // tidak salah buka/tutup TP yang lain.
  const toggleTp = (kunci) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(kunci)) next.delete(kunci); else next.add(kunci);
      return next;
    });
  };

  const bukaMateri = async (m) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/cbt-materi/${m.id}`);
      setSelected(res.data);
    } finally {
      setLoadingDetail(false);
    }
  };

  const mulaiLatihan = async (latihan) => {
    setStarting(true);
    try {
      const res = await api.post(`/cbt-latihan/${latihan.id}/start`);
      if (res.data.device_token) {
        localStorage.setItem(`cbt_device_${res.data.attempt_id}`, res.data.device_token);
      }
      navigate(`/ujian/exam/${res.data.attempt_id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal membuka latihan.');
    } finally {
      setStarting(false);
    }
  };

  if (selected) {
    return (
      <div className="max-w-md mx-auto">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-700 mb-3">
          <ChevronLeft className="w-3.5 h-3.5" /> Kembali
        </button>
        <div className="surface-card p-4">
          {selected.gambar_url && <img src={selected.gambar_url} alt="" className="w-full h-40 object-cover rounded-lg mb-3" />}
          <p className="text-xs text-ink-500 mb-1">
            {selected.tp?.judul ? `${selected.tp.judul} · ` : ''}{selected.subject?.nama || 'Umum'} &middot; oleh {selected.teacher?.user?.name}
          </p>
          <h2 className="cbt-display text-lg font-bold text-ink-900 mb-3">{selected.judul}</h2>
          <div className="text-sm text-ink-700 [&_img]:max-w-full [&_img]:rounded-lg [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.isi) }} />
        </div>

        {selected.latihan?.length > 0 && (
          <div className="surface-card p-4 mt-3">
            <h3 className="flex items-center gap-1.5 font-display font-semibold text-sm text-ink-900 mb-3">
              <ListChecks className="w-4 h-4 text-brand-600" /> Soal Latihan Terkait
            </h3>
            <div className="space-y-2">
              {selected.latihan.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 border border-line-200 rounded-xl px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-900 truncate">{l.nama}</p>
                    <p className="text-xs text-ink-500">
                      {l.jumlah_soal} soal{l.skor_terbaik !== null && <> &middot; skor terbaik <b className="text-brand-700">{l.skor_terbaik}</b></>}
                    </p>
                  </div>
                  <button
                    onClick={() => mulaiLatihan(l)}
                    disabled={starting}
                    className="text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg px-3 py-1.5 transition shrink-0"
                  >
                    {l.skor_terbaik !== null ? 'Latihan Lagi' : 'Mulai'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      {loadingDetail && <p className="text-center text-sm text-ink-300 py-4">Memuat...</p>}

      {subjectOptions.length > 0 && (
        <div className="surface-card p-4">
          <label className="block text-xs font-medium text-ink-500 mb-1">Saring Mata Pelajaran</label>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="field-input text-ink-700 text-sm">
            <option value="">Semua Mapel</option>
            {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
        </div>
      )}

      {dikelompokkan.map(([mapel, tpEntries]) => (
        <div key={mapel} className="surface-card p-4">
          <h2 className="font-display font-semibold text-sm text-ink-900 mb-3">{mapel}</h2>
          <div className="space-y-3">
            {tpEntries.map(([tpNama, list]) => {
              const kunci = `${mapel}::${tpNama}`;
              const isOpen = expanded.has(kunci);
              return (
                <div key={tpNama}>
                  <button onClick={() => toggleTp(kunci)} className="w-full flex items-center justify-between gap-2 text-left">
                    <p className="text-xs font-semibold text-ink-500">{tpNama}</p>
                    <span className="flex items-center gap-1.5 text-xs text-ink-400 shrink-0">
                      {list.length} materi <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-2 mt-2">
                      {list.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => bukaMateri(m)}
                          className="w-full flex items-center gap-3 text-left hover:bg-mist-50 transition rounded-xl p-1"
                        >
                          {m.gambar_url ? (
                            <img src={m.gambar_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-mist-50 flex items-center justify-center shrink-0">
                              <BookOpen className="w-6 h-6 text-ink-300" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-ink-900 truncate">{m.judul}</p>
                            <p className="text-xs text-ink-500 flex items-center gap-1"><Eye className="w-3 h-3" /> {m.hits}×</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {!loading && materiList.length === 0 && (
        <p className="text-center text-sm text-ink-300 py-8">Belum ada materi yang diterbitkan guru.</p>
      )}
      {!loading && materiList.length > 0 && dikelompokkan.length === 0 && (
        <p className="text-center text-sm text-ink-300 py-8">Tidak ada materi untuk mapel ini.</p>
      )}
    </div>
  );
}
