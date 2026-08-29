/* ============================================================
   western-view.js · 西方星相体系高精矢量视觉化渲染层 (Pure SVG / Zero Emoji)
   ------------------------------------------------------------
   打造博物馆级别、高精度、极具仪式感的西方星盘全景体验：
     1. 占星术 (Astrology)：
        - 高精视觉化本命星盘圆盘 (SVG 500px High-End Natal Wheel)
        - 360° 黄道度数刻度、12 宫位划分、四大天顶地轴 (ASC/DSC/MC/IC)
        - 十大星曜高精度落点与纯 SVG 发光勋章 (Zero Emoji)
        - 真实几何相位织网 (Trine/Sextile/Opposition/Square) 与相位速查表
        - 太阳·月亮·上升三核黄金大卡 + 六维天赋潜能雷达图
     2. 星座全览 (Horoscope)：
        - 12星座交互式黄道运势轮盘与纯 SVG 矢量微标
        - 事业/感情/财富/健康 四大维度进度仪表与宜忌
        - 宏观星象天象周期预报（本周/本月/年度）
     3. 生命灵术 (Numerology)：
        - 毕达哥拉斯核心主命数大图腾卡
        - 九宫能量图阵连线图腾 (SVG 3x3 Grid with Active Line Highlights)
        - 9年生命周期循环流年环 (9-Year Cycle Ring)
   ============================================================ */

import { calcWesternChart, calcNumerology } from '../engines/western.js';
import { initWestern3D, syncWestern3D } from '../fx/western3d.js';
import { zodiacArtSVG } from './zodiac-art.js';

let _w3dReady = false;
function ensureW3D() { if (!_w3dReady) { _w3dReady = true; try { initWestern3D(); } catch (e) { console.warn('[western3d]', e); } } }
import { SIGNS, getSunSignByDate, getHoroscopeForecast } from '../tools2/horoscope.js';
import { attachToolAI } from '../tools2/runtime.js';

/* ============================================================
   纯 SVG 矢量图标库与路径系统 (Zero Emoji / Pure Vector Icons)
   ============================================================ */

/** 黄道十二星座 SVG 路径字典 */
export const ZODIAC_SVG_PATHS = {
  aries: 'M 12 20 L 12 10 C 9.5 5 4 4 4 8 C 4 11 7 13 10 11 M 12 10 C 14.5 5 20 4 20 8 C 20 11 17 13 14 11',
  taurus: 'M 12 9 A 5 5 0 1 0 12 19 A 5 5 0 1 0 12 9 M 5 5 C 8 9 16 9 19 5',
  gemini: 'M 4 5 Q 12 8 20 5 M 4 19 Q 12 16 20 19 M 8 6 L 8 18 M 16 6 L 16 18',
  cancer: 'M 8 8 A 3 3 0 1 0 8 2 A 3 3 0 1 0 8 8 M 8 5 C 13 3 19 6 18 11 M 16 22 A 3 3 0 1 0 16 16 A 3 3 0 1 0 16 22 M 16 19 C 11 21 5 18 6 13',
  leo: 'M 7 14 A 3 3 0 1 0 7 8 A 3 3 0 1 0 7 14 M 9.5 12.5 C 11 6 17 6 16 12 C 15 16 18 19 20 16',
  virgo: 'M 4 18 L 4 8 C 4 5 7 5 7 8 L 7 18 M 7 8 C 7 5 10 5 10 8 L 10 18 M 10 8 C 10 5 13 5 13 8 L 13 15 C 13 20 19 18 18 12 C 17 9 14 13 18 19',
  libra: 'M 4 19 L 20 19 M 4 13 L 8.5 13 A 3.5 3.5 0 0 1 15.5 13 L 20 13',
  scorpio: 'M 4 18 L 4 8 C 4 5 7 5 7 8 L 7 18 M 7 8 C 7 5 10 5 10 8 L 10 18 M 10 8 C 10 5 13 5 13 8 L 13 14 C 13 18 17 18 19 15 M 16 15 L 19 15 L 18 18',
  sagittarius: 'M 5 19 L 19 5 M 13 5 L 19 5 L 19 11 M 8 13 L 13 18',
  capricorn: 'M 5 17 L 5 8 C 5 5 8 5 8 8 L 8 15 C 8 19 13 19 14 15 C 15 11 11 11 13 16',
  aquarius: 'M 4 9 L 7 6 L 10 9 L 13 6 L 16 9 L 19 6 L 20 7 M 4 15 L 7 12 L 10 15 L 13 12 L 16 15 L 19 12 L 20 13',
  pisces: 'M 6 4 C 10 8 10 16 6 20 M 18 4 C 14 8 14 16 18 20 M 4 12 L 20 12'
};

/** 生成星座独立完整 SVG 标签 */
export function getZodiacSvg(id, size = 18, color = 'currentColor') {
  const key = (id || '').toLowerCase();
  const path = ZODIAC_SVG_PATHS[key] || ZODIAC_SVG_PATHS.aries;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="w-svg-ic w-zodiac-ic" style="color:${color}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
}

/** 获取星座在母 SVG 内部的 <g> 矢量节点 (供 500px 轮盘嵌入) */
export function getZodiacSvgNode(id, x, y, scale = 0.8, color = 'currentColor') {
  const key = (id || '').toLowerCase();
  const path = ZODIAC_SVG_PATHS[key] || ZODIAC_SVG_PATHS.aries;
  return `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${scale})" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${path}" transform="translate(-12, -12)"/></g>`;
}

