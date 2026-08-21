# 问问大师

> 基于传统命理学的智能解读 Web 应用 —— 八字排盘、紫微斗数、奇门遁甲、梅花易数、流日运势、八字合盘，配合 AI 智能问答。

采用 Claude 风格 UI 设计，支持浅色/深色双主题，PWA 离线可用，部署于 GitHub Pages。

---

## 功能概览

### 命理引擎

| 引擎 | 文件 | 说明 |
|------|------|------|
| 八字排盘 | `src/engines/bazi.js` | 四柱八字、五行力量、十神、神煞、大运流年 |
| 历法计算 | `src/engines/calendar.js` | 精确节气时刻（1900–2101）、月柱判定、真太阳时 |
| 节气数据 | `src/engines/solar-terms.js` | 202 年 × 12 节气精确到分钟的权威时间戳 |
| 紫微斗数 | `src/engines/ziwei.js` | 十二宫位、星曜排布 |
| 奇门遁甲 | `src/engines/qimen.js` | 天盘地盘、八门九星 |
| 梅花易数 | `src/engines/meihua.js` | 体用生克、卦象解读 |
| 流日运势 | `src/engines/liuri.js` | 当日干支 × 个人命盘互动，统一基调驱动文案 |
| 八字合盘 | `src/engines/synastry.js` | 逐柱比对、五行互补、日主十神关系 |

### 工具中心

财运分析、事业方向、良辰择日、穿搭建议、裁员风险、每日日签、起名选字、摇签问卜、选号测算、生肖运势、八字合盘、答题书。

### AI 智能问答

- 支持 DeepSeek 和 OpenRouter 双提供方，设置页可切换
- 命理知识库（55 条术语词条）本地检索 + AI 兜底
- 点击报告卡片「这段是什么意思」自动组装结构化提问
- 离线降级：无网络时仍可查术语与命盘解读
- **自进化**：根据「有用 / 不准」反馈，在本地记住你的语气偏好、常问主题，并把认可过的回答收成个人知识；记忆不上传

### 设计与交互

- **Claude 风格 UI**：米白纸感底（`#faf9f5`）、赭橙强调色（`#d97757`）、扁平卡片
- **双主题**：浅色 / 深色 / 跟随系统，首屏无闪烁切换
- **响应式**：360px / 430px / 768px / 桌面端四档适配
- **无障碍**：WCAG AA 对比度达标、键盘可聚焦、`aria-expanded` 状态同步
- **PWA**：manifest + Service Worker，可安装到主屏幕

---

## 技术栈

| 层 | 技术 |
|----|------|
| 构建 | Vite 7（esbuild 压缩、manualChunks 分包） |
| 前端 | 原生 ES Modules，无框架依赖 |
| AI | DeepSeek API / OpenRouter API（Fetch Streaming） |
| 测试 | Node.js 原生 + Puppeteer E2E |
| 部署 | GitHub Actions → GitHub Pages |
| 存储 | IndexedDB（命盘档案）+ localStorage（偏好设置） |

---

## 项目结构

```
src/
├── engines/          # 命理计算引擎（八字、历法、紫微、奇门、梅花、合盘…）
├── ai/               # AI 提供方门面 + 知识库 + 智能问答
├── evolve/           # 自进化：基因组、经历记忆、个人知识蒸馏
├── render/           # 报告渲染层
├── tools/            # 工具中心各功能模块
├── tools2/           # 工具中心 V2（动态 import 异步加载）
├── ui/               # 导航、主题、标签页、Toast、天气
├── state/            # 状态管理（上下文、评分、合盘对象）
├── share/            # 分享卡片生成
├── fx/                # 视觉特效（浑天仪动画）
├── main.js           # 应用入口
└── *.css             # 样式层（令牌 → 基础 → 组件 → 精修）

tools/                # 测试与验证脚本
├── verify-bazi-v3.mjs  # 八字核心算法验证（123 项）
├── test-liuri.mjs      # 流日引擎单测（12 项）
├── test-synastry.mjs   # 合盘引擎单测（15 项）
├── test-evolve.mjs     # 自进化纯函数单测
├── test-gloss.mjs      # 术语引导 E2E
├── test-firstscreen.mjs# 首屏含义 E2E
├── test-explain.mjs    # AI 提问上下文 E2E
├── test-daily.mjs      # 每日触点 E2E
├── test-partners.mjs   # 合盘对象存储 E2E
├── test-persist.mjs    # 命盘持久化 E2E
├── test-flat-tabs.mjs  # 分区标签 E2E（43 项）
├── contrast.mjs        # WCAG AA 对比度审计
└── archive/            # 已归档的一次性脚本
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
npm run test:unit    # 引擎单测（流日 + 合盘）
npm run test:e2e     # Puppeteer E2E 套件（7 个场景）
npm run test:a11y    # WCAG AA 对比度审计
```

