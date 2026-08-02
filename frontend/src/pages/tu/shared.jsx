export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const formatRupiah = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

const TILE_TONE = {
  neutral: 'bg-mist-50 text-ink-700',
  brand: 'bg-brand-50 text-brand-600',
  rose: 'bg-rose-50 text-rose-700',
};

export function StatTile({ icon: Icon, label, value, sub, tone = 'neutral' }) {
  return (
    <div className="surface-card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TILE_TONE[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-lg font-display font-semibold text-ink-900 truncate">{value}</p>
        {sub && <p className="text-xs text-ink-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

export function Avatar({ name }) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  return (
    <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center text-xs font-display font-semibold shrink-0">
      {initial}
    </div>
  );
}