/** 行星纯 SVG 节点渲染 (供 500px 星盘勋章与列表嵌入) */
export function getPlanetSvgNode(key, x, y, scale = 0.65, color = 'currentColor') {
  let content = '';
  switch (key) {
    case 'Sun':
      content = `<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>`;
      break;
    case 'Moon':
      content = `<path d="M 12 3 A 9 9 0 0 0 12 21 C 7 18 7 6 12 3 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`;
      break;
    case 'Asc':
      content = `<line x1="3" y1="17" x2="21" y2="17" stroke="currentColor" stroke-width="1.8"/><path d="M 6 17 A 6 6 0 0 1 18 17" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M 12 5 L 12 10 M 7 7 L 10 9 M 17 7 L 14 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`;
      break;
    case 'Mercury':
      content = `<path d="M 8 4 Q 12 7 16 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="11" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="12" y1="15.5" x2="12" y2="21" stroke="currentColor" stroke-width="1.8"/><line x1="8.5" y1="18.5" x2="15.5" y2="18.5" stroke="currentColor" stroke-width="1.8"/>`;
      break;
    case 'Venus':
      content = `<circle cx="12" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="12" y1="14" x2="12" y2="21" stroke="currentColor" stroke-width="1.8"/><line x1="8.5" y1="17.5" x2="15.5" y2="17.5" stroke="currentColor" stroke-width="1.8"/>`;
      break;
    case 'Mars':
      content = `<circle cx="9" cy="15" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="12.5" y1="11.5" x2="19" y2="5" stroke="currentColor" stroke-width="1.8"/><polyline points="14,5 19,5 19,10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    case 'Jupiter':
      content = `<path d="M 6 7 Q 10 4 10 18 M 6 12 L 18 12 M 15 8 L 15 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
      break;
    case 'Saturn':
      content = `<line x1="9" y1="4" x2="9" y2="13" stroke="currentColor" stroke-width="1.8"/><line x1="5.5" y1="7" x2="12.5" y2="7" stroke="currentColor" stroke-width="1.8"/><path d="M 9 11 Q 15 12 15 16 Q 15 20 12 20 Q 9 20 9 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
      break;
    case 'Uranus':
      content = `<circle cx="12" cy="17" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="12" y1="14" x2="12" y2="5" stroke="currentColor" stroke-width="1.8"/><line x1="6" y1="5" x2="6" y2="12" stroke="currentColor" stroke-width="1.8"/><line x1="18" y1="5" x2="18" y2="12" stroke="currentColor" stroke-width="1.8"/><line x1="6" y1="8.5" x2="18" y2="8.5" stroke="currentColor" stroke-width="1.8"/>`;
      break;
    case 'Neptune':
      content = `<line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="1.8"/><line x1="8.5" y1="17" x2="15.5" y2="17" stroke="currentColor" stroke-width="1.8"/><path d="M 6 8 Q 6 14 12 14 Q 18 14 18 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
      break;
    case 'Pluto':
    default:
      content = `<circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M 7 9 Q 7 14 12 14 Q 17 14 17 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="12" y1="14" x2="12" y2="21" stroke="currentColor" stroke-width="1.8"/><line x1="8.5" y1="17.5" x2="15.5" y2="17.5" stroke="currentColor" stroke-width="1.8"/>`;
      break;
  }
  return `<g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${scale})" style="color:${color}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(-12, -12)">${content}</g></g>`;
}

