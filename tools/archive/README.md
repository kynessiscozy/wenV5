# tools/archive · 一次性调试脚本归档

这里存放开发过程中产生的**一次性**探查 / 验证 / 截图脚本，均为 Puppeteer
驱动的临时工具，不参与 CI，也不被 `package.json` 的任何 npm script 引用。
保留仅为追溯历史改动时参考，可随时安全删除。

| 前缀 | 用途 |
|---|---|
| `probe-*` / `dbg-*` / `diag-*` / `inspect-*` / `find-*` | 定位某个 UI / 逻辑问题的临时探查 |
| `verify-*` | 验证某次具体改动是否生效（改动合入后即失效） |
| `shot-*` / `shot*.mjs` | 截图对比 |
| `audit-*` | 布局 / 自检审计 |
| `test-explain-ctx.mjs` 等未被 npm script 引用的 test-* | 已被正式测试覆盖或对应功能已重构 |
| `*.py`（claudeify / strip-glass / strip-shadows） | Claude 风格改造时的一次性 codemod，详见根目录 CLAUDE-STYLE.md |

**仍在使用的脚本保留在上级 `tools/` 目录**：
`npm run test:unit`（test-liuri / test-synastry）、
`npm run test:e2e`（test-gloss / test-firstscreen / test-explain / test-daily /
test-partners / test-persist / test-flat-tabs）、
`npm run test:a11y`（contrast.mjs），以及资产生成器 `gen-tool-art.mjs`。

新增一次性脚本时请直接放入本目录，避免再次污染 `tools/` 根目录。
