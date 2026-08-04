/**
 * Dulu memotong teks panjang jadi "..." di kolom tabel — sekarang sengaja
 * menampilkan teks apa adanya, selengkap-lengkapnya, tanpa dipotong sama
 * sekali. Nama komponen & prop (maxWidth, clickable) dipertahankan supaya
 * semua pemanggil di seluruh aplikasi tidak perlu diubah satu-satu.
 */
export default function TruncateText({ text, className = '' }) {
  if (!text) return <span className="text-ink-300">-</span>;
  return <span className={className}>{text}</span>;
}
