import DOMPurify from 'dompurify';

// Konten Soal/Pilihan Jawaban CBT sekarang HTML dari editor TipTap (bisa
// ada gambar base64/tabel/tautan) — WAJIB disaring sebelum ditampilkan
// lewat dangerouslySetInnerHTML, soalnya yang lihat bukan cuma guru
// pembuatnya sendiri (siswa ikut lihat pas ngerjain ujian, guru lain bisa
// lihat di analisis). Tanpa ini, guru (atau siapa pun yang berhasil
// menyisipkan payload lewat request API langsung, bukan lewat editor)
// bisa nanam script yang jalan di browser siswa/guru lain — stored XSS.
// Buat label/preview ringkas (mis. daftar soal di modal Buat Ujian,
// Analisis Butir Soal) — HTML dibuang total, cukup teksnya saja, supaya
// tidak render setengah-setengah di ruang sempit yang cuma 1 baris.
export const stripHtml = (html) => DOMPurify.sanitize(html || '', { ALLOWED_TAGS: [] }).replace(/\s+/g, ' ').trim();

export const sanitizeHtml = (html) => DOMPurify.sanitize(html || '', {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 's', 'sup', 'sub', 'ul', 'ol', 'li',
    'blockquote', 'a', 'img', 'table', 'tbody', 'thead', 'tr', 'td', 'th', 'span',
  ],
  ALLOWED_ATTR: ['href', 'src', 'target', 'rel', 'style', 'colspan', 'rowspan'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i,
});
