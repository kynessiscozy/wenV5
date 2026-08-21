/* ============================================================
   天气模块 — 定位 → Open-Meteo → 菜单头部内嵌行
   城市名在前，去卡片化，融入 header
   ============================================================ */

const WX_MAP = {
  0:  { icon: 'sun',        label: '晴' },
  1:  { icon: 'sun-cloud',  label: '晴间多云' },
  2:  { icon: 'cloud-sun',  label: '多云' },
  3:  { icon: 'cloud',      label: '阴' },
  45: { icon: 'fog',        label: '雾' },
  48: { icon: 'fog',        label: '雾凇' },
  51: { icon: 'drizzle',    label: '毛毛雨' },
  53: { icon: 'drizzle',    label: '小雨' },
  55: { icon: 'drizzle',    label: '中雨' },
  61: { icon: 'rain',       label: '小雨' },
  63: { icon: 'rain',       label: '中雨' },
  65: { icon: 'heavy-rain', label: '大雨' },
  71: { icon: 'snow',       label: '小雪' },
  73: { icon: 'snow',       label: '中雪' },
  75: { icon: 'snow',       label: '大雪' },
  77: { icon: 'snow',       label: '雪粒' },
  80: { icon: 'rain',       label: '阵雨' },
  81: { icon: 'rain',       label: '中阵雨' },
  82: { icon: 'heavy-rain', label: '大阵雨' },
  85: { icon: 'snow',       label: '小阵雪' },
  86: { icon: 'snow',       label: '大阵雪' },
  95: { icon: 'thunder',    label: '雷暴' },
  96: { icon: 'thunder',    label: '雷暴冰雹' },
  99: { icon: 'thunder',    label: '强雷暴' },
};

/* ---- 天气大图标 (26x26) — 精致版，含微光填充 ---- */
function wxIconBig(key) {
  const h = '<svg viewBox="0 0 26 26" width="26" height="26" fill="none" stroke-linecap="round" stroke-linejoin="round">';
  const s = 'stroke="currentColor" stroke-width="1.5"';
  const su = 'stroke="currentColor" stroke-width="1.5" fill="currentColor" fill-opacity=".12"';
  // 太阳 — 内外双圈 + 放射光芒
  const sun = `<circle cx="13" cy="12" r="4.5" ${su}/><path d="M13 1.5v2M13 22.5v1.5M3.5 12h2M20.5 12h2M6.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M6.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" ${s}/>`;
  // 云 — 叠加层云轮廓
  const cloud = `<path d="M5.5 14.5C2.5 14.5 1.5 12 1.5 10S3.5 6 6 5.5a6 6 0 0 1 11-1c2.5.2 4.5 2 4.5 4.8S18 14.5 15.5 14.5Z" ${s}/>`;
  // 雨滴
  const rain = `<path d="M14.5 19l-1 3M18.5 19.5l-1 3" ${s}/>`;
  switch (key) {
    case 'sun':
      return h + sun + '</svg>';
    case 'sun-cloud':
      return h + `<circle cx="13" cy="10" r="3.5" ${su}/><path d="M13 2v1.5M13 18v1.5M5.5 10h1.5M18.5 10h1.5M7.7 6.7l1 1M16.3 13.3l1 1M7.7 13.3l1-1M16.3 6.7l1-1" ${s}/>` + cloud + '</svg>';
    case 'cloud-sun':
      return h + `<circle cx="7.5" cy="8.5" r="3" ${su}/><path d="M7.5 2v1.5M7.5 15v1.5M2.5 8.5h1.2M11.5 8.5h1.2M4 5l.9.9M10 12l.9.9M4 12l.9-.9M10 5l.9-.9" ${s}/>` + cloud + '</svg>';
    case 'cloud':
      return h + cloud + '</svg>';
    case 'drizzle':
      return h + cloud + `<path d="M10.5 19l-.5 2M13.5 19.5l-.5 2M16.5 19l-.5 2" stroke="currentColor" stroke-width="1.1"/>` + '</svg>';
    case 'rain':
      return h + rain + cloud + '</svg>';
    case 'heavy-rain':
      return h + cloud + `<path d="M9.5 19l-1 3M13 18.5l-1 3M16.5 19l-1 3" stroke="currentColor" stroke-width="1.2"/>` + '</svg>';
    case 'snow':
      return h + cloud + `<circle cx="10.5" cy="19" r="1.1" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1"/><circle cx="13.5" cy="20" r="1.1" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1"/><circle cx="16.5" cy="19" r="1.1" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1"/>` + '</svg>';
    case 'thunder':
      return h + cloud + `<path d="M13.5 14 9.5 18h3l-1.5 4 5-3.5h-3l2-4.5Z" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.3"/>` + '</svg>';
    case 'fog':
      return h + `<path d="M3.5 10h19M3.5 13h15M3.5 16h17" stroke="currentColor" stroke-width="1.4"/>` + '</svg>';
    default:
      return h + sun + '</svg>';
  }
}

