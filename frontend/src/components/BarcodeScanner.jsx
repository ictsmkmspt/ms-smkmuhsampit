import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../api/axios';

export default function BarcodeScanner({ onDecode }) {
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const scannerRef = useRef(null);
  const isProcessing = useRef(false);
  const isRunning = useRef(false);
  const onScanSuccessRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5Qrcode('reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 250 },
      (decodedText) => onScanSuccessRef.current(decodedText),
      () => {}
    ).then(() => {
      isRunning.current = true;
    }).catch((err) => {
      setIsError(true);
      setMessage('Tidak bisa mengakses kamera: ' + (err?.message || err));
    });

    return () => {
      if (isRunning.current) {
        scanner.stop()
          .then(() => scanner.clear())
          .catch(() => {})
          .finally(() => { isRunning.current = false; });
      }
    };
  }, []);

  const onScanSuccess = async (decodedText) => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    if (onDecode) {
      // Dipakai oleh halaman lain (misal Poin Pelanggaran) yang butuh
      // penanganan berbeda saat QR Code berhasil dibaca.
      try {
        const result = await onDecode(decodedText);
        setIsError(!!result?.error);
        setMessage(result?.message || '');
      } catch (err) {
        setIsError(true);
        setMessage(err?.message || 'Terjadi kesalahan.');
      }
    } else {
      // Perilaku default: catat absensi langsung (dipakai di halaman Absensi).
      try {
        const res = await api.post('/attendance/scan', { code: decodedText });
        // Backend menolak beberapa kasus (di luar jam absen, dst) dengan
        // HTTP 200 + flag `ditolak`, bukan status error — cuma cek
        // `already_scanned` di sini bikin penolakan waktu tampil seolah
        // sukses (ikon centang hijau) padahal absensinya TIDAK tercatat.
        setIsError(res.data.already_scanned || res.data.ditolak);
        setMessage(res.data.message);
      } catch (err) {
        setIsError(true);
        setMessage(err.response?.data?.message || 'QR Code tidak dikenali.');
      }
    }

    setTimeout(() => { isProcessing.current = false; }, 2500);
  };

  onScanSuccessRef.current = onScanSuccess;

  return (
    <div className="max-w-md mx-auto">
      <div className="relative rounded-2xl overflow-hidden bg-ink-900 aspect-square">
        <div id="reader" className="w-full h-full" />
      </div>

      {message && (
        <div className={`mt-4 flex items-start gap-2 p-3 rounded-xl text-sm font-medium ${
          isError ? 'bg-honey-50 text-honey-700 border border-honey-200' : 'bg-brand-50 text-brand-700 border border-brand-100'
        }`}>
          {isError
            ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
