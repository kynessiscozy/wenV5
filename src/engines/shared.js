const CURR_YEAR=new Date().getFullYear();
const TG='甲乙丙丁戊己庚辛壬癸'.split(''),DZ='子丑寅卯辰巳午未申酉戌亥'.split(''),SX='鼠牛虎兔龙蛇马羊猴鸡狗猪'.split(''),WX='木火土金水'.split('');
const GW={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const ZW={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const ZC={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','庚','戊'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
/* 五行色改用 CSS 变量，随明暗主题自动调整对比度（见 theme-claude.css） */
const WC={木:'var(--wx-mu)',火:'var(--wx-huo)',土:'var(--wx-tu)',金:'var(--wx-jin)',水:'var(--wx-shui)'};
const NY=['海中金','海中金','炉中火','炉中火','大林木','大林木','路旁土','路旁土','剑锋金','剑锋金','山头火','山头火','涧下水','涧下水','城头土','城头土','白蜡金','白蜡金','杨柳木','杨柳木','泉中水','泉中水','屋上土','屋上土','霹雳火','霹雳火','松柏木','松柏木','长流水','长流水','沙中金','沙中金','山下火','山下火','平地木','平地木','壁上土','壁上土','金箔金','金箔金','覆灯火','覆灯火','天河水','天河水','大驿土','大驿土','钗钏金','钗钏金','桑柘木','桑柘木','大溪水','大溪水','沙中土','沙中土','天上火','天上火','石榴木','石榴木','大海水','大海水'];

/* 唯一的五行生克与干支关系表，供排盘、流日和合盘共用。 */
const WX_SHENG=Object.freeze({木:'火',火:'土',土:'金',金:'水',水:'木'});
const WX_KE=Object.freeze({木:'土',火:'金',土:'水',金:'木',水:'火'});
const WX_MOTHER=Object.freeze({木:'水',火:'木',土:'火',金:'土',水:'金'});
const WX_OVERCOMER=Object.freeze({木:'金',火:'水',土:'木',金:'火',水:'土'});
const GAN_HE=Object.freeze({甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'});
const ZHI_HE=Object.freeze({子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'});
const ZHI_CHONG=Object.freeze({子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'});
const ZHI_HAI=Object.freeze({子:'未',未:'子',丑:'午',午:'丑',寅:'巳',巳:'寅',卯:'辰',辰:'卯',申:'亥',亥:'申',酉:'戌',戌:'酉'});

/* 六十甲子的天干、地支序号须同奇偶；非法组合不生成纳音。 */
function getNayin(ganzhi) {
  if (typeof ganzhi !== 'string' || ganzhi.length !== 2) return '';
  const g = TG.indexOf(ganzhi[0]), z = DZ.indexOf(ganzhi[1]);
  if (g < 0 || z < 0 || g % 2 !== z % 2) return '';
  const index = ((6 * g - 5 * z) % 60 + 60) % 60;
  return NY[index] || '';
}

/* —— 十神表（修正版：按"五行生克 + 阴阳同异"严格生成）—— */
const SS=(function(){
  const yin={甲:0,丙:0,戊:0,庚:0,壬:0,乙:1,丁:1,己:1,辛:1,癸:1}; // 0=阳 1=阴
  const SH=WX_SHENG, KE=WX_KE, BS=WX_MOTHER, BK=WX_OVERCOMER;
  const out={};
  TG.forEach(d=>{
    out[d]={};
    const dw=GW[d], dy=yin[d];
    TG.forEach(o=>{
      const ow=GW[o], oy=yin[o], same=(dy===oy);
      let r='';
      if(dw===ow)      r= same?'比肩':'劫财';
      else if(SH[dw]===ow) r= same?'食神':'伤官';
      else if(KE[dw]===ow) r= same?'偏财':'正财';
      else if(BK[dw]===ow) r= same?'七杀':'正官';
      else if(BS[dw]===ow) r= same?'偏印':'正印';
      out[d][o]=r;
    });
  });
  return out;
})();

export { CURR_YEAR, TG, DZ, SX, WX, GW, ZW, ZC, WC, NY, SS, getNayin,
  WX_SHENG, WX_KE, WX_MOTHER, WX_OVERCOMER, GAN_HE, ZHI_HE, ZHI_CHONG, ZHI_HAI };