/* ---- 辅助图标 — 定位针 / 湿度 / 风速 (13x13) ---- */
const miniLoc = '<svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="5.5" r="2.5" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="5.5" r="1" fill="currentColor" fill-opacity=".25"/><path d="M10.5 12c0-1.8-3.5-5.3-3.5-5.3S3.5 10.2 3.5 12" stroke="currentColor" stroke-width="1.3"/></svg>';
const miniHum = '<svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M7 12.5c-1.5 0-2.7-1.2-2.7-2.7 0-2.3 2.7-5 2.7-5s2.7 2.7 2.7 5c0 1.5-1.2 2.7-2.7 2.7Z" stroke="currentColor" stroke-width="1.3"/><path d="M6.3 10.7c0-.4.3-.7.7-.7s.7.3.7.7" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width=".8"/></svg>';
const miniWnd = '<svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.5h6c1 0 1.8-.8 1.8-1.8S9 2.9 8 2.9s-1.8.8-1.8 1.8" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 9.5h5.5c1 0 1.8.8 1.8 1.8s-.8 1.8-1.8 1.8-1.8-.8-1.8-1.8" stroke="currentColor" stroke-width="1.3"/><path d="M3 12h4.5" stroke="currentColor" stroke-width="1.3"/></svg>';

