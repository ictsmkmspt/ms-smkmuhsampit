import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Default center kalau belum ada koordinat sama sekali — Sampit, Kalimantan
// Tengah (lokasi sekolah), supaya peta tidak mulai dari tengah lautan.
const DEFAULT_CENTER = [-2.5407, 112.9531];
const DEFAULT_ZOOM = 13;

const markerIcon = L.divIcon({
  className: '',
  html: '<div style="width:20px;height:20px;border-radius:50%;background:#15803D;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

/**
 * Peta kecil untuk pilih koordinat lokasi (klik di peta ATAU geser
 * marker) — dipakai form pendaftaran mandiri IDUKA
 * (BursaLoginPage.jsx) supaya lokasi GPS-nya bisa diisi tanpa harus tahu
 * angka latitude/longitude sendiri. Leaflet dipakai langsung (bukan
 * react-leaflet) supaya tidak nambah dependensi versi yang harus dicocokkan.
 */
export default function LocationPickerMap({ latitude, longitude, onChange, height = 220 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const map = L.map(containerRef.current, {
      center: latitude && longitude ? [latitude, longitude] : DEFAULT_CENTER,
      zoom: latitude && longitude ? 16 : DEFAULT_ZOOM,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const placeMarker = (lat, lng) => {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: markerIcon, draggable: true }).addTo(map);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getLatLng();
          onChangeRef.current(pos.lat, pos.lng);
        });
      }
    };

    if (latitude && longitude) placeMarker(latitude, longitude);

    map.on('click', (e) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
      onChangeRef.current(e.latlng.lat, e.latlng.lng);
    });

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kalau lat/lng berubah dari LUAR (mis. tombol "Gunakan Lokasi Saya"),
  // pindahkan marker + view peta tanpa bikin ulang peta-nya.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !latitude || !longitude) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      markerRef.current = L.marker([latitude, longitude], { icon: markerIcon, draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng();
        onChangeRef.current(pos.lat, pos.lng);
      });
    }
    map.setView([latitude, longitude], Math.max(map.getZoom(), 16));
  }, [latitude, longitude]);

  return (
    <div>
      <div ref={containerRef} style={{ height }} className="rounded-xl overflow-hidden border border-line-200" />
      <p className="text-xs text-ink-400 mt-1.5">Klik di peta atau geser penanda untuk memilih lokasi.</p>
    </div>
  );
}
