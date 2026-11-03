# 问问大师

[![CI / Deploy](https://github.com/kynessiscozy/wenV5/actions/workflows/deploy.yml/badge.svg)](https://github.com/kynessiscozy/wenV5/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![Version](https://img.shields.io/badge/version-5.0.0--beta.1-blue)

问问大师是一个探索东方命理与西方星象的 Web 应用。输入出生信息后，可以查看八字、紫微斗数和西方星盘等报告，也可以使用决策工具、角色向导和可选的 AI 问答。

**[在线体验](https://kynessiscozy.github.io/wenV5/funnel.html)** · [更新日志](./CHANGELOG.md) · [贡献指南](./CONTRIBUTING.md)

> 本项目处于 Beta 阶段。推演结果仅供文化研究与娱乐参考，不构成医疗、投资或其他重大决策建议。

## 功能概览

- **东方命理**：四柱八字、五行十神、紫微斗数、梅花易数、流日与双人合盘；支持节气和真太阳时校正。
- **西方星象**：本命星盘、行星落座与宫位、相位、生命灵数，以及可交互的 Three.js 星象场景。
- **工具中心**：塔罗、MBTI、择日、合盘、起名、答案之书、日签等工具。
- **角色与分享**：选择引路人，获得不同的阅读线索与反思问题；引路人不改变排盘或评分。可在本机预览、生成分享海报。
- **AI 问答**：可配置 DeepSeek 或 OpenRouter，结合命盘上下文进行追问；未配置 API Key 时提供本地知识库和离线回答。
- **PWA**：支持安装到主屏幕；资源缓存完成后，部分入口和推演功能可离线使用。

## 如何使用

1. 打开[入口页](https://kynessiscozy.github.io/wenV5/funnel.html)，首次展示月白；点击右上角可展开或收起引路人选择，再填写问卷。
2. 根据提示填写出生信息，完成推演并查看报告；填写途中可选择退出，未完成的内容不会保存。报告中可切换东方和西方内容。
3. 按需使用工具、保存档案、生成分享海报，或在 AI 设置中配置自己的服务商和 API Key。

访问站点根路径会进入漏斗页；直接访问主应用 `index.html` 则会看到待机入口卡。PWA 的启动页同样为 `funnel.html`。

## 本地开发

### 环境要求

- Node.js 24 或更高版本，以及 npm
- 运行浏览器测试时需要 Puppeteer 可用的 Chrome 和相应系统依赖

### 安装与启动

```bash
git clone https://github.com/kynessiscozy/wenV5.git
cd wenV5
npm ci
npm run dev
```

打开 <http://localhost:5173/funnel.html>。开发服务器默认监听 5173 端口，也可通过 `PORT` 环境变量指定端口。

### 构建与预览

```bash
npm run build      # 输出到 dist/
npm run preview    # 预览生产构建，默认端口 4173
npm run size       # 构建并统计产物大小
```

预览时访问 <http://localhost:4173/funnel.html>。应用使用相对基础路径，可以部署在静态站点的子路径下；PWA 和 Service Worker 需要 HTTPS 或 localhost 等安全上下文。

## 测试与验证

```bash
npm run test:unit           # 单元测试与数据验证
npm run test:flow           # 入口状态机与漏斗交接
npm run test:funnel-exit    # 采集流程退出与未提交数据保护
npm run test:guide-perspective:e2e # 引路人视角与排盘结果一致性
npm run test:first-entry-pwa # 首访、离线问卷与档案升级（自动构建）
npm run test:e2e            # Puppeteer 浏览器回归
npm run test:home-offline   # 构建并测试离线入口和推演
npm run test:cache-upgrade  # Service Worker 缓存升级
npm run test:a11y           # 对比度检查
```

`test:e2e`、`test:funnel-exit` 和 `test:guide-perspective:e2e` 需要先启动开发服务器。报告测试默认访问 `http://localhost:5173/index.html`，可通过 `BASE_URL` 指定地址；退出测试可通过 `FUNNEL_URL` 指定漏斗页地址。浏览器测试需要可用的 Chrome。`test:home-offline` 会自行提供构建后的测试站点，不需要另行启动服务器。

算法和数据变更可运行对应验证：

```bash
node tools/verify-bazi-v3.mjs
npm run verify:lunar        # 农历 vs lunar-javascript
npm run verify:ziwei        # 紫微 vs iztro，耗时较长
npm run verify:western      # 西方星历验证
npm run audit:deep:quick    # 数据审计抽样；去掉 :quick 运行全量
npm run verify:algo:quick   # 算法验证抽样；去掉 :quick 运行全量
```

完整脚本列表见 [`package.json`](./package.json)。`test:character`、`test:trait-picker` 等包含旧版特质轮盘测试，当前漏斗单一入口下保留为历史套件。提交前的检查要求见[贡献指南](./CONTRIBUTING.md)。

## 实现与限制

项目使用原生 ES Modules 和 Vite 构建；Three.js 场景和部分工具按需加载。命理计算主要在浏览器中进行，Puppeteer 用于浏览器回归测试。

| 模块 | 实现与范围 |
| --- | --- |
| 八字与历法 | `src/engines/bazi.js`、`calendar.js`、`solar-terms.js`；支持节气和真太阳时校正 |
| 农历 | `src/engines/lunar.js`；数据表覆盖 1900–2100 年，含闰月 |
| 紫微斗数 | `src/engines/ziwei.js`；标准安星，尚不包含部分杂曜、飞星四化及大限等内容 |
| 奇门遁甲 | `src/engines/qimen.js`；当前为简化排盘，用于九宫速览，不是完整时家转盘 |
| 西方星象 | `src/engines/western.js`；包含星历、宫位、相位与生命灵数计算，部分天体计算使用近似模型 |

历史交叉验证结果及计算范围见 [算法验证报告](./docs/algo-verification-2026-10-13.md)和[数据审计报告](./docs/audit-deep-2026-10-13.md)。这些验证不能保证所有日期、流派或使用场景下的结果完全一致。

### 入口流程

`public/funnel.html` 是问卷入口；主应用由 `src/ui/entry-plan.js` 决定初始路径，由 `src/ui/entry-flow.js` 管理界面状态。直接访问、深链、档案载入和问卷交接使用同一套流程。旧首页和特质轮盘的 DOM 保留供报告等功能复用，但不再作为可交互入口。

## 隐私与外部服务

- 出生信息、档案、API Key 和自进化偏好默认保存在浏览器本地；清除浏览器数据可能导致其丢失。档案可通过应用导出、导入，请妥善保管导出文件。
- 使用外部 AI 时，API Key、问题、近期对话及相关命盘或工具上下文可能发送给所选服务商；连接检测也会发送 Key。请勿输入不愿与服务商分享的敏感信息，并留意其隐私政策和费用。
- 天气功能使用定位及外部天气、地理编码服务；使用相关功能时，位置信息可能发送给这些服务。
- 离线能力依赖浏览器和已缓存资源；外部 AI、天气等联网功能在离线时不可用。

## 项目结构

```text
public/              漏斗入口、PWA 清单、Service Worker 与静态素材
index.html           主应用页面
src/
├── engines/         东方与西方计算引擎、历法和数据
├── ai/              AI 服务商、本地知识库与回答逻辑
├── evolve/          本地反馈与偏好
├── character/       角色定义
├── fx/              Three.js 场景与特效
├── render/          报告和工具展示
├── share/           分享卡片与海报
├── state/           应用状态与上下文
├── tools/、tools2/  工具中心
├── ui/              入口流程、导航和界面组件
└── main.js          主应用入口
tools/               测试、验证与审计脚本
docs/                算法验证和数据审计报告
```

## 部署与贡献

推送到 `main` 或手动触发 GitHub Actions 后，[部署工作流](./.github/workflows/deploy.yml)会先构建并运行单元测试，再将 `dist/` 发布到 GitHub Pages。其他静态托管环境也可发布该目录。

欢迎提交问题和改进建议。开发规范、提交前检查及 PR 指南请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md)；版本历史见 [CHANGELOG.md](./CHANGELOG.md)。

## 许可证

本项目采用 [MIT License](./LICENSE)。Copyright © 2026 kynessiscozy。
