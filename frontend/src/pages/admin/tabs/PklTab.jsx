import { useState } from 'react';
import { Building2, ClipboardList } from 'lucide-react';
import DudiTab from './pkl/DudiTab';
import PenempatanTab from './pkl/PenempatanTab';

const SECTIONS = [
  { key: 'dudi', label: 'Kelola DUDI', icon: Building2, component: DudiTab },
  { key: 'penempatan', label: 'Penempatan PKL', icon: ClipboardList, component: PenempatanTab },
];

export default function PklTab() {
  const [active, setActive] = useState('dudi');
  const section = SECTIONS.find((s) => s.key === active);
  const ActiveComponent = section?.component;

  return (
    <div>
      <div className="flex gap-1 bg-white rounded-xl border border-line-200 p-1 w-fit mb-6">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
                isActive ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-mist-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
