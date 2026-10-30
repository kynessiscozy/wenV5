import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

// Measures files, not HTTP traffic. Gzip totals assume each file is compressed
// separately and downloaded once; lazy chunks/images may not be requested.
const root = resolve(process.argv[2] || 'dist');
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...await walk(file));
    else if (entry.isFile()) results.push(file);
  }
  return results;
}

const files = await walk(root);
const rows = await Promise.all(files.map(async file => {
  const bytes = await readFile(file);
  const path = relative(root, file).replaceAll('\\', '/');
  const ext = extname(file).toLowerCase();
  const gzip = ['.js', '.css', '.html'].includes(ext) ? gzipSync(bytes).byteLength : null;
  return { path, ext, size: bytes.byteLength, gzip };
}));
const sum = (items, key) => items.reduce((total, item) => total + (item[key] ?? 0), 0);
const fmt = n => n.toLocaleString('en-US') + ' B';
const report = (name, items, compressed = false) => {
  console.log(`${name}: ${items.length} 文件 · 原始 ${fmt(sum(items, 'size'))}` +
    (compressed ? ` · gzip ${fmt(sum(items, 'gzip'))}` : ''));
};

console.log(`生产构建：${root}`);
report('全部', rows);
for (const [name, extension] of [['JS', '.js'], ['CSS', '.css'], ['HTML', '.html']]) {
  report(name, rows.filter(row => row.ext === extension), true);
}
report('图片与图标', rows.filter(row => ['.webp', '.png', '.jpg', '.jpeg', '.svg', '.ico'].includes(row.ext)));
report('Three.js 按需核心', rows.filter(row => /^assets\/three(?:\.module|\.core|-runtime)-.*\.js$/.test(row.path)), true);
console.log('最大文件：');
rows.sort((a, b) => b.size - a.size).slice(0, 8).forEach(row =>
  console.log(`  ${row.path} ${fmt(row.size)}${row.gzip === null ? '' : ` (gzip ${fmt(row.gzip)})`}`));
console.log('提示：gzip 为逐文件估算，不等于首屏或实际网络传输量。');