八字核心算法验证：

```bash
node tools/verify-bazi-v3.mjs    # 123 项权威交叉验证
```

---

## 八字引擎验证

八字推演经 123 项测试验证，覆盖以下维度，全部通过：

| 验证维度 | 测试数 | 权威来源 |
|---------|--------|---------|
| 节气精确时刻 | 6 | 新华网、央视网、光明网 |
| 立春年柱分界 | 6 | 精确节气时刻验证 |
| 小寒月柱分界 | 7 | 万年历、周新春易学网 |
| 完整四柱排盘 | 6 | 测算网、占卜网、周易算命网 |
| 日柱 60 甲子循环 | 3 | 数学验证 |
| 五虎遁 / 五鼠遁 | 10 | 传统口诀 |
| 纳音五行表 | 21 | 标准对照 |
| 十神表 | 20 | 五行生克推导 |
| 地支藏干 | 12 | 标准对照 |
| 五行归类 | 22 | 标准对照 |
| 神煞计算 | 5 | 空亡 / 桃花 / 驿马 / 天乙 / 文昌 |
| 五行力量分析 | 5 | 结构完整性 |

节气数据覆盖 1900–2101 年共 202 年 × 12 节气，精确到分钟，与权威来源交叉验证。

---

## 部署

项目通过 GitHub Actions 自动部署到 GitHub Pages。

推送 `main` 分支即触发 CI：构建 → 引擎单测 → 发布 Pages。

手动触发：GitHub 仓库 → Actions → Deploy to GitHub Pages → Run workflow。

---

## AI 配置

应用支持两种 AI 提供方，在设置页面切换：

| 提供方 | 说明 |
|--------|------|
| DeepSeek | 默认提供方 |
| OpenRouter | 备选，支持多模型路由 |

API Key 存储于浏览器 localStorage，不上传服务器。无 Key 时自动降级为离线模式（术语检索 + 命盘解读仍可用）。

---

## 自进化

问问会在**这台设备上**慢慢更懂你，不训练云端模型，也不改命理引擎。

| 能力 | 说明 |
|------|------|
| 经历记忆 | 每次问答写入 IndexedDB（问题 / 回答摘要 / 意图），不含出生日期 |
| 显式反馈 | 气泡上的「有用 / 不准」；复制、重试作为隐式信号 |
| 基因组 | 语气（陪伴 / 严谨 / 传统 / 建议）、篇幅、常问主题、提示词课 |
| 个人知识 | 点过「有用」的 AI 回答蒸馏成私人 FAQ，下次同类问题优先命中 |
| 代数 | 每完成一轮进化 +1，聊天标题显示「第 N 代」 |

开关、导出、清空都在问问大师 → 设置 → 自进化。关闭后不再记录，也不再改提示词。

---

## 开发约定

- 引擎层（`engines/`）为纯函数，不读写 DOM，便于单测
- `mkDy()` 出生日期由参数传入，不读页面输入框
- CSS 颜色全部使用语义令牌（`--c-*`），不写死 hex 值
- 字号使用 px 字阶变量（`--fs-*`），不用 `em` 层层相乘
- 触控目标 ≥ 40×40px，符合 WCAG 2.5.8
- 详见 `CLAUDE-STYLE.md`

---

## License

Private
