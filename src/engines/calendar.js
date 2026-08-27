import { SOLAR_TERM_TIMES } from './solar-terms.js';

const JQ_STR="AQMCBQMEBAQFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQMCBQMEBAUFBQYGBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBgkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBAYGBwYIBgkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBAYGBwYIBgkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMDBAQFBAYGBwYIBgkHCgYLBgAFAQMCBQMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBAYGBwYIBgkHCgYLBgAFAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBAMDBAQFBAYGBwYIBgkHCgYLBgAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBAYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCAwMDBAMFBAYFBwUIBgkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCAwMDBAMFBAYFBwUIBQkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCAwMDBAMFAwYFBwUIBQkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkGCgYLBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCAwMDBAMFAwYFBwUIBQkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkGCgYLBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMDBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMDBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMDBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICAwMCBAMFAwYEBwUIBQkGCgULBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICBAMDBAQFBAYFBwYIBgkHCgYLBgAE";

/* 节气查找表缓存：模块内变量，不挂浏览器全局，Node 单测可直接使用 */
let _jqArr=null,_jqMaxYear=0;
function _initJq(){const bin=atob(JQ_STR);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);_jqArr=arr;_jqMaxYear=1900+Math.floor(arr.length/24)-1;}
function solarTermDate(year,n){
  // n: 0=立春 1=惊蛰 2=清明 3=立夏 4=芒种 5=小暑
  //    6=立秋 7=白露 8=寒露 9=立冬 10=大雪 11=小寒（返回 year 当年 1 月的小寒）
  // 寿星通式（21 世纪）：day = INT(Y*0.2422 + C) - INT((Y-1)/4)
  // 注意闰年修正必须用 (diff-1)/4：2000 年本身是闰年，其 2/29 不应计入扣除项，
  // 否则 diff 为 4 的倍数的年份全部会早算一天。
  const M=[2,3,4,5,6,7,8,9,10,11,12,1];
  const D=[3.87,5.63,4.81,5.52,5.678,7.105,7.5,7.646,8.318,7.438,7.18,5.4055];
  const diff=year-2000;
  const day=Math.floor(D[n]+0.2422*diff-Math.floor((diff-1)/4));
  return[M[n],day];
}
function jqDate(y,n){
  // 优先使用项目内置的精确节气时刻表（1900–2101，含时分秒）
  const row=SOLAR_TERM_TIMES[y];
  if(row&&row[n]){
    const p=row[n].split(' ')[0].split('-');
    if(p.length===3)return[Number(p[1]),Number(p[2])];
  }
  // 其次使用 base64 查找表
  if(y>=1900){
    if(!_jqArr)_initJq();
    if(y<=_jqMaxYear){
      const off=((y-1900)*12+n)*2;
      if(off+1<_jqArr.length)return[_jqArr[off]+1,_jqArr[off+1]+1];
    }
  }
  // 超出数据范围时回退到公式估算
  return solarTermDate(y,n);
}
function jqInstant(year,index){
  const row=SOLAR_TERM_TIMES[year];
  if(row&&row[index]){
    // 节气表以中国标准时间（UTC+8）保存，转为统一 UTC 时间比较。
    return new Date(row[index].replace(' ','T')+'+08:00');
  }
  const d=jqDate(year,index);
  if(!d)return null;
  // solarTermDate/jqDate 对 index===11 已返回当年 1 月的小寒日期，这里无需再偏移年份
  return new Date(Date.UTC(year,d[0]-1,d[1],0,0,0)-8*3600000);
}
function birthAsChinaStandardInstant(year,month,day,hour=12,minute=0,second=0){
  return new Date(Date.UTC(year,month-1,day,hour,minute,second)-8*3600000);
}
function getMonthPillar(year,month,day,hour=12,minute=0,second=0,birthInstant=null){
  // 按节气“具体时刻”判断，不再按公历日期零点切换。
  const birth=birthInstant?new Date(birthInstant):birthAsChinaStandardInstant(year,month,day,hour,minute,second);
  const lichun=jqInstant(year,0);
  if(!lichun)return{mi:2,yp:year};
  const beforeLichun=birth<lichun;
  const yp=beforeLichun?year-1:year;
  if(beforeLichun){
    // 立春前的1月出生者，应与当年1月的小寒比较，而非上一年1月的小寒。
    // SOLAR_TERM_TIMES[year][11] 存的就是该年1月的小寒时刻。
    const xiaohan=jqInstant(year,11);
    return{mi:xiaohan&&birth>=xiaohan?11:10,yp};
  }
  let mi=10;
  for(let i=0;i<=10;i++){
    const term=jqInstant(year,i);
    if(term&&birth>=term)mi=i;
    else if(term)break;
  }
  return{mi,yp};
}
function zoneParts(date,tz){
  const f=new Intl.DateTimeFormat('en-CA',{timeZone:tz,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const p=Object.fromEntries(f.formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
  // 某些引擎会把午夜格式化为 24:00，统一成次日 00:00 之前的可比较形式。
  if(p.hour===24)p.hour=0;
  return p;
}
function zoneOffsetMinutes(date,tz){
  const p=zoneParts(date,tz);
  const asUtc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
  return Math.round((asUtc-date.getTime())/60000);
}
function zonedTimeToUtc(y,m,d,hour,minute,second,tz){
  const wall=Date.UTC(y,m-1,d,hour,minute,second);
  let utc=wall;
  // 两次迭代即可处理 IANA 时区的标准时与夏令时偏移。
  for(let i=0;i<3;i++)utc=wall-zoneOffsetMinutes(new Date(utc),tz)*60000;
  return new Date(utc);
}
function equationOfTimeMinutes(y,m,d){
  const start=Date.UTC(y,0,0), cur=Date.UTC(y,m-1,d);
  const doy=Math.floor((cur-start)/86400000);
  const B=2*Math.PI*(doy-1)/365;
  return 229.18*(0.000075+0.001868*Math.cos(B)-0.032077*Math.sin(B)-0.014615*Math.cos(2*B)-0.040849*Math.sin(2*B));
}
function trueSolarTime(date,lon,tz='Asia/Shanghai'){
  const d=new Date(date),p=zoneParts(d,tz);
  // 真太阳时 = UTC + 经度时间 + 均时差；IANA 实际偏移已在 UTC 中处理，
  // 因而不再对 1986—1991 年按月份硬减一小时。
  const correction=(lon*4)+equationOfTimeMinutes(p.year,p.month,p.day);
  return new Date(d.getTime()+correction*60000);
}
function resolveBirthDateTime(y,m,d,hh,mm,useTrueSolar,lon,tz='Asia/Shanghai'){
  const civil=zonedTimeToUtc(y,m,d,hh,mm,0,tz);
  const solar=useTrueSolar&&Number.isFinite(lon)?trueSolarTime(civil,lon,tz):civil;
  const p=useTrueSolar&&Number.isFinite(lon)?{
    year:solar.getUTCFullYear(),month:solar.getUTCMonth()+1,day:solar.getUTCDate(),hour:solar.getUTCHours(),minute:solar.getUTCMinutes()
  }:zoneParts(civil,tz);
  let by=p.year,bm=p.month,bd=p.day,ch=p.hour,cmin=p.minute;
  const totalMin=ch*60+cmin;
  let hourZhi;
  if(totalMin>=23*60){
    hourZhi=0;
    const next=new Date(Date.UTC(by,bm-1,bd+1));by=next.getUTCFullYear();bm=next.getUTCMonth()+1;bd=next.getUTCDate();
  }else if(totalMin<60)hourZhi=0;
  else hourZhi=Math.floor((totalMin-60)/120)+1;
  return{year:by,month:bm,day:bd,hour:ch,minute:cmin,hourZhi,note:useTrueSolar?'已启用真太阳时换算（经度'+lon+'°）':'',instant:civil.getTime(),tz};
}
function getDayPillarIndex(y,m,d){const anchor=new Date(Date.UTC(2000,0,1));const target=new Date(Date.UTC(y,m-1,d));const diff=Math.round((target-anchor)/86400000);return((54+diff)%60+60)%60;}

export { _initJq, solarTermDate, jqDate, jqInstant, getMonthPillar, trueSolarTime, resolveBirthDateTime, getDayPillarIndex };
