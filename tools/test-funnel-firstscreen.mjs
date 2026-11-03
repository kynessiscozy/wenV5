/* 首屏（funnel.html）与旧入口移除的静态回归：纯 Node，无需浏览器。
   覆盖：月白优先、四位引路人各有主题色、人物选择可折叠、
   填表互动有关闭按钮可随时回首屏、老虎机与旧表单不得回流。 */
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { DEFAULT_PERSONA, FUNNEL_PERSONAS } from '../src/ui/entry-personas.js';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
let pass = 0;
const ok = (condition, message) => { assert.ok(condition, message); pass++; console.log('  ✓ ' + message); };

console.log('═══════════════════════════════════════════════');
console.log('  首屏人物/主题色 与 旧入口移除回归');
console.log('═══════════════════════════════════════════════\n');

const funnel = await read('public/funnel.html');
const html = await read('index.html');
const mainJs = await read('src/main.js');

/* ---- 1. 首屏优先显示月白 ---- */
ok(funnel.includes('<html lang="zh-CN" data-persona="moonfox">'), '首屏静态默认人物是 moonfox');
ok(funnel.includes('src="./art/yuebai-entry.mp4"') && funnel.includes('poster="./art/yuebai-lord.webp"'),
  '首屏第一帧就是月白视频/海报，无需等待 JS');
ok(funnel.includes('<title>问问大师 · 月白命盘厅</title>'), '首屏标题默认月白');
ok(funnel.includes("fmApplyPersona('moonfox')"), '每次进漏斗都以月白初始化');
ok(DEFAULT_PERSONA === 'moonfox', '主应用默认引路人同步为月白');
ok(html.includes('./art/yuebai-lord.webp'), '交接遮罩静态默认立绘为月白');
const switchOrder = [...funnel.matchAll(/data-persona="(\w+)"/g)].map(m => m[1]);
ok(switchOrder[0] === 'moonfox', '人物选择里月白排第一位');

/* ---- 2. 主题色按人物配置，首屏按键同主题色 ---- */
for (const key of Object.keys(FUNNEL_PERSONAS)) {
  ok(funnel.includes(`html[data-persona="${key}"]`) || (key === 'moonfox' && funnel.includes(':root, html[data-persona="moonfox"]')),
    `${key} 有独立主题色变量块`);
}
ok(funnel.includes("setAttribute('data-persona',key)"), '切换人物时同步切换主题属性');
ok(funnel.includes('background:linear-gradient(180deg,var(--cta-1),var(--cta-2))'), '首屏 CTA 使用人物主题渐变');
ok(funnel.includes('.btn.primary{background:linear-gradient(180deg,var(--cta-1),var(--cta-2))'), '问卷主按钮与首屏同主题色');
ok(funnel.includes('.persona-list button.on{background:linear-gradient(180deg,var(--cta-1),var(--cta-2))'), '人物选中态使用主题色');
ok(!funnel.includes('#8a2015,#5f130d') && !funnel.includes('border:1px solid #c89b5a'), '地炎君硬编码配色不再写死在按钮上');

/* ---- 3. 人物选择可折叠 ---- */
ok(funnel.includes('id="personaToggle"') && funnel.includes('aria-expanded="false"'), '人物选择默认折叠，只显示当前人物');
ok(funnel.includes('id="personaCurrentName">月白<'), '折叠态显示当前人物名');
ok(funnel.includes('fmPersonaCollapse') && funnel.includes("classList.toggle('open')"), '可展开/收起，选中后自动收起');
ok(funnel.includes('.persona-list[hidden]{display:none}'), '折叠时选项列表不占位');

/* ---- 4. 填表互动关闭按钮随时回首屏 ---- */
ok(funnel.includes('id="btnCloseFlow"') && funnel.includes('aria-label="关闭并返回首屏"'), '填表互动有关闭按钮');
ok(funnel.includes("name==='immersion'||name==='quiz'||name==='inter'"), '关闭按钮在沉浸/问卷/过场全程可见，首屏与已提交加载时隐藏');
ok(funnel.includes('function closeFlow()') && funnel.includes("show('entry')"), '关闭直接回首屏');
ok(funnel.includes('flowGen++') && funnel.includes('if(gen!==flowGen)return'), '回首屏后挂起的过场/滑题定时器全部失效，不会被拽回问卷');
ok(funnel.includes("e.key==='Escape'&&closeBtn&&!closeBtn.hidden"), 'Esc 也可回首屏');

/* ---- 5. 老虎机与旧表单彻底移除 ---- */
ok(!html.includes('traitSelection') && !html.includes('traitMachine') && !html.includes('trait-selection.css'),
  'index.html 无老虎机 DOM 与样式引用');
await assert.rejects(access(new URL('src/trait-selection.css', root)), '老虎机样式文件已删除');
pass++; console.log('  ✓ 老虎机样式文件已删除');
ok(!html.includes('formModal') && !html.includes('id="bDate"') && !html.includes('result-style-option'),
  'index.html 无旧表单 DOM');
ok(!mainJs.includes('TJOpenForm') && !mainJs.includes('resolveBirthCity') && !mainJs.includes('_formDirty'),
  'main.js 无表单开关/城市下拉/未推演保护残余');
ok(mainJs.includes('DEFAULT_BIRTH_INPUT') && mainJs.includes('setBirthInput'),
  '出生信息改为单一状态对象，由交接与档案写入');

console.log(`\n验证结果: ${pass} 通过 / 0 失败`);
console.log('✓ 首屏人物/主题色与旧入口移除全部一致');
