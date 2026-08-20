const QD='休门,生门,伤门,杜门,景门,死门,惊门,开门'.split(','),QS='天蓬,天任,天冲,天辅,天英,天芮,天柱,天心,天禽'.split(','),QG='值符,腾蛇,太阴,六合,白虎,玄武,九地,九天'.split(','),QP='坎一宫,坤二宫,震三宫,巽四宫,中五宫,乾六宫,兑七宫,艮八宫,离九宫'.split(',');
function mkQm(b){const monthZhi=b.M.zi;const yangDun=[2,3,4,5,6,7].includes(monthZhi);const juBase=yangDun?(b.dj%9+1):(10-b.dj%9);const ju=((juBase-1)%9)+1;const ps=[];const shiGan=b.H.gi;for(let i=0;i<9;i++){const di=yangDun?(ju-1+i)%8:((ju-1-i)%8+8)%8;const si=yangDun?(ju-1+i*2)%9:((ju-1-i*2)%9+9)%9;ps.push({p:QP[i],d:QD[di],s:QS[si],g:QG[(shiGan+i)%8],cc:i===4});}return{ps,ju,yangDun};}

export { mkQm };
