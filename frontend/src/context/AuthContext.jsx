import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/me')
      .then((res) => setUser(res.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const applyLoginResponse = (data) => {
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setMustChangePassword(!!data.must_change_password);
    return data.user;
  };

  const login = async (identifier, password) => {
    const res = await api.post('/login', { login: identifier, password });
    return applyLoginResponse(res.data);
  };

  // Login khusus alumni pakai NIS (bukan email/no. HP) — dipakai halaman
  // /bursakerjakhusus/masuk, lihat AuthController::loginNis().
  const loginNis = async (nis, password) => {
    const res = await api.post('/login-alumni', { nis, password });
    return applyLoginResponse(res.data);
  };

  const logout = async () => {
    // Bersihkan sesi LOKAL apapun hasil panggilan API-nya (jaringan
    // putus, timeout, dst) — kalau await di atas gagal tanpa try/finally,
    // token di localStorage tidak pernah terhapus dan user tetap
    // "login" di perangkat ini walau sudah menekan Keluar.
    try {
      await api.post('/logout');
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setMustChangePassword(false);
    }
  };

  const updateUser = (partial) => setUser((prev) => ({ ...prev, ...partial }));

  return (
    <AuthContext.Provider value={{ user, login, loginNis, logout, loading, mustChangePassword, setMustChangePassword, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
