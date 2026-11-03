/* funnel.html 是唯一入口与唯一的填表互动。
 * 主应用内的旧表单已彻底移除：任何「填写出生信息 / 重新推演 /
 * 补全命盘」意图都回到漏斗页完成，不再维护第二套输入界面。 */
export function goToFunnel() {
  location.href = './funnel.html';
}
