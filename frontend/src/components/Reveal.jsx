import { useEffect, useRef, useState } from 'react';

/**
 * Bungkus konten supaya fade + geser naik tipis begitu masuk viewport
 * (scroll reveal) — dipakai buat polesan estetik halaman publik seperti
 * LowonganPublic.jsx. Pakai IntersectionObserver murni (bukan GSAP,
 * proyek ini belum pakai GSAP) supaya tidak nambah dependensi baru cuma
 * buat 1 halaman. `motion-safe:` di className bikin animasinya otomatis
 * mati kalau user mengaktifkan "prefers-reduced-motion" — konten tetap
 * langsung terlihat, cuma tidak ada gerakan.
 */
export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 motion-safe:translate-y-3'} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  );
}
