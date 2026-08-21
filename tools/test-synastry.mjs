/* 合盘引擎单元测试（Node 环境）
   calendar.js 用 window 缓存节气表，这里补一个最小 shim。 */
globalThis.window = globalThis.window || globalThis;

import { mkBazi } from '../src/engines/bazi.js';
import { calcSynastry, buildPartnerChart } from '../src/engines/synastry.js';

let pass=0, fail=0;
const t=(name,cond,extra='')=>{ if(cond){pass++;console.log('  ✓',name);} else {fail++;console.log('  ✗',name,extra);} };

console.log('\n[1] 对方排盘不依赖 DOM、不读本人生日');
const p1=buildPartnerChart({y:1992,m:8,d:20,hourZhi:null});
t('三柱模式 precision=day', p1.precision==='day');
t('三柱模式只暴露 Y/M/D', JSON.stringify(p1.pillars)==='["Y","M","D"]');
const p2=buildPartnerChart({y:1992,m:8,d:20,hourZhi:5});
t('四柱模式 precision=full', p2.precision==='full');
t('日柱与时辰无关（两模式日柱一致）', p1.b.D.g===p2.b.D.g && p1.b.D.z===p2.b.D.z,
  `${p1.b.D.g}${p1.b.D.z} vs ${p2.b.D.g}${p2.b.D.z}`);

console.log('\n[2] 与已知排盘交叉验证');
// 1990-06-15 巳时(5) —— 项目默认示例
const me=mkBazi(1990,6,15,5);
t('示例命盘日柱可计算', !!me.D.g && !!me.D.z, me.D.g+me.D.z);

