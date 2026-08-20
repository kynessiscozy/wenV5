import { GW } from './shared.js';

function mkSi(b){const mz=b.M.z;let s,se,sp,season;if('寅卯'.includes(mz)){s='春';se='木';sp='生发';season='春'}else if(mz==='辰'){s='春季末';se='土';sp='转化';season='春'}else if('巳午'.includes(mz)){s='夏';se='火';sp='旺盛';season='夏'}else if(mz==='未'){s='夏季末';se='土';sp='蕴藏';season='夏'}else if('申酉'.includes(mz)){s='秋';se='金';sp='收敛';season='秋'}else if(mz==='戌'){s='秋季末';se='土';sp='肃杀';season='秋'}else if('亥子'.includes(mz)){s='冬';se='水';sp='潜藏';season='冬'}else{s='冬季末';se='土';sp='待发';season='冬'}const W={春:{木:'旺',火:'相',土:'死',金:'囚',水:'休'},夏:{火:'旺',土:'相',金:'死',水:'囚',木:'休'},秋:{金:'旺',水:'相',木:'死',火:'囚',土:'休'},冬:{水:'旺',木:'相',火:'死',土:'囚',金:'休'}};let st=W[season][GW[b.D.g]];if('辰戌丑未'.includes(mz)&&GW[b.D.g]==='土')st='旺';return{s,se,sp,st,season};}

export { mkSi };
