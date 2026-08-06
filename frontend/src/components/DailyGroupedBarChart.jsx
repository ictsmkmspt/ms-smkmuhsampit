import { useMemo, useState } from 'react';
import { Table2, BarChart3 } from 'lucide-react';

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 34;
const PAD_BOTTOM = 20;
const PAD_TOP = 12;
const PAD_RIGHT = 8;

/**
 * Grafik batang berkelompok untuk deret harian (tanggal 1 s.d. akhir bulan):
 * tiap tanggal punya beberapa batang TERPISAH (bukan ditumpuk), 1 per seri
 * berwarna tetap. Dipakai untuk Absensi Bulanan supaya hadir/izin/sakit/alpa
 * tetap terlihat sebagai batang sendiri-sendiri, bukan 1 batang bertumpuk.
 */
export default function DailyGroupedBarChart({ title, subtitle, labels, series, showTableToggle = false }) {
  const [hover, setHover] = useState(null); // index label
  const [showTable, setShowTable] = useState(false);

  const totals = useMemo(
    () => labels.map((_, i) => series.reduce((sum, s) => sum + (s.data[i] || 0), 0)),
    [labels, series]
  );

  const maxValue = Math.max(1, ...series.flatMap((s) => s.data));
  const { yMax, yTicks } = niceScale(maxValue);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const colWidth = plotWidth / labels.length;
  const barGap = 0.6;
  const barWidth = Math.max(1, (colWidth - barGap * (series.length + 1)) / series.length);

  const yFor = (value) => PAD_TOP + plotHeight - (value / yMax) * plotHeight;

  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="font-display font-semibold text-ink-900">{title}</h3>
          {subtitle && <p className="text-xs text-ink-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
      </div>

      <div className="flex flex-wrap gap-3 mt-2 mb-1">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-ink-600">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>

      {showTable ? (
        <div className="table-scroll mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 border-b border-line-200">
                <th className="pb-2 font-medium whitespace-nowrap px-2">Tanggal</th>
                {series.map((s) => (
                  <th key={s.name} className="font-medium text-right whitespace-nowrap px-2">{s.name}</th>
                ))}
                <th className="font-medium text-right whitespace-nowrap px-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={l} className="border-t border-line-200">
                  <td className="py-1.5 text-ink-900 whitespace-nowrap px-2">{l}</td>
                  {series.map((s) => (
                    <td key={s.name} className="text-right text-ink-700 tabular-nums whitespace-nowrap px-2">{s.data[i] || 0}</td>
                  ))}
                  <td className="text-right font-medium text-ink-900 tabular-nums whitespace-nowrap px-2">{totals[i]}</td>
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

            {labels.map((l, i) => {
              const colX = PAD_LEFT + i * colWidth;
              const isHover = hover === i;

              return (
                <g key={l}>
                  {series.map((s, si) => {
                    const val = s.data[i] || 0;
                    const h = (val / yMax) * plotHeight;
                    const x = colX + (colWidth - series.length * barWidth - (series.length - 1) * barGap) / 2 + si * (barWidth + barGap);
                    return (
                      <rect
                        key={s.name}
                        x={x} y={PAD_TOP + plotHeight - h} width={barWidth} height={h}
                        fill={s.color} opacity={isHover ? 1 : 0.92}
                      />
                    );
                  })}
                  <text
                    x={colX + colWidth / 2}
                    y={HEIGHT - PAD_BOTTOM + 12}
                    textAnchor="middle" fontSize="7"
                    fill={isHover ? 'var(--color-ink-900)' : 'var(--color-ink-500)'}
                    fontWeight={isHover ? '600' : '400'}
                  >
                    {l}
                  </text>
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

          {hover !== null && (
            <div
              className="absolute bg-ink-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none z-10 whitespace-nowrap"
              style={{
                left: `${((PAD_LEFT + hover * colWidth + colWidth / 2) / WIDTH) * 100}%`,
                top: 0,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <p className="font-semibold mb-1">Tanggal {labels[hover]}</p>
              {series.map((s) => (
                <p key={s.name} className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-0.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  {s.name}: <span className="font-semibold">{s.data[hover] || 0}</span>
                </p>
              ))}
              <p className="mt-1 pt-1 border-t border-white/20 font-semibold">Total: {totals[hover]}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Skala Y "rapi" ala Heckbert: step dibulatkan ke 1/2/5/10 x magnitude
 * supaya label sumbu selalu angka bulat, dan yMax dinaikkan ke kelipatan
 * step terdekat supaya tick teratas selalu pas di puncak grafik.
 */
function niceScale(maxValue, targetTicks = 4) {
  const rawStep = Math.max(maxValue, 1) / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const stepMentah = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  // Data selalu bilangan bulat, jadi step tidak boleh < 1 — kalau tidak,
  // beberapa tick akan dibulatkan ke nilai integer yang sama (key duplikat).
  const step = Math.max(1, Math.round(stepMentah));
  const yMax = Math.ceil(Math.max(maxValue, 1) / step) * step;
  const yTicks = [];
  for (let v = 0; v <= yMax + 1e-9; v += step) yTicks.push(Math.round(v));
  return { yMax, yTicks };
}