/* ---- 反向地理编码 ---- */
async function reverseCity(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=zh&zoom=10`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error('nominatim fail');
    const d = await r.json();
    const addr = d.address || {};
    return addr.city || addr.town || addr.county || addr.state || addr.country || '';
  } catch (e) {
    return '';
  }
}

/* ---- 获取天气 ---- */
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  const r = await fetch(url, { signal: ctrl.signal });
  clearTimeout(t);
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

/* ---- 渲染天气模块 ---- */
/* 同时刷新首页和 p2 菜单的天气卡片 */
function _setWxLoading(prefix) {
  const card = document.getElementById(prefix + 'WxLine');
  if (!card) return;
  card.style.display = 'block';
  card.classList.add('is-loading');
  const iconEl = document.getElementById(prefix + 'WxIcon');
  const primaryEl = document.getElementById(prefix + 'WxPrimary');
  const secondaryEl = document.getElementById(prefix + 'WxSecondary');
  if (primaryEl) primaryEl.innerHTML = '天气加载中…';
  if (secondaryEl) secondaryEl.innerHTML = '';
  if (iconEl) iconEl.innerHTML = '<svg viewBox="0 0 26 26" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="13" cy="12" r="4.5" fill="currentColor" fill-opacity=".12"/><path d="M13 1.5v2M13 22.5v1.5M3.5 12h2M20.5 12h2M6.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M6.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>';
}

function _setWxContent(prefix, icon, temp, label, city, hum, wind) {
  const card = document.getElementById(prefix + 'WxLine');
  if (!card) return;
  card.classList.remove('is-loading');
  const iconEl = document.getElementById(prefix + 'WxIcon');
  const primaryEl = document.getElementById(prefix + 'WxPrimary');
  const secondaryEl = document.getElementById(prefix + 'WxSecondary');
  if (iconEl) iconEl.innerHTML = wxIconBig(icon);
  if (primaryEl) primaryEl.innerHTML = `<span class="t">${temp}°</span>${label}`;
  if (secondaryEl) {
    let parts = [];
    if (city) parts.push(`<span class="wx-meta-item">${miniLoc}${city}</span>`);
    parts.push(`<span class="wx-meta-item">${miniHum}${hum}%</span>`);
    parts.push(`<span class="wx-meta-item">${miniWnd}${wind} km/h</span>`);
    secondaryEl.innerHTML = parts.join('<span class="wx-meta-sep">·</span>');
  }
}

function _setWxError(prefix) {
  const card = document.getElementById(prefix + 'WxLine');
  if (!card) return;
  card.classList.remove('is-loading');
  const iconEl = document.getElementById(prefix + 'WxIcon');
  const primaryEl = document.getElementById(prefix + 'WxPrimary');
  const secondaryEl = document.getElementById(prefix + 'WxSecondary');
  if (primaryEl) primaryEl.innerHTML = '天气暂不可用';
  if (secondaryEl) secondaryEl.innerHTML = '';
  if (iconEl) iconEl.innerHTML = '<svg viewBox="0 0 26 26" width="26" height="26"><circle cx="13" cy="13" r="5" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".4"/><path d="M10 10l6 6M10 16l6-6" stroke="currentColor" stroke-width="1.5" opacity=".4" stroke-linecap="round"/></svg>';
}

const WX_PREFIXES = ['wx', 'p2Wx']; /* 首页 + p2菜单 */

async function refreshWeather() {
  WX_PREFIXES.forEach(p => _setWxLoading(p));

  try {
    let lat, lon, city = '';
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('no geo'));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, timeout: 8000, maximumAge: 600000
        });
      });
      lat = pos.coords.latitude.toFixed(4);
      lon = pos.coords.longitude.toFixed(4);
      city = await reverseCity(lat, lon);
      _wxGeo = { city, lat: parseFloat(lat), lon: parseFloat(lon) };
    } catch (e) {
      lat = '39.9042'; lon = '116.4074'; city = '北京';
    }

    const data = await fetchWeather(lat, lon);
    const cur = data.current;
    const wx = WX_MAP[cur.weather_code] || { icon: 'sun', label: '未知' };
    const temp = Math.round(cur.temperature_2m);
    const hum  = cur.relative_humidity_2m;
    const wind = Math.round(cur.wind_speed_10m);
    // 缓存最近天气，供需要结合环境的工具使用
    _wxNow = { city, temp, hum, wind, label: wx.label, code: cur.weather_code, icon: wx.icon };

    WX_PREFIXES.forEach(p => _setWxContent(p, wx.icon, temp, wx.label, city, hum, wind));
  } catch (e) {
    console.warn('天气获取失败:', e);
    WX_PREFIXES.forEach(p => _setWxError(p));
  }
}

/* ---- 导出当前地理位置 ---- */
let _wxGeo = null;

export function getWxGeo() {
  return _wxGeo;
}

/* ---- 主动获取定位（供工具按需调用，如风水大师） ----
   返回 {city, lat, lon}，并写入 _wxGeo 缓存。
   失败时抛出错误，由调用方决定是否回退默认值。 */
export async function requestGeo() {
  return await new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('当前浏览器不支持定位'));
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));
        const city = await reverseCity(lat, lon);
        _wxGeo = { city: city || '当前位置', lat, lon };
        resolve(_wxGeo);
      } catch (e) {
        _wxGeo = { city: '当前位置', lat: pos.coords.latitude, lon: pos.coords.longitude };
        resolve(_wxGeo);
      }
    }, (err) => {
      reject(new Error(err && err.code === 1 ? '定位权限被拒绝，请在浏览器设置中允许后重试' : '定位失败'));
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
  });
}

/* ---- 导出最近一次天气（供工具结合使用） ---- */
let _wxNow = null;

export function getWxNow() {
  return _wxNow;
}
let _lastFetch = 0;

export function initWeather() {
  const el = document.getElementById('wxLine');
  if (!el) return;

  refreshWeather();
  _lastFetch = Date.now();

  const observer = new MutationObserver(() => {
    const homeDrawer = document.getElementById('homeMenuDrawer');
    const p2Drawer = document.getElementById('p2MenuDrawer');
    const isOpen = (homeDrawer && homeDrawer.classList.contains('open')) ||
                   (p2Drawer && p2Drawer.classList.contains('open'));
    if (isOpen) {
      const now = Date.now();
      if (now - _lastFetch > 600000) {
        refreshWeather();
        _lastFetch = now;
      }
    }
  });

  const homeDrawer = document.getElementById('homeMenuDrawer');
  if (homeDrawer) {
    observer.observe(homeDrawer, { attributes: true, attributeFilter: ['class'] });
  }
  const p2Drawer = document.getElementById('p2MenuDrawer');
  if (p2Drawer) {
    observer.observe(p2Drawer, { attributes: true, attributeFilter: ['class'] });
  }
}
