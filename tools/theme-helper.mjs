import { HOME_THEMES } from '../src/ui/home-theme.js';
import { themeForPersona } from '../src/ui/entry-personas.js';

/**
 * 旧特质老虎机已删除：人物在 funnel.html 选定并经 wen_funnel_v1 交接。
 * 测试里切换人物 = 写入已消费的交接记录（只带 trait，不触发自动推演）
 * 后重载，等主应用把该主题应用完成。
 */
export async function applyThemeFor(page, id, { timeout = 15000 } = {}) {
  const theme = Object.prototype.hasOwnProperty.call(HOME_THEMES, id) ? id : themeForPersona(id);
  await page.evaluate(trait => {
    try { localStorage.setItem('wen_funnel_v1', JSON.stringify({ v: 1, applied: 1, trait })); } catch (e) {}
  }, id);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(t => document.documentElement.dataset.homeTheme === t, { timeout }, theme);
}

/**
 * 旧出生信息表单已删除：提交 = 走漏斗交接的同一条数据通道
 * （applyEntryPayload 写状态 → calc 推演）。场景里先前用
 * window.__testBirth 暂存的字段会被合并，缺省值与旧表单一致。
 */
export async function submitBirth(page, patch = {}) {
  await page.evaluate(p => {
    const payload = {
      bd: '1990-06-15', timeStr: '09:00', cityName: '上海市', gen: 'male',
      ...(window.__testBirth || {}), ...p,
    };
    window.applyEntryPayload?.(payload);
    window.calc?.();
  }, patch);
}
