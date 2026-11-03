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
  leizi: Object.freeze({
    key: 'leizi',
    name: '雷兹',
    theme: 'leizi',
    poster: './art/leizi-lord.webp',
    video: './art/leizi-invite.mp4?v=63',
    lead: '先看天势，再定落子。',
    circle: '是雷兹先替你圈出来的',
    hooksTitle: '雷 兹 先 说 三 句',
    byline: '雷兹正在为你排盘…',
  }),
});

export function personaFor(trait) {
  return FUNNEL_PERSONAS[trait] || FUNNEL_PERSONAS[DEFAULT_PERSONA];
}

/** Funnel persona id → HOME_THEMES id. */
export function themeForPersona(trait) {
  return personaFor(trait).theme;
}
