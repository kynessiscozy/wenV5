import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { HOME_THEMES } from '../src/ui/home-theme.js';
import { CHAT_MASTER } from '../src/character/chat-master.js';
import * as threeRuntime from '../src/fx/three-runtime.js';
import * as three from 'three';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const worker = await read('public/sw.js');
const html = await read('index.html');
const scene = await read('src/fx/western3d.js');

// Every member used by the lazy scenes must be explicitly re-exported. If a
// scene is extended, this fails immediately rather than only in that scene.
const sceneMembers = new Set([...scene.matchAll(/\bTHREE\.([A-Za-z_$][\w$]*)/g)].map(match => match[1]));
assert.ok(scene.includes("import('./three-runtime.js')"), '西方剧场应继续按需加载 Three.js 门面');
assert.doesNotMatch(scene, /\bTHREE\s*\[/, '动态 Three.js 成员无法在构建时检查');
assert.deepEqual(Object.keys(threeRuntime).sort(), [...sceneMembers].sort(), 'Three.js 门面与场景使用的成员必须一致');
for (const name of sceneMembers) assert.equal(threeRuntime[name], three[name], `Three.js ${name} 导出不一致`);
console.log(`✓ 按需 Three.js 门面覆盖全部 ${sceneMembers.size} 个场景成员`);

// Registry-driven paths are not always visible as literal HTML references.
// Check every character and twin asset exists and is available to the worker.
const characterAssets = new Set();
for (const theme of Object.values(HOME_THEMES)) {
  Object.values(theme.character.assets).forEach(asset => { if (asset?.src) characterAssets.add(asset.src); });
  Object.values(theme.backdrop).forEach(path => characterAssets.add(path));
}
for (const twin of CHAT_MASTER.twins) {
  characterAssets.add(twin.portrait);
  characterAssets.add(twin.avatar);
}
for (const path of characterAssets) {
  assert.match(path, /^\.\/art\/[A-Za-z0-9_-]+\.(?:webp|svg|png)$/);
  assert.ok((await stat(new URL(`public/${path.slice(2)}`, root))).isFile(), `${path} 必须存在`);
  assert.ok(worker.includes(`'${path.slice(2)}'`), `${path} 必须保留离线缓存`);
}

// Calculation overlays and static fallback art are declared directly in HTML.
for (const [, path] of html.matchAll(/(?:\.\/|\/)\b(art\/[A-Za-z0-9_-]+\.(?:webp|svg|png))/g)) {
  assert.ok((await stat(new URL(`public/${path}`, root))).isFile(), `${path} 必须存在`);
}
// Old bookmarks/pages still use these icon URLs after the twin icon update.
for (const path of ['icon.svg', 'icon-192.png', 'icon-512.png']) {
  assert.ok((await stat(new URL(`public/${path}`, root))).isFile(), `${path} 必须保留`);
  assert.ok(worker.includes(`'${path}'`), `${path} 必须保留离线缓存`);
}
console.log(`✓ ${characterAssets.size} 项角色及双子资源、推演素材和旧版图标路径完整`);
