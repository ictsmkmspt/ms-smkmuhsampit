/**
 * Skala Y "rapi" ala Heckbert: step dibulatkan ke 1/2/5/10 x magnitude
 * supaya label sumbu selalu angka bulat yang enak dibaca, dan yMax
 * dinaikkan ke kelipatan step terdekat supaya tick teratas selalu pas
 * di puncak grafik. Dipakai bersama oleh CategoryBarChart & DailyGroupedBarChart.
 */
export function niceScale(maxValue, targetTicks = 4) {
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
