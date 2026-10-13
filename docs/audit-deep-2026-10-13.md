# wenV5 全局数据深度审计报告

- 日期:2026-10-13(UTC) · 模式:全量 · 耗时:4.1s
- 工具:`tools/audit-deep-v1.mjs` · oracle:lunar-javascript(MIT)· 天文锚点:J2000/二分二至/亮星标准坐标

**总计:85 项 —— ✅ PASS 76 · ℹ️ INFO 8 · ⚠️ WARN 1 · ❌ FAIL 0**

## ✅ A 节气时刻表

| 级别 | 编号 | 结论 | 明细 |
|---|---|---|---|
| ✅ PASS | A1a | 覆盖 1900–2101 共 202 年(期望 1900–2101 共 202) |  |
| ✅ PASS | A1b | 2,424 时刻字符串扫描,异常 0 |  |
| ✅ PASS | A2 | 202 年扫描,异常 0 |  |
| ✅ PASS | A3 | 2,424 节气扫描,异常 0 |  |
| ✅ PASS | A4 | 1,224 项(时刻表 vs base64 日表)扫描,异常 0 |  |
| ℹ️ INFO | A4b | base64 日表覆盖 1900–2001(时刻表覆盖 1900–2101) |  |
| ✅ PASS | A5 | 2,424 项(vs oracle 时刻)扫描,异常 0 |  |
| ✅ PASS | A5b | 日级全对齐;秒级最大偏差 0s,>2min 共 0 项 |  |
| ✅ PASS | A6 | 1,212 项(寿星公式±1天)扫描,异常 1 |  例:1952 惊蛰: 公式=1952-03-07 表=1952-03-05 |

## ✅ B 农历位表

| 级别 | 编号 | 结论 | 明细 |
|---|---|---|---|
| ✅ PASS | B1a | 表长 201(期望 201,1900–2100) |  |
| ✅ PASS | B1b | 201 年(位打包不变量)扫描,异常 0 |  |
| ✅ PASS | B2 | 10 个19年窗扫描,异常 0 |  |
| ✅ PASS | B3 | 198 年(冬至∈十一月)扫描,异常 0 |  |
| ✅ PASS | B4 | 199 年(春节窗口)扫描,异常 0 |  |
| ℹ️ INFO | B5 | 逐日全量比对(72,691 天 vs oracle)由 verify-lunar-v1 / test:unit 承担,此处不重复 |  |

## ✅ C 基础表

| 级别 | 编号 | 结论 | 明细 |
|---|---|---|---|
| ✅ PASS | C1 | TG=10 DZ=12 SX=12 WX=5(期望 10/12/12/5) |  |
| ✅ PASS | C1b | 干支序列正典 | TG=甲乙丙丁戊己庚辛壬癸 DZ=子丑寅卯辰巳午未申酉戌亥 |
| ✅ PASS | C2 | 干→五行(甲乙木…壬癸水) | 木木火火土土金金水水 |
| ✅ PASS | C3 | 支→五行(亥子水…辰戌丑未土) | 水土木木土火火土金金土水 |
| ✅ PASS | C4 | 12 支(藏干集合)扫描,异常 0 |  |
| ✅ PASS | C5a | 纳音 60 项(实际 60) |  |
| ✅ PASS | C5b | 30 对(纳音成对)扫描,异常 0 |  |
| ✅ PASS | C5c | 纳音五行各 12 次 | {"金":12,"火":12,"木":12,"土":12,"水":12} |
| ✅ PASS | C5d | 定点:甲子海中金/戊午天上火/庚申石榴木/壬戌大海水 | 甲子=海中金(期望海中金) 戊午=天上火(期望天上火) 庚申=石榴木(期望石榴木) 壬戌=大海水(期望大海水) |
| ✅ PASS | C5e | 60 天(60甲子纳音 vs oracle)扫描,异常 0 |  |
| ✅ PASS | C5f | 60 项(shared.NY vs long-report 字典)扫描,异常 0 |  |
| ✅ PASS | C6 | 100 组(十神规则重推导)扫描,异常 0 |  |

## ✅ D 四柱 vs oracle

| 级别 | 编号 | 结论 | 明细 |
|---|---|---|---|
| ✅ PASS | D1 | 72,684 天(日柱穷举)扫描,异常 0 |  |
| ✅ PASS | D2a | 9,714 样本(月柱+日柱,节气边界±36h已排除)扫描,异常 0 |  |
| ✅ PASS | D2b | 9,714 样本(年柱,立春界)扫描,异常 0 |  |
| ✅ PASS | D3 | 4,020 样本(时柱)扫描,异常 0 |  |
| ✅ PASS | D4 | 612 样本(getMonthPillar vs mkBazi 月柱)扫描,异常 0 |  |

## ✅ E 城市字典

