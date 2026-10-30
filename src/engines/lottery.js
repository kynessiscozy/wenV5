/* 两个娱乐选号入口共用的随机组合规则，不使用命盘或预测中奖。 */
export const LOTTERY_GAMES = {
  ssq: { name: '双色球', red: { n: 6, max: 33 }, blue: { n: 1, max: 16 } },
  dlt: { name: '超级大乐透', red: { n: 5, max: 35 }, blue: { n: 2, max: 12 } },
};

export function pickLotteryNumbers(n, max, random = Math.random) {
  const numbers = new Set();
  while (numbers.size < n) numbers.add(Math.floor(random() * max) + 1);
  return [...numbers].sort((a, b) => a - b);
}

export function drawLotteryRows(type, count, random = Math.random) {
  // 兼容旧入口：除双色球以外均按大乐透处理。
  const game = type === 'ssq' ? LOTTERY_GAMES.ssq : LOTTERY_GAMES.dlt;
  return Array.from({ length: count }, (_, i) => ({
    idx: i + 1,
    red: pickLotteryNumbers(game.red.n, game.red.max, random),
    blue: pickLotteryNumbers(game.blue.n, game.blue.max, random),
  }));
}
