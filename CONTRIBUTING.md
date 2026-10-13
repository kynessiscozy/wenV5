# 贡献指南

感谢你对「问问大师」的关注!本项目为个人主导的开源项目(MIT License),欢迎任何形式的贡献。

## 快速上手

```bash
# 环境要求:Node.js >= 24
npm install
npm run dev          # 开发服务器 http://localhost:5173
```

## 提交改动前必须通过的检查

```bash
npm run build                      # 生产构建无错误
npm run test:unit                  # 引擎单测矩阵(全绿是合并前提,含农历逐日全量验证)
node tools/verify-bazi-v3.mjs      # 八字核心算法 123 项交叉验证
node tools/verify-western-v1.mjs   # 西方星历 59 项验证
npm run verify:ziwei               # 紫微标准安星 vs iztro 交叉验证(约 5 分钟,改动紫微/农历引擎必跑)
npm run audit:deep:quick           # 全局数据深度审计(抽样,秒级;改动任何数据表建议跑全量 audit:deep)
npm run verify:algo:quick          # 全局算法验证(抽样,秒级;改动任何推演算法建议跑全量 verify:algo)
```

CI(GitHub Actions)会在每次 push 到 `main` 时自动执行构建 + 单测,失败则阻断 Pages 部署。**请不要向 CI 红灯的 main 分支合并代码。**

涉及 UI 的改动,建议补充运行:

```bash
npm run test:e2e     # Puppeteer E2E(需先 npm run build && npm run preview)
npm run test:a11y    # WCAG AA 对比度审计
```

## 代码规范

- **原生 ES Modules**,无框架依赖;新代码请保持与 `src/fx/`、`src/render/` 一致的可读格式(具名变量、必要注释)
- 历史遗留:`src/engines/` 中部分文件为早期压缩风格(单行超长),**正在逐模块重构为可读源码**;如果你要改动这些文件,欢迎顺手展开重构,但必须保证上述验证脚本全绿
- 引擎层(`src/engines/`)保持纯函数、不触碰 DOM;UI 相关逻辑放在 `src/render/` 或 `src/ui/`
- 提交信息使用中文,建议带类型前缀:`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`

## 项目结构速查

| 目录 | 职责 |
|------|------|
| `src/engines/` | 命理计算引擎(东方 + 西方),纯函数 |
| `src/render/` | 报告渲染层 |
| `src/fx/` | Three.js 视觉特效 |
| `src/tools/` `src/tools2/` | 工具中心 |
| `src/ai/` | AI 提供方门面 + 智能问答 |
| `tools/` | 测试与验证脚本(非应用代码) |

## Issue 与 PR

- 报告 bug 时请附:浏览器/设备、出生数据(可脱敏)、期望 vs 实际结果
- 命理算法类 issue 请尽量引用权威排盘依据(万年历/经典文献),便于交叉验证
- PR 请保持小步提交,一个 PR 聚焦一件事

## 免责声明

本项目输出的命理/占星内容仅供文化研究与娱乐参考。贡献代码时请勿添加医疗、投资等严肃领域的断言性文案(单测中有恐吓词/吉凶断言扫描,见 `tools/test-liuri.mjs`)。
