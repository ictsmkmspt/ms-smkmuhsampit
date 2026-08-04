import { useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 34;
const PAD_BOTTOM = 34;
const PAD_TOP = 12;
const PAD_RIGHT = 8;

/**
 * Grafik batang untuk 1 titik waktu (mis. 1 bulan terpilih), di mana tiap
 * batang mewakili satu kategori (jenis pelanggaran/prestasi, atau status
 * kehadiran) dengan warnanya sendiri — bukan deret waktu. Label kategori
 * ditaruh langsung di bawah tiap batang, jadi tidak perlu legend terpisah
 * (identitas sudah tidak bergantung ke warna semata).
 */
export default function CategoryBarChart({ title, subtitle, categories, showTableToggle = false }) {
  const [hover, setHover] = useState(null); // index kategori
  const [showTable, setShowTable] = useState(false);

  const maxValue = Math.max(1, ...categories.map((c) => c.value));
  const { yMax, yTicks } = niceScale(maxValue);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const colWidth = categories.length ? plotWidth / categories.length : plotWidth;
  const barWidth = Math.min(40, colWidth * 0.5);

  const yFor = (value) => PAD_TOP + plotHeight - (value / yMax) * plotHeight;

  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="font-display font-semibold text-ink-900">{title}</h3>
          {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
        </div>
        {showTableToggle && (
          <button
            onClick={() => setShowTable((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-600 bg-mist-50 hover:bg-mist-100 border border-line-200 rounded-lg px-2.5 py-1.5 transition shrink-0"
          >
            {showTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
            {showTable ? 'Lihat Grafik' : 'Lihat Tabel'}
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <p className="text-center text-ink-300 py-10 text-sm">Belum ada data untuk bulan ini.</p>
      ) : showTable ? (
        <div className="table-scroll mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium">Kategori</th>
                <th className="font-medium text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.name} className="border-t border-line-200">
                  <td className="py-1.5 text-ink-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </td>
                  <td className="text-right text-ink-700 tabular-nums">{c.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-2">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" role="img" aria-label={title}>
            {yTicks.map((t) => (
              <line
                key={t}
                x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT}
                y1={yFor(t)} y2={yFor(t)}
                stroke="var(--color-line-200)" strokeWidth="1"
              />
            ))}

            {yTicks.map((t) => (
              <text key={t} x={PAD_LEFT - 8} y={yFor(t)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="var(--color-ink-500)">
                {t}
              </text>
            ))}

            {categories.map((c, i) => {
              const colX = PAD_LEFT + i * colWidth;
              const x = colX + (colWidth - barWidth) / 2;
              const h = (c.value / yMax) * plotHeight;
              const isHover = hover === i;
              const barisLabel = wrapLabel(c.name);

              return (
                <g key={c.name}>
                  <rect
                    x={x} y={PAD_TOP + plotHeight - h} width={barWidth} height={h}
                    rx={4} fill={c.color} opacity={isHover ? 1 : 0.92}
                  />
                  {barisLabel.map((baris, bi) => (
                    <text
                      key={bi}
                      x={colX + colWidth / 2}
                      y={HEIGHT - PAD_BOTTOM + 14 + bi * 10}
                      textAnchor="middle" fontSize="8.5"
                      fill={isHover ? 'var(--color-ink-900)' : 'var(--color-ink-500)'}
                      fontWeight={isHover ? '600' : '400'}
                    >
                      {baris}
                    </text>
                  ))}
                  <rect
                    x={colX} y={PAD_TOP} width={colWidth} height={plotHeight}
                    fill="transparent" tabIndex={0}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    style={{ cursor: 'pointer', outline: 'none' }}
                  />
                </g>
              );
            })}
          </svg>

          {hover !== null && categories[hover] && (
            <div
              className="absolute bg-ink-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none z-10 whitespace-nowrap"
              style={{
                left: `${((PAD_LEFT + hover * colWidth + colWidth / 2) / WIDTH) * 100}%`,
                top: 0,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <p className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-0.5 rounded-full shrink-0" style={{ backgroundColor: categories[hover].color }} />
                <span className="font-semibold">{categories[hover].name}: {categories[hover].value}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function wrapLabel(name) {
  const kata = name.split(' ');
  if (kata.length <= 1 || name.length <= 10) return [name];
  const tengah = Math.ceil(kata.length / 2);
  return [kata.slice(0, tengah).join(' '), kata.slice(tengah).join(' ')];
}

/**
 * Skala Y "rapi" ala Heckbert: step dibulatkan ke 1/2/5/10 x magnitude
 * supaya label sumbu selalu angka bulat yang enak dibaca, dan yMax
 * dinaikkan ke kelipatan step terdekat supaya tick teratas selalu pas
 * di puncak grafik.
 */
function niceScale(maxValue, targetTicks = 4) {
  const rawStep = Math.max(maxValue, 1) / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  const yMax = Math.ceil(Math.max(maxValue, 1) / step) * step;
  const yTicks = [];
  for (let v = 0; v <= yMax + 1e-9; v += step) yTicks.push(Math.round(v));
  return { yMax, yTicks };
}
