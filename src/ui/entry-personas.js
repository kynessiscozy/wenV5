/* 漏斗引路人 → 主应用角色的唯一映射表。
 *
 * funnel.html 是 public/ 下的独立页面（不能用 ES module 导入），所以它保留了
 * 一份很小的视频/立绘路径表；但「名字、语气、对应哪个 HOME_THEMES 角色」这类
 * 跨页语义只在这里定义一次。新增引路人时，改这里 + funnel.html 的素材表即可。
 *
 * 首屏优先显示月白：默认引路人就是 moonfox，未知/缺失一律回退月白，
 * 与 funnel.html 的静态首屏保持一致。
 *
 * 注意 xiyao（夕瑶）在 HOME_THEMES 里没有同名条目：她的紫色星扇立绘就是
 * xingling（魅惑）那一套素材，因此映射到 xingling。
 * 同理 yuebai（月白）是 moonfox 的素材，yuchen / diyan 与主题同名。
 */
export const DEFAULT_PERSONA = 'moonfox';

export const FUNNEL_PERSONAS = Object.freeze({
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
  }),
  diyan: Object.freeze({
    key: 'diyan',
    name: '地炎君',
    theme: 'diyan',
    poster: './art/diyan-lord.webp',
    video: './art/diyan-invite.mp4',
    lead: '先定根基，再看全局。',
    circle: '是君先替你圈出来的',
    hooksTitle: '君 先 说 三 句',
    byline: '地炎君正在为你排盘…',
  }),
  yuchen: Object.freeze({
    key: 'yuchen',
    name: '玉宸神后',
    theme: 'yuchen',
    poster: './art/yuchen-lord.webp',
    video: './art/yuchen-invite.mp4',
    lead: '静下心，先看这一处。',
    circle: '是后先替你圈出来的',
    hooksTitle: '后 先 说 三 句',
    byline: '玉宸正在为你排盘…',
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
  }),
});

export function personaFor(trait) {
  return FUNNEL_PERSONAS[trait] || FUNNEL_PERSONAS[DEFAULT_PERSONA];
}

/** Funnel persona id → HOME_THEMES id. */
export function themeForPersona(trait) {
  return personaFor(trait).theme;
}
