import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../api/axios';

export default function BarcodeScanner() {
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const scannerRef = useRef(null);
  const isProcessing = useRef(false);
  const isRunning = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode('reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 250 },
      onScanSuccess,
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

    try {
      const res = await api.post('/attendance/scan', { code: decodedText });
      setIsError(res.data.already_scanned);
      setMessage(res.data.message);
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Barcode tidak dikenali.');
    }

    setTimeout(() => { isProcessing.current = false; }, 2500);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="relative rounded-2xl overflow-hidden bg-ink-900 aspect-square">
        <div id="reader" className="w-full h-full" />
        <div className="pointer-events-none absolute inset-5">
          <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-honey-400 rounded-tl-lg" />
          <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-honey-400 rounded-tr-lg" />
          <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-honey-400 rounded-bl-lg" />
          <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-honey-400 rounded-br-lg" />
        </div>
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
