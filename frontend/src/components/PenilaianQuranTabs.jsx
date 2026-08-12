import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, BookOpen, BookMarked, ScrollText } from 'lucide-react';
import api from '../api/axios';
import { fmtDMY } from '../utils/date';

const SUB_TABS = [
  { key: 'akademik', label: 'Nilai Akademik', labelShort: 'Akademik', icon: ClipboardList },
  { key: 'tahsin', label: 'Tahsin', labelShort: 'Tahsin', icon: BookOpen },
  { key: 'tahfidz', label: 'Tahfidz', labelShort: 'Tahfidz', icon: BookMarked },
  { key: 'tadarus', label: 'Tadarus', labelShort: 'Tadarus', icon: ScrollText },
];

/**
 * Sub-menu "Penilaian" read-only — dipakai bareng oleh dashboard Siswa & Wali
 * (isinya identik, cuma beda endpoint sumber datanya: /my-*-scores untuk
 * siswa sendiri, /my-children/{id}/*-scores untuk anak yang dipilih wali).
 * Nilai Akademik tetap punya skor (dari fitur lama); Tahsin/Tahfidz/Tadarus
 * murni catatan progres + keterangan, tanpa skor.
 */
export default function PenilaianQuranTabs({ endpoints }) {
  const [sub, setSub] = useState('akademik');
  const [academicScores, setAcademicScores] = useState([]);
  const [tahsinScores, setTahsinScores] = useState([]);
  const [tahfidzScores, setTahfidzScores] = useState([]);
  const [tadarusScores, setTadarusScores] = useState([]);
  const [surahList, setSurahList] = useState([]);

  useEffect(() => { api.get('/quran-surah').then((res) => setSurahList(res.data)); }, []);

  useEffect(() => {
    api.get(endpoints.akademik).then((res) => setAcademicScores(res.data)).catch(() => setAcademicScores([]));
    api.get(endpoints.tahsin).then((res) => setTahsinScores(res.data)).catch(() => setTahsinScores([]));
    api.get(endpoints.tahfidz).then((res) => setTahfidzScores(res.data)).catch(() => setTahfidzScores([]));
    api.get(endpoints.tadarus).then((res) => setTadarusScores(res.data)).catch(() => setTadarusScores([]));
  }, [endpoints.akademik, endpoints.tahsin, endpoints.tahfidz, endpoints.tadarus]);

  const namaSurah = (nomor) => surahList.find((s) => s.nomor === Number(nomor))?.nama || `Surah #${nomor}`;

  const nilaiPerMapel = useMemo(() => {
    const map = new Map();
    academicScores.forEach((n) => {
      const key = n.subject?.id ?? 0;
      if (!map.has(key)) map.set(key, { nama: n.subject?.nama || 'Lainnya', items: [] });
      map.get(key).items.push(n);
    });
    return [...map.values()]
      .map((g) => ({ ...g, rataRata: (g.items.reduce((sum, s) => sum + s.skor, 0) / g.items.length).toFixed(1) }))
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [academicScores]);

  const tahsinPerJilid = useMemo(() => {
    const map = new Map();
    tahsinScores.forEach((n) => {
      if (!map.has(n.jilid)) map.set(n.jilid, { jilid: n.jilid, items: [] });
      map.get(n.jilid).items.push(n);
    });
    return [...map.values()].sort((a, b) => a.jilid - b.jilid);
  }, [tahsinScores]);

  const groupBySurah = (list) => {
    const map = new Map();
    list.forEach((n) => {
      if (!map.has(n.surah)) map.set(n.surah, { surah: n.surah, items: [] });
      map.get(n.surah).items.push(n);
    });
    return [...map.values()].sort((a, b) => a.surah - b.surah);
  };

  const tahfidzPerSurah = useMemo(() => groupBySurah(tahfidzScores), [tahfidzScores]);
  const tadarusPerSurah = useMemo(() => groupBySurah(tadarusScores), [tadarusScores]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-white border border-line-200 rounded-xl p-1 w-fit mx-auto overflow-x-auto max-w-full">
        {SUB_TABS.map((t) => {
          const isActive = sub === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSub(t.key)}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50 hover:text-ink-900'
              }`}
            >
              <t.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="sm:hidden">{t.labelShort}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {sub === 'akademik' && (
        nilaiPerMapel.length === 0 ? (
          <div className="surface-card p-6 text-center">
            <ClipboardList className="w-8 h-8 text-ink-300 mx-auto mb-2" />
            <p className="text-sm text-ink-500">Belum ada nilai tercatat.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {nilaiPerMapel.map((g) => (
              <div key={g.nama} className="surface-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold text-ink-900 text-sm">{g.nama}</h3>
                  <span className="badge-soft badge-brand">rata-rata {g.rataRata}</span>
                </div>
                <ul className="divide-y divide-line-200">
                  {g.items.map((n) => (
                    <li key={n.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-ink-900 truncate">{n.nama_kegiatan}</p>
                        <p className="text-xs text-ink-500">{fmtDMY(n.tanggal)}{n.recorded_by?.name && <> &middot; Guru: {n.recorded_by.name}</>}</p>
                      </div>
                      <span className="font-display font-semibold text-ink-900 shrink-0">{n.skor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      )}

      {sub === 'tahsin' && (
        tahsinPerJilid.length === 0 ? (
          <div className="surface-card p-6 text-center">
            <BookOpen className="w-8 h-8 text-ink-300 mx-auto mb-2" />
            <p className="text-sm text-ink-500">Belum ada catatan Tahsin.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tahsinPerJilid.map((g) => (
              <div key={g.jilid} className="surface-card p-4">
                <h3 className="font-display font-semibold text-ink-900 text-sm mb-2">Jilid {g.jilid}</h3>
                <ul className="divide-y divide-line-200">
                  {g.items.map((n) => (
                    <li key={n.id} className="py-2 text-sm">
                      <p className="text-ink-900">Halaman {n.halaman}</p>
                      <p className="text-xs text-ink-500">{fmtDMY(n.tanggal)}{n.keterangan && <> &middot; {n.keterangan}</>}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      )}

      {sub === 'tahfidz' && (
        tahfidzPerSurah.length === 0 ? (
          <div className="surface-card p-6 text-center">
            <BookMarked className="w-8 h-8 text-ink-300 mx-auto mb-2" />
            <p className="text-sm text-ink-500">Belum ada catatan Tahfidz.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tahfidzPerSurah.map((g) => (
              <div key={g.surah} className="surface-card p-4">
                <h3 className="font-display font-semibold text-ink-900 text-sm mb-2">{namaSurah(g.surah)}</h3>
                <ul className="divide-y divide-line-200">
                  {g.items.map((n) => (
                    <li key={n.id} className="py-2 text-sm">
                      <p className="text-ink-900">Ayat {n.ayat_mulai}–{n.ayat_selesai}</p>
                      <p className="text-xs text-ink-500">{fmtDMY(n.tanggal)}{n.keterangan && <> &middot; {n.keterangan}</>}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      )}

      {sub === 'tadarus' && (
        tadarusPerSurah.length === 0 ? (
          <div className="surface-card p-6 text-center">
            <ScrollText className="w-8 h-8 text-ink-300 mx-auto mb-2" />
            <p className="text-sm text-ink-500">Belum ada catatan Tadarus.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tadarusPerSurah.map((g) => (
              <div key={g.surah} className="surface-card p-4">
                <h3 className="font-display font-semibold text-ink-900 text-sm mb-2">{namaSurah(g.surah)}</h3>
                <ul className="divide-y divide-line-200">
                  {g.items.map((n) => (
                    <li key={n.id} className="py-2 text-sm">
                      <p className="text-ink-900">Ayat {n.ayat_mulai}–{n.ayat_selesai}</p>
                      <p className="text-xs text-ink-500">{fmtDMY(n.tanggal)}{n.keterangan && <> &middot; {n.keterangan}</>}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
