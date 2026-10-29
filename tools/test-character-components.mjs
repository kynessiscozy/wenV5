import assert from 'node:assert/strict';
import { WENWEN, characterAvatarMarkup, applyCharacterAssets } from '../src/character/wenwen.js';
import { MOON_FOX } from '../src/character/moon-fox.js';
import { EARTHFIRE_SOVEREIGN } from '../src/character/earthfire-sovereign.js';
import { JADE_EMPRESS } from '../src/character/jade-empress.js';
import { QINGLAN } from '../src/character/qinglan.js';
import { XINGLING } from '../src/character/xingling.js';
import { LUYE } from '../src/character/luye.js';
import { SUYAN } from '../src/character/suyan.js';
import { mountCharacterCompanion, mountCharacterPrompt } from '../src/character/companion.js';
import { initCharacterCompanion } from '../src/ui/character-companion.js';
import { HOME_THEMES } from '../src/ui/home-theme.js';
import { formatStandardAnswer } from '../src/render/ai.js';

// Exercise the reusable UI contract without a browser or the application's global functions.
class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.listeners = new Map();
    const properties = new Map();
    this.style = {
      setProperty: (name, value) => properties.set(name, String(value)),
      getPropertyValue: name => properties.get(name) || '',
      removeProperty: name => properties.delete(name),
    };
    const classes = new Set();
    this.classList = {
      toggle: (name, force) => force ? classes.add(name) : classes.delete(name),
      contains: name => classes.has(name),
    };
    this.textContent = '';
    this.hidden = false;
  }
  get firstChild() { return this.children[0] || null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  removeAttribute(name) { delete this.attributes[name]; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { this.children.push(...children); }
  prepend(child) { this.children.unshift(child); }
  replaceChildren(...children) { this.children = children; }
  querySelector(tag) { return this.children.find(child => child.tagName === tag.toUpperCase()) || null; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  click() { this.listeners.get('click')?.(); }
  focus() {}
  scrollIntoView(options) { this.scrollOptions = options; }
}
globalThis.document = { createElement: tag => new Element(tag) };
const windowEvents = new Map();
globalThis.window = {
  matchMedia: () => ({ matches: true }),
  addEventListener: (type, listener) => windowEvents.set(type, listener),
};

const unsafeReply = formatStandardAnswer('【结论】：<img src=x onerror=alert(1)> & 测试');
assert.doesNotMatch(unsafeReply, /<img/);
assert.match(unsafeReply, /&lt;img/);
assert.match(unsafeReply, /&amp;/, '结构化 AI 回复也必须转义 HTML');

assert.deepEqual(Object.values(HOME_THEMES).map(theme => theme.trait.label), ['温柔', '神秘', '威严', '从容', '洒脱', '魅惑', '好奇', '自信']);
assert.equal(new Set(Object.values(HOME_THEMES).map(theme => theme.trait.label)).size, Object.keys(HOME_THEMES).length, '每个角色应有可扩展的代表特质');
for (const theme of Object.values(HOME_THEMES)) {
  assert.ok(theme.trait.mark && theme.trait.color && theme.character.assets.portrait && theme.backdrop.mobile && theme.backdrop.wide);
  for (const expression of ['blink', 'speaking']) {
    assert.equal(theme.character.assets[expression].forPortrait, theme.character.assets.portrait.src, '表情必须来自对应重绘人物');
    assert.equal(theme.character.assets[expression].width, theme.character.assets.portrait.width);
    assert.equal(theme.character.assets[expression].height, theme.character.assets.portrait.height);
  }
}

assert.equal(new Set(WENWEN.topics.map(topic => topic.id)).size, WENWEN.topics.length, '话题 ID 必须唯一');
assert.ok(WENWEN.topics.every(topic => topic.response && topic.prompt), '每个话题都应有回应与可编辑问题');
const custom = {
  ...WENWEN,
  name: '小星',
  greeting: '从哪里开始？',
  topics: [{ id: 'test', label: '兴趣', response: '一起聊聊兴趣。', prompt: '我的兴趣是什么？' }],
  assets: {
    ...WENWEN.assets,
    portrait: { ...WENWEN.assets.portrait, width: 400, height: 800, spotlight: { x: 20, y: 30, size: 40 } },
    avatar: { ...WENWEN.assets.avatar, src: './avatar" onerror="bad.webp', width: '192" onload="bad' },
  },
};
assert.match(characterAvatarMarkup(custom), /avatar&quot; onerror=&quot;bad\.webp/, '图片地址应安全转义');
assert.match(characterAvatarMarkup(custom), /width="192&quot; onload=&quot;bad"/, '图片尺寸属性应安全转义');
const asset = new Element('img');
asset.dataset.characterAsset = 'avatar';
applyCharacterAssets({ querySelectorAll: () => [asset] }, custom);
assert.equal(asset.src, custom.assets.avatar.src, '静态图片应从角色定义取得素材');

const host = new Element('section');
const action = new Element('button');
let reportReady = false;
const events = [];
const conversation = mountCharacterCompanion(host, {
  character: custom,
  actionButton: action,
  hasReport: () => reportReady,
  onDefault: () => events.push('default'),
  onStart: topic => events.push(`start:${topic.id}`),
  onResume: topic => events.push(`resume:${topic.id}`),
});
assert.equal(host.children[0].textContent, '从哪里开始？');
assert.equal(action.textContent, '开启探索');
conversation.showHint('先选一个话题。');
conversation.refresh();
assert.equal(host.children[0].textContent, '先选一个话题。', '主动提示应在刷新时保留');
action.click();
host.children[1].children[0].click();
conversation.showHint('不应覆盖已选择的话题');
assert.equal(host.children[0].textContent, '一起聊聊兴趣。');
assert.equal(host.children[1].children[0].getAttribute('aria-pressed'), 'true');
assert.equal(action.textContent, '填写信息');
action.click();
reportReady = true;
conversation.refresh();
assert.equal(action.textContent, '继续聊聊');
action.click();
assert.deepEqual(events, ['default', 'start:test', 'resume:test']);
conversation.clearSelection();
assert.equal(conversation.getTopic(), null);
assert.equal(host.children[0].textContent, '从哪里开始？', '清除选择后不应保留旧提示');
assert.equal(action.textContent, '开启探索');
assert.equal(host.children[1].children[0].getAttribute('aria-pressed'), 'false');
conversation.destroy();
action.click();
assert.deepEqual(events, ['default', 'start:test', 'resume:test'], '销毁后应解绑外部按钮');

const promptHost = new Element('div');
let clicked = false;
const prompt = mountCharacterPrompt(promptHost, {
  character: custom,
  message: '继续聊兴趣？',
  actionLabel: '继续',
  onAction: () => { clicked = true; },
});
assert.equal(prompt.children[0].children[0].src, custom.assets.avatar.src, '提示组件应复用角色头像');
assert.equal(prompt.children[1].textContent, '继续聊兴趣？');
prompt.children[2].click();
assert.equal(clicked, true);

// Optional expressions are portrait-aligned; another character must not inherit them accidentally.
const blink = new Element('img');
blink.dataset.characterAsset = 'blink';
blink.dataset.characterOptional = '';
applyCharacterAssets({ querySelectorAll: () => [blink] }, custom);
assert.equal(blink.hidden, true, '替换人物后不应叠加问问的眨眼素材');
const sameSizeDifferentPortrait = { ...WENWEN, assets: { ...WENWEN.assets, portrait: { ...WENWEN.assets.portrait, src: './other.webp' } } };
applyCharacterAssets({ querySelectorAll: () => [blink] }, sameSizeDifferentPortrait);
assert.equal(blink.hidden, true, '尺寸相同但不是同一画面时也不能叠加表情');
applyCharacterAssets({ querySelectorAll: () => [blink] }, WENWEN);
assert.equal(blink.hidden, false, '匹配人物时应恢复可选表情');
assert.equal(blink.src, WENWEN.assets.blink.src);
applyCharacterAssets({ querySelectorAll: () => [blink] }, JADE_EMPRESS);
assert.equal(blink.hidden, false);
assert.equal(blink.src, JADE_EMPRESS.assets.blink.src, '神后使用自己的同源眨眼素材');
assert.equal(JADE_EMPRESS.assets.blink.forPortrait, JADE_EMPRESS.assets.portrait.src);
assert.equal(JADE_EMPRESS.assets.speaking.forPortrait, JADE_EMPRESS.assets.portrait.src);
applyCharacterAssets({ querySelectorAll: () => [blink] }, { ...custom, assets: { portrait: custom.assets.portrait } });
assert.equal(blink.hidden, true, '没有表情素材的角色应保持静止');

// Scene props can be swapped independently and disappear when a character lacks them.
const lantern = new Element('img');
const lanternHolder = new Element('div');
lantern.dataset.characterAsset = 'lantern';
lantern.dataset.characterSceneOptional = '';
lantern.closest = () => lanternHolder;
applyCharacterAssets({ querySelectorAll: () => [lantern] }, { ...custom, assets: { portrait: custom.assets.portrait } });
assert.equal(lantern.hidden, true);
assert.equal(lanternHolder.hidden, true, '缺少道具时连同灯绳一起隐藏');
applyCharacterAssets({ querySelectorAll: () => [lantern] }, WENWEN);
assert.equal(lantern.hidden, false);
assert.equal(lanternHolder.hidden, false);
assert.equal(lantern.src, WENWEN.assets.lantern.src);
assert.equal(lanternHolder.style.getPropertyValue('--prop-cord-x'), '49.67%', '灯绳应绑定到素材本身的锚点');
const alternateLantern = { ...WENWEN, assets: { ...WENWEN.assets, lantern: { src: './new-lantern.webp', alt: '', width: 100, height: 200 } } };
applyCharacterAssets({ querySelectorAll: () => [lantern] }, alternateLantern);
assert.equal(lanternHolder.style.getPropertyValue('--prop-cord-x'), '', '替换素材后不应沿用旧灯绳锚点');
const fire = new Element('img');
const fireHolder = new Element('div');
fire.dataset.characterAsset = 'fireThrone';
fire.dataset.characterSceneOptional = '';
fire.closest = () => fireHolder;
applyCharacterAssets({ querySelectorAll: () => [fire] }, EARTHFIRE_SOVEREIGN);
assert.equal(fire.hidden, false);
assert.equal(fireHolder.hidden, false);
assert.equal(fire.src, EARTHFIRE_SOVEREIGN.assets.fireThrone.src, '火焰王座应作为独立的可替换配景');
applyCharacterAssets({ querySelectorAll: () => [fire] }, MOON_FOX);
assert.equal(fire.hidden, true);
assert.equal(fireHolder.hidden, true, '其他角色不能继承火焰王座');
const rune = new Element('img');
const runeHolder = new Element('div');
rune.dataset.characterAsset = 'runes';
rune.dataset.characterSceneOptional = '';
rune.closest = () => runeHolder;
applyCharacterAssets({ querySelectorAll: () => [rune] }, EARTHFIRE_SOVEREIGN);
assert.equal(rune.hidden, false);
assert.equal(runeHolder.hidden, false);
assert.equal(rune.src, EARTHFIRE_SOVEREIGN.assets.runes.src, '地炎符文应是角色独立的可选配景');
applyCharacterAssets({ querySelectorAll: () => [rune] }, WENWEN);
assert.equal(rune.hidden, true);
assert.equal(runeHolder.hidden, true, '切回问问时不得继承地炎符文');

// The cloud buttons reuse the character's optional scenery without leaking the old asset.
const buttonTexture = new Element('image');
buttonTexture.dataset.characterAsset = 'cloudTrail';
buttonTexture.dataset.characterTexture = '';
const textureRoot = { querySelectorAll: () => [buttonTexture] };
const alternateCloud = { ...WENWEN, assets: { ...WENWEN.assets, cloudTrail: { src: './other-cloud.webp' } } };
applyCharacterAssets(textureRoot, alternateCloud);
assert.equal(buttonTexture.getAttribute('href'), './other-cloud.webp', '按钮云纹应随角色素材替换');
applyCharacterAssets(textureRoot, { ...custom, assets: { portrait: custom.assets.portrait } });
assert.equal(buttonTexture.getAttribute('visibility'), 'hidden', '没有流云素材时应隐藏云纹而保留按钮轮廓');
applyCharacterAssets(textureRoot, WENWEN);
assert.equal(buttonTexture.getAttribute('visibility'), undefined);
assert.equal(buttonTexture.getAttribute('href'), WENWEN.assets.cloudTrail.src);

// The adapter connects the supplied identity directly to the real host actions.
const nodes = new Map([
  ['characterScene', new Element('figure')],
  ['characterPortraitButton', new Element('button')],
  ['homeCtaMain', new Element('button')],
  ['s-ming', new Element('section')],
]);
const names = [new Element('span'), new Element('strong')];
document.getElementById = id => nodes.get(id) || null;
document.querySelectorAll = selector => selector === '[data-character-name]' ? names : [];
let formOpened = 0, chatOpened = 0;
const adapter = initCharacterCompanion({
  character: custom,
  openForm: () => { formOpened++; },
  openAsk: () => { chatOpened++; },
});
assert.ok(names.every(el => el.textContent === '小星'));
assert.equal(nodes.get('characterPortraitButton').getAttribute('aria-label'), '点击小星，开启探索');
assert.equal(nodes.get('characterPortraitButton').style.getPropertyValue('--character-ratio'), '400 / 800');
assert.equal(nodes.get('characterScene').style.getPropertyValue('--character-ratio'), '400 / 800', '天灯位置应跟随替换后的角色比例');
assert.equal(nodes.get('characterScene').style.getPropertyValue('--character-mobile-vw'), '200.0000vw');
assert.equal(nodes.get('characterScene').style.getPropertyValue('--character-mobile-inset'), '80.0000px');
assert.equal(nodes.get('characterScene').style.getPropertyValue('--character-mobile-inset-compact'), '32.0000px');
nodes.get('characterPortraitButton').click();
nodes.get('homeCtaMain').click();
assert.equal(chatOpened, 0, '首页人物不能打开聊天');
assert.equal(formOpened, 2, '人物与开启探索都应打开真实表单');
windowEvents.get('tj:ai-stream')({ detail: { active: true } });
assert.equal(nodes.get('characterScene').dataset.speaking, 'true');
windowEvents.get('tj:ai-stream')({ detail: { active: false } });
assert.equal(nodes.get('characterScene').dataset.speaking, 'false');

const homePortrait = new Element('img');
homePortrait.dataset.characterAsset = 'portrait';
const homeBlink = new Element('img');
homeBlink.dataset.characterAsset = 'blink';
homeBlink.dataset.characterOptional = '';
const homeName = new Element('span');
const homeRoot = {
  querySelectorAll(selector) {
    if (selector === '[data-character-asset]') return [homePortrait, homeBlink];
    if (selector === '[data-character-name]') return [homeName];
    return [];
  },
};
nodes.set('page1', homeRoot);
adapter.setHomeCharacter(MOON_FOX);
assert.equal(homePortrait.src, MOON_FOX.assets.portrait.src);
assert.equal(homeBlink.src, MOON_FOX.assets.blink.src);
assert.equal(homeBlink.hidden, false, '新角色只能使用自己对齐的表情');
assert.equal(MOON_FOX.assets.blink.forPortrait, MOON_FOX.assets.portrait.src);
assert.equal(MOON_FOX.assets.speaking.forPortrait, MOON_FOX.assets.portrait.src);
assert.equal(homeName.textContent, '月白');
assert.equal(nodes.get('characterPortraitButton').getAttribute('aria-label'), '点击月白，开启探索');
assert.equal(nodes.get('characterPortraitButton').style.getPropertyValue('--character-ratio'), '848 / 1264');
assert.equal(nodes.get('characterScene').dataset.cameraSafeX, '0.23');
assert.equal(nodes.get('characterScene').dataset.cameraSafeInset, '0.05');
adapter.setHomeCharacter(EARTHFIRE_SOVEREIGN);
assert.equal(homePortrait.src, EARTHFIRE_SOVEREIGN.assets.portrait.src);
assert.equal(homeBlink.src, EARTHFIRE_SOVEREIGN.assets.blink.src);
assert.equal(EARTHFIRE_SOVEREIGN.assets.blink.forPortrait, EARTHFIRE_SOVEREIGN.assets.portrait.src);
assert.equal(EARTHFIRE_SOVEREIGN.assets.speaking.forPortrait, EARTHFIRE_SOVEREIGN.assets.portrait.src);
assert.equal(homeName.textContent, '地炎君');
assert.equal(nodes.get('characterPortraitButton').getAttribute('aria-label'), '点击地炎君，开启探索');
assert.equal(nodes.get('characterPortraitButton').style.getPropertyValue('--character-ratio'), '625 / 1180');
assert.equal(nodes.get('characterScene').dataset.cameraCloseScale, '1.7');
assert.equal(nodes.get('characterScene').dataset.cameraSafeX, '0.885');
for (const character of [QINGLAN, XINGLING, LUYE, SUYAN]) {
  adapter.setHomeCharacter(character);
  assert.equal(homePortrait.src, character.assets.portrait.src);
  assert.equal(homeBlink.src, character.assets.blink.src);
  assert.equal(homeBlink.hidden, false, '新角色应使用自己的同源表情');
  assert.equal(character.assets.blink.forPortrait, character.assets.portrait.src);
  assert.equal(character.assets.speaking.forPortrait, character.assets.portrait.src);
  assert.equal(nodes.get('characterPortraitButton').getAttribute('aria-label'), `点击${character.name}，开启探索`);
}
adapter.setHomeCharacter(WENWEN);
assert.equal(nodes.get('characterScene').dataset.cameraCloseScale, '1.45', '新角色应采用自己的近景比例');
assert.equal(nodes.get('characterScene').dataset.cameraSafeX, undefined);
assert.ok(names.every(el => el.textContent === '小星'), '切换首页角色不应更改报告角色');
nodes.get('characterPortraitButton').click();
assert.equal(formOpened, 3, '切换角色后人物仍只绑定一次真实表单');

const easternReport = new Element('div');
const westernReport = new Element('div');
nodes.get('s-ming').querySelector = selector => ({
  ':scope > .sys-eastern': easternReport,
  ':scope > .sys-western': westernReport,
}[selector] || null);
adapter.onReportReady({ isDemo: true });
assert.equal(easternReport.children.length + westernReport.children.length, 0, '示例报告不能假称个人命盘');
adapter.onReportReady();
const reportPrompt = easternReport.children[0].children[0];
const westernPrompt = westernReport.children[0].children[0];
for (const prompt of [reportPrompt, westernPrompt]) {
  assert.equal(prompt.children[2].textContent, '和小星聊聊');
  assert.equal(prompt.children[3].getAttribute('aria-label'), '收起小星的提示');
}
assert.equal(westernPrompt.children[1].textContent, '星盘好了，想一起聊聊吗？');
reportPrompt.children[2].click();
westernPrompt.children[2].click();
assert.equal(chatOpened, 2, '两个体系的报告提示都应连接真实对话入口');
console.log('✓ 角色素材、场景道具、可选表情与可复用组件');
