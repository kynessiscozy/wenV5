# 问问大师 V5.0 BETA

[![CI / Deploy](https://github.com/kynessiscozy/wenV5/actions/workflows/deploy.yml/badge.svg)](https://github.com/kynessiscozy/wenV5/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![Version](https://img.shields.io/badge/version-5.0.0--beta.1-blue)

> 融汇东方命理与西方星象的智能推演 Web 应用 —— 四柱八字、紫微斗数、奇门遁甲、梅花易数 × 西方占星、生命灵数，配以 Three.js 3D 星象剧场与 AI 智能问答。

**🔮 在线演示**：<https://kynessiscozy.github.io/wenV5/>（GitHub Pages，随 `main` 分支自动部署）

V5.0 是一次彻底的体系化升级：在东方命理之外引入完整的**西方星象与生命灵数体系**，并以 **Three.js 3D 星象剧场** 重构西方模式的视觉表达。当前为 Beta 版本。

---

## 核心特性

### 双体系命理引擎

| 体系 | 引擎 | 说明 |
|------|------|------|
| 东方 | `src/engines/bazi.js` | 四柱八字、五行旺衰、十神格局、神煞、大运流年 |
| 东方 | `src/engines/calendar.js` / `solar-terms.js` | 精确节气时刻（1900–2101）、真太阳时校正 |
| 东方 | `src/engines/ziwei.js` / `qimen.js` / `meihua.js` | 紫微斗数 · 奇门遁甲 · 梅花易数三式参判 |
| 东方 | `src/engines/synastry.js` / `liuri.js` | 双人合盘 · 流日流周推演 |
| 西方 | `src/engines/western.js` | 天体力学星历计算、本命星盘、十二宫位、几何相位、毕达哥拉斯生命灵数 |

西方与东方模式一键切换；西方报告含三核本我（太阳/月亮/上升）、四象能量、十大星曜落座落宫、性格画像、黄道全览与灵数九宫。

### 3D 星象剧场（V5.0 新增）

基于 Three.js 的实时 WebGL 场景（`src/fx/western3d.js`）：

- **命盘 · 金色罗盘** — 十大行星按真实落座经度排上黄道环，几何相位以光线织网，支持拖拽旋转、滚轮缩放
- **运势 · 黄道天球** — 十二星座环 + 行星轨道实时运转
- **关系 · 灵数粒子云** — 数字轮廓采样为 4200 颗粒子，从星尘汇聚成你的生命灵数（移植自 ASTRA threejs 版动画）
- 环带配图采用**真实星座星表**绘制（`src/render/zodiac-art.js`，含主要恒星赤经/赤纬/星等与连线）
- 懒加载：three 及后处理模块仅在西方模式激活时加载（独立 chunk）；仅当前分区渲染，切走即暂停；`prefers-reduced-motion` 自动降级单帧

### 工具中心

13 款大师级决策工具：塔罗大师（22 大阿卡纳 · 5 大牌阵 · 3D 翻牌）、人格大师（MBTI 16 型）、事业大师、择日助手、合盘助手、生肖助手、智能起名、摇签问卜、答案之书、今日日签、双色球/大乐透等。

### AI 智能问答与自进化

- 支持 DeepSeek / OpenRouter 双提供方，东方命理 / 西方星相双依据切换
- 结构化命盘上下文注入、多轮追问、意图识别与工具路由
- 自进化系统：根据「有用 / 不准」反馈在本地调整语气与偏好，支持代数显示、导出与清空
- 隐私优先：所有数据（出生信息、档案、记忆）仅存本地设备，不上传服务器

### 其他

- 真太阳时校正、全国城市数据库、命盘档案 JSON 导出导入、术语点击解释、分享卡生成
- PWA：manifest + Service Worker，可安装到主屏幕
- Claude 风格 UI：纸质/暗夜双主题、WCAG AA 对比度、360px–桌面多档响应式

---

## 技术栈

| 层 | 技术 |
|----|------|
| 构建 | Vite 8（Rolldown 压缩、手动分包） |
| 前端 | 原生 ES Modules，无框架依赖 |
| 3D | three@0.185（懒加载 chunk + EffectComposer Bloom 后处理） |
| AI | DeepSeek API / OpenRouter API（Fetch Streaming） |
| 测试 | Node.js 原生 + Puppeteer E2E |

---

## 项目结构

```
src/
├── engines/          # 命理计算引擎（东方八字/历法/紫微/奇门/梅花/合盘 + 西方星历/灵数）
├── ai/               # AI 提供方门面 + 知识库 + 智能问答
├── evolve/           # 自进化：基因组、经历记忆、个人知识蒸馏
├── render/           # 报告渲染层（report / western-view / zodiac-art / tools-catalog）
├── fx/               # 视觉特效（western3d 三场景 / armillary / liquid-orb）
├── tools/            # 工具中心（东方）
├── tools2/           # 工具中心 V2（13 款大师工具，动态加载）
├── ui/               # 导航、主题、标签页、Toast、天气
├── state/            # 状态管理
├── share/            # 分享卡片生成
├── main.js           # 应用入口
└── *.css             # 样式层（令牌 → 基础 → 组件 → 精修）

tools/                # 测试与验证脚本（单元/E2E/审计，见 package.json scripts）
```

---

## 快速开始

### 环境要求

- Node.js ≥ 24
- npm

### 安装与开发

```bash
npm install
npm run dev          # 启动开发服务器（默认 5173 端口）
```

### 构建与预览

```bash
npm run build        # 生产构建 → dist/
npm run preview      # 本地预览构建产物（默认 4173 端口）
```

### 测试

```bash
npm run test:unit    # 引擎单测（流日/合盘/塔罗/MBTI/西方星历等）
npm run test:e2e     # Puppeteer E2E 套件
npm run test:a11y    # WCAG AA 对比度审计
node tools/verify-bazi-v3.mjs     # 八字核心算法 123 项权威交叉验证
node tools/verify-western-v1.mjs  # 西方星历 59 项验证
```

---

## 部署

项目通过 GitHub Actions 自动部署到 GitHub Pages：推送 `main` 分支即触发 CI（构建 → 引擎单测 → 发布 Pages）。也可在 Actions 页手动触发。

---

## AI 配置

应用支持 DeepSeek 与 OpenRouter 两种 AI 提供方，在设置页切换；API Key 仅存于浏览器本地。无 Key 时自动降级为离线模式（术语检索与命盘解读仍可用）。

---

## 版本

- **V5.0 BETA 1** — 西方星象体系 + Three.js 3D 星象剧场 + 十二星座真实星图配图 + 西方标签组交互
- V4.3 — 工具中心 V2、西方星盘与灵数、CSS 样式体系
- V2.x–V4.x — 东方命理核心、AI 问答、自进化、PWA

## License

本项目基于 **MIT License** 开源，详见 [LICENSE](./LICENSE)。

Copyright (c) 2026 kynessiscozy

> 命理推演结果仅供文化研究与娱乐参考，不构成任何医疗、投资或人生决策建议。
