import { useState } from 'react';
import { ChevronDown, Clock, AlertOctagon } from 'lucide-react';
import JamMasukTab from '../settings/JamMasukTab';
import PoinPelanggaranTab from '../settings/PoinPelanggaranTab';

const SUBMENU = [
  { key: 'jam',  label: 'Pengaturan Jam Masuk', icon: Clock,         component: JamMasukTab },
  { key: 'poin', label: 'Poin Pelanggaran',      icon: AlertOctagon,  component: PoinPelanggaranTab },
];

export default function SettingsTab() {
  const [activeSub, setActiveSub] = useState('jam');
  const [open, setOpen] = useState(false);

  const current = SUBMENU.find((s) => s.key === activeSub);
  const ActiveComponent = current?.component;

  return (
    <div>
      <div className="relative mb-5 w-72">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between gap-2 field-input bg-white text-ink-900 font-medium"
        >
          <span className="flex items-center gap-2">
            <current.icon className="w-4 h-4 text-brand-600" />
            {current.label}
          </span>
          <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-10 mt-1 w-full surface-card overflow-hidden">
            {SUBMENU.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => { setActiveSub(item.key); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition ${
                    activeSub === item.key ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-mist-50'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {ActiveComponent && <ActiveComponent />}
    </div>
  );
}
