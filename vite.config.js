import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
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
            { name: 'engines', test: /\/src\/engines\//, priority: 10 },
            { name: 'ai', test: /\/src\/ai\//, priority: 10 },
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