/** 独立行星 SVG 图标 */
export function getPlanetSvg(key, size = 18, color = 'currentColor') {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="w-svg-ic w-planet-ic" style="color:${color}" aria-hidden="true">${getPlanetSvgNode(key, 12, 12, 0.9, color)}</svg>`;
}

/** 四象元素纯 SVG 图标 */
export function getElementSvg(elemKey, size = 16, color = 'currentColor') {
  let path = '';
  switch (elemKey) {
    case 'fire':
      path = `<path d="M 12 3 C 12 3 7 9 7 14 C 7 17.5 9.5 20 12 20 C 14.5 20 17 17.5 17 14 C 17 11 15 9 15 9 C 15 9 14 12 12 12 C 10.5 12 10.5 10 12 8 C 12.8 6.8 12 3 12 3 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`;
      break;
    case 'earth':
      path = `<polygon points="12,4 20,19 4,19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><line x1="6" y1="14" x2="18" y2="14" stroke="currentColor" stroke-width="1.6"/>`;
      break;
    case 'air':
      path = `<path d="M 4 9 L 15 9 C 17 9 18 7.5 17 6 C 16 4.5 14 5 14 6 M 4 14 L 17 14 C 19 14 20 15.5 19 17 C 18 18.5 16 18 16 17 M 4 19 L 12 19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
      break;
    case 'water':
    default:
      path = `<path d="M 12 3 C 12 3 6 10 6 15 C 6 18.3 8.7 21 12 21 C 15.3 21 18 18.3 18 15 C 18 10 12 3 12 3 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`;
      break;
  }
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="w-svg-ic w-elem-ic" style="color:${color}" aria-hidden="true">${path}</svg>`;
}

/** 占星与生活面向通用纯 SVG 图标 */
export function getWesternSvgIcon(name, size = 16, color = 'currentColor') {
  let content = '';
  switch (name) {
    case 'sun':
    case 'solar':
      content = `<circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M 12 2 L 12 5 M 12 19 L 12 22 M 2 12 L 5 12 M 19 12 L 22 12 M 4.9 4.9 L 7.1 7.1 M 16.9 16.9 L 19.1 19.1 M 4.9 19.1 L 7.1 16.9 M 16.9 7.1 L 19.1 4.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`;
      break;
    case 'moon':
    case 'lunar':
      content = `<path d="M 12 3 A 9 9 0 0 0 12 21 C 7 18 7 6 12 3 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`;
      break;
    case 'asc':
    case 'sunrise':
      content = `<line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" stroke-width="1.8"/><path d="M 6 18 A 6 6 0 0 1 18 18" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M 12 6 L 12 11 M 7 8 L 10 10 M 17 8 L 14 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`;
      break;
    case 'sparkle':
      content = `<path d="M 12 3 L 14 9 L 20 11 L 14 13 L 12 19 L 10 13 L 4 11 L 10 9 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`;
      break;
    case 'star':
      content = `<polygon points="12,3 14.8,8.5 21,9.3 16.5,13.7 17.6,19.8 12,16.8 6.4,19.8 7.5,13.7 3,9.3 9.2,8.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`;
      break;
    case 'strength':
      content = `<path d="M 12 3 L 19 6 L 19 12 C 19 16.5 16 19.5 12 21 C 8 19.5 5 16.5 5 12 L 5 6 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><polyline points="9,12 11,14 15,10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
      break;
    case 'warning':
      content = `<polygon points="12,4 21,19 3,19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1" fill="currentColor"/>`;
      break;
    case 'career':
      content = `<rect x="4" y="8" width="16" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M 9 8 L 9 5 C 9 4.5 9.5 4 10 4 L 14 4 C 14.5 4 15 4.5 15 5 L 15 8" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="4" y1="13" x2="20" y2="13" stroke="currentColor" stroke-width="1.6"/>`;
      break;
    case 'love':
      content = `<path d="M 12 20 C 12 20 4 15 4 9 C 4 6 6 4 9 4 C 10.8 4 12 5.2 12 5.2 C 12 5.2 13.2 4 15 4 C 18 4 20 6 20 9 C 20 15 12 20 12 20 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`;
      break;
    case 'wealth':
      content = `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M 12 7 L 12 17 M 9.5 9.5 C 9.5 8 11 8 12 8 C 13.5 8 14.5 8.8 14.5 10 C 14.5 12 9.5 11.5 9.5 13.5 C 9.5 14.8 10.5 15.5 12 15.5 C 13.5 15.5 14.5 14.8 14.5 13.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
      break;
    case 'health':
      content = `<path d="M 4 12 C 4 12 8 8 12 8 C 16 8 20 12 20 12 C 20 12 16 16 12 16 C 8 16 4 12 4 12 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M 12 4 L 12 6 M 12 18 L 12 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`;
      break;
    case 'color':
      content = `<path d="M 12 3 C 7 3 3 7 3 12 C 3 16 6 19 9 19 C 10 19 10.5 18.5 10.5 17.5 C 10.5 16.8 10.2 16.2 10.2 15.5 C 10.2 14 11.5 13 13 13 L 15 13 C 18 13 21 10.5 21 7.5 C 21 5 17 3 12 3 Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="7.5" cy="9.5" r="1.2" fill="currentColor"/><circle cx="11.5" cy="6.5" r="1.2" fill="currentColor"/><circle cx="16.5" cy="8.5" r="1.2" fill="currentColor"/>`;
      break;
    case 'number':
      content = `<rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M 8 9 L 10 7 L 10 13 M 8 13 L 12 13 M 14 7 L 16 7 L 16 13 M 14 10 L 16 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    case 'noble':
      content = `<circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="15" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M 4 18 C 4 15 7 13 9 13 C 10 13 11 13.5 12 14.5 C 13 13.5 14 13 15 13 C 17 13 20 15 20 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
      break;
    case 'calendar':
      content = `<rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="4" y1="10" x2="20" y2="10" stroke="currentColor" stroke-width="1.6"/><line x1="8" y1="3" x2="8" y2="6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="16" y1="3" x2="16" y2="6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
      break;
    case 'telescope':
      content = `<line x1="5" y1="16" x2="19" y2="6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M 16 4 L 20 7 L 17 11 L 13 8 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M 7 14 L 12 19 M 10 16 L 8 21 M 11 17 L 14 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
      break;
    case 'geometry':
      content = `<polygon points="4,20 20,20 4,4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><line x1="4" y1="16" x2="8" y2="20" stroke="currentColor" stroke-width="1.6"/><line x1="4" y1="12" x2="12" y2="20" stroke="currentColor" stroke-width="1.6"/><line x1="4" y1="8" x2="16" y2="20" stroke="currentColor" stroke-width="1.6"/>`;
      break;
    case 'hourglass':
      content = `<path d="M 6 4 L 18 4 M 6 20 L 18 20 M 7 4 C 7 10 11 12 11 12 C 11 12 7 14 7 20 M 17 4 C 17 10 13 12 13 12 C 13 12 17 14 17 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    case 'target':
      content = `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>`;
      break;
    case 'idea':
      content = `<path d="M 9 18 L 15 18 M 10 21 L 14 21 M 12 3 C 8 3 6 6 6 9 C 6 12 8.5 13.5 8.5 15 L 15.5 15 C 15.5 13.5 18 12 18 9 C 18 6 16 3 12 3 Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    case 'book':
      content = `<path d="M 4 19.5 C 4 17 6 17 12 17 C 18 17 20 17 20 19.5 M 4 4.5 C 4 7 6 7 12 7 C 18 7 20 7 20 4.5 M 4 4.5 L 4 19.5 M 20 4.5 L 20 19.5 M 12 7 L 12 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`;
      break;
    case 'astrolabe':
    default:
      content = `<circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-25 12 12)" fill="none" stroke="currentColor" stroke-width="1.8"/>`;
      break;
  }
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="w-svg-ic" style="color:${color}" aria-hidden="true">${content}</svg>`;
}

/* ============================================================
   1. 高精视觉化本命星盘圆盘 (500x500 高清矢量绘制 · 纯 SVG)
   ============================================================ */
function renderAstroWheelSvg(chart) {
  const size = 500, cx = 250, cy = 250;
  const rOut = 238, rZodiacOut = 232, rZodiacIn = 188, rHousesIn = 120, rCenter = 48;
  const signs = SIGNS;
  const planets = chart.planets;

  // 1. 最外层 360 度精细刻度线
  const tickMarks = [];
  for (let i = 0; i < 360; i++) {
    const a = (i - 90) * Math.PI / 180;
    const is30 = i % 30 === 0;
    const is10 = i % 10 === 0;
    const is5 = i % 5 === 0;
    const tickLen = is30 ? 10 : is10 ? 7 : is5 ? 4.5 : 2.5;
    const x1 = cx + (rOut - tickLen) * Math.cos(a), y1 = cy + (rOut - tickLen) * Math.sin(a);
    const x2 = cx + rOut * Math.cos(a), y2 = cy + rOut * Math.sin(a);
    const stroke = is30 ? 'var(--ac)' : is10 ? 'var(--ac4)' : is5 ? 'var(--c-border-2)' : 'var(--c-border)';
    const width = is30 ? 1.5 : is10 ? 1 : 0.6;
    tickMarks.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${stroke}" stroke-width="${width}"/>`);
  }

  // 2. 黄道十二宫 12 扇区背景与纯 SVG 矢量星座符号
  const signArcs = signs.map((s, i) => {
    const startAngle = (i * 30 - 90) * Math.PI / 180;
    const endAngle = ((i + 1) * 30 - 90) * Math.PI / 180;
    const midAngle = ((i + 0.5) * 30 - 90) * Math.PI / 180;

    const x1 = cx + rZodiacOut * Math.cos(startAngle), y1 = cy + rZodiacOut * Math.sin(startAngle);
    const x2 = cx + rZodiacOut * Math.cos(endAngle), y2 = cy + rZodiacOut * Math.sin(endAngle);
    const x3 = cx + rZodiacIn * Math.cos(endAngle), y3 = cy + rZodiacIn * Math.sin(endAngle);
    const x4 = cx + rZodiacIn * Math.cos(startAngle), y4 = cy + rZodiacIn * Math.sin(startAngle);

    const tx = cx + (rZodiacIn + 23) * Math.cos(midAngle);
    const ty = cy + (rZodiacIn + 23) * Math.sin(midAngle);
    const lx = cx + (rZodiacIn + 8) * Math.cos(midAngle);
    const ly = cy + (rZodiacIn + 8) * Math.sin(midAngle);

    const isSun = s.id === chart.sun.id;
    const isMoon = s.id === chart.moon.id;
    const isAsc = s.id === chart.asc.id;

    const elemColor = s.elemKey === 'fire' ? '#e05a47' : s.elemKey === 'earth' ? '#5c8d62' : s.elemKey === 'air' ? '#d4a34b' : '#5e7fa2';
    const bgFill = isSun ? 'rgba(217, 119, 87, 0.28)' : isAsc ? 'rgba(181, 131, 141, 0.22)' : isMoon ? 'rgba(107, 139, 164, 0.22)' : (i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)');

    return `
      <path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${rZodiacOut} ${rZodiacOut} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${rZodiacIn} ${rZodiacIn} 0 0 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z" fill="${bgFill}" stroke="var(--c-border)" stroke-width="0.8"/>
      ${getZodiacSvgNode(s.id, tx, ty, 0.78, elemColor)}
      <text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="600" fill="var(--c-text-3)">${s.name.slice(0, 2)}</text>
    `;
  }).join('');

  // 3. 12 宫位划分线与罗马数字 (I ~ XII)
  const romanHouses = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const houseLines = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 - 90) * Math.PI / 180;
    const x1 = cx + rZodiacIn * Math.cos(a), y1 = cy + rZodiacIn * Math.sin(a);
    const x2 = cx + rHousesIn * Math.cos(a), y2 = cy + rHousesIn * Math.sin(a);
    const isAxis = i === 0 || i === 6 || i === 3 || i === 9;

    const midA = ((i + 0.5) * 30 - 90) * Math.PI / 180;
    const htx = cx + (rHousesIn + 16) * Math.cos(midA), hty = cy + (rHousesIn + 16) * Math.sin(midA);

    return `
      <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${isAxis ? 'var(--ac)' : 'var(--c-border)'}" stroke-width="${isAxis ? '1.8' : '0.6'}" ${isAxis ? '' : 'stroke-dasharray="2 3"'}/>
      <text x="${htx.toFixed(1)}" y="${(hty + 3.5).toFixed(1)}" text-anchor="middle" font-size="8.5" font-family="var(--serif)" font-weight="700" fill="var(--c-text-4)">${romanHouses[i]}</text>
    `;
  }).join('');

  // 4. 四大核心天顶地轴 (ASC / DSC / MC / IC)
  const axisMarks = `
    <!-- ASC (东方上升点) -->
    <line x1="${cx - rOut - 6}" y1="${cy}" x2="${cx - rHousesIn + 10}" y2="${cy}" stroke="var(--ac)" stroke-width="2.2"/>
    <polygon points="${cx - rOut - 12},${cy} ${cx - rOut - 4},${cy - 4} ${cx - rOut - 4},${cy + 4}" fill="var(--ac)"/>
    <text x="${cx - rOut - 16}" y="${cy + 4}" text-anchor="end" font-size="10" font-weight="800" fill="var(--ac-text)">ASC 上升</text>

    <!-- DSC (西方下降点) -->
    <line x1="${cx + rHousesIn - 10}" y1="${cy}" x2="${cx + rOut + 6}" y2="${cy}" stroke="var(--ac)" stroke-width="1.8" stroke-dasharray="4 2"/>
    <text x="${cx + rOut + 12}" y="${cy + 4}" text-anchor="start" font-size="9" font-weight="700" fill="var(--c-text-3)">DSC 下降</text>

    <!-- MC (天顶中天) -->
    <line x1="${cx}" y1="${cy - rOut - 6}" x2="${cx}" y2="${cy - rHousesIn + 10}" y2="${cy}" stroke="var(--ac)" stroke-width="2.2"/>
    <polygon points="${cx},${cy - rOut - 12} ${cx - 4},${cy - rOut - 4} ${cx + 4},${cy - rOut - 4}" fill="var(--ac)"/>
    <text x="${cx}" y="${cy - rOut - 16}" text-anchor="middle" font-size="10" font-weight="800" fill="var(--ac-text)">MC 天顶</text>

    <!-- IC (天底) -->
    <line x1="${cx}" y1="${cy + rHousesIn - 10}" x2="${cx}" y2="${cy + rOut + 6}" stroke="var(--ac)" stroke-width="1.8" stroke-dasharray="4 2"/>
    <text x="${cx}" y="${cy + rOut + 16}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--c-text-3)">IC 天底</text>
  `;

  // 5. 真实几何相位连线 (Aspect Lines)
  const planetCoords = {};
  planets.forEach((p, idx) => {
    const totalDeg = p.absDegree || 0;
    const a = (totalDeg - 90) * Math.PI / 180;
    const rDist = rHousesIn - 12 - (idx % 2) * 14;
    planetCoords[p.key] = {
      x: cx + rDist * Math.cos(a),
      y: cy + rDist * Math.sin(a),
      edgeX: cx + rZodiacIn * Math.cos(a),
      edgeY: cy + rZodiacIn * Math.sin(a),
      a,
      totalDeg,
      p
    };
  });

  const aspectLinesSvg = (chart.aspects || []).slice(0, 14).map(asp => {
    const c1 = planetCoords[asp.p1.key];
    const c2 = planetCoords[asp.p2.key];
    if (!c1 || !c2) return '';
    return `<line x1="${c1.x.toFixed(1)}" y1="${c1.y.toFixed(1)}" x2="${c2.x.toFixed(1)}" y2="${c2.y.toFixed(1)}" stroke="${asp.color}" stroke-width="${asp.type === 'trine' || asp.type === 'conjunction' ? '1.4' : '0.9'}" opacity="0.68" ${asp.strokeStyle === 'dashed' ? 'stroke-dasharray="3 3"' : ''}/>`;
  }).join('');

  // 6. 行星精准落座勋章与引线 (纯 SVG 矢量微标)
  const planetMedallions = planets.map((p) => {
    const item = planetCoords[p.key];
    if (!item) return '';
    const isCore = p.key === 'Sun' || p.key === 'Moon' || p.key === 'Asc';
    const rad = isCore ? 13.5 : 10.5;

    // 连接星体勋章到黄道内圈的细引线
    const leadLine = `<line x1="${item.x.toFixed(1)}" y1="${item.y.toFixed(1)}" x2="${item.edgeX.toFixed(1)}" y2="${item.edgeY.toFixed(1)}" stroke="var(--ac4)" stroke-width="0.7" stroke-dasharray="1.5 2"/>`;

    return `
      ${leadLine}
      <g class="planet-glyph-group" data-planet="${p.key}">
        <circle cx="${item.x.toFixed(1)}" cy="${item.y.toFixed(1)}" r="${rad}" fill="var(--c-surface)" stroke="${isCore ? 'var(--ac)' : 'var(--c-border-2)'}" stroke-width="${isCore ? '1.8' : '1'}" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.18))"/>
        ${getPlanetSvgNode(p.key, item.x, item.y, isCore ? 0.68 : 0.54, isCore ? 'var(--ac-text)' : 'var(--c-text-hi)')}
      </g>
    `;
  }).join('');

  return `<div class="w-wheel-container">
    <div class="w-wheel-stage">
      <svg viewBox="0 0 ${size} ${size}" class="w-wheel-svg" aria-label="西方本命星盘圆盘">
        <defs>
          <radialGradient id="spaceGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="var(--c-surface-3)" stop-opacity="0.7"/>
            <stop offset="70%" stop-color="var(--c-surface-2)" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="var(--c-surface)" stop-opacity="1"/>
          </radialGradient>
          <filter id="glowGold" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        <!-- 背景底盘 -->
        <circle cx="${cx}" cy="${cy}" r="${rOut + 4}" fill="url(#spaceGrad)" stroke="var(--c-border)" stroke-width="1.2"/>
        <circle cx="${cx}" cy="${cy}" r="${rOut}" fill="none" stroke="var(--ac4)" stroke-width="1.2"/>
        <circle cx="${cx}" cy="${cy}" r="${rZodiacOut}" fill="none" stroke="var(--c-border)" stroke-width="0.8"/>
        <circle cx="${cx}" cy="${cy}" r="${rZodiacIn}" fill="none" stroke="var(--ac4)" stroke-width="1"/>
        <circle cx="${cx}" cy="${cy}" r="${rHousesIn}" fill="var(--c-surface)" stroke="var(--c-border-2)" stroke-width="1"/>

        <!-- 360 度刻度 -->
        ${tickMarks.join('')}

        <!-- 12 扇区 -->
        ${signArcs}

        <!-- 12 宫位划分 -->
        ${houseLines}

        <!-- 相位织网 -->
        ${aspectLinesSvg}

        <!-- 四大天顶地轴 -->
        ${axisMarks}

        <!-- 十大星曜徽章 -->
        ${planetMedallions}

        <!-- 中央星盘宇宙星核 -->
        <circle cx="${cx}" cy="${cy}" r="${rCenter}" fill="var(--c-surface-2)" stroke="var(--ac)" stroke-width="2" filter="url(#glowGold)"/>
        <circle cx="${cx}" cy="${cy}" r="${rCenter - 5}" fill="none" stroke="var(--c-border)" stroke-width="0.7" stroke-dasharray="2 3"/>
        <g transform="translate(${cx}, ${cy - 16}) scale(0.72)">${getPlanetSvgNode('Sun', 0, 0, 0.9, 'var(--ac-text)')}</g>
        <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="12" font-weight="900" fill="var(--ac-text)">${chart.sun.name}</text>
        <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--c-text-hi)">${chart.asc.name}上升</text>
        <text x="${cx}" y="${cy + 26}" text-anchor="middle" font-size="8" fill="var(--c-text-3)">${chart.moon.name}月亮</text>
      </svg>
    </div>

    <!-- 底部相位与要素图例说明 -->
    <div class="w-wheel-aspect-legend">
      <div class="aspect-pill trine"><i style="background:#7ab648"></i><span>三分相 (120° 顺畅)</span></div>
      <div class="aspect-pill sextile"><i style="background:#3a8696"></i><span>六分相 (60° 契机)</span></div>
      <div class="aspect-pill oppo"><i style="background:#d4654a"></i><span>对分相 (180° 张力)</span></div>
      <div class="aspect-pill square"><i style="background:#d97757"></i><span>四分相 (90° 挑战)</span></div>
    </div>
  </div>`;
}

