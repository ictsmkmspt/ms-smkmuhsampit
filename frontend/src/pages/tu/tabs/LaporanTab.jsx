import RingkasanSection from './laporan/RingkasanSection';
import LaporanPeroranganSection from './laporan/LaporanPeroranganSection';

// Sub-menu Laporan TU sekarang dipilih lewat dropdown di nav sidebar
// (TuDashboard.jsx, LAPORAN_SUBMENU), bukan pill di dalam halaman —
// activeSub dikirim dari situ.
const SECTIONS = {
  ringkasan: { label: 'Ringkasan', desc: 'Rekap keuangan bulanan dan daftar tunggakan seluruh siswa.', Component: RingkasanSection },
  perorangan: { label: 'Perorangan', desc: 'Laporan tagihan lengkap 1 siswa, terpisah SPP dan Tagihan Lain.', Component: LaporanPeroranganSection },
};

export default function LaporanTab({ activeSub = 'ringkasan' }) {
  const section = SECTIONS[activeSub] || SECTIONS.ringkasan;
  const { Component } = section;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display font-semibold text-ink-900 text-lg">Laporan {section.label}</h2>
        <p className="text-sm text-ink-500">{section.desc}</p>
      </div>

      <Component />
    </div>
  );
}
