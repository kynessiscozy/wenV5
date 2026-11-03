/* 入口交互状态机回归：纯 Node，无需浏览器。
   覆盖 planEntry 的意图优先级、引路人→角色映射，以及「旧轮询/强制跳转」
   不再回到代码里的静态不变量。 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  PANEL_ACTIONS, PAYLOAD_KEY, PROFILE_KEY,
  isPendingPayload, markApplied, planEntry,
} from '../src/ui/entry-plan.js';
import {
  FUNNEL_PERSONAS, DEFAULT_PERSONA, personaFor, themeForPersona,
} from '../src/ui/entry-personas.js';
import { HOME_THEMES } from '../src/ui/home-theme.js';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
let pass = 0;
const ok = (condition, message) => { assert.ok(condition, message); pass++; console.log('  ✓ ' + message); };

const pending = { v: 1, trait: 'diyan', bd: '1990-06-15', cityName: '', ts: 1 };
const applied = { ...pending, applied: 1 };

console.log('═══════════════════════════════════════════════');
console.log('  入口交互状态机 / 漏斗交接回归');
console.log('═══════════════════════════════════════════════\n');

/* ---- 1. 意图优先级 ---- */
ok(planEntry({}).type === 'wait', '主模块未就绪时不抢屏');
ok(planEntry({ appReady: true }).type === 'idle', '普通访客停在可操作的待机入口卡');
ok(planEntry({ appReady: true, payload: pending }).type === 'handoff', '未消费的问卷答案走一次性交接');
ok(planEntry({ appReady: true, payload: applied }).type === 'idle', 'applied 的问卷不会重复自动推演');
ok(planEntry({ appReady: true, payload: { v: 1, applied: 0 } }).type === 'idle', '缺少出生日期的残损数据被忽略');

const menuPlan = planEntry({ appReady: true, intent: { menu: true }, payload: pending, profileId: '7' });
ok(menuPlan.type === 'intent' && menuPlan.menu === true && menuPlan.consumePayload === true,
  '菜单深链优先于档案与交接，并消费残留交接');
const panelPlan = planEntry({ appReady: true, intent: { panel: 'guide' }, payload: pending });
ok(panelPlan.type === 'intent' && panelPlan.panel === 'guide' && panelPlan.consumePayload,
  '面板深链优先于交接');
const badPanel = planEntry({ appReady: true, intent: { panel: 'evil' }, payload: pending });
ok(badPanel.type === 'handoff' && PANEL_ACTIONS.evil === undefined,
  '未登记的 panel 不会打开任意全局函数');
const profilePlan = planEntry({ appReady: true, profileId: '12', payload: pending });
ok(profilePlan.type === 'profile' && profilePlan.id === 12 && profilePlan.consumePayload,
  '档案载入优先于交接，且交接被消费');
ok(planEntry({ appReady: true, profileId: '0' }).type === 'idle', '非法档案 id 回退待机入口卡');
ok(PAYLOAD_KEY === 'wen_funnel_v1' && PROFILE_KEY === 'wen_load_profile_v1', '存储键保持不变');
ok(isPendingPayload(pending) && !isPendingPayload(applied) && !isPendingPayload(null), 'pending 判定严格');
ok(markApplied(pending).applied === 1 && !pending.applied, '消费只改副本，不污染入参');

/* ---- 2. 引路人 → 角色映射 ---- */
for (const [key, persona] of Object.entries(FUNNEL_PERSONAS)) {
  ok(Object.prototype.hasOwnProperty.call(HOME_THEMES, persona.theme), `${key}（${persona.name}）映射到真实角色 ${persona.theme}`);
  ok(persona.poster.startsWith('./art/') && persona.video.startsWith('./art/'), `${key} 素材路径为相对地址`);
  ok(themeForPersona(key) === persona.theme, `${key} 主题解析一致`);
}
ok(DEFAULT_PERSONA === 'moonfox' && personaFor('unknown').key === DEFAULT_PERSONA, '未知引路人回退月白');
ok(themeForPersona('xiyao') === 'xingling', '夕瑶不再静默变成焱绒');
ok(themeForPersona('moonfox') === 'moonfox', '月白对应狐系主题');
ok(personaFor('diyan').name === '焱绒' && personaFor('diyan').byline.includes('焱绒'), '原 diyan 标识展示焱绒');
ok(personaFor('yuchen').name === '祢玉' && personaFor('yuchen').byline.includes('祢玉'), '原 yuchen 标识展示祢玉');

