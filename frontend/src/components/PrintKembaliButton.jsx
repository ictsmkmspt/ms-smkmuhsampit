import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Tombol "Kembali" khusus halaman /print/* — semua halaman ini SELALU
 * dibuka lewat window.open(url, '_blank') dari dashboard (bukan navigasi
 * SPA biasa), jadi jendelanya tidak punya riwayat halaman sebelumnya.
 * Di APK (WebView Capacitor), itu berarti tombol back Android/gesture
 * langsung "tembus" keluar dari aplikasi alih-alih menutup halaman cetak
 * ini — makanya perlu tombol kembali eksplisit di dalam halaman.
 *
 * window.close() adalah aksi yang benar di sini (bukan navigate(-1))
 * karena halaman ini memang dibuka lewat script — browser mengizinkan
 * window.close() untuk jendela yang punya window.opener. Fallback ke
 * navigate(-1) cuma untuk kasus langka halaman ini diakses tanpa lewat
 * window.open (mis. URL dibagikan langsung) sehingga window.close()
 * tidak berefek apa-apa.
 */
export default function PrintKembaliButton() {
  const navigate = useNavigate();

  const kembali = () => {
    window.close();
    setTimeout(() => {
      if (!document.hidden) navigate(-1);
    }, 150);
  };

  return (
    <button
      onClick={kembali}
      className="no-print flex items-center gap-1.5 text-sm font-medium text-ink-600 bg-white border border-line-200 hover:bg-mist-50 px-3 py-2 rounded-lg transition shrink-0"
    >
      <ArrowLeft className="w-4 h-4" /> Kembali
    </button>
  );
}
