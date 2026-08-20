/* ============================================================
   tools2 · 工具系统入口
   ------------------------------------------------------------
   注册全部重构工具。bootstrap() 由 src/main.js 在文件末尾
   （所有旧 IIFE 之后）显式调用，确保 openToolPage/closeToolPage
   最终由本系统接管。
   ============================================================ */
import './tools2.css';
import { register, installGlobal } from './runtime.js';
import { wealth } from './wealth.js';
import { career } from './career.js';
import { date } from './date.js';
import { style } from './style.js';
import { layoff } from './layoff.js';
import { daily } from './daily.js';
import { name } from './name.js';
import { oracle } from './oracle.js';
import { lottery } from './lottery.js';
import { zodiac } from './zodiac.js';
import { relation } from './relation.js';
import { answerbook } from './answerbook.js';
import { calendar } from './calendar.js';
import { exportPdfTool } from './export.js';

[
  wealth, career, date, style, layoff, daily,
  name, oracle, lottery, zodiac, relation, answerbook, calendar,
  exportPdfTool,
].forEach(register);

export function bootstrap() {
  installGlobal();
}

