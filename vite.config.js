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
           Vite 8 用 Rolldown 替代 Rollup，manualChunks 函数形式已废弃，
           改用 codeSplitting 分组规则。 */
        manualChunks(id) {
          if (id.includes('/src/engines/')) return 'engines';
          if (id.includes('/src/ai/')) return 'ai';
          if (id.includes('/src/render/')) return 'render';
          if (id.includes('/src/tools/')) return 'tools';
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
