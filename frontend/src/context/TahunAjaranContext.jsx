import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const TahunAjaranContext = createContext(null);

/**
 * Tahun ajaran yang sedang "dilihat" oleh Admin/Waka — dipilih lewat dropdown
 * kecil di sidebar. Terpisah dari status "aktif" tahun ajaran (yang menentukan
 * ke tahun ajaran mana data baru masuk) — ini murni buat browsing/lihat
 * laporan tahun lalu tanpa perlu ubah tahun ajaran aktif.
 */
export function TahunAjaranProvider({ children }) {
  const [list, setList] = useState([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    api.get('/tahun-ajaran').then((res) => {
      setList(res.data);
      const aktif = res.data.find((t) => t.status === 'aktif');
      if (aktif) setSelectedId(String(aktif.id));
    }).catch(() => {});
  }, []);

  const aktifId = list.find((t) => t.status === 'aktif')?.id ?? null;
  const isAktif = !selectedId || Number(selectedId) === aktifId;

  return (
    <TahunAjaranContext.Provider value={{ list, selectedId, setSelectedId, aktifId, isAktif }}>
      {children}
    </TahunAjaranContext.Provider>
  );
}

/**
 * Dipakai halaman laporan/riwayat yang mau ikut filter tahun ajaran pilihan
 * sidebar. Kembalikan `{}` kalau lagi lihat tahun ajaran aktif (supaya
 * endpoint tetap pakai default aktif-nya sendiri), atau `{ tahun_ajaran_id }`
 * kalau lagi lihat tahun ajaran lain.
 */
export function useTahunAjaranParam() {
  const ctx = useContext(TahunAjaranContext);
  if (!ctx || ctx.isAktif || !ctx.selectedId) return {};
  return { tahun_ajaran_id: ctx.selectedId };
}

export const useTahunAjaran = () => useContext(TahunAjaranContext);
