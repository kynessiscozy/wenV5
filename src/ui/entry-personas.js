/* 漏斗引路人 → 主应用角色的唯一映射表。
 *
 * funnel.html 是 public/ 下的独立页面（不能用 ES module 导入），所以它保留了
 * 一份很小的视频/立绘路径表；但「名字、语气、对应哪个 HOME_THEMES 角色」这类
 * 跨页语义只在这里定义一次。新增引路人时，改这里 + funnel.html 的素材表即可。
 *
 * 注意 xiyao（夕瑶）在 HOME_THEMES 里没有同名条目：她的紫色星扇立绘就是
 * xingling（魅惑）那一套素材，因此映射到 xingling，而不是静默回退成焱绒。
 * 同理 yuebai（月白）是 moonfox 的素材，yuchen / diyan 与主题同名。
 */
export const DEFAULT_PERSONA = 'moonfox';

export const FUNNEL_PERSONAS = Object.freeze({
  diyan: Object.freeze({
    key: 'diyan',
    name: '焱绒',
    theme: 'diyan',
    poster: './art/diyan-lord.webp',
    video: './art/diyan-invite.mp4',
    lead: '先定根基，再看全局。',
    circle: '是焱绒先替你圈出来的',
    hooksTitle: '焱 绒 先 说 三 句',
    byline: '焱绒正在为你排盘…',
    // 预告页皮肤：颜色只在这里定义，funnel-teaser 按人设取用，不再写死任何角色的配色。
    palette: Object.freeze({
      bg: '#0c0908', bgRgb: '12,9,8', ink: '#f3e9dc', inkRgb: '243,233,220',
      soft: '#e6dac6', dim: '#c9bba6', gold: '#d8a24a', goldRgb: '216,162,74', goldSoft: '#e8c595',
      cardBg: 'rgba(26,18,16,.88)', ctaTop: '#8a2015', ctaBottom: '#5f130d',
      ctaShade: 'rgba(20,8,5,.55)', note: 'rgba(201,187,166,.8)', ctaSpacing: '.3em',
    }),
  }),
  yuchen: Object.freeze({
    key: 'yuchen',
    name: '玉宸',
    theme: 'yuchen',
    poster: './art/yuchen-lord.webp',
    video: './art/yuchen-invite.mp4',
    lead: '静下心，先看这一处。',
    circle: '是玉宸先替你圈出来的',
    hooksTitle: '玉 宸 先 说 三 句',
    byline: '玉宸正在为你排盘…',
    // 预告页皮肤：颜色只在这里定义，funnel-teaser 按人设取用，不再写死任何角色的配色。
    palette: Object.freeze({
      bg: '#10140e', bgRgb: '16,20,14', ink: '#f5f5e9', inkRgb: '245,245,233',
      soft: '#e8e4cd', dim: '#d2d5bf', gold: '#d9d3a9', goldRgb: '217,211,169', goldSoft: '#eee9cc',
      cardBg: 'rgba(24,30,21,.88)', ctaTop: '#566440', ctaBottom: '#313e26',
      ctaShade: 'rgba(10,14,6,.55)', note: 'rgba(210,213,191,.8)', ctaSpacing: '.3em',
    }),
  }),
  moonfox: Object.freeze({
    key: 'moonfox',
    name: '月白',
    theme: 'moonfox',
    poster: './art/yuebai-lord.webp',
    video: './art/yuebai-invite.mp4',
    lead: '别急，先看清这一处。',
    circle: '是月白先替你圈出来的',
    hooksTitle: '月 白 先 说 三 句',
    byline: '月白正在为你翻册…',
    // 预告页皮肤：颜色只在这里定义，funnel-teaser 按人设取用，不再写死任何角色的配色。
    palette: Object.freeze({
      bg: '#090f17', bgRgb: '9,15,23', ink: '#edf6fa', inkRgb: '237,246,250',
      soft: '#d9e6ee', dim: '#c2d4df', gold: '#b9dbef', goldRgb: '185,219,239', goldSoft: '#d4e8f5',
      cardBg: 'rgba(13,25,39,.88)', ctaTop: '#315d7a', ctaBottom: '#18374e',
      ctaShade: 'rgba(4,10,16,.55)', note: 'rgba(194,212,223,.8)', ctaSpacing: '.3em',
    }),
  }),
  xiyao: Object.freeze({
    key: 'xiyao',
    name: '夕瑶',
    theme: 'xingling',
    poster: './art/xiyao-lord.webp',
    video: './art/xiyao-invite.mp4',
    lead: '别急，先看你这一局。',
    circle: '是夕瑶先替你圈出来的',
    hooksTitle: '夕 瑶 先 说 三 句',
    byline: '夕瑶正在为你看盘…',
    // 预告页皮肤：颜色只在这里定义，funnel-teaser 按人设取用，不再写死任何角色的配色。
    palette: Object.freeze({
      bg: '#100c18', bgRgb: '16,12,24', ink: '#f8f1ff', inkRgb: '248,241,255',
      soft: '#e6d9f2', dim: '#d8c8e4', gold: '#d4b7f2', goldRgb: '212,183,242', goldSoft: '#e8d8f7',
      cardBg: 'rgba(27,19,38,.88)', ctaTop: '#63477a', ctaBottom: '#3e2a53',
      ctaShade: 'rgba(10,6,18,.55)', note: 'rgba(216,200,228,.8)', ctaSpacing: '.3em',
    }),
  }),
  leizi: Object.freeze({
    key: 'leizi',
    name: '雷兹',
    theme: 'leizi',
    poster: './art/leizi-lord.webp',
    video: './art/leizi-invite.mp4?v=64',
    lead: '先看天势，再定落子。',
    circle: '是雷兹先替你圈出来的',
    hooksTitle: '雷 兹 先 说 三 句',
    byline: '雷兹正在为你排盘…',
    // 预告页皮肤：颜色只在这里定义，funnel-teaser 按人设取用，不再写死任何角色的配色。
    palette: Object.freeze({
      bg: '#0a0e1a', bgRgb: '10,14,26', ink: '#fdf6e0', inkRgb: '253,246,224',
      soft: '#eae0c2', dim: '#ddd0ac', gold: '#f2c14e', goldRgb: '242,193,78', goldSoft: '#fbe3a1',
      cardBg: 'rgba(16,20,34,.88)', ctaTop: '#a07d24', ctaBottom: '#6b5316',
      ctaShade: 'rgba(16,12,2,.55)', note: 'rgba(221,208,172,.8)', ctaSpacing: '.3em',
    }),
  }),
  muse: Object.freeze({
    key: 'muse',
    name: '絮羽',
    theme: 'muse',
    poster: './art/muse-lord.webp',
    video: './art/muse-invite.mp4?v=69',
    lead: '让灵感先落在你身上。',
    circle: '是絮羽先替你圈出来的',
    hooksTitle: '絮 羽 先 说 三 句',
    byline: '絮羽正在为你展翼…',
    // 预告页皮肤：颜色只在这里定义，funnel-teaser 按人设取用，不再写死任何角色的配色。
    palette: Object.freeze({
      bg: '#10182b', bgRgb: '16,24,43', ink: '#faf3e0', inkRgb: '250,243,224',
      soft: '#e9dfc6', dim: '#d8d0b8', gold: '#e6cf9a', goldRgb: '230,207,154', goldSoft: '#f4e7c3',
      cardBg: 'rgba(20,28,48,.88)', ctaTop: '#a68d4e', ctaBottom: '#77622f',
      ctaShade: 'rgba(14,12,4,.55)', note: 'rgba(216,208,184,.8)', ctaSpacing: '.3em',
    }),
  }),
});

export function personaFor(trait) {
  return FUNNEL_PERSONAS[trait] || FUNNEL_PERSONAS[DEFAULT_PERSONA];
}

/** Funnel persona id → HOME_THEMES id. */
export function themeForPersona(trait) {
  return personaFor(trait).theme;
}
