# 更新日志(Changelog)

本文件记录「问问大师」的所有重要变更。

格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增

- `CHANGELOG.md` 与 GitHub Issue 模板(Bug 报告 / 功能请求)
- README 引擎表如实标注紫微/奇门为**简化排盘**,附实现边界脚注

### 变更

- **引擎可读化重构第二弹**(方法同 bazi.js:展开 → 新旧实现模糊等价对比 → 验证套件全绿):
  - `calendar.js` — 节气三级回退链、真太阳时/均时差、晚子时进日、日柱戊午锚点全注释;27,289 项模糊对比零差异(1895–2105 节气穷举、5 时区含夏令时)
  - `ziwei.js` / `qimen.js` — 具名常量表 + 口诀出处注释 + 简化边界如实标注;12,824 项模糊对比零差异(201 年 × 12 时辰系统扫描)
  - `solar-terms.js` — 55KB 单行数据表重排为一年一行(228 行),新增数据格式/约定/维护文档;2,424 个时刻字符串逐字节一致

## [5.0.0-beta.1] - 2026-08-30

首个公开版本,MIT 开源。

### 新增

- **西方星象体系**:天体力学星历计算、本命星盘(十大星曜落座落宫)、十二宫位、几何相位、毕达哥拉斯生命灵数九宫
- **Three.js 3D 星象剧场**:命盘·金色罗盘 / 运势·黄道天球 / 关系·灵数粒子云(懒加载独立 chunk,`prefers-reduced-motion` 自动降级)
- 十二星座**真实星图**配图(`zodiac-art.js`,含主要恒星赤经/赤纬/星等与连线)
- 全景长报告重做:十神/藏干/纳音表/五行占比/三维评分/五维画像真实数据映射,夜空报头与星座星图带
- 新手指引 / 关于 / 免责声明 / README 全面重写
- 开源基础设施:MIT LICENSE、CONTRIBUTING.md、README 徽章(CI/License/版本)与在线演示链接

### 变更

- `bazi.js` 压缩风格展开为可读源码(引擎可读化重构第一弹;45,049 项新旧实现模糊对比零差异)

### 质量

- 验证矩阵全绿:八字 123 + 118 项交叉验证、西方星历 59 项、全局数据审计 15 项、流日/合盘/塔罗/MBTI/长报告/工具轮播单测
- CI(GitHub Actions)「构建 + 单测」门禁,合并 `main` 自动部署 GitHub Pages

## [4.3.x] - 2026-08(内部迭代)

- **4.3.1** — 三分区统一标签排版、今日建议卡重设计、Dock 纯光球入口、暗色可读性与背景光球优化
- **4.3.0** — 工具环形导航(`tools-ring`)、西方星盘 3D 浑仪(`armillary-western`)、长报告分享卡、新手引导流程、西方占星引擎升级、星座运势工具增强、能量穿搭工具;Claude 风格 CSS 体系(claude-refine / claude-ui / enhance)

## [V2.x–V4.x] - wendi 时期(内部版本)

- 东方命理核心:四柱八字、节气历法(真太阳时)、紫微、奇门、梅花、双人合盘、流日流周
- AI 智能问答(DeepSeek / OpenRouter 双提供方、结构化命盘上下文、意图识别与工具路由)
- 自进化系统(`evolve`:基因组、经历记忆、个人知识蒸馏,本地反馈调参)
- 工具中心 V1/V2(塔罗、MBTI、择日、合盘、起名、摇签、答案之书等 13 款)
- Claude 风格 UI(纸质/暗夜双主题、WCAG AA)、PWA(manifest + Service Worker)

[未发布]: https://github.com/kynessiscozy/wenV5/compare/v5.0.0-beta.1...main
[5.0.0-beta.1]: https://github.com/kynessiscozy/wenV5/releases/tag/v5.0.0-beta.1
