import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import api from '../api/axios';

const VARIANT_CLASSES = {
  dark: 'text-white/80 hover:text-[#F2B705]',
  light: 'text-ink-700 hover:text-brand-600',
};

const PANEL_WIDTH = 320; // samakan dengan class w-80 di panel
const VIEWPORT_MARGIN = 8;

function formatWaktu(iso) {
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// Hitung posisi panel lewat position:fixed + koordinat dari JS (bukan
// absolute right-0 di dalam wrapper kecil) supaya tetap dijepit dalam
// layar — tombol ini dipasang di banyak tempat sempit (mis. sidebar admin
// yang cuma lebar 256px, jauh lebih sempit dari lebar panel 320px), jadi
// anchor "right-0" polos gampang mendorong panel sampai keluar tepi kiri
// layar.
function computePanelPosition(btnRect) {
  const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN;
  const left = Math.max(VIEWPORT_MARGIN, Math.min(btnRect.right - PANEL_WIDTH, maxLeft));
  return { top: btnRect.bottom + 8, left };
}

// Tombol lonceng notifikasi in-app — dipasang di semua dashboard/portal CBT
// di sebelah tombol profil. Meniru pola CbtProfilMenu.jsx (state `open` +
// ref klik-di-luar sendiri) dan pola polling MaintenanceGate di App.jsx
// (setInterval + clearInterval), tapi cuma poll /unread-count tiap 30
// detik — daftar lengkap (/notifications) baru diambil saat panel dibuka.
export default function NotificationBell({ variant = 'dark' }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [panelPos, setPanelPos] = useState(null);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUnread = () => api.get('/notifications/unread-count')
      .then((res) => setUnreadCount(res.data.count))
      .catch(() => {});
    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Panel posisi fixed butuh dihitung ulang kalau layar di-resize/diputar
  // selagi terbuka — tanpa ini panel bisa "nyangkut" di posisi lama yang
  // sudah tidak pas dengan lebar layar baru.
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (btnRef.current) setPanelPos(computePanelPosition(btnRef.current.getBoundingClientRect()));
    };
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [open]);

  const openPanel = () => {
    setOpen((v) => {
      const next = !v;
      if (next && btnRef.current) {
        setPanelPos(computePanelPosition(btnRef.current.getBoundingClientRect()));
      }
      return next;
    });
    if (!loaded) {
      api.get('/notifications')
        .then((res) => { setItems(res.data.data); setLoaded(true); })
        .catch(() => {});
    }
  };

  const markRead = (notif) => {
    if (!notif.read_at) {
      setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      api.post(`/notifications/${notif.id}/mark-read`).catch(() => {});
    }
    setOpen(false);
    if (notif.url) navigate(notif.url);
  };

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnreadCount(0);
    api.post('/notifications/mark-all-read').catch(() => {});
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={btnRef}
        onClick={openPanel}
        className={`relative flex items-center justify-center transition ${VARIANT_CLASSES[variant]}`}
        title="Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && panelPos && (
        <div
          className="fixed z-50 w-80 surface-card overflow-hidden"
          style={{ top: panelPos.top, left: panelPos.left }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-mist-100">
            <p className="text-sm font-semibold text-ink-700">Notifikasi</p>
            {items.some((n) => !n.read_at) && (
              <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-400 text-center">Belum ada notifikasi.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`w-full text-left px-4 py-3 border-b border-mist-50 last:border-0 hover:bg-mist-50 transition ${!n.read_at ? 'bg-brand-50/40' : ''}`}
                >
                  <p className="text-sm font-medium text-ink-700">{n.title}</p>
                  {n.body && <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[11px] text-ink-400 mt-1">{formatWaktu(n.created_at)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
