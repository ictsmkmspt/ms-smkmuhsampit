import { useEffect, useState } from 'react';
import { LogOut, HeartHandshake, AlertTriangle, NotebookPen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import SanksiSiswaTab from './tabs/SanksiSiswaTab';
import CatatanBkTab from './tabs/CatatanBkTab';

const TABS = [
  { key: 'sanksi', label: 'Sanksi Siswa', icon: AlertTriangle },
  { key: 'catatan', label: 'Catatan BK', icon: NotebookPen },
];

export default function BkDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('sanksi');
  const [prefillKejadian, setPrefillKejadian] = useState(null);
  const [tahunAjaranAktif, setTahunAjaranAktif] = useState(null);

  useEffect(() => {
    api.get('/tahun-ajaran').then((res) => {
      setTahunAjaranAktif(res.data.find((t) => t.status === 'aktif') || null);
    }).catch(() => {});
  }, []);

  const bukaCatatTindakLanjut = (kejadian) => {
    setPrefillKejadian(kejadian);
    setActiveTab('catatan');
  };

  return (
    <div className="min-h-screen bg-mist-50 pb-20">
      <div className="bg-[#0B1B3A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-end">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/60">
                Bimbingan Konseling{tahunAjaranAktif && <> &middot; TA {tahunAjaranAktif.nama}</>}
              </p>
              <h1 className="font-display text-lg font-semibold text-white">{user.name}</h1>
            </div>
          </div>

          <button onClick={logout} className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-[#F2B705] transition">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6">
        {activeTab === 'sanksi' && <SanksiSiswaTab onCatatTindakLanjut={bukaCatatTindakLanjut} />}
        {activeTab === 'catatan' && (
          <CatatanBkTab prefill={prefillKejadian} onPrefillUsed={() => setPrefillKejadian(null)} />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line-200 z-50">
        <div className="max-w-4xl mx-auto flex">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-3 transition ${
                  isActive ? 'text-brand-600' : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-brand-600' : 'text-ink-400'}`}>
                  {tab.label}
                </span>
                {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-brand-600 rounded-t-full" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
