import { useEffect, useRef, useState } from 'react';
import { X, Eraser, Save, Building2 } from 'lucide-react';
import api from '../api/axios';

/**
 * Modal "Edit Profil" untuk DUDI — 2 bagian: data perusahaan (nama, alamat,
 * penanggung jawab, telepon) dan tanda tangan (digambar langsung di kanvas
 * pakai mouse/jari, bukan upload file). Hasil kanvas diekspor jadi PNG
 * transparan lalu dikirim ke server persis seperti file upload biasa.
 */
export default function TandaTanganModal({ dudi, onClose, onSaved }) {
  // --- Bagian data perusahaan ---
  const [form, setForm] = useState({
    nama_perusahaan: dudi?.nama_perusahaan || '',
    alamat: dudi?.alamat || '',
    penanggung_jawab: dudi?.penanggung_jawab || '',
    telepon: dudi?.telepon || '',
  });
  const [savingProfil, setSavingProfil] = useState(false);
  const [profilError, setProfilError] = useState('');
  const [profilSukses, setProfilSukses] = useState('');

  const handleSimpanProfil = async (e) => {
    e.preventDefault();
    setProfilError('');
    setProfilSukses('');
    setSavingProfil(true);
    try {
      const res = await api.put('/dudi/profile', form);
      onSaved?.(res.data.dudi);
      setProfilSukses(res.data.message);
    } catch (err) {
      setProfilError(err.response?.data?.message || 'Gagal menyimpan data perusahaan.');
    } finally {
      setSavingProfil(false);
    }
  };

  // --- Bagian tanda tangan ---
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Siapkan kanvas: latar transparan, skala sesuai devicePixelRatio biar garis tidak pecah/blur.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a1a';
  }, []);

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  const draw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    setHasDrawing(true);
  };

  const stopDraw = () => {
    drawingRef.current = false;
  };

  const handleHapus = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const handleSimpanTtd = () => {
    setError('');
    const canvas = canvasRef.current;
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError('Gagal membuat gambar tanda tangan.');
        return;
      }
      setSaving(true);
      try {
        const formData = new FormData();
        formData.append('tanda_tangan', blob, 'tanda-tangan.png');
        const res = await api.post('/dudi/tanda-tangan', formData);
        onSaved?.(res.data.dudi);
        onClose();
      } catch (err) {
        setError(err.response?.data?.message || 'Gagal menyimpan tanda tangan.');
      } finally {
        setSaving(false);
      }
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-line-200 shrink-0">
          <div>
            <h3 className="font-display font-semibold text-ink-900">Edit Profil</h3>
            <p className="text-xs text-ink-500 mt-0.5">Data perusahaan &amp; tanda tangan Anda</p>
          </div>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          {/* Bagian 1: Data Perusahaan */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-brand-600" />
              <h4 className="font-display font-semibold text-sm text-ink-900">Data Perusahaan</h4>
            </div>

            {profilError && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{profilError}</p>}
            {profilSukses && <p className="text-sm text-brand-700 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 mb-3">{profilSukses}</p>}

            <form onSubmit={handleSimpanProfil} className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Nama Perusahaan</label>
                <input
                  type="text" value={form.nama_perusahaan}
                  onChange={(e) => setForm({ ...form, nama_perusahaan: e.target.value })}
                  className="field-input text-sm" required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Alamat</label>
                <input
                  type="text" value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  className="field-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Penanggung Jawab</label>
                <input
                  type="text" value={form.penanggung_jawab}
                  onChange={(e) => setForm({ ...form, penanggung_jawab: e.target.value })}
                  className="field-input text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Telepon</label>
                <input
                  type="text" value={form.telepon}
                  onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                  className="field-input text-sm"
                />
              </div>
              <button disabled={savingProfil} className="btn-primary w-full justify-center mt-1">
                <Save className="w-4 h-4" /> {savingProfil ? 'Menyimpan...' : 'Simpan Data Perusahaan'}
              </button>
            </form>
          </div>

          <div className="border-t border-line-200" />

          {/* Bagian 2: Tanda Tangan */}
          <div>
            <h4 className="font-display font-semibold text-sm text-ink-900 mb-3">Tanda Tangan</h4>

            {dudi?.tanda_tangan_url && (
              <div className="mb-4">
                <p className="text-xs font-medium text-ink-500 mb-2">Tanda tangan tersimpan saat ini</p>
                <div className="border border-line-200 rounded-lg bg-mist-50 flex items-center justify-center p-3">
                  <img src={dudi.tanda_tangan_url} alt="Tanda tangan tersimpan" className="h-16 object-contain" />
                </div>
              </div>
            )}

            <p className="text-xs font-medium text-ink-500 mb-2">
              {dudi?.tanda_tangan_url ? 'Gambar tanda tangan baru (menggantikan yang lama)' : 'Gambar tanda tangan di sini'}
            </p>

            {error && <p className="text-sm text-honey-700 bg-honey-50 border border-honey-200 rounded-lg px-3 py-2 mb-3">{error}</p>}

            <canvas
              ref={canvasRef}
              className="w-full border-2 border-dashed border-line-300 rounded-lg touch-none"
              style={{ height: '180px', backgroundImage: 'linear-gradient(0deg, transparent 24px, #f3f4f6 25px)', backgroundSize: '100% 25px' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            <p className="text-xs text-ink-400 mt-1.5">Gambar pakai mouse atau jari langsung di kotak di atas.</p>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleHapus}
                disabled={!hasDrawing}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-honey-700 border border-line-200 rounded-lg px-4 py-2.5 disabled:opacity-40"
              >
                <Eraser className="w-4 h-4" /> Hapus
              </button>
              <button
                onClick={handleSimpanTtd}
                disabled={!hasDrawing || saving}
                className="btn-primary flex-1 justify-center disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Tanda Tangan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
