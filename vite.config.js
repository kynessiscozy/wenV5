import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'offline-asset-manifest',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter(name => /^assets\/.*\.(?:js|css)$/.test(name));
      this.emitFile({ type: 'asset', fileName: 'offline-assets.json', source: JSON.stringify(assets) });
    },
  }],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rolldownOptions: {
      output: {
        /* 按目录分包：主包只保留启动路径，
           引擎 / AI / 渲染 / 工具各自成 chunk，便于并行加载与缓存复用。
           tools2 经 main.js 的动态 import() 自动独立成异步 chunk。
           Vite 8 用 codeSplitting 替代废弃的 manualChunks。 */
        codeSplitting: {
          groups: [
            // Keep Vite's dynamic-import helper out of the engine chunk so the
            // small home entry does not have to download every report engine.
            { name: 'preload-helper', test: /\0vite\/preload-helper\.js$/, priority: 100 },
            // The tiny focus helper is shared by home, chat and reports. Keep
            // it out of the heavy engine chunk so home stays independently usable.
            { name: 'focus', test: /\/src\/ui\/focus\.js$/, priority: 100 },
            { name: 'engines', test: /\/src\/engines\//, priority: 10 },
            { name: 'ai', test: /\/src\/ai\//, priority: 10 },
            { name: 'evolve', test: /\/src\/evolve\//, priority: 10 },
            { name: 'render', test: /\/src\/render\//, priority: 10 },
            { name: 'tools', test: /\/src\/tools\//, priority: 10 },
          ],
        },
      },
    },
  },
  server: {
    host: true,
    port: Number(process.env.PORT) || 5173,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: Number(process.env.PORT) || 4173,
    allowedHosts: true,
  },
});