/* ---- 3. 静态不变量：旧的抢屏/强制跳转逻辑不得回流 ---- */
const html = await read('index.html');
const homeJs = await read('src/home.js');
const mainJs = await read('src/main.js');
const navJs = await read('src/ui/navigation.js');
const flowJs = await read('src/ui/entry-flow.js');
const planJs = await read('src/ui/entry-plan.js');
const teaserJs = await read('src/ui/funnel-teaser.js');
const calcJs = await read('src/ui/character-calculation.js');
const themeJs = await read('src/ui/home-theme.js');
const funnelHtml = await read('public/funnel.html');
const worker = await read('public/sw.js');
const manifest = JSON.parse(await read('public/manifest.webmanifest'));
const flowCss = await read('src/entry-flow.css');

ok(html.includes('data-entry="funnel"') && flowCss.includes('html[data-entry="funnel"] #page1'),
  '首页隐藏由唯一的入口开关控制');
ok(!html.includes('#page1{display:none!important}'), '不再有 !important 内联覆盖');
ok(!html.includes('setInterval'), '入口页不再用轮询抢屏');
ok(html.includes('window.__wenEntryIntent') && html.includes('id="funnelVeil"'), '只采集一次意图 + 静态遮罩骨架');
ok(html.includes('/src/entry-flow.css') && homeJs.includes('initEntryFlow()'), '状态机在入口模块之前挂载');
ok(planJs.includes('planEntry') && flowJs.includes('planEntry('), '界面效果与纯决策函数分离');

ok(!mainJs.includes('location.href') && mainJs.includes('window.__wenFlow?.onFormClosed?.()'),
  '关闭表单不再静默重定向，而是交给状态机');
ok(navJs.includes('onReportBack') && !navJs.includes('location.href'), '报告返回不再强制跳页');
ok(mainJs.includes('window.__wenProfilesReady'), '档案载入等待 IndexedDB 就绪而非固定延时');
ok(mainJs.includes('applyEntryPayload') && mainJs.includes('resolveBirthCity()'),
  '自由填写的城市在表单层解析，避免遮罩后被校验错误困住');
ok(mainJs.includes("document.getElementById('funnelTeaser'))return"), '预告页显示时后台快捷键被隔离');

ok(calcJs.includes('autoAdvance') && calcJs.includes("'tj:calculation-ready'"),
  '自动推进只发生在漏斗交接，且结果先展示');
ok(!calcJs.includes('setInterval'), '演算场景不靠定时器反复点击');
ok(themeJs.includes('themeForPersona'), '角色主题使用共享映射表');

ok(teaserJs.includes('p.applied && !p.teasered'), '预告页触发条件保持不变');
ok(teaserJs.includes("event.key === 'Escape'") && teaserJs.includes("class=\"ft-close\""),
  '预告页可用 Esc / 关闭按钮退出');
ok(teaserJs.includes('onTeaserOpen') && teaserJs.includes('onTeaserClosed'), '预告页向状态机报告开合');
ok(teaserJs.includes('personaFor(payload.trait)'), '预告页使用共享人物表');

ok(funnelHtml.includes('window.__wenStatsMode') && funnelHtml.includes('if(window.__wenStatsMode)return;'),
  '?stats 统计页不再因空 DOM 抛错');
ok(funnelHtml.includes('finished=true') && funnelHtml.includes('applied:0'), '问卷只提交一次且交接标记显式');
ok(funnelHtml.includes('flowLocked') && funnelHtml.includes('personaKey()'), '中段过场锁定导航、加载文案随人物切换');
ok(worker.includes("BASE + 'funnel.html'"), '漏斗页纳入离线缓存');
ok(manifest.start_url === './funnel.html' && manifest.scope === './', 'PWA 安装后也从唯一入口启动');

console.log(`\n验证结果: ${pass} 通过 / 0 失败`);
console.log('✓ 入口交互状态机与漏斗交接全部一致');
