import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';

const SchoolProfileContext = createContext(null);

const DEFAULT_PROFILE = {
  nama_sekolah: 'SMK Muhammadiyah Sampit',
  visi: '',
  misi: '',
  alamat: '',
  website: '',
  nama_kepala_sekolah: '',
  nip_kepala_sekolah: '',
  logo_url: null,
  ttd_kepala_sekolah_url: null,
  cap_sekolah_url: null,
  tahun_ajaran: null,
};

/**
 * Profil sekolah (nama, visi, misi, logo) — publik, diambil sekali di root
 * aplikasi supaya tersedia di halaman Login juga (sebelum user login).
 * Sekalian dipakai buat set judul tab browser & favicon secara dinamis.
 */
export function SchoolProfileProvider({ children }) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  const reload = useCallback(() => {
    api.get('/school-profile').then((res) => setProfile(res.data)).catch(() => {});
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    document.title = profile.nama_sekolah;

    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon && profile.logo_url) {
      favicon.removeAttribute('type');
      favicon.href = profile.logo_url;
    }
  }, [profile]);

  return (
    <SchoolProfileContext.Provider value={{ profile, reload }}>
      {children}
    </SchoolProfileContext.Provider>
  );
}

export const useSchoolProfile = () => useContext(SchoolProfileContext);
