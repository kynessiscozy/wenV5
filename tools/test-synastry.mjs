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

console.log(`\n结果： ${pass} 通过 / ${fail} 失败\n`);
process.exit(fail?1:0);