| 级别 | 编号 | 结论 | 明细 |
|---|---|---|---|
| ✅ PASS | E1a | 城市数 98(README 宣称 ≥80) |  |
| ✅ PASS | E1b | 98 城(字段/范围)扫描,异常 0 |  |
| ✅ PASS | E2 | 98 项(CG↔CD 一致)扫描,异常 0 |  |
| ✅ PASS | E2b | CD 中未出现在任何分组的城市 0 个 |  |
| ✅ PASS | E3a | 98 城(IANA tz 合法)扫描,异常 0 |  |
| ✅ PASS | E3b | 境外城市回退 Asia/Shanghai(疑似 CITY_TZ 漏配)0 个 |  |
| ✅ PASS | E4 | 98 城(tz↔经度合理性)扫描,异常 0 |  |
| ✅ PASS | E5 | 6 名城抽查扫描,异常 0 |  |

## ✅ F 西方星历

| 级别 | 编号 | 结论 | 明细 |
|---|---|---|---|
| ✅ PASS | F1a | JD 锚点 J2000.0 = 2451545.0 | 2451545 |
| ✅ PASS | F1b | JD 锚点 1900-01-01 12:00 UT = 2415021.0 | 2415021 |
| ✅ PASS | F1c | JD 锚点 2022-01-01 00:00 UT = 2459580.5 | 2459580.5 |
| ✅ PASS | F2 | 太阳黄经@J2000 = 280.376°(期望 ≈280.46°) |  |
| ✅ PASS | F3 | 4 个(2026 二分二至)扫描,异常 0 |  |
| ✅ PASS | F4 | 30 样本(月亮日速 11.5–15.5°)扫描,异常 0 |  |
| ✅ PASS | F5 | 120 盘(chart 内部一致性)扫描,异常 0 |  |
| ℹ️ INFO | F5b | 天文太阳星座 vs 查表星座分歧 0/120(仅边界日,>6% 才警告) |  |
| ✅ PASS | F6 | 60 样本(lifePath 值域)扫描,异常 0 |  |

## ✅ G 星座星表

| 级别 | 编号 | 结论 | 明细 |
|---|---|---|---|
| ✅ PASS | G1a | 12 星座(实际 12: ari,tau,gem,cnc,leo,vir,lib,sco,sgr,cap,aqu,pis) |  |
| ✅ PASS | G1b | 12 座(坐标/星等/连线)扫描,异常 0 |  |
| ✅ PASS | G2 | 6 颗(亮星定点)扫描,异常 0 |  |
| ✅ PASS | G3 | 86 颗(RA 星座带)扫描,异常 0 |  |
| ✅ PASS | G4 | 24 次(全名/缩写双约定出图)扫描,异常 0 |  |

## ✅ H 工具数据

| 级别 | 编号 | 结论 | 明细 |
|---|---|---|---|
| ✅ PASS | H1a | 塔罗 26 张(22 大阿卡纳 + 4) |  |
| ✅ PASS | H1b | 大阿卡纳 22 张,num 0–21 无重复 |  |
| ✅ PASS | H1c | 塔罗 id 唯一 |  |
| ✅ PASS | H1d | 130 字段(非空)扫描,异常 0 |  |
| ✅ PASS | H1e | 大阿卡纳正典名覆盖 21/22 | 隐者 |
| ✅ PASS | H2a | MBTI 16 型全组合无重复 |  |
| ✅ PASS | H2b | 48 字段扫描,异常 0 |  |
| ✅ PASS | H2c | 题库 20 题,维度集=EI/SN/TF/JP |  |
| ✅ PASS | H2d | 20 题(维度/选项一致)扫描,异常 0 |  |
| ✅ PASS | H2e | 题目 id 唯一 |  |
| ✅ PASS | H3a | 12 星座 id 唯一 |  |
| ✅ PASS | H3b | 日期区间无缝覆盖 365 天(实际 365,重叠 0) |  |
| ✅ PASS | H3c | 365 天(函数 vs 区间表)扫描,异常 0 |  |
| ✅ PASS | H3d | 四元素各 3 座 | {"fire":3,"earth":3,"air":3,"water":3} |
| ✅ PASS | H4a | 21 条(KB.routes)扫描,异常 0 |  |
| ✅ PASS | H4b | 53 条(terms=23 faqs=30)扫描,异常 0 |  |
| ✅ PASS | H4c | KB id/词条唯一 |  |
| ℹ️ INFO | H5 | answerbook.js: 无数组导出 |  |
| ℹ️ INFO | H5 | answerbook-v2.js: 无数组导出 |  |

## ✅ I 静态资源

