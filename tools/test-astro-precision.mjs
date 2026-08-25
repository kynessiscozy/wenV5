/* Full VSOP/Kepler planetary calculation test */

function norm360(d) {
  let res = d % 360;
  return res < 0 ? res + 360 : res;
}
function rad(d) { return d * Math.PI / 180; }
function deg(r) { return r * 180 / Math.PI; }

function calcPlanetGeocentric(jd, planetKey, sunLong) {
  const n = jd - 2451545.0;
  const sunRad = rad(sunLong);
  const xEarth = Math.cos(sunRad + Math.PI);
  const yEarth = Math.sin(sunRad + Math.PI);

  const ELEMENTS = {
    Mercury: { L0: 252.2509, rate: 4.0923344, a: 0.387098, e: 0.20563 },
    Venus:   { L0: 181.9798, rate: 1.6021303, a: 0.723332, e: 0.00677 },
    Mars:    { L0: 355.4330, rate: 0.5240330, a: 1.523688, e: 0.09340 },
    Jupiter: { L0: 34.3515,  rate: 0.0830853, a: 5.202603, e: 0.04849 },
    Saturn:  { L0: 50.0774,  rate: 0.0334441, a: 9.554909, e: 0.05551 },
    Uranus:  { L0: 314.0550, rate: 0.0117283, a: 19.21845, e: 0.04630 },
    Neptune: { L0: 304.3487, rate: 0.0059810, a: 30.11039, e: 0.00946 },
    Pluto:   { L0: 238.9290, rate: 0.0039640, a: 39.48212, e: 0.24881 }
  };

  const el = ELEMENTS[planetKey];
  if (!el) return 0;

  // Mean longitude & anomaly
  const M = norm360(el.L0 + el.rate * n);
  // Equation of center approximation
  const v = M + deg(2 * el.e * Math.sin(rad(M)));
  const r = el.a * (1 - el.e * el.e) / (1 + el.e * Math.cos(rad(v - M)));

  const vRad = rad(v);
  const xHeliocentric = r * Math.cos(vRad);
  const yHeliocentric = r * Math.sin(vRad);

  // Geocentric transformation
  const xGeo = xHeliocentric - xEarth;
  const yGeo = yHeliocentric - yEarth;

  let lambdaGeo = deg(Math.atan2(yGeo, xGeo));
  return norm360(lambdaGeo);
}

const jd = 2451545.0; // 2000-01-01
const sunLong = 280.38;
['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].forEach(p => {
  const l = calcPlanetGeocentric(jd, p, sunLong);
  const signIdx = Math.floor(l / 30);
  const degInSign = (l % 30).toFixed(1);
  const SIGNS = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
  console.log(`${p}: ${l.toFixed(2)}° -> ${SIGNS[signIdx]}座 ${degInSign}°`);
});
