import { useState } from 'react';

/**
 * Teks yang otomatis dipotong (...) kalau kepanjangan buat tabel, klik buat
 * lihat lengkap (toggle expand/collapse) — dipakai di kolom-kolom tabel yang
 * isinya bisa panjang: nama perusahaan, alamat, email, catatan, dst.
 *
 * Pakai clickable={false} kalau teksnya sudah di dalam elemen yang bisa
 * diklik sendiri (misal baris <button>) — supaya klik untuk expand tidak
 * bentrok/ikut memicu aksi baris itu. Mode ini cuma truncate + tooltip hover.
 */
export default function TruncateText({ text, maxWidth = '12rem', className = '', clickable = true }) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return <span className="text-ink-300">-</span>;

  if (!clickable) {
    return (
      <span title={text} className={`block truncate ${className}`} style={{ maxWidth }}>
        {text}
      </span>
    );
  }

  return (
    <span
      onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
      title={expanded ? 'Klik untuk sembunyikan' : text}
      className={`cursor-pointer hover:text-brand-600 transition ${expanded ? 'inline-block whitespace-normal break-words' : 'block truncate'} ${className}`}
      style={expanded ? undefined : { maxWidth }}
    >
      {text}
    </span>
  );
}
