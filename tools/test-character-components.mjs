import assert from 'node:assert/strict';
import { WENWEN, characterAvatarMarkup, applyCharacterAssets } from '../src/character/wenwen.js';
import { mountCharacterCompanion, mountCharacterPrompt } from '../src/character/companion.js';
import { initCharacterCompanion } from '../src/ui/character-companion.js';
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
nodes.get('characterPortraitButton').click();
nodes.get('homeCtaMain').click();
assert.equal(chatOpened, 0, '首页人物不能打开聊天');
assert.equal(formOpened, 2, '人物与开启探索都应打开真实表单');
windowEvents.get('tj:ai-stream')({ detail: { active: true } });
assert.equal(nodes.get('characterScene').dataset.speaking, 'true');
windowEvents.get('tj:ai-stream')({ detail: { active: false } });
assert.equal(nodes.get('characterScene').dataset.speaking, 'false');
adapter.onReportReady({ isDemo: true });
assert.equal(nodes.get('s-ming').children.length, 0, '示例报告不能假称个人命盘');
adapter.onReportReady();
const reportPrompt = nodes.get('s-ming').children[0].children[0];
assert.equal(reportPrompt.children[2].textContent, '和小星聊聊');
assert.equal(reportPrompt.children[3].getAttribute('aria-label'), '收起小星的提示');
reportPrompt.children[2].click();
assert.equal(chatOpened, 1, '报告提示仍应连接真实对话入口');
console.log('✓ 角色素材、场景道具、可选表情与可复用组件');
