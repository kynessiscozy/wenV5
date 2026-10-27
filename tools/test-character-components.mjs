import assert from 'node:assert/strict';
import { WENWEN, characterAvatarMarkup, applyCharacterAssets } from '../src/character/wenwen.js';
import { mountCharacterCompanion, mountCharacterPrompt } from '../src/character/companion.js';
import { initCharacterCompanion } from '../src/ui/character-companion.js';

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
    };
    const classes = new Set();
    this.classList = {
      toggle: (name, force) => force ? classes.add(name) : classes.delete(name),
      contains: name => classes.has(name),
    };
    this.textContent = '';
    this.hidden = false;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { this.children.push(...children); }
  prepend(child) { this.children.unshift(child); }
  replaceChildren(...children) { this.children = children; }
  querySelector(tag) { return this.children.find(child => child.tagName === tag.toUpperCase()) || null; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); }
  click() { this.listeners.get('click')?.(); }
  focus() {}
  scrollIntoView() {}
}
globalThis.document = { createElement: tag => new Element(tag) };
globalThis.window = { matchMedia: () => ({ matches: true }) };

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
action.click();
host.children[1].children[0].click();
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

// The application adapter also uses the supplied identity in labels and report prompts.
const nodes = new Map([
  ['characterCompanion', new Element('section')],
  ['characterScene', new Element('figure')],
  ['characterPortraitButton', new Element('button')],
  ['characterInvitation', new Element('button')],
  ['characterFormContext', new Element('div')],
  ['homeCtaMain', new Element('button')],
  ['s-ming', new Element('section')],
]);
const names = [new Element('span'), new Element('strong')];
document.getElementById = id => nodes.get(id) || null;
document.querySelectorAll = selector => selector === '[data-character-name]' ? names : [];
let formOpened = false;
const adapter = initCharacterCompanion({ character: custom, openForm: () => { formOpened = true; } });
assert.equal(nodes.get('characterCompanion').children[0].textContent, '', '首页不显示初始问候，但可复用组件仍支持自定义问候');
assert.ok(names.every(el => el.textContent === '小星'));
assert.equal(nodes.get('characterPortraitButton').getAttribute('aria-label'), '和小星聊聊');
assert.equal(nodes.get('characterPortraitButton').style.getPropertyValue('--character-ratio'), '400 / 800', '人物比例应随注入角色变化');
assert.equal(nodes.get('characterPortraitButton').style.getPropertyValue('--character-light-x'), '20%', '角色光点位置应可替换');
assert.equal(nodes.get('characterPortraitButton').style.getPropertyValue('--character-light-y'), '30%');
assert.equal(nodes.get('characterPortraitButton').style.getPropertyValue('--character-light-size'), '40%');
assert.equal(nodes.get('characterPortraitButton').classList.contains('has-character-light'), true);
nodes.get('characterPortraitButton').animate = () => { throw new Error('减少动态效果时不应播放人物动作'); };
nodes.get('characterCompanion').children[1].children[0].click();
nodes.get('homeCtaMain').click();
assert.equal(formOpened, true);
adapter.onReportReady();
const reportPrompt = nodes.get('s-ming').children[0].children[0];
assert.equal(reportPrompt.children[2].textContent, '和小星聊聊');
assert.equal(reportPrompt.children[3].getAttribute('aria-label'), '收起小星的提示');
console.log('✓ 角色素材、可替换话题与可复用组件');
