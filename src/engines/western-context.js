import { calcWesternChart, calcNumerology } from './western.js';
import { zonedTimeToUtc } from './calendar.js';

// A report context is reused by its views, AI and sharing. Cache by both object
// and inputs so edits or a new calendar year cannot return stale results.
const cache = new WeakMap();

export function getWesternProfile(ctx) {
  if (!ctx || typeof ctx !== 'object') return null;
  const input = ctx.input || ctx._input;
  const city = ctx.city;
  if (!input || !city || !Number.isFinite(city.o) || !Number.isFinite(city.a)) return null;
  const y = Number(input.by), m = Number(input.bm), d = Number(input.bd);
  const time = /^([01]\d|2[0-3]):([0-5]\d)(?::00(?:\.0{1,3})?)?$/.exec(String(input.timeStr || ''));
  if (!Number.isInteger(y) || y < 1 || y > 9999 || !Number.isInteger(m) || !Number.isInteger(d) || !time) return null;
  const date = new Date(0);
  date.setUTCFullYear(y, m - 1, d);
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const h = Number(time[1]), min = Number(time[2]);
  const key = [y, m, d, h, min, city.o, city.a, city.tz, new Date().getFullYear()].join('|');
  const saved = cache.get(ctx);
  if (saved?.key === key) return saved.value;
  // Resolve the birth wall time using the city’s historical IANA offset.
  const instant = zonedTimeToUtc(y, m, d, h, min, 0, city.tz || 'Asia/Shanghai');
  const wall = new Date(0);
  wall.setUTCFullYear(y, m - 1, d);
  wall.setUTCHours(h, min, 0, 0);
  const offset = (wall.getTime() - instant.getTime()) / 3600000;
  const value = { y, m, d, h, min, city,
    chart: calcWesternChart(y, m, d, h, min, city.o, city.a, offset),
    numerology: calcNumerology(y, m, d) };
  cache.set(ctx, { key, value });
  return value;
}
