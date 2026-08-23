import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpoint polling latar belakang (bukan aksi langsung dari pengguna) —
// NotificationBell & MaintenanceGate memanggil ini tiap 30-60 detik di
// SEMUA halaman. Kalau token basi ketahuan lewat salah satu poll ini
// selagi pengguna sedang mengetik di form lain, jangan langsung redirect
// paksa (bisa menghapus input yang belum disimpan) — biarkan aksi
// pengguna berikutnya yang benar-benar memanggil API yang menemukan 401
// itu sendiri dan memicu redirect di bawah.
const ENDPOINT_POLLING_LATAR = ['/notifications/unread-count', '/maintenance-status'];

// Token kedaluwarsa/invalid (401) berarti sesi login sudah tidak berlaku di
// backend — bersihkan token & lempar ke halaman login, daripada tiap halaman
// menampilkan alert generik "Gagal ..." yang membingungkan.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isPollingLatar = ENDPOINT_POLLING_LATAR.some((p) => error.config?.url?.startsWith(p));
    if (error.response?.status === 401 && !isPollingLatar && window.location.pathname !== '/login' && window.location.pathname !== '/') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
