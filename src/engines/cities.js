const CD={},CG=[
{g:'直辖市',c:[{i:'beijing',n:'北京',p:'bj',o:116.4,a:39.9},{i:'shanghai',n:'上海',p:'sh',o:121.5,a:31.2},{i:'tianjin',n:'天津',p:'tj',o:117.2,a:39.1},{i:'chongqing',n:'重庆',p:'cq',o:106.6,a:29.6}]},
{g:'河北',c:[{i:'shijiazhuang',n:'石家庄',p:'sjz',o:114.5,a:38},{i:'tangshan',n:'唐山',p:'ts',o:118.2,a:39.6},{i:'baoding',n:'保定',p:'bd',o:115.5,a:38.9},{i:'qinhuangdao',n:'秦皇岛',p:'qhd',o:119.6,a:39.9}]},
{g:'辽宁',c:[{i:'shenyang',n:'沈阳',p:'sy',o:123.4,a:41.8},{i:'dalian',n:'大连',p:'dl',o:121.6,a:38.9}]},
{g:'吉林',c:[{i:'changchun',n:'长春',p:'cc',o:125.3,a:43.9}]},
{g:'黑龙江',c:[{i:'haerbin',n:'哈尔滨',p:'heb',o:126.6,a:45.8}]},
{g:'山西',c:[{i:'taiyuan',n:'太原',p:'ty',o:112.6,a:37.9}]},
{g:'内蒙古',c:[{i:'huhehaote',n:'呼和浩特',p:'hhht',o:111.8,a:40.8}]},
{g:'江苏',c:[{i:'nanjing',n:'南京',p:'nj',o:118.8,a:32.1},{i:'suzhou',n:'苏州',p:'sz',o:120.6,a:31.3},{i:'wuxi',n:'无锡',p:'wx',o:120.3,a:31.6},{i:'changzhou',n:'常州',p:'cz',o:120,a:31.8},{i:'nantong',n:'南通',p:'nt',o:120.9,a:32},{i:'xuzhou',n:'徐州',p:'xz',o:117.3,a:34.3},{i:'yangzhou',n:'扬州',p:'yz',o:119.4,a:32.4}]},
{g:'浙江',c:[{i:'hangzhou',n:'杭州',p:'hz',o:120.2,a:30.3},{i:'ningbo',n:'宁波',p:'nb',o:121.6,a:29.9},{i:'wenzhou',n:'温州',p:'wz',o:120.7,a:28},{i:'jiaxing',n:'嘉兴',p:'jx',o:120.8,a:30.8},{i:'shaoxing',n:'绍兴',p:'sx',o:120.6,a:30},{i:'jinhua',n:'金华',p:'jh',o:119.7,a:29.1}]},
{g:'安徽',c:[{i:'hefei',n:'合肥',p:'hf',o:117.3,a:31.9},{i:'wuhu',n:'芜湖',p:'wh',o:118.4,a:31.3}]},
{g:'福建',c:[{i:'fuzhou',n:'福州',p:'fz',o:119.3,a:26.1},{i:'xiamen',n:'厦门',p:'xm',o:118.1,a:24.5},{i:'quanzhou',n:'泉州',p:'qz',o:118.7,a:24.9}]},
{g:'江西',c:[{i:'nanchang',n:'南昌',p:'nc',o:115.9,a:28.7}]},
{g:'山东',c:[{i:'jinan',n:'济南',p:'jn',o:117,a:36.7},{i:'qingdao',n:'青岛',p:'qd',o:120.4,a:36.1},{i:'yantai',n:'烟台',p:'yt',o:121.5,a:37.5},{i:'weihai',n:'威海',p:'wh',o:122.1,a:37.5}]},
{g:'河南',c:[{i:'zhengzhou',n:'郑州',p:'zz',o:113.7,a:34.8},{i:'luoyang',n:'洛阳',p:'ly',o:112.5,a:34.6},{i:'kaifeng',n:'开封',p:'kf',o:114.3,a:34.8}]},
{g:'湖北',c:[{i:'wuhan',n:'武汉',p:'wh',o:114.3,a:30.6},{i:'yichang',n:'宜昌',p:'yc',o:111.3,a:30.7}]},
{g:'湖南',c:[{i:'changsha',n:'长沙',p:'cs',o:113,a:28.2},{i:'hengyang',n:'衡阳',p:'hy',o:112.6,a:26.9}]},
{g:'广东',c:[{i:'guangzhou',n:'广州',p:'gz',o:113.3,a:23.1},{i:'shenzhen',n:'深圳',p:'sz',o:114.1,a:22.6},{i:'dongguan',n:'东莞',p:'dg',o:113.8,a:23.1},{i:'foshan',n:'佛山',p:'fs',o:113.1,a:23},{i:'zhuhai',n:'珠海',p:'zh',o:113.6,a:22.3},{i:'huizhou',n:'惠州',p:'hz',o:114.4,a:23.1},{i:'shantou',n:'汕头',p:'st',o:116.7,a:23.4}]},
{g:'广西',c:[{i:'nanning',n:'南宁',p:'nn',o:108.4,a:22.8},{i:'guilin',n:'桂林',p:'gl',o:110.3,a:25.3}]},
{g:'海南',c:[{i:'haikou',n:'海口',p:'hk',o:110.4,a:20},{i:'sanya',n:'三亚',p:'sy',o:109.5,a:18.3}]},
{g:'四川',c:[{i:'chengdu',n:'成都',p:'cd',o:104.1,a:30.7},{i:'mianyang',n:'绵阳',p:'my',o:104.7,a:31.5}]},
{g:'贵州',c:[{i:'guiyang',n:'贵阳',p:'gy',o:106.7,a:26.7}]},
{g:'云南',c:[{i:'kunming',n:'昆明',p:'km',o:102.8,a:25},{i:'dali',n:'大理',p:'dl',o:100.2,a:25.6},{i:'lijiang',n:'丽江',p:'lj',o:100.2,a:26.9}]},
{g:'陕西',c:[{i:'xian',n:'西安',p:'xa',o:108.9,a:34.3}]},
{g:'甘肃',c:[{i:'lanzhou',n:'兰州',p:'lz',o:103.8,a:36.1}]},
{g:'新疆',c:[{i:'wulumuqi',n:'乌鲁木齐',p:'wlmq',o:87.6,a:43.8}]},
{g:'港澳台',c:[{i:'hongkong',n:'香港',p:'xg',o:114.2,a:22.3},{i:'macau',n:'澳门',p:'am',o:113.5,a:22.2},{i:'taipei',n:'台北',p:'tb',o:121.6,a:25},{i:'kaohsiung',n:'高雄',p:'gx',o:120.3,a:22.6}]},
{g:'东亚',c:[{i:'tokyo',n:'东京',p:'dj',o:139.7,a:35.7},{i:'osaka',n:'大阪',p:'db',o:135.5,a:34.7},{i:'seoul',n:'首尔',p:'se',o:127,a:37.6},{i:'kyoto',n:'京都',p:'jd',o:135.8,a:35},{i:'busan',n:'釜山',p:'fs',o:129.1,a:35.2},{i:'fukuoka',n:'福冈',p:'fg',o:130.4,a:33.6}]},
{g:'东南亚',c:[{i:'singapore',n:'新加坡',p:'xjp',o:103.8,a:1.4},{i:'bangkok',n:'曼谷',p:'mg',o:100.5,a:13.8},{i:'kualalumpur',n:'吉隆坡',p:'jlp',o:101.7,a:3.1},{i:'jakarta',n:'雅加达',p:'yjd',o:106.8,a:-6.2},{i:'hanoi',n:'河内',p:'hn',o:105.8,a:21},{i:'hochiminh',n:'胡志明',p:'hzm',o:106.7,a:10.8},{i:'manila',n:'马尼拉',p:'mnl',o:121,a:14.6}]},
{g:'欧美大洋洲',c:[{i:'london',n:'伦敦',p:'ld',o:-0.1,a:51.5},{i:'paris',n:'巴黎',p:'bl',o:2.4,a:48.9},{i:'berlin',n:'柏林',p:'bl',o:13.4,a:52.5},{i:'rome',n:'罗马',p:'lm',o:12.5,a:41.9},{i:'madrid',n:'马德里',p:'mdl',o:-3.7,a:40.4},{i:'newyork',n:'纽约',p:'ny',o:-74,a:40.7},{i:'losangeles',n:'洛杉矶',p:'lsj',o:-118.2,a:34.1},{i:'sanfrancisco',n:'旧金山',p:'jjs',o:-122.4,a:37.8},{i:'chicago',n:'芝加哥',p:'zjg',o:-87.6,a:41.9},{i:'toronto',n:'多伦多',p:'dld',o:-79.4,a:43.7},{i:'vancouver',n:'温哥华',p:'wgh',o:-123.1,a:49.3},{i:'sydney',n:'悉尼',p:'xn',o:151.2,a:-33.9},{i:'melbourne',n:'墨尔本',p:'meb',o:145,a:-37.8},{i:'dubai',n:'迪拜',p:'db',o:55.3,a:25.2},{i:'auckland',n:'奥克兰',p:'akl',o:174.7,a:-36.9},{i:'moscow',n:'莫斯科',p:'msk',o:37.6,a:55.8},{i:'istanbul',n:'伊斯坦布尔',p:'ystb',o:28.9,a:41}]}
];
CG.forEach(g=>g.c.forEach(c=>{CD[c.i]={n:c.n,p:c.p,o:c.o,a:c.a,g:g.g}}));

export { CD, CG };
