import { useEffect, useState } from 'react';
import { LogOut, HardHat, Boxes, Wrench, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import InventarisTab from './tabs/InventarisTab';
import PemeliharaanTab from './tabs/PemeliharaanTab';
import KunjunganLabTab from './tabs/KunjunganLabTab';
import NotificationBell from '../../components/NotificationBell';

const BASE_TABS = [
  { key: 'inventaris', label: 'Inventaris', icon: Boxes, component: InventarisTab },
  { key: 'pemeliharaan', label: 'Pemeliharaan', icon: Wrench, component: PemeliharaanTab },
];

const ROLE_LABEL = { teknisi: 'Teknisi', kepala_bengkel: 'Kepala Bengkel' };

export default function RoomStaffDashboard() {
  const { user, logout } = useAuth();
  const isKepalaBengkel = user.role === 'kepala_bengkel';
  const [room, setRoom] = useState(null);
  const [roomLoaded, setRoomLoaded] = useState(!isKepalaBengkel);
  const [activeTab, setActiveTab] = useState('inventaris');

  useEffect(() => {
    // /rooms otomatis dibatasi backend cuma 1 ruang buat Kepala Bengkel.
    // Teknisi sengaja tidak dibatasi (data[0] tidak berarti apa-apa buat
    // mereka), jadi tidak perlu ditampilkan sebagai "ruang miliknya".
    if (isKepalaBengkel) {
      api.get('/rooms').then((res) => { setRoom(res.data[0] || null); setRoomLoaded(true); });
    }
  }, [isKepalaBengkel]);

  // Tab "Kunjungan" cuma muncul buat Kepala Bengkel yang ditugaskan ke ruang
  // berjenis Laboratorium — tidak ada peran baru "Kepala Lab", cukup ruang
  // yang jenisnya lab (lihat LaboratoriumKunjunganController). Kepala Bengkel
  // ruang biasa (bengkel) & Teknisi tidak melihat tab ini sama sekali.
  const TABS = room?.jenis === 'lab'
    ? [...BASE_TABS, { key: 'kunjungan', label: 'Kunjungan', icon: UserCheck, component: KunjunganLabTab }]
    : BASE_TABS;

  useEffect(() => {
    if (!TABS.find((t) => t.key === activeTab)) {
      setActiveTab('inventaris');
    }
  }, [TABS, activeTab]); // eslint-disable-line

  const active = TABS.find((t) => t.key === activeTab);
  const ActiveComponent = active?.component;

  return (
    <div className="min-h-screen bg-mist-50 pb-20">
      <div className="bg-[#0B1B3A]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-end">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/60">
                {ROLE_LABEL[user.role] || 'Staf Ruang'}
                {isKepalaBengkel ? (room ? ` — ${room.nama}` : '') : ' — Semua Ruang'}
              </p>
              <h1 className="font-display text-lg font-semibold text-white">{user.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
          <button onClick={logout} className="flex items-center gap-1.5 text-sm font-semibold text-white hover:text-[#F2B705] transition">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
          <NotificationBell />
          </div>
        </div>
      </div>

      {isKepalaBengkel && roomLoaded && room === null && (
        <div className="max-w-4xl mx-auto px-6 pt-6">
          <div className="surface-card p-4 border-l-4 border-l-honey-400">
            <p className="text-sm text-ink-700">Akun ini belum ditugaskan ke ruang manapun — hubungi Waka Sarpras/Admin untuk ditugaskan ke sebuah ruang dulu.</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 pt-6">
        {ActiveComponent && <ActiveComponent />}
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