console.log('\n[3] 相合/相冲能被正确识别');
// 构造：找一对日支六合的日期
function findPair(pred,limit=4000){
  for(let i=0;i<limit;i++){
    const d=new Date(1990,0,1+i);
    const b=mkBazi(d.getFullYear(),d.getMonth()+1,d.getDate(),6);
    if(pred(b)) return {b,date:d};
  }
  return null;
}
const meB=mkBazi(1990,6,15,5);
const ZHI_HE={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
const ZHI_CHONG={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
const hePair=findPair(b=>ZHI_HE[meB.D.z]===b.D.z);
const chPair=findPair(b=>ZHI_CHONG[meB.D.z]===b.D.z);
t('能找到日支六合样本', !!hePair);
t('能找到日支相冲样本', !!chPair);

const base={myChart:meB,myPillars:['Y','M','D','H'],myYongShen:'水'};
const rHe=calcSynastry({...base,partner:{y:hePair.date.getFullYear(),m:hePair.date.getMonth()+1,d:hePair.date.getDate(),hourZhi:null}});
const rCh=calcSynastry({...base,partner:{y:chPair.date.getFullYear(),m:chPair.date.getMonth()+1,d:chPair.date.getDate(),hourZhi:null}});
t('日支六合被标记 heZhi', rHe.dayPair.heZhi===true);
t('日支相冲被标记 chongZhi', rCh.dayPair.chongZhi===true);
t('六合样本分数 > 相冲样本', rHe.score>rCh.score, `${rHe.score} vs ${rCh.score}`);

console.log('\n[4] 分数边界与结构完整性');
let min=100,max=0,bad=0;
for(let i=0;i<600;i++){
  const dt=new Date(1970,0,1+i*37);
  const r=calcSynastry({...base,partner:{y:dt.getFullYear(),m:dt.getMonth()+1,d:dt.getDate(),hourZhi:i%13===0?null:(i%12)}});
  min=Math.min(min,r.score);max=Math.max(max,r.score);
  if(!Number.isFinite(r.score)||r.score<0||r.score>100)bad++;
  if(!r.dm||!r.dm.ss||!r.comp||!r.comp.text)bad++;
}
t('600 组样本无越界/缺字段', bad===0, 'bad='+bad);
t('分数落在合理区间且有区分度', min>=5&&max<=97&&(max-min)>15, `min=${min} max=${max}`);

console.log('\n[5] 极端与容错');
const rOld=calcSynastry({...base,partner:{y:1900,m:1,d:1,hourZhi:0}});
t('1900 年可计算', Number.isFinite(rOld.score));
const rLeap=calcSynastry({...base,partner:{y:2000,m:2,d:29,hourZhi:null}});
t('闰日 2000-02-29 可计算', Number.isFinite(rLeap.score));
t('五行占比合计接近 100', Math.abs(Object.values(rLeap.theirWx.pct).reduce((a,b)=>a+b,0)-100)<=3);

console.log('\n[6] 时辰缺失→三柱模式→UI标注一致性');
// 场景一：对方时辰缺失（hourZhi=null），引擎应降级为 day 精度，而非 full
const rDay = calcSynastry({
  ...base,
  partner: { y: 1992, m: 8, d: 20, hourZhi: null },
});
t('时辰缺失时 precision=day（而非 full）', rDay.precision === 'day' && rDay.precision !== 'full');
t('partnerPillars 仅含三柱（Y/M/D，无 H）',
  rDay.partnerPillars.length === 3 && !rDay.partnerPillars.includes('H'));

// 边界：hourZhi 越界或未传同样应进入三柱模式（与 null 同等处理）
const rOob1 = buildPartnerChart({ y: 1992, m: 8, d: 20, hourZhi: 12 });
const rOob2 = buildPartnerChart({ y: 1992, m: 8, d: 20, hourZhi: -1 });
const rOob3 = buildPartnerChart({ y: 1992, m: 8, d: 20, hourZhi: undefined });
t('hourZhi=12 越界→day 模式', rOob1.precision === 'day');
t('hourZhi=-1 越界→day 模式', rOob2.precision === 'day');
t('hourZhi=undefined→day 模式', rOob3.precision === 'day');

// 场景二：三柱模式下日柱比对仍然成立（日柱不依赖时辰）
// 同一日期：给定时辰 vs 时辰缺失，日柱干支应完全一致
const rFull = calcSynastry({
  ...base,
  partner: { y: 1992, m: 8, d: 20, hourZhi: 5 },
});
t('日柱干支在两种精度下一致',
  rDay.partnerChart.D.g === rFull.partnerChart.D.g &&
  rDay.partnerChart.D.z === rFull.partnerChart.D.z,
  `${rDay.partnerChart.D.g}${rDay.partnerChart.D.z} vs ${rFull.partnerChart.D.g}${rFull.partnerChart.D.z}`);
t('dayPair 在三柱模式下仍被计算（夫妻宫不因缺时辰而丢失）',
  typeof rDay.dayPair === 'object' && rDay.dayPair !== null &&
  typeof rDay.dayPair.heZhi === 'boolean');
// 日柱直接关系（dayPair）在两种精度下结构一致
t('dayPair 字段集合在两种精度下一致',
  Object.keys(rDay.dayPair).sort().join(',') === Object.keys(rFull.dayPair).sort().join(','));

// 场景三：三柱模式下不应访问时柱相关数据（不应报错）
// 所有互动条目的 where 不应出现「对方时柱」，证明未触碰对方 H 柱
const allHits = [...rDay.positives, ...rDay.frictions];
const leakH = allHits.some(h => h.where && h.where.includes('对方时柱'));
t('三柱模式下互动条目不涉及对方时柱', !leakH);
// 关键结构在三柱模式下完整、可计算（不抛错）
t('三柱模式下 dayMaster 仍可计算', !!rDay.dm && !!rDay.dm.ss);
t('三柱模式下五行互补仍可计算', !!rDay.comp && !!rDay.comp.text);
t('三柱模式下分数有限且落在合理区间', Number.isFinite(rDay.score) && rDay.score >= 5 && rDay.score <= 97);
// theirWx 仅按三柱统计，不应包含占位时柱的影响（total 不为 0）
t('三柱模式下对方五行分布可计算', rDay.theirWx.total > 0);

// 场景四：UI 标注应明确显示「仅三柱」或类似提示
// precision 字段是 UI 显示「仅三柱」提示的唯一依据：
// full 模式下应为 full，day 模式下应为 day，二者可被 UI 区分
t('full 模式 precision=full', rFull.precision === 'full');
t('day 与 full 的 precision 可区分（UI 据此显示「仅三柱」）',
  rDay.precision === 'day' && rFull.precision === 'full' && rDay.precision !== rFull.precision);
// partnerPillars 长度亦可作为 UI 判定三柱/四柱的辅助依据
t('UI 可据 partnerPillars 长度区分三柱/四柱',
  rDay.partnerPillars.length === 3 && rFull.partnerPillars.length === 4);

console.log(`\n结果： ${pass} 通过 / ${fail} 失败\n`);
process.exit(fail?1:0);
