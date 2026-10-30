import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('public/manifest.webmanifest', root), 'utf8'));
const html = await readFile(new URL('index.html', root), 'utf8');
const worker = await readFile(new URL('public/sw.js', root), 'utf8');
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

async function checkOpaquePng(src, size) {
  assert.match(src, /^\.\/[^/?#]+\.png$/, `图标应使用可在子路径下部署的相对地址: ${src}`);
  const bytes = await readFile(new URL(`public/${src.slice(2)}`, root));
  assert.ok(bytes.subarray(0, 8).equals(signature), `${src} 不是 PNG`);
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR', `${src} 缺少 PNG 头`);
  assert.equal(bytes.readUInt32BE(16), size, `${src} 宽度不符`);
  assert.equal(bytes.readUInt32BE(20), size, `${src} 高度不符`);
  // Home-screen and maskable backgrounds must be opaque on every platform.
  assert.ok([0, 2, 3].includes(bytes[25]), `${src} 不应带透明通道`);
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    assert.notEqual(type, 'tRNS', `${src} 不应包含透明像素`);
    offset += length + 12;
    if (type === 'IEND') break;
  }
  assert.ok(worker.includes(`'${src.slice(2)}'`), `${src} 未加入离线资源`);
}

assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.equal(manifest.display, 'standalone');
for (const purpose of ['any', 'maskable']) {
  for (const size of [192, 512]) {
    const icons = manifest.icons.filter(icon =>
      icon.sizes === `${size}x${size}` && (icon.purpose || 'any').split(/\s+/).includes(purpose));
    assert.equal(icons.length, 1, `${purpose} ${size} 图标应唯一`);
    assert.equal(icons[0].type, 'image/png');
    await checkOpaquePng(icons[0].src, size);
  }
}
for (const size of [192, 512]) {
  const normal = manifest.icons.find(icon => icon.sizes === `${size}x${size}` && icon.purpose === 'any');
  const maskable = manifest.icons.find(icon => icon.sizes === `${size}x${size}` && icon.purpose === 'maskable');
  assert.notEqual(normal.src, maskable.src, '自适应图标需要独立的安全边距');
}

const favicon = html.match(/<link\s+rel="icon"[^>]*>/)?.[0];
const apple = html.match(/<link\s+rel="apple-touch-icon"[^>]*>/)?.[0];
assert.ok(favicon && /type="image\/png"/.test(favicon) && /sizes="128x128"/.test(favicon));
assert.ok(apple && /sizes="180x180"/.test(apple));
const faviconSrc = favicon.match(/href="([^"]+)"/)?.[1];
const appleSrc = apple.match(/href="([^"]+)"/)?.[1];
assert.ok(faviconSrc && appleSrc);
await checkOpaquePng(faviconSrc, 128);
await checkOpaquePng(appleSrc, 180);
console.log('✓ 双子图标：清单尺寸、透明度、独立安全区、iOS、浏览器及离线路径');
