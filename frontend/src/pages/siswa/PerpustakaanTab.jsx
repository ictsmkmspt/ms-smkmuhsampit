import { useState } from 'react';
import { PeminjamanSayaView, KatalogView } from '../../components/PerpustakaanSelfServiceViews';

const PERPUS_SUB_TABS = [
  { key: 'peminjaman', label: 'Peminjaman Saya' },
  { key: 'katalog', label: 'Katalog' },
];

export default function PerpustakaanTab() {
  const [sub, setSub] = useState('peminjaman');

  return (
    <div className="max-w-md mx-auto">
      <div className="flex gap-1 bg-white border border-line-200 rounded-xl p-1 mb-4 w-fit mx-auto">
        {PERPUS_SUB_TABS.map((t) => {
          const isActive = sub === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSub(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-700 hover:bg-mist-50 hover:text-ink-900'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {sub === 'peminjaman' && <PeminjamanSayaView />}
      {sub === 'katalog' && <KatalogView />}
    </div>
  );
}
