import { ChevronLeft, ChevronRight } from 'lucide-react';

// Kontrol "Sebelumnya/Selanjutnya" — gaya visual sama persis dengan yang
// sudah dipakai di SiswaDashboard.jsx & ParentDashboard.jsx, diekstrak jadi
// komponen bersama dipakai lewat hook usePagination. Otomatis tidak
// render apa-apa kalau cuma 1 halaman (data sedikit, tidak perlu kontrol).
export default function Pagination({ page, totalPages, onChange, className = '' }) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between mt-3 pt-3 border-t border-line-200 ${className}`}>
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
      </button>
      <span className="text-xs text-ink-400">Halaman {page} / {totalPages}</span>
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-brand-600 disabled:opacity-30"
      >
        Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