/* —— SVG 工具函数：绘制六维潜能雷达图 —— */
function renderRadarSvg(radar) {
  const size = 220, cx = 110, cy = 110, rMax = 78;
  const items = [
    { label: '行动力', val: radar.action },
    { label: '同理心', val: radar.empathy },
    { label: '洞察力', val: radar.insight },
    { label: '逻辑力', val: radar.logic },
    { label: '创造力', val: radar.creative },
    { label: '坚韧度', val: radar.grit },
  ];
  const count = items.length;

  // 背景六边形网格
  const gridLevels = [0.25, 0.5, 0.75, 1.0].map(lvl => {
    const pts = Array.from({ length: count }, (_, i) => {
      const a = (i * 60 - 90) * Math.PI / 180;
      return `${(cx + rMax * lvl * Math.cos(a)).toFixed(1)},${(cy + rMax * lvl * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="var(--c-border)" stroke-width="0.8" ${lvl === 1 ? '' : 'stroke-dasharray="2 3"'}/>`;
  }).join('');

  // 轴线
  const axisLines = Array.from({ length: count }, (_, i) => {
    const a = (i * 60 - 90) * Math.PI / 180;
    const x2 = cx + rMax * Math.cos(a), y2 = cy + rMax * Math.sin(a);
    return `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="var(--c-border)" stroke-width="0.8"/>`;
  }).join('');

  // 数据多边形
  const dataPts = items.map((it, i) => {
    const a = (i * 60 - 90) * Math.PI / 180;
    const r = rMax * (it.val / 100);
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

  // 标签
  const labels = items.map((it, i) => {
    const a = (i * 60 - 90) * Math.PI / 180;
    const lx = cx + (rMax + 18) * Math.cos(a);
    const ly = cy + (rMax + 18) * Math.sin(a);
    return `<text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--c-text-2)">${it.label} <tspan font-weight="bold" fill="var(--ac-text)">${it.val}</tspan></text>`;
  }).join('');

  return `<div class="w-radar-box">
    <svg viewBox="0 0 ${size} ${size}" class="w-radar-svg">
      ${gridLevels}
      ${axisLines}
      <polygon points="${dataPts}" fill="rgba(217, 119, 87, 0.28)" stroke="var(--ac)" stroke-width="2"/>
      ${items.map((it, i) => {
        const a = (i * 60 - 90) * Math.PI / 180;
        const r = rMax * (it.val / 100);
        return `<circle cx="${(cx + r * Math.cos(a)).toFixed(1)}" cy="${(cy + r * Math.sin(a)).toFixed(1)}" r="3" fill="var(--ac)"/>`;
      }).join('')}
      ${labels}
    </svg>
  </div>`;
}

/* ============================================================
   1. 占星术渲染 (#s-ming)
   ============================================================ */
export function renderWesternAstrologySection(ctx) {
  const input = (ctx && ctx.input) || (ctx && ctx._input) || {};
  const city = (ctx && ctx.city) || { n: '北京', o: 116.4, a: 39.9 };
  const y = input.by || 1995, m = input.bm || 6, d = input.bd || 15;
  const timeStr = input.timeStr || '12:00';
  const [h, min] = timeStr.split(':').map(Number);

  const chart = calcWesternChart(y, m, d, h || 12, min || 0, city.o || 116.4, city.a || 39.9);
  const sun = chart.sun;
  const moon = chart.moon;
  const asc = chart.asc;

  let H = '';

  // 沉浸式 3D 罗盘:核心信息直接叠在场景上(不再单独设横幅卡)
  ensureW3D(); syncWestern3D();
  window.__w3dData = window.__w3dData || {};
  window.__w3dData.astro = { planets: chart.planets, aspects: chart.aspects || [], sun: chart.sun, moon: chart.moon, asc: chart.asc };
  H += '<div class="w3d-hero w3d-hero-night" id="w3d-astro" data-system="western">' +
    '<button class="w3d-reset" type="button" aria-label="复位视角" title="复位视角" onpointerdown="event.stopPropagation()" onclick="window._w3dReset && window._w3dReset(\'astro\')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v5h5"/></svg></button>' +
    '<div class="w3d-loading"><span class="w3d-load-ring"></span><span>星空正在编译中...</span></div>' +
    '<div class="w3d-ov">' +
      '<div class="w3d-ov-chips">' +
        '<span>☉ 太阳 ' + sun.name + '</span>' +
        '<span>☽ 月亮 ' + moon.name + '</span>' +
        '<span>ASC 上升 ' + asc.name + '</span>' +
      '</div>' +
      '<div class="w3d-ov-take"><b>核心气质</b>' + sun.tag + '。主导能量为' + chart.dominantElem.name + '，在' + sun.career.slice(0, 24) + '等领域展现天赋优势。</div>' +
    '</div>' +
  '</div>';

  // 视觉化本命星盘圆盘大卡 (Visual Natal Wheel)
  H += '<div class="glass card-2 western-card" data-card="astro-core" data-system="western">' +
    '<div class="card-hd">' +
      '' +
      '<div>' +
        '' +
        '<div class="card-st">太阳 / 月亮 / 上升 · 驱动与情感与第一名片</div>' +
      '</div>' +
    '</div>' +
    '<div class="w-trio-grid" style="margin-top:14px">' +
      '<div class="w-trio-card sun">' +
        '<div class="kicker">' + getWesternSvgIcon('sun', 14) + ' 太阳星座 · 本我驱动</div>' +
        '<div class="symbol">' + getZodiacSvg(sun.id, 38, '#d97757') + '</div>' +
        '<div class="name">' + sun.name + '</div>' +
        '<div class="tag">' + sun.elem + '象 · ' + sun.mode + ' ｜ 守护星：' + sun.ruler + '</div>' +
        '<p>' + sun.summary + '</p>' +
      '</div>' +
      '<div class="w-trio-card moon">' +
        '<div class="kicker">' + getWesternSvgIcon('moon', 14) + ' 月亮星座 · 内心情感</div>' +
        '<div class="symbol">' + getZodiacSvg(moon.id, 38, '#6b8ba4') + '</div>' +
        '<div class="name">' + moon.name + '</div>' +
        '<div class="tag">' + moon.elem + '象 · 守护潜意识安全感</div>' +
        '<p>掌管你的真实情绪反应、私密安全感与内在精神寄托。</p>' +
      '</div>' +
      '<div class="w-trio-card asc">' +
        '<div class="kicker">' + getWesternSvgIcon('asc', 14) + ' 上升星座 · 第一名片</div>' +
        '<div class="symbol">' + getZodiacSvg(asc.id, 38, '#b5838d') + '</div>' +
        '<div class="name">' + asc.name + '</div>' +
        '<div class="tag">' + asc.elem + '象 · 外在行事风度</div>' +
        '<p>决定你给外界的第一印象、个人气质与面对挑战时的本能应对。</p>' +
      '</div>' +
    '</div>' +
  '</div>';

  // 四象三态能量流向 + 六维天赋雷达
  H += '<div class="glass card-2 western-card" data-card="astro-elements" data-system="western">' +
    '<div class="card-hd">' +
      '' +
      '<div>' +
        '' +
        '<div class="card-st">元素配比 ｜ 潜能六维雷达评估</div>' +
      '</div>' +
    '</div>' +
    '<div class="w-elem-radar-layout">' +
      '<div class="w-elem-col">' +
        '<div class="w-elem-title">四象元素能量分布</div>' +
        chart.elemBreakdown.map(e =>
          '<div class="w-elem-bar-row">' +
            '<div class="lab"><span>' + getElementSvg(e.key, 15, e.color) + ' ' + e.name + '</span><b>' + e.pct + '%</b></div>' +
            '<div class="track"><div class="fill" style="width:' + e.pct + '%;background:' + e.color + '"></div></div>' +
            '<div class="meta">包含 ' + e.count + ' 颗星体能量</div>' +
          '</div>'
        ).join('') +
        '<div class="w-elem-summary" style="margin-top:10px">' +
          '<b>能量调和：</b>主导为 <span class="tag-g">' + chart.dominantElem.name + ' (' + chart.dominantElem.pct + '%)</span>，' +
          (chart.deficitElem.pct <= 10 ? '短板为 ' + chart.deficitElem.name + ' (' + chart.deficitElem.pct + '%)，日常注意平衡补充。' : '四象能量较为充盈均衡。') +
        '</div>' +
      '</div>' +
      '<div class="w-radar-col">' +
        '<div class="w-elem-title" style="text-align:center">六维人格天赋雷达</div>' +
        renderRadarSvg(sun.radar) +
      '</div>' +
    '</div>' +
  '</div>';

  // 十大行星落座与宫位详解卡
  H += '<div class="glass card-2 western-card" data-card="astro-planets" data-system="western">' +
    '<div class="card-hd">' +
      '' +
      '<div>' +
        '' +
        '<div class="card-st">星体落入星座 · 宫位与生活领域投射</div>' +
      '</div>' +
    '</div>' +
    '<div class="w-planet-cards-grid">' +
      chart.planets.map(p =>
        '<div class="w-planet-tile">' +
          '<div class="top"><span class="sym">' + getPlanetSvg(p.key, 18) + '</span><span class="pname">' + p.zh + '</span><span class="pdeg">' + p.degree + '</span></div>' +
          '<div class="mid" style="color:' + p.sign.color + '">' + getZodiacSvg(p.sign.id, 16, p.sign.color) + ' ' + p.sign.name + '</div>' +
          '<div class="house">第 ' + p.houseNum + ' 宫</div>' +
          '<div class="desc">' + p.mean + '</div>' +
        '</div>'
      ).join('') +
    '</div>' +
  '</div>';

  // 深度心理画像与 AI 挂载
  H += '<div class="glass card-2 western-card" data-card="astro-portrait" data-system="western">' +
    '<div class="card-hd">' +
      '' +
      '<div>' +
        '<div class="card-tt">深度性格与生活指南</div>' +
        '<div class="card-st">' + sun.name + ' · ' + sun.tag + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="w-portrait-prose">' +
      '<p><b>' + getWesternSvgIcon('star', 15) + ' 核心本我特质：</b>' + sun.summary + '</p>' +
      '<p><b>' + getWesternSvgIcon('strength', 15) + ' 个人闪光优势：</b>' + sun.strength + '</p>' +
      '<p><b>' + getWesternSvgIcon('warning', 15) + ' 潜在成长盲区：</b>' + sun.blindSpot + '</p>' +
      '<p><b>' + getWesternSvgIcon('career', 15) + ' 职场最强姿态：</b>' + sun.career + '</p>' +
      '<p><b>' + getWesternSvgIcon('love', 15) + ' 亲密关系密码：</b>' + sun.love + '</p>' +
    '</div>' +
    '<div class="w-ai-mount-point" id="wAstroAIMount"></div>' +
  '</div>';

  return H;
}

/* ============================================================
   2. 星座全览渲染 (#s-yun)
   ============================================================ */
export function renderWesternHoroscopeSection(ctx) {
  const input = (ctx && ctx.input) || (ctx && ctx._input) || {};
  const m = input.bm || 6, d = input.bd || 15;
  const sun = getSunSignByDate(m, d);

  const fToday = getHoroscopeForecast(sun, 'today');
  const fWeek = getHoroscopeForecast(sun, 'week');
  const fMonth = getHoroscopeForecast(sun, 'month');
  const fYear = getHoroscopeForecast(sun, 'year');

  let H = '';

  // Three.js 黄道天球场景
  ensureW3D(); syncWestern3D();
  window.__w3dData = window.__w3dData || {};
  window.__w3dData.horo = { sunName: sun.name };
  H += '<div class="w3d-hero w3d-hero-night" id="w3d-horo" data-system="western">' +
    '<button class="w3d-reset" type="button" aria-label="复位视角" title="复位视角" onpointerdown="event.stopPropagation()" onclick="window._w3dReset && window._w3dReset(\'horo\')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v5h5"/></svg></button>' +
    '<div class="w3d-loading"><span class="w3d-load-ring"></span><span>星空正在编译中...</span></div>' +
    '<div class="w3d-ov"><div class="w3d-ov-kicker">黄道天球 · 实时星象</div><div class="w3d-ov-chips"><span>☉ ' + sun.name + '</span><span>' + fToday.sub + '</span></div></div>' +
  '</div>';

  // 今日运势总览大卡
  H += '<div class="glass card-1 western-card" data-card="horoscope-today" data-system="western">' +
    '<div class="card-hd">' +
      '' +
      '<div>' +
        '' +
        '<div class="card-st">' + fToday.sub + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="w-horo-hero">' +
      '<div class="score-ring-box">' +
        '<svg viewBox="0 0 100 100" class="ring-svg">' +
          '<circle cx="50" cy="50" r="42" fill="none" stroke="var(--c-surface-3)" stroke-width="8"/>' +
          '<circle cx="50" cy="50" r="42" fill="none" stroke="var(--ac)" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + (2 * Math.PI * 42 * fToday.baseScore / 100) + ' 300" style="transform:rotate(-90deg);transform-origin:center"/>' +
        '</svg>' +
        '<div class="score-txt">' + fToday.baseScore + '<small>今日综合分</small></div>' +
      '</div>' +
      '<div class="hero-details">' +
        '<div class="mood-tag">' + fToday.mood + '</div>' +
        '<div class="guide-chips">' +
          '<span class="chip">' + getWesternSvgIcon('color', 14) + ' 幸运色：' + fToday.luckyColor + '</span>' +
          '<span class="chip">' + getWesternSvgIcon('number', 14) + ' 幸运数：' + fToday.luckyNum + '</span>' +
          '<span class="chip">' + getWesternSvgIcon('noble', 14) + ' 贵人星座：' + fToday.noble + '</span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="w-aspect-grid" style="margin-top:14px">' +
      '<div class="w-aspect-card">' +
        '<div class="hd"><span>' + getWesternSvgIcon('career', 15) + ' 事业学业</span><b>' + fToday.careerScore + '分</b></div>' +
        '<p>' + fToday.career + '</p>' +
      '</div>' +
      '<div class="w-aspect-card">' +
        '<div class="hd"><span>' + getWesternSvgIcon('love', 15) + ' 感情桃花</span><b>' + fToday.loveScore + '分</b></div>' +
        '<p>' + fToday.love + '</p>' +
      '</div>' +
      '<div class="w-aspect-card">' +
        '<div class="hd"><span>' + getWesternSvgIcon('wealth', 15) + ' 财富投资</span><b>' + fToday.wealthScore + '分</b></div>' +
        '<p>' + fToday.wealth + '</p>' +
      '</div>' +
      '<div class="w-aspect-card">' +
        '<div class="hd"><span>' + getWesternSvgIcon('health', 15) + ' 健康元气</span><b>' + fToday.healthScore + '分</b></div>' +
        '<p>' + fToday.health + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="w-yiji-banner">' +
      '<div class="col yi"><b>✦ 今日宜：</b>' + fToday.yi.map(x => '<span>' + x + '</span>').join(' ') + '</div>' +
      '<div class="col ji"><b>✕ 今日忌：</b>' + fToday.ji.map(x => '<span>' + x + '</span>').join(' ') + '</div>' +
    '</div>' +
  '</div>';

  // 12 星座黄道能量全览网格
  H += '<div class="glass card-2 western-card" data-card="horoscope-all" data-system="western">' +
    '<div class="card-hd">' +
      '' +
      '<div>' +
        '' +
        '<div class="card-st">各星座今日综合分 ｜ 实时能量气场</div>' +
      '</div>' +
    '</div>' +
    '<div class="w-all-signs-grid">' +
      SIGNS.map(s => {
        const fc = getHoroscopeForecast(s, 'today');
        const isMe = s.id === sun.id;
        return '<div class="w-sign-tile' + (isMe ? ' is-me' : '') + '">' +
          '<div class="sym sym-art">' + zodiacArtSVG(s.id, { size: 120, star: '#ffffff', line: 'rgba(230,195,126,0.85)', bg: 'radial-gradient(circle at 50% 38%, #1c2745 0%, #0d1428 75%)' }) + '</div>' +
          '<div class="name">' + s.name + (isMe ? '<span class="me-tag">本命</span>' : '') + '</div>' +
          '<div class="score">' + fc.baseScore + '分</div>' +
          '<div class="mood">' + fc.mood.split(' · ')[0] + '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
  '</div>';

  // 中长期星象展望
  H += '<div class="glass card-2 western-card" data-card="horoscope-macro" data-system="western">' +
    '<div class="card-hd">' +
      '' +
      '<div>' +
        '<div class="card-tt">中长期星象展望 · ' + sun.name + '</div>' +
        '<div class="card-st">周报 ｜ 月度 ｜ 年度跃迁</div>' +
      '</div>' +
    '</div>' +
    '<div class="w-macro-list">' +
      '<div class="m-item"><b>' + getWesternSvgIcon('calendar', 14) + ' 本周星象：</b><span>' + fWeek.career + ' ' + fWeek.love + '</span></div>' +
      '<div class="m-item"><b>' + getWesternSvgIcon('moon', 14) + ' 本月罗盘：</b><span>' + fMonth.career + ' ' + fMonth.wealth + '</span></div>' +
      '<div class="m-item"><b>' + getWesternSvgIcon('sun', 14) + ' 年度跃迁：</b><span>' + fYear.career + ' ' + fYear.love + '</span></div>' +
    '</div>' +
    '<div class="w-ai-mount-point" id="wHoroAIMount"></div>' +
  '</div>';

  return H;
}

/* ============================================================
   3. 生命灵术渲染 (#s-rel)
   ============================================================ */
export function renderWesternNumerologySection(ctx) {
  const input = (ctx && ctx.input) || (ctx && ctx._input) || {};
  const y = input.by || 1995, m = input.bm || 6, d = input.bd || 15;

  const num = calcNumerology(y, m, d);
  const arch = num.archetype;

  // Three.js 生命矩阵场景
  ensureW3D(); syncWestern3D();
  window.__w3dData = window.__w3dData || {};
  window.__w3dData.num = { lifePath: num.lifePath };

  let H = '';

  // 顶部生命密码大卡
  H += '<div class="w3d-hero w3d-hero-night" id="w3d-num" data-system="western">' +
    '<button class="w3d-reset" type="button" aria-label="复位视角" title="复位视角" onpointerdown="event.stopPropagation()" onclick="window._w3dReset && window._w3dReset(\'num\')"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v5h5"/></svg></button>' +
    '<div class="w3d-loading"><span class="w3d-load-ring"></span><span>星空正在编译中...</span></div>' +
    '<div class="w3d-ov"><div class="w3d-ov-kicker">生命灵数矩阵</div><div class="w3d-ov-chips"><span>灵数 ' + num.lifePath + '</span><span>' + arch.name + '</span></div></div>' +
  '</div>' +
  '<div class="glass card-1 western-card" data-card="num-core" data-system="western">' +
    '<div class="card-hd">' +
      '' +
      '<div>' +
        '' +
        '<div class="card-st">毕达哥拉斯生命密码 ｜ ' + y + '.' + m + '.' + d + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="w-num-trio-box">' +
      '<div class="main-archetype-card">' +
        '<div class="kicker">核心主命数 · LIFE PATH</div>' +
        '<div class="big-num">' + num.lifePath + '</div>' +
        '<div class="arch-name">' + arch.name + '</div>' +
        '<div class="arch-tag">' + arch.tag + '</div>' +
        '<p class="arch-desc">' + arch.strength + '</p>' +
      '</div>' +
      '<div class="sub-numbers-col">' +
        '<div class="sub-num-card">' +
          '<div class="kicker">天赋数 (Talents)</div>' +
          '<div class="mid-num">' + num.talentNums.join(' · ') + '</div>' +
          '<p>代表你与生俱来的潜在潜能工具箱与天赋武器。</p>' +
        '</div>' +
        '<div class="sub-num-card">' +
          '<div class="kicker">生日数 (Birthday)</div>' +
          '<div class="mid-num">' + num.birthdayNum + '</div>' +
          '<p>展现你在日常处事中的第一直觉反应与外部风格。</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  // 3x3 九宫生命灵数图阵与激活连线
  H += '<div class="glass card-2 western-card" data-card="num-grid" data-system="western">' +
    '<div class="card-hd">' +
      '' +
      '<div>' +
        '' +
        '<div class="card-st">1~9 数字频次分布 ｜ 优势连线诊断</div>' +
      '</div>' +
    '</div>' +
    '<div class="w-num-grid-layout">' +
      '<div class="num-3x3-matrix">' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
          const cnt = num.gridCounts[n];
          return '<div class="matrix-cell' + (cnt > 0 ? ' is-active' : ' is-empty') + '">' +
            '<div class="num-val">' + n + '</div>' +
            '<div class="num-cnt">' + (cnt > 0 ? cnt + '个' : '缺') + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="lines-analysis-box">' +
        '<div class="lines-title">✦ 已激活优势能量连线 (' + num.activeLines.length + ' 条)</div>' +
        (num.activeLines.length > 0 ?
          num.activeLines.map(l =>
            '<div class="line-item"><b>' + l.key + ' ' + l.name + '：</b><span>' + l.desc + '</span></div>'
          ).join('') :
          '<div class="line-item" style="color:var(--c-text-3)">数字分布较分散，适合聚焦某一核心领域持续深耕突破。</div>'
        ) +
        (num.missingNums.length > 0 ?
          '<div class="missing-box"><b>' + getWesternSvgIcon('idea', 14) + ' 空缺数字补益：</b>缺少数字 ' + num.missingNums.join('、') + '，可通过后天刻意练习与团队互补补齐短板。</div>' : ''
        ) +
      '</div>' +
    '</div>' +
  '</div>';

  // 9 年生命周期流年密码
  H += '<div class="glass card-2 western-card" data-card="num-year" data-system="western">' +
    '<div class="card-hd">' +
      '' +
      '<div>' +
        '' +
        '<div class="card-st">今年处于 9 年周期的第 ' + num.personalYear + ' 年 ｜ ' + num.personalYearGuide.theme + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="w-py-box">' +
      '<div class="py-badge">' + getWesternSvgIcon('target', 14) + ' ' + num.personalYear + ' 号流年主题：' + num.personalYearGuide.theme + '</div>' +
      '<p class="py-text">' + num.personalYearGuide.advice + '</p>' +
    '</div>' +
    '<div class="w-ai-mount-point" id="wNumAIMount"></div>' +
  '</div>';

  return H;
}

/* ============================================================
   挂载 AI 解读事件
   ============================================================ */
export function bindWesternAIEvents(root) {
  if (!root) return;

  const astroMount = root.querySelector('#wAstroAIMount');
  if (astroMount) {
    attachToolAI({
      root: root,
      typeLabel: '西方占星术 · 星盘解读',
      getSource: () => (root.querySelector('[data-card="astro-portrait"]')?.innerText || '').slice(0, 1800),
      slot: astroMount
    });
  }

  const horoMount = root.querySelector('#wHoroAIMount');
  if (horoMount) {
    attachToolAI({
      root: root,
      typeLabel: '西方星相 · 星座全览',
      getSource: () => (root.querySelector('[data-card="horoscope-today"]')?.innerText || '').slice(0, 1800),
      slot: horoMount
    });
  }

  const numMount = root.querySelector('#wNumAIMount');
  if (numMount) {
    attachToolAI({
      root: root,
      typeLabel: '西方生命灵术 · 灵数密码',
      getSource: () => (root.querySelector('[data-card="num-core"]')?.innerText || '').slice(0, 1800),
      slot: numMount
    });
  }
}
