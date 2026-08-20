export const RESULT_STYLES = {
  rigorous: {
    label: '严谨型',
    short: '依据清楚，结论克制',
    prompt: '采用严谨型：先列出最相关的命盘依据与不确定性，再给出克制的判断。区分“计算结果”“传统解释”和“现实建议”，不要使用绝对预测。',
    intro: '先讲依据，再给克制判断。'
  },
  companion: {
    label: '陪伴型',
    short: '温暖理解，陪你拆解',
    prompt: '采用陪伴型：先回应用户的情绪和处境，再用少量术语解释倾向，语气温暖但不讨好，最后给一个今天能完成的小行动。',
    intro: '先接住感受，再拆解下一步。'
  },
  traditional: {
    label: '传统型',
    short: '保留术语，讲清命理脉络',
    prompt: '采用传统型：可以保留四柱、十神、旺衰、用神、格局、流年等术语，但每个术语后都要用一句白话解释；说明推断属于哪条传统规则，不把流派判断说成客观事实。',
    intro: '保留术语，附白话解释。'
  },
  advisory: {
    label: '建议型',
    short: '少绕弯，直接落到选择',
    prompt: '采用建议型：减少命理铺陈，直接说当前重点、可选方案、风险提醒和下一步行动；最多给两条建议，适合做决策参考，不替用户做决定。',
    intro: '聚焦重点，直接给行动。'
  }
};

export function getResultStyle(id) {
  return RESULT_STYLES[id] || RESULT_STYLES.companion;
}