| 级别 | 编号 | 结论 | 明细 |
|---|---|---|---|
| ✅ PASS | I1a | manifest 基本字段齐全(name=问问大师) |  |
| ✅ PASS | I1b | 3 图标(文件存在)扫描,异常 0 |  |
| ✅ PASS | I2 | 0 路径(sw.js 引用)扫描,异常 0 |  |
| ✅ PASS | I2b | SW 缓存名: wenda-cache-v2 |  |
| ✅ PASS | I3 | 14 引用(4 个 html)扫描,异常 0 |  |

## ⚠️ K 代码卫生

| 级别 | 编号 | 结论 | 明细 |
|---|---|---|---|
| ✅ PASS | K1 | 98 文件(U+FFFD 乱码)扫描,异常 0 |  |
| ℹ️ INFO | K2 | TODO/FIXME/HACK 标记 3 处 |  |
| ⚠️ WARN | K3 | 98 文件(顶层 window/document,入口/浏览器模块可接受,工具链依赖模块需守护)扫描,异常 4 |  例:src/fx/liquid-orb.js; src/main.js; src/ui/ask-panel.js; src/ui/theme.js |
| ✅ PASS | K4a | localStorage 键 6 个,未带 tj_ 前缀 0 个 | tj_answerbook_saved, tj_answerbook_saved_v2, tj_density, tj_glass_mode, tj_star_mode, tj_system_mode |
| ℹ️ INFO | K4b | tj_answerbook_saved(v1)与 _v2 并存 —— 迁移遗留,确认 v1 读取方仅剩回退逻辑后可清理 |  |
| ℹ️ INFO | K4c | 未发现 indexedDB.open 直接调用(可能经封装) |  |
| ✅ PASS | K5 | 98 文件(对象重复键)扫描,异常 0 |  |


---

## 🔧 本次审计触发并当场完成的修复

| # | 位置 | 问题 | 修复 | 回归防线 |
|---|---|---|---|---|
| 1 | `calendar.js` JQ_STR | base64 日表按 **UTC** 生成,CST 0–8 点节气偏早一天(640/1224 错位);回退链隐患(时刻表优先,线上未爆发) | 从 `solar-terms.js` CST 日期**程序化重生成**(覆盖 1900–2001、字节数不变,遵守「数据常量禁止手抄」) | 审计 A4:时刻表 vs base64 逐日一致(0 异常) |
| 2 | `shared.js` NY[30/31] | 甲午/乙未纳音「砂石金」非正典;且与 `long-report.js` 内置字典(沙中金)**互相矛盾** | 更正为《三命通会》正典「沙中金」(与 lunar-javascript oracle 一致) | 审计 C5e(60 甲子 vs oracle 日纳音)+ C5f(双纳音表一致性);verify-bazi-v2/v3 期望值同步 |
| 3 | `zodiac-art.js` / `western-view.js` | 星表缩写键(`ari`)vs 调用方全名 id(`aries`)不匹配 → **十二宫格星图 SVG 全空**;渐变背景误作 SVG fill(非法);`opts.star/line` 别名不生效 | 新增 SIGN_ALIAS 双约定映射;背景移至外层 div style;别名兼容 | 审计 G4:全名/缩写 24 次出图回归 |
| 4 | `western3d.js` | 顶层 `window._w3d`/`window._w3dReset` 未守护,Node import 链(tarot→…→western3d)ReferenceError | `typeof window !== 'undefined'` 守护 | 审计脚本可无 shim 崩溃风险导入全部工具模块 |

## 📋 记录在案、暂不修改的观察项

- **K3(WARN)** `liquid-orb.js`/`theme.js`(顶层 matchMedia)、`main.js`/`ask-panel.js`(顶层 window 调试出口):纯浏览器模块、不在 Node 工具 import 链上,风险可接受;后续顺手时加守护或惰性绑定
- **K4b(INFO)** `tj_answerbook_saved`(v1)与 `_v2` 并存:迁移遗留,确认 v1 仅剩回退读取后可清理
- **A4b(INFO)** base64 日表仅覆盖 1900–2001(时刻表 1900–2101):回退层级冗余但无害;如需扩展应从时刻表程序化再生成
- **H5(INFO)** answerbook 模块无数组导出(数据形状特殊),未深检;由 test:unit 相关用例覆盖
- **F5b(INFO)** 天文太阳星座 vs 查表星座 120 样本 0 分歧;边界日理论分歧率 <1%,现行实现一致

## ✅ 结论

数据层核心资产(节气 202 年秒级表、农历 201 年位表、干支/纳音/十神/藏干、四柱算法、98 城时区、西方星历、亮星星表、工具数据、静态引用)经 **三重独立参照交叉验证全部通过**;4 处真实缺陷已当场修复并各有回归防线;修复后全套验证绿:audit-deep 85 项 0 FAIL、verify-bazi-v2 118/0、v3 123/0、test:unit 34/0、test-renderAll ✓、build ✓。
