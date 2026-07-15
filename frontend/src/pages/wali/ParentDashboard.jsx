import { useEffect, useState } from 'react';
import { LogOut, School, Trophy, AlertOctagon, Clock, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const TYPE_CONFIG = {
  absensi: { icon: Clock, badge: 'badge-brand' },
  pelanggaran: { icon: AlertOctagon, badge: 'badge-rose' },
  prestasi: { icon: Trophy, badge: 'badge-honey' },
};

export default function ParentDashboard() {
  const { user, logout } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/my-children')
      .then((res) => {
        setChildren(res.data);
        if (res.data.length > 0) setSelectedId(res.data[0].id);
        else setLoading(false);
      })
      .catch(() => { setError('Gagal memuat data anak.'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    api.get(`/my-children/${selectedId}/activity`)
      .then((res) => setActivity(res.data))
      .catch(() => setError('Gagal memuat aktivitas.'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const selectedChild = children.find((c) => c.id === selectedId);

  return (
    <div className="min-h-screen bg-mist-50">
      <div className="bg-white border-b border-line-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <p className="text-xs text-ink-500">Orang Tua / Wali</p>
            <h1 className="font-display text-lg font-semibold text-ink-900">{user.name}</h1>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-honey-700 font-medium">
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-6 pb-10">
        {children.length === 0 && !loading && (
          <div className="surface-card p-6 text-center">
            <School className="w-8 h-8 text-ink-300 mx-auto mb-2" />
            <p className="text-sm text-ink-500">Belum ada data anak yang terhubung ke akun ini. Hubungi admin sekolah untuk menghubungkan akun.</p>
          </div>
        )}

        {children.length > 0 && (
          <>
            {/* Pemilih anak, cuma tampil kalau lebih dari 1 anak */}
            {children.length > 1 && (
              <div className="relative mb-5 w-72">
                <button
                  onClick={() => setShowPicker((p) => !p)}
                  className="w-full flex items-center justify-between gap-2 field-input bg-white text-ink-900 font-medium"
                >
                  <span>{selectedChild?.user?.name}</span>
                  <ChevronDown className={`w-4 h-4 text-ink-400 transition-transform ${showPicker ? 'rotate-180' : ''}`} />
                </button>
                {showPicker && (
                  <div className="absolute z-10 mt-1 w-full surface-card overflow-hidden">
                    {children.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedId(c.id); setShowPicker(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition ${
                          selectedId === c.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-ink-700 hover:bg-mist-50'
                        }`}
                      >
                        <span>{c.user?.name}</span>
                        <span className="text-xs text-ink-400">{c.class_room?.name || '-'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Kartu ringkasan anak */}
            {selectedChild && (
              <div className="surface-card p-5 mb-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-display font-semibold text-ink-900 text-lg">{selectedChild.user?.name}</h2>
                  <p className="text-sm text-ink-500">
                    {selectedChild.class_room?.name || 'Belum ada kelas'} · NIS {selectedChild.nis}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="badge-soft badge-rose">Poin Pelanggaran: {selectedChild.total_poin ?? 0}</span>
                  <span className="badge-soft badge-honey">Poin Prestasi: {selectedChild.total_prestasi ?? 0}</span>
                </div>
              </div>
            )}

            {/* Aktivitas terkini */}
            <div className="surface-card p-5">
              <h2 className="font-display font-semibold text-ink-900 mb-4">Aktivitas Terkini</h2>

              {loading ? (
                <p className="text-center text-ink-300 py-6">Memuat...</p>
              ) : error ? (
                <p className="text-center text-honey-700 py-6">{error}</p>
              ) : (
                <ul className="divide-y divide-line-200">
                  {activity?.timeline?.map((item, i) => {
                    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.absensi;
                    const Icon = config.icon;
                    return (
                      <li key={i} className="py-3 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-mist-50 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-4 h-4 text-ink-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-ink-900">{item.title}</p>
                            <span className="text-xs text-ink-400 shrink-0">{item.date}</span>
                          </div>
                          {item.detail && <p className="text-xs text-ink-500 mt-0.5">{item.detail}</p>}
                          {item.poin != null && (
                            <span className={`badge-soft ${config.badge} mt-1.5 inline-block`}>
                              {item.type === 'prestasi' ? '+' : '+'}{item.poin} poin
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {(!activity?.timeline || activity.timeline.length === 0) && (
                    <li className="py-6 text-center text-sm text-ink-300">Belum ada aktivitas tercatat.</li>
                  )}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
