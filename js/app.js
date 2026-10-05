'use strict';
const $=s=>document.querySelector(s),svg=$('#cv'),NS='http://www.w3.org/2000/svg';
const LS=(k,d)=>{try{return JSON.parse(localStorage[k])||d}catch{return d}};
const T={terminal:['Начало','#a6e3a1'],process:['Действие','#89b4fa'],decision:['Условие?','#fab387'],io:['Ввод/Вывод','#cba6f7'],data:['Данные','#94e2d5'],sub:['Подпроцесс','#f9e2af'],note:['Заметка','#f5c2e7'],doc:['Документ','#f2cdcd'],prep:['Подготовка','#b4befe'],conn:['A','#bac2de'],manual:['Ввод','#74c7ec']};
const TA={start:'terminal',end:'terminal',stop:'terminal',input:'io',output:'io',database:'data',db:'data',condition:'decision',if:'decision',subprocess:'sub',document:'doc',preparation:'prep',connector:'conn',manual_input:'manual',comment:'note'};
const NAMES={terminal:'Старт/Конец',process:'Процесс',decision:'Условие',io:'Ввод/вывод',data:'Данные',sub:'Подпроцесс',note:'Заметка',doc:'Документ',prep:'Подготовка',conn:'Соединитель',manual:'Ручной ввод'},ICON={terminal:'⬭',process:'▭',decision:'◇',io:'▱',data:'🛢',sub:'⊟',note:'🗒',doc:'📃',prep:'⬡',conn:'◯',manual:'⌨'};
const PAL={dark:{bg:'#1e1e2e',dot:'#3a3c52',edge:'#89b4fa',txt:'#cdd6f4'},light:{bg:'#f6f7fb',dot:'#cdd2e2',edge:'#3b5bdb',txt:'#1f2430'},blue:{bg:'#0b3d91',dot:'#3b6bc2',edge:'#ffffff',txt:'#ffffff'},paper:{bg:'#fbf6e9',dot:'#ded3b5',edge:'#5c4a2a',txt:'#2b2315'},none:{bg:'transparent',dot:'#8886',edge:'#5c6bc0',txt:'#333333'}};
const BGN={dark:'Тёмный',light:'Светлый',blue:'Синька',paper:'Бумага',none:'Прозрачный'};
const VER='2.6',AUTHOR={tg:'https://t.me/ASV_prod',gh:'https://github.com/smol0901-jpg',bug:'https://github.com/smol0901-jpg/block-on-main/issues/new'};
let S={nodes:[],edges:[],groups:[],cam:{x:60,y:40,k:1}},cfg={bg:'dark',snap:true,sig:true,sc:2,route:'curve',map:true,grid:true,guides:true,depth:true,flow:false,splash:true,nocross:false,noover:false,rad:10,gs:20,trace:true,...LS('ffCfg',{})},selG=null,MC=new Set(),MM=null,mmDrag=false;
const ANIM=new Map(),NANIM=new Map(),DUR=420,REDUCE=matchMedia('(prefers-reduced-motion: reduce)').matches;let LIFT=0,VEL={x:0,y:0},lastCamT=0,RB=null,full=true,rk0=1,tkOn=false,animOn=false,NCK='',NCR=new Map(),NCX=[],NCV=0,NCON=false,NCW=false,LP=null;
const DASH={solid:'',dashed:'9 6',dotted:'0.1 7',dashdot:'12 6 0.1 6'},hex6=c=>{c=String(c||'');if(/^#[0-9a-f]{3}$/i.test(c))c='#'+[...c.slice(1)].map(x=>x+x).join('');return/^#[0-9a-f]{6}$/i.test(c)?c.toLowerCase():null},pick=(o,ks)=>Object.fromEntries(ks.filter(k=>o[k]!=null&&o[k]!=='').map(k=>[k,o[k]]));
let sel=new Set(),selE=null,tool='select',linkFrom=null,hist=[],hi=-1,clip=null,ov='',raf=0,space=false,last={t:0,id:0},NM=new Map(),g=null;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const G=v=>cfg.snap?Math.round(v/(cfg.gs||20))*(cfg.gs||20):Math.round(v),N=id=>S.nodes.find(n=>n.id==id),stamp=()=>new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
const toast=m=>{const t=$('#toast');t.textContent=m;try{t.showPopover&&!t.matches(':popover-open')&&t.showPopover()}catch{}t.classList.add('show');clearTimeout(t._);t._=setTimeout(()=>{t.classList.remove('show');setTimeout(()=>{try{t.hidePopover&&t.hidePopover()}catch{}},250)},2600)};
const ink=c=>{c=c.replace('#','');if(c.length==3)c=[...c].map(x=>x+x).join('');const[r,g,b]=[0,2,4].map(i=>parseInt(c.substr(i,2),16));return(r*299+g*587+b*114)/1000>140?'#1e1e2e':'#ffffff'};
const nid=p=>{let i=1;const u=new Set([...S.nodes,...S.edges,...S.groups].map(o=>o.id));while(u.has(p+i))i++;return p+i};
/* ---------- модель ---------- */
const wrap=(t,m=16)=>{const o=[];String(t).split('\n').forEach(p=>{let l='';p.split(' ').forEach(w=>{if(l&&(l+' '+w).length>m){o.push(l);l=w}else l=l?l+' '+w:w});o.push(l)});return o};
function sz(n,fs){const cw=fs*.6,lh=Math.round(fs*1.36),dc=n.type=='decision'?.62:1,m=n.sw?Math.max(3,Math.floor((n.sw*dc-26)/cw)):16,L=wrap(n.text,m),mx=Math.max(...L.map(s=>s.length),3);
let w=Math.max(120,mx*cw*1.03+36),h=Math.max(56,L.length*lh+26);if(n.type=='decision'){w*=1.35;h=Math.max(84,h*1.5)}if(n.type=='io'||n.type=='prep')w+=24;if(n.type=='manual')h+=8;
if(n.type=='conn')w=h=Math.max(48,Math.round(mx*cw+30));
const aw=w,ah=h;if(n.sw)w=Math.max(60,n.sw);if(n.sh)h=Math.max(36,n.sh);if(n.type=='conn'&&(n.sw||n.sh))w=h=Math.max(n.sw||0,n.sh||0,40);
return{w:Math.round(w),h:Math.round(h),L,lh,ok:(!n.sw||w>=aw-1)&&(!n.sh||h>=ah-1)}}
function dim(n){let fs=n.fs||14,r=sz(n,fs);if(n.sw||n.sh){while(!r.ok&&fs>9){fs--;r=sz(n,fs)}}n.w=r.w;n.h=r.h;n.L=r.L;n.lh=r.lh;n.fe=fs}
const dimAll=()=>S.nodes.forEach(dim);
function addNode(type,x,y,text,color){const n={id:nid('n'),type,text:text??T[type][0],x:G(x),y:G(y)};if(color)n.color=color;dim(n);S.nodes.push(n);if(!REDUCE){NANIM.set(n.id,performance.now());animKick()}return n}
function addEdge(a,b,label){if(!a||!b||a==b||S.edges.some(e=>e.from==a&&e.to==b))return null;const e={id:nid('e'),from:a,to:b};if(label)e.label=label;S.edges.push(e);if(!REDUCE){ANIM.set(e.id,performance.now());animKick()}return e}
const ser=c=>({format:'flowforge',version:'2.6',...(c?{camera:{x:Math.round(S.cam.x),y:Math.round(S.cam.y),zoom:+S.cam.k.toFixed(3),...(S.cam.r?{rot:+S.cam.r.toFixed(4)}:{})}}:{}),nodes:S.nodes.map(n=>({id:n.id,type:n.type,text:n.text,x:n.x,y:n.y,...pick(n,['color','fs','sw','sh','lock','bd'])})),edges:S.edges.map(e=>({id:e.id,from:e.from,to:e.to,...pick(e,['label','route','dash','arrow','color','width','pts'])})),groups:S.groups.map(({id,title,color,nodes})=>({id,title,color,nodes}))});
let PJ=LS('ffProj',{});const pname=()=>(PJ[cfg.pid]&&PJ[cfg.pid].n)||'Без названия',slug=s=>String(s).trim().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'flowforge';
let svT=0;const save=()=>{clearTimeout(svT);svT=setTimeout(saveNow,500)};addEventListener('pagehide',()=>saveNow());document.addEventListener('visibilitychange',()=>{if(document.hidden)saveNow()});
function saveNow(){try{if(!cfg.pid){cfg.pid='p'+Date.now().toString(36);cfgSave()}const o=PJ[cfg.pid];PJ[cfg.pid]={n:o?o.n:'Схема '+(Object.keys(PJ).length+1),t:Date.now(),d:ser(true)};localStorage.ffProj=JSON.stringify(PJ)}catch{}}
const cfgSave=()=>{try{localStorage.ffCfg=JSON.stringify(cfg)}catch{}};
function commit(){const s=JSON.stringify(ser());if(hist[hi]===s)return;hist=hist.slice(0,hi+1);hist.push(s);if(hist.length>100)hist.shift();hi=hist.length-1;save();draw();insp()}
function restore(s){const d=JSON.parse(s);S.nodes=d.nodes;S.edges=d.edges;S.groups=d.groups||[];dimAll();sel=new Set([...sel].filter(i=>N(i)));if(selE&&!S.edges.some(e=>e.id==selE))selE=null;if(selG&&!S.groups.some(g=>g.id==selG))selG=null;save();draw();insp()}
const undo=()=>{if(hi>0){hi--;restore(hist[hi])}},redo=()=>{if(hi<hist.length-1){hi++;restore(hist[hi])}};
function norm(d){if(!d||!Array.isArray(d.nodes))throw Error('нет массива "nodes"');const m=new Map(),seen=new Set();
const nodes=d.nodes.map((r,i)=>{r=r||{};let id=r.id!=null?String(r.id):'n'+(i+1);const o=id;while(seen.has(id))id+='_';seen.add(id);if(!m.has(o))m.set(o,id);
const ty0=TA[r.type]||r.type,type=T[ty0]?ty0:'process',xy=r.x!=null&&r.y!=null&&isFinite(+r.x)&&isFinite(+r.y),n={id,type,text:String(r.text??T[type][0]),x:xy?+r.x:NaN,y:xy?+r.y:NaN};const hc=hex6(r.color);if(hc)n.color=hc;if(+r.fs>=10&&+r.fs<=48&&+r.fs!=14)n.fs=+r.fs;if(+r.sw>=40)n.sw=+r.sw;if(+r.sh>=30)n.sh=+r.sh;if(r.lock===true)n.lock=true;if(['dashed','dotted','none','thick','thin'].includes(r.bd))n.bd=r.bd;return n});
const RM={curve:'curve',smooth:'curve',bezier:'curve',ortho:'ortho',orthogonal:'ortho',angle:'ortho',angular:'ortho',line:'line',straight:'line'},DM={dashed:'dashed',dash:'dashed',dotted:'dotted',dot:'dotted',dashdot:'dashdot'},pairs=new Set(),edges=[];
(Array.isArray(d.edges)?d.edges:[]).forEach(r=>{const a=m.get(String(r?.from)),b=m.get(String(r?.to));if(a&&b&&a!=b&&!pairs.has(a+'>'+b)){pairs.add(a+'>'+b);const e={id:'e'+(edges.length+1),from:a,to:b};if(r.label)e.label=String(r.label);if(RM[r.route])e.route=RM[r.route];if(DM[r.dash])e.dash=DM[r.dash];if(r.arrow=='both'||r.arrow=='none')e.arrow=r.arrow;const c=hex6(r.color);if(c)e.color=c;if(+r.width>=1&&+r.width<=6&&+r.width!=2)e.width=+r.width;if(Array.isArray(r.pts)){const Q=r.pts.filter(v=>Array.isArray(v)&&isFinite(+v[0])&&isFinite(+v[1])).slice(0,12).map(v=>[+v[0],+v[1]]);if(Q.length)e.pts=Q}edges.push(e)}});
const used=new Set(),groups=[];(Array.isArray(d.groups)?d.groups:[]).forEach(r=>{const ids=(Array.isArray(r?.nodes)?r.nodes:[]).map(x=>m.get(String(x))).filter(x=>x&&!used.has(x));if(!ids.length)return;ids.forEach(x=>used.add(x));groups.push({id:'g'+(groups.length+1),title:String(r.title??'Группа'),color:hex6(r.color)||'#89b4fa',nodes:ids})});
return{nodes,edges,groups,auto:nodes.some(n=>isNaN(n.x))}}
function setDoc(r){const{nodes,edges,groups,auto}=norm(r),c=r.camera;S.nodes=nodes;S.edges=edges;S.groups=groups;dimAll();sel=new Set();selE=null;selG=null;linkFrom=null;
if(auto)layout('TB',true);const ok=c&&isFinite(+c.x)&&isFinite(+c.y)&&+c.zoom>0;if(ok&&!auto)S.cam={x:+c.x,y:+c.y,k:Math.max(.1,Math.min(4,+c.zoom)),r:+c.rot||0};commit();if(!ok||auto){S.cam.r=0;fit()}}
function demo(){S.nodes=[];S.edges=[];S.groups=[];sel=new Set();selG=null;const a=addNode('terminal',340,40,'Начало'),b=addNode('io',320,160,'Ввод A, B'),c=addNode('decision',300,280,'A > B?'),d=addNode('process',600,440,'Max = A'),e=addNode('process',60,440,'Max = B'),f=addNode('terminal',340,600,'Конец');
addEdge(a.id,b.id);addEdge(b.id,c.id);addEdge(c.id,d.id,'Да');addEdge(c.id,e.id,'Нет');addEdge(d.id,f.id);addEdge(e.id,f.id);commit();fit()}
function layout(dir='TB',quiet){const nd=S.nodes;if(!nd.length)return;
if(window.dagre){const gr=new dagre.graphlib.Graph();gr.setGraph({rankdir:dir,nodesep:50,ranksep:70});gr.setDefaultEdgeLabel(()=>({}));nd.forEach(n=>gr.setNode(n.id,{width:n.w,height:n.h}));S.edges.forEach(e=>gr.setEdge(e.from,e.to));dagre.layout(gr);nd.forEach(n=>{const p=gr.node(n.id);n.x=G(p.x-n.w/2);n.y=G(p.y-n.h/2)})}
else simpleLayout(dir);
if(!quiet){commit();fit()}}
/* ---------- геометрия и рендер ---------- */
const pt=(n,s)=>s=='r'?[n.x+n.w,n.y+n.h/2]:s=='l'?[n.x,n.y+n.h/2]:s=='b'?[n.x+n.w/2,n.y+n.h]:[n.x+n.w/2,n.y];
const side=(a,b)=>{const dx=b.x+b.w/2-a.x-a.w/2,dy=b.y+b.h/2-a.y-a.h/2;return Math.abs(dx)*a.h>Math.abs(dy)*a.w?(dx>0?'r':'l'):(dy>0?'b':'t')},NV={r:[1,0],l:[-1,0],b:[0,1],t:[0,-1]};

const DIRS=[[1,0],[-1,0],[0,1],[0,-1]],RC=new Map();
function mid(pts){let t=0;const sg=[];for(let i=1;i<pts.length;i++){const l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);sg.push(l);t+=l}let h=t/2;for(let i=0;i<sg.length;i++){if(h<=sg[i]){const k=sg[i]?h/sg[i]:0;return[pts[i][0]+(pts[i+1][0]-pts[i][0])*k,pts[i][1]+(pts[i+1][1]-pts[i][1])*k]}h-=sg[i]}return pts[0]}
function rpath(pts,r=(cfg.rad??10)){let d=`M${pts[0]}`;for(let i=1;i<pts.length-1;i++){const a=pts[i-1],b=pts[i],c=pts[i+1],l1=Math.hypot(b[0]-a[0],b[1]-a[1]),l2=Math.hypot(c[0]-b[0],c[1]-b[1]),k=Math.min(r,l1/2,l2/2),p1=[b[0]+(a[0]-b[0])/l1*k,b[1]+(a[1]-b[1])/l1*k],p2=[b[0]+(c[0]-b[0])/l2*k,b[1]+(c[1]-b[1])/l2*k];d+=`L${p1}Q${b} ${p2}`}return d+`L${pts[pts.length-1]}`}
const simp=pts=>{const o=[pts[0]];for(let i=1;i<pts.length-1;i++){const a=o[o.length-1],b=pts[i],c=pts[i+1];if(a[0]==b[0]&&a[1]==b[1])continue;if((a[0]==b[0]&&b[0]==c[0])||(a[1]==b[1]&&b[1]==c[1]))continue;o.push(b)}o.push(pts[pts.length-1]);return o};
function hPush(h,f,v){h.push([f,v]);let i=h.length-1;while(i>0){const p=(i-1)>>1;if(h[p][0]<=h[i][0])break;[h[p],h[i]]=[h[i],h[p]];i=p}}
function hPop(h){const t=h[0],l=h.pop();if(h.length){h[0]=l;let i=0;for(;;){const a=2*i+1,b=a+1;let m=i;if(a<h.length&&h[a][0]<h[m][0])m=a;if(b<h.length&&h[b][0]<h[m][0])m=b;if(m==i)break;[h[m],h[i]]=[h[i],h[m]];i=m}}return t}
/* Угловая трасса: A* по сетке из линий-границ блоков; обходит любые блоки, штраф за повороты */
function route(a,b,s1,s2,p,q,av){
 const ST=24,MG=16,p1=[p[0]+NV[s1][0]*ST,p[1]+NV[s1][1]*ST],q1=[q[0]+NV[s2][0]*ST,q[1]+NV[s2][1]*ST];
 const x0=Math.min(p1[0],q1[0])-260,x1=Math.max(p1[0],q1[0])+260,y0=Math.min(p1[1],q1[1])-260,y1=Math.max(p1[1],q1[1])+260;
 const ob=S.nodes.filter(n=>n.x+n.w+MG>x0&&n.x-MG<x1&&n.y+n.h+MG>y0&&n.y-MG<y1).map(n=>[n.x-MG,n.y-MG,n.x+n.w+MG,n.y+n.h+MG]);
 const key=s1+s2+'|'+p1+'|'+q1+'|'+ob.join(';');let r=av?null:RC.get(key);if(r)return r;const avs=av?av.filter(s=>s[2]>=x0&&s[0]<=x1&&s[3]>=y0&&s[1]<=y1):[];
 const uq=(v,lo,hi)=>[...new Set(v.filter(x=>x>=lo&&x<=hi))].sort((m,n)=>m-n);
 const xs=uq([p1[0],q1[0],(p1[0]+q1[0])/2,x0,x1,...ob.flatMap(o=>[o[0],o[2]]),...avs.flatMap(s=>[s[0],s[2]])],x0,x1),ys=uq([p1[1],q1[1],(p1[1]+q1[1])/2,y0,y1,...ob.flatMap(o=>[o[1],o[3]]),...avs.flatMap(s=>[s[1],s[3]])],y0,y1);
 const nx=xs.length,ny=ys.length,ix=new Map(xs.map((v,i)=>[v,i])),iy=new Map(ys.map((v,i)=>[v,i])),si=ix.get(p1[0]),sj=iy.get(p1[1]),ti=ix.get(q1[0]),tj=iy.get(q1[1]);
 const hO=new Set(),vO=new Set();avs.forEach(s=>{if(s[1]==s[3]){const j=iy.get(s[1]),lo=ix.get(s[0]),hi=ix.get(s[2]);if(j===undefined||lo===undefined||hi===undefined)return;for(let i=lo;i<hi;i++)hO.add(i*ny+j)}else{const i=ix.get(s[0]),lo=iy.get(s[1]),hi=iy.get(s[3]);if(i===undefined||lo===undefined||hi===undefined)return;for(let j=lo;j<hi;j++)vO.add(i*ny+j)}});
 const pen=(i,j,ni,nj,nd)=>{let c=0;if(nd<2){if(hO.has(Math.min(i,ni)*ny+j))c+=400;if(vO.has(ni*ny+nj-1)&&vO.has(ni*ny+nj))c+=800}else{if(vO.has(i*ny+Math.min(j,nj)))c+=400;if(hO.has((ni-1)*ny+nj)&&hO.has(ni*ny+nj))c+=800}return c};
 const inside=(x,y)=>{for(const o of ob)if(x>o[0]&&x<o[2]&&y>o[1]&&y<o[3])return true;return false},bc=new Int8Array(nx*ny).fill(-1);
 const blocked=(i,j)=>{const k=i*ny+j;return bc[k]>=0?bc[k]:(bc[k]=inside(xs[i],ys[j])?1:0)};
 const d0=DIRS.findIndex(d=>d[0]==NV[s1][0]&&d[1]==NV[s1][1]),gd=DIRS.findIndex(d=>d[0]==-NV[s2][0]&&d[1]==-NV[s2][1]);
 const dist=new Float64Array(nx*ny*4).fill(Infinity),par=new Int32Array(nx*ny*4).fill(-1),H=[],hh=(i,j)=>Math.abs(xs[i]-xs[ti])+Math.abs(ys[j]-ys[tj]);
 const st0=(si*ny+sj)*4+d0;dist[st0]=0;hPush(H,hh(si,sj),st0);let end=-1,pops=0;
 while(H.length&&pops++<40000){const s=hPop(H)[1],d=s&3,c=s>>2,i=(c/ny)|0,j=c%ny,g=dist[s];
  if(i==ti&&j==tj){end=s;break}
  for(let nd=0;nd<4;nd++){if((nd^1)==d)continue;const ni=i+DIRS[nd][0],nj=j+DIRS[nd][1];if(ni<0||nj<0||ni>=nx||nj>=ny)continue;const goal=ni==ti&&nj==tj;if(!goal&&blocked(ni,nj))continue;
   if(inside((xs[i]+xs[ni])/2,(ys[j]+ys[nj])/2))continue;
   let cost=g+Math.abs(xs[ni]-xs[i])+Math.abs(ys[nj]-ys[j])+(nd!=d?40:0)+(goal&&nd!=gd?40:0);if(avs.length)cost+=pen(i,j,ni,nj,nd);const ns=(ni*ny+nj)*4+nd;if(cost<dist[ns]){dist[ns]=cost;par[ns]=s;hPush(H,cost+hh(ni,nj),ns)}}}
 let pts;
 if(end>=0){const path=[];for(let s=end;s>=0;s=par[s]){const c=s>>2;path.push([xs[(c/ny)|0],ys[c%ny]])}path.reverse();pts=[p,...path,q]}
 else pts=[p,p1,(s1=='r'||s1=='l')?[q1[0],p1[1]]:[p1[0],q1[1]],q1,q];
 r=simp(pts);if(!av){if(RC.size>1500)RC.clear();RC.set(key,r)}return r}
const GC=new Map();let NSIG=0;const nsig=()=>{let h=S.nodes.length;for(const n of S.nodes)h=(h*31+n.x*7+n.y*13+n.w*17+n.h*19)%2147483647;return h};
function curveVia(A,s1,s2){const n=A.length,m=[],L0=Math.hypot(A[1][0]-A[0][0],A[1][1]-A[0][1])*.8,L1=Math.hypot(A[n-1][0]-A[n-2][0],A[n-1][1]-A[n-2][1])*.8;
for(let i=0;i<n;i++){if(i==0)m.push([NV[s1][0]*L0,NV[s1][1]*L0]);else if(i==n-1)m.push([-NV[s2][0]*L1,-NV[s2][1]*L1]);else m.push([(A[i+1][0]-A[i-1][0])/2,(A[i+1][1]-A[i-1][1])/2])}
let d=`M${A[0]}`;const hm=[];for(let i=0;i<n-1;i++){const c1=[A[i][0]+m[i][0]/3,A[i][1]+m[i][1]/3],c2=[A[i+1][0]-m[i+1][0]/3,A[i+1][1]-m[i+1][1]/3];d+=`C${c1} ${c2} ${A[i+1]}`;hm.push([(A[i][0]+3*c1[0]+3*c2[0]+A[i+1][0])/8,(A[i][1]+3*c1[1]+3*c2[1]+A[i+1][1])/8])}
return{d,m:hm[Math.floor(hm.length/2)],hm}}
function geo0(e,a,b,md){const s1=side(a,b),s2=side(b,a),p=pt(a,s1),q=pt(b,s2),W=e.pts&&e.pts.length?e.pts:null;
if(W){const ST=22,p1=[p[0]+NV[s1][0]*ST,p[1]+NV[s1][1]*ST],q1=[q[0]+NV[s2][0]*ST,q[1]+NV[s2][1]*ST],A=[p,...W,q];
 if(md=='line'){const hm=[];for(let i=0;i<A.length-1;i++)hm.push([(A[i][0]+A[i+1][0])/2,(A[i][1]+A[i+1][1])/2]);return{d:'M'+A.map(v=>v.join(',')).join('L'),m:mid(A),hm}}
 if(md=='curve')return curveVia(A,s1,s2);
 const an=[p1,...W,q1],P=[p,p1],st=[0];
 for(let i=1;i<an.length;i++){const X=P[P.length-1],Y=an[i];if(X[0]!=Y[0]&&X[1]!=Y[1]){const pv=P[P.length-2];P.push(pv[1]==X[1]?[X[0],Y[1]]:[Y[0],X[1]])}P.push(Y);if(i<an.length-1)st.push(P.length-1)}
 P.push(q);const hm=st.map((s,j)=>mid(P.slice(s,(j+1<st.length?st[j+1]:P.length-1)+1))),all=simp(P);return{d:rpath(all),m:mid(all),hm}}
if(md=='line'){const m=[(p[0]+q[0])/2,(p[1]+q[1])/2];return{d:`M${p}L${q}`,m,hm:[m]}}
if(md=='ortho'){const r=(NCON&&NCR.get(e.id))||route(a,b,s1,s2,p,q),m=mid(r);return{d:rpath(r),m,hm:[m]}}
const k=Math.min(Math.hypot(q[0]-p[0],q[1]-p[1])*.4,110),c1=[p[0]+NV[s1][0]*k,p[1]+NV[s1][1]*k],c2=[q[0]+NV[s2][0]*k,q[1]+NV[s2][1]*k],m=[(p[0]+3*c1[0]+3*c2[0]+q[0])/8,(p[1]+3*c1[1]+3*c2[1]+q[1])/8];return{d:`M${p}C${c1} ${c2} ${q}`,m,hm:[m]}}
function geo(e){const a=NM.get(e.from),b=NM.get(e.to);if(!a||!b)return;const md=e.route||(cfg.nocross?'ortho':cfg.route)||'curve',key=(cfg.rad??10)+md+'|'+a.x+','+a.y+','+a.w+','+a.h+'|'+b.x+','+b.y+','+b.w+','+b.h+'|'+(e.pts?e.pts.join(';'):'')+(md=='ortho'?'|'+NSIG+(cfg.nocross&&NCON?'n'+NCV:''):''),c=GC.get(e.id);if(c&&c.k===key)return c.v;const v=geo0(e,a,b,md);if(GC.size>4000)GC.clear();GC.set(e.id,{k:key,v});return v}
function shp(n,f,st,sw,da){const{x,y,w,h}=n,a=`fill="${f}" stroke="${st}" stroke-width="${sw}"${da?` stroke-dasharray="${da}"`:''}`;
switch(n.type){case'terminal':return`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h/2}" ${a}/>`;
case'decision':return`<path d="M${x+w/2} ${y}L${x+w} ${y+h/2}L${x+w/2} ${y+h}L${x} ${y+h/2}Z" ${a}/>`;
case'io':{const s=h*.3;return`<path d="M${x+s} ${y}H${x+w}L${x+w-s} ${y+h}H${x}Z" ${a}/>`}
case'data':{const e=9;return`<path d="M${x} ${y+e}V${y+h-e}A${w/2} ${e} 0 0 0 ${x+w} ${y+h-e}V${y+e}A${w/2} ${e} 0 0 0 ${x} ${y+e}A${w/2} ${e} 0 0 0 ${x+w} ${y+e}" ${a}/>`}
case'sub':return`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" ${a}/><path d="M${x+14} ${y}V${y+h}M${x+w-14} ${y}V${y+h}" fill="none" stroke="${st}" stroke-width="${sw}"/>`;
case'doc':return`<path d="M${x} ${y}H${x+w}V${y+h-12}Q${x+w*.75} ${y+h-28} ${x+w*.5} ${y+h-12}T${x} ${y+h-12}Z" ${a}/>`;
case'prep':{const s=Math.min(h*.4,w/4);return`<path d="M${x+s} ${y}H${x+w-s}L${x+w} ${y+h/2}L${x+w-s} ${y+h}H${x+s}L${x} ${y+h/2}Z" ${a}/>`}
case'conn':return`<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" ${a}/>`;
case'manual':return`<path d="M${x} ${y+h*.22}L${x+w} ${y}V${y+h}H${x}Z" ${a}/>`;
case'note':return`<path d="M${x} ${y}H${x+w-16}L${x+w} ${y+16}V${y+h}H${x}Z" ${a}/>`;
default:return`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" ${a}/>`}}

const defs=()=>`<defs>${[...MC].map(c=>`<marker id="ah${c.slice(1)}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}<marker id="ahs" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#f9e2af"/></marker><linearGradient id="gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".30"/><stop offset=".55" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".10"/></linearGradient></defs>`;
function gbox(g){const m=g.nodes.map(N).filter(Boolean);if(!m.length)return null;let a=1e9,b=1e9,c=-1e9,d=-1e9;m.forEach(n=>{a=Math.min(a,n.x);b=Math.min(b,n.y);c=Math.max(c,n.x+n.w);d=Math.max(d,n.y+n.h)});const p=24,h=28;return{x:a-p,y:b-p-h,w:c-a+2*p,h:d-b+2*p+h,hh:h}}
function tipAt(d,f){const p=document.createElementNS(NS,'path');p.setAttribute('d',d);const L=p.getTotalLength(),a=p.getPointAtLength(L*f),b=p.getPointAtLength(Math.max(0,L*f-3));return{x:a.x.toFixed(1),y:a.y.toFixed(1),a:(Math.atan2(a.y-b.y,a.x-b.x)*180/Math.PI).toFixed(1)}}
const clampv=v=>Math.max(-9,Math.min(9,v));
function shT(l){const k=S.cam.k,a=-cr(),ca=Math.cos(a),sa=Math.sin(a),x=2+LIFT*5+(l>1?4:0)-clampv(VEL.x*.3),y=4+LIFT*9+(l>1?7:0)-clampv(VEL.y*.3);return`translate(${((ca*x-sa*y)/k).toFixed(2)} ${((sa*x+ca*y)/k).toFixed(2)})`}
function dk(c,k=.38){c=hex6(c)||'#888888';return'#'+[1,3,5].map(i=>Math.round(parseInt(c.substr(i,2),16)*(1-k)).toString(16).padStart(2,'0')).join('')}
function miniIcon(k,pw=38){const n={type:k,x:3,y:4,w:40,h:24};if(k=='decision'){n.y=2;n.h=28}if(k=='conn'){n.x=11;n.y=3;n.w=24;n.h=24}const c=T[k][1];return`<svg viewBox="0 0 46 32" width="${pw}" height="${Math.round(pw*32/46)}" aria-hidden="true">${shp(n,c,dk(c),1.4)}</svg>`}
function body(ex){const P=PAL[cfg.bg],lb=P.bg=='transparent'?'#ffffff':P.bg,k0=S.cam.k,now=performance.now(),vis=(x,y,w,h)=>ex||!RB||(x<RB.x+RB.w&&x+w>RB.x&&y<RB.y+RB.h&&y+h>RB.y),flowOK=cfg.flow&&!ex&&S.edges.length<=200,fph=((now/1000)%.9).toFixed(3);MC=new Set([P.edge]);let o='',hd='';NSIG=nsig();routeAll();
const vn=S.nodes.filter(n=>vis(n.x,n.y,n.w,n.h)),rich=cfg.depth&&(ex||(k0>=.4&&vn.length<=100)),dgm=!ex&&g&&g.t=='drag'&&g.mv?g.o:null;
let hn=null,he=null;if(!ex&&cfg.trace){if(sel.size==1){const id=[...sel][0];hn=new Set([id]);he=new Set();S.edges.forEach(e=>{if(e.from==id||e.to==id){he.add(e.id);hn.add(e.from);hn.add(e.to)}})}else if(selE){const x=ed();if(x){hn=new Set([x.from,x.to]);he=new Set([x.id])}}}
S.groups.forEach(gp=>{const r=gbox(gp);if(!r||!vis(r.x,r.y,r.w,r.h))return;const on=!ex&&selG==gp.id,c=gp.color||'#89b4fa';
o+=`<g><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="14" fill="${c}" fill-opacity=".07" stroke="${on?'#f9e2af':c}" stroke-width="${on?2.6:1.8}" ${on?'':'stroke-dasharray="8 5"'} pointer-events="none"/><rect data-g="${gp.id}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.hh}" rx="14" fill="${c}" fill-opacity=".22"/><text x="${r.x+14}" y="${r.y+19}" font-size="13" font-weight="700" fill="${P.txt}" pointer-events="none">${esc(gp.title)}</text></g>`});
S.edges.forEach(e=>{const a=NM.get(e.from),b=NM.get(e.to);if(!a||!b)return;const on=!ex&&selE==e.id;
if(!on&&!ex){let x0=Math.min(a.x,b.x),y0=Math.min(a.y,b.y),x1=Math.max(a.x+a.w,b.x+b.w),y1=Math.max(a.y+a.h,b.y+b.h);if(e.pts)for(const v of e.pts){x0=Math.min(x0,v[0]);x1=Math.max(x1,v[0]);y0=Math.min(y0,v[1]);y1=Math.max(y1,v[1])}if(!vis(x0-260,y0-260,x1-x0+520,y1-y0+520))return}
const q=geo(e);if(!q)return;const col=e.color||P.edge,w=e.width||2,dm=DASH[e.dash||'solid'],ar=e.arrow||'end',mk=on?'ahs':'ah'+col.slice(1),sc=on?'#f9e2af':col,dim2=he&&!he.has(e.id),hi=he&&he.has(e.id)&&!on,sw=on?w+1:hi?w+.8:w;MC.add(col);
let pr=1;if(!ex){const t0=ANIM.get(e.id);if(t0!==undefined)pr=Math.max(0,Math.min(1,(now-t0)/DUR))}
const ea=1-Math.pow(1-pr,3),an=pr<1;let ln;
if(an&&!dm){ln=`<path d="${q.d}" pathLength="1" fill="none" stroke="${sc}" stroke-width="${sw}" stroke-linejoin="round" stroke-dasharray="1 1" stroke-dashoffset="${(1-ea).toFixed(4)}"/>`;if(ar!='none'&&ea>.03){const t=tipAt(q.d,ea);ln+=`<path d="M-11 -6L1 0L-11 6z" transform="translate(${t.x} ${t.y}) rotate(${t.a}) scale(${w/2})" fill="${sc}"/>`}}
else ln=`<path d="${q.d}" fill="none" stroke="${sc}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${dm?`stroke-dasharray="${dm}"`:''} ${ar!='none'?`marker-end="url(#${mk})"`:''} ${ar=='both'?`marker-start="url(#${mk})"`:''} ${an?`opacity="${ea.toFixed(3)}"`:''}/>`;
const fl=flowOK&&!an&&!dm?`<path class="fl" d="${q.d}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="${w}" stroke-dasharray="3 13" stroke-linecap="round" style="animation-delay:-${fph}s"/>`:'';
let lab='';if(e.label){const lw=Math.max(26,e.label.length*8+14);lab=`<g${an?` opacity="${(ea*ea).toFixed(3)}"`:''}><rect x="${q.m[0]-lw/2}" y="${q.m[1]-23}" width="${lw}" height="20" rx="8" fill="${lb}" fill-opacity=".92" stroke="${sc}" stroke-opacity=".4"/><text x="${q.m[0]}" y="${q.m[1]-9}" text-anchor="middle" font-size="13" font-weight="700" fill="${P.txt}">${esc(e.label)}</text></g>`}
o+=`<g data-e="${e.id}"${dim2?' opacity=".25"':''}><path d="${q.d}" fill="none" stroke="transparent" stroke-width="24"/>${ln}${fl}${lab}</g>`;
if(on){const hk=1/Math.max(.6,Math.min(k0,1.5));(e.pts||[]).forEach((v,i)=>hd+=`<circle data-wp="${e.id}:${i}" cx="${v[0]}" cy="${v[1]}" r="${8*hk}" fill="#f9e2af" stroke="#1e1e2e" stroke-width="${2*hk}" style="cursor:move"/>`);(q.hm||[q.m]).forEach((v,i)=>hd+=`<circle data-wm="${e.id}:${i}" cx="${v[0]}" cy="${v[1]}" r="${6*hk}" fill="#1e1e2e" stroke="#f9e2af" stroke-width="${2*hk}" opacity=".9" style="cursor:copy"/>`)}});
if(cfg.nocross&&!ex&&NCON){const rr=6/Math.max(.6,Math.min(k0,1.5));NCX.forEach(v=>o+=`<circle cx="${v[0]}" cy="${v[1]}" r="${rr}" fill="none" stroke="#f38ba8" stroke-width="2" pointer-events="none"/>`)}
if(rich){const s1=vn.filter(n=>!dgm||!dgm.has(n.id)).map(n=>shp(n,'#000','#000',9)).join(''),s2=dgm?vn.filter(n=>dgm.has(n.id)).map(n=>shp(n,'#000','#000',9)).join(''):'';
o+=`<g id="shd" fill-opacity=".26" stroke-opacity=".08" stroke-linejoin="round" pointer-events="none" transform="${ex?'translate(3 5)':shT(1)}">${s1}</g>`+(s2?`<g id="shd2" fill-opacity=".2" stroke-opacity=".07" stroke-linejoin="round" pointer-events="none" transform="${shT(2)}">${s2}</g>`:'')}
S.nodes.forEach(n=>{if(!vis(n.x,n.y,n.w,n.h)&&!sel.has(n.id))return;const on=!ex&&(sel.has(n.id)||linkFrom==n.id),dr=dgm&&dgm.has(n.id),f=n.color||T[n.type][1],cx=n.x+n.w/2,cy=n.y+n.h/2,lh=n.lh||19,fs=n.fe||n.fs||14,y0=cy-(n.L.length-1)*lh/2+fs*.36,bd=n.bd,sc=on?'#f9e2af':bd=='none'?'none':dk(f),swd=on?3:bd=='thick'?3.2:bd=='thin'?.9:1.6,da=bd=='dashed'?'7 4':bd=='dotted'?'1.5 4':'';
let tr='',dimN=hn&&!hn.has(n.id);const t0=ex?undefined:NANIM.get(n.id);if(t0!==undefined){const p=Math.max(0,Math.min(1,(now-t0)/220)),e=1-Math.pow(1-p,3),s=.82+.18*e;tr=` transform="translate(${cx} ${cy}) scale(${s.toFixed(3)}) translate(${-cx} ${-cy})" opacity="${e.toFixed(2)}"`}else if(dr)tr=` transform="translate(${(-2/k0).toFixed(2)} ${(-3/k0).toFixed(2)})"`;
o+=`<g data-n="${n.id}"${tr}${dimN&&!tr?' opacity=".5"':''}>${on?`<g opacity=".3" stroke-linejoin="round">${shp(n,'none','#f9e2af',9)}</g>`:''}${shp(n,f,sc,swd,da)}${rich?shp(n,'url(#gl)','none',0):''}<text font-size="${fs}" font-weight="600" text-anchor="middle" fill="${ink(f)}">${n.L.map((s,i)=>`<tspan x="${cx}" y="${y0+i*lh}">${esc(s)}</tspan>`).join('')}</text>${n.lock&&!ex?`<text x="${n.x+n.w-16}" y="${n.y+15}" font-size="11">🔒</text>`:''}</g>`});
if(!ex&&sel.size==1&&tool!='pan'){const n=N([...sel][0]);if(n)['r','l','t','b'].forEach(s=>{const[px,py]=pt(n,s);o+=`<circle data-p="${n.id}" data-s="${s}" cx="${px}" cy="${py}" r="${9/Math.max(.6,Math.min(k0,1.5))}" fill="#f9e2af" stroke="#1e1e2e" stroke-width="2"/>`})}
if(!ex&&sel.size==1&&tool!='pan'){const n=N([...sel][0]);if(n&&!n.lock){const k=1/Math.max(.6,Math.min(k0,1.5)),z=12*k;[['nw',n.x,n.y,'nwse'],['ne',n.x+n.w,n.y,'nesw'],['sw',n.x,n.y+n.h,'nesw'],['se',n.x+n.w,n.y+n.h,'nwse']].forEach(([c,x,y,cu])=>o+=`<rect data-rs="${n.id}:${c}" x="${x-z/2}" y="${y-z/2}" width="${z}" height="${z}" rx="${3*k}" fill="#89b4fa" stroke="#1e1e2e" stroke-width="${1.6*k}" style="cursor:${cu}-resize"/>`)}}
return o+hd}
const draw=()=>{full=true;raf||(raf=requestAnimationFrame(render));tick()};
const drawCam=()=>{lastCamT=Date.now();raf||(raf=requestAnimationFrame(render));tick()};
let PC={x:0,y:0};
function render(){raf=0;const c=S.cam,vb=viewB(),vx=vb.x,vy=vb.y,vw=vb.w,vh=vb.h;
VEL.x=VEL.x*.55+(c.x-PC.x)*.45;VEL.y=VEL.y*.55+(c.y-PC.y)*.45;PC={x:c.x,y:c.y};
const inside=RB&&!full&&vx>=RB.x&&vy>=RB.y&&vx+vw<=RB.x+RB.w&&vy+vh<=RB.y+RB.h&&Math.abs(c.k/rk0-1)<.35&&(c.k<.5)==(rk0<.5);
if(inside)fastCam(c);else fullRender(c,vx,vy,vw,vh);
$('#info').innerHTML=`<span class="ia">${S.nodes.length} бл · ${S.edges.length} св · </span>${Math.round(c.k*100)}%${cfg.nocross&&NCON?` · <span class="ix">✂ ${NCX.length}</span>`:''}`;{const cp=$('#cmpi');if(cp){cp.style.transform=`rotate(${(cr()*180/Math.PI).toFixed(1)}deg)`;$('#cmp').classList.toggle('dim',Math.abs(cr())<.01)}}$('[data-a=undo]').disabled=hi<1;$('[data-a=redo]').disabled=hi>=hist.length-1;inside?miniView():mini()}
function fullRender(c,vx,vy,vw,vh){full=false;rk0=c.k;const mx=vw*.6,my=vh*.6;RB={x:vx-mx,y:vy-my,w:vw+2*mx,h:vh+2*my};NM=new Map(S.nodes.map(n=>[n.id,n]));const P=PAL[cfg.bg],b=body(false);
$('#stage').style.background=P.bg=='transparent'?'':P.bg;$('#stage').classList.toggle('chk',P.bg=='transparent');
bgStyle(c);
svg.innerHTML=`${defs()}<g id="wd" transform="${camT(c)}">${b}${ov}</g>`}
function bgStyle(c){const gl=$('#gridl'),P=PAL[cfg.bg];if(!gl)return;if(P.bg=='transparent'||!cfg.grid||c.k<.5){gl.style.display='none';return}
const GS=cfg.gs||20,per=GS*c.k,r=svg.getBoundingClientRect(),D=Math.ceil(Math.hypot(r.width,r.height)*1.08/per+4)*per,cw=s2w(r.width/2,r.height/2),sp=w2s(Math.round(cw[0]/GS)*GS,Math.round(cw[1]/GS)*GS),rd=Math.max(.8,c.k),s=gl.style;
s.display='block';s.width=s.height=D+'px';s.transform=`translate(${(sp[0]-D/2).toFixed(2)}px,${(sp[1]-D/2).toFixed(2)}px) rotate(${(cr()*180/Math.PI).toFixed(3)}deg)`;
s.backgroundImage=`radial-gradient(circle at 50% 50%,${P.dot} ${rd}px,transparent ${rd+.6}px)`;s.backgroundSize=`${per}px ${per}px`;s.backgroundPosition=`${D/2-per/2}px ${D/2-per/2}px`}
function fastCam(c){const w=svg.querySelector('#wd');if(!w)return draw();w.setAttribute('transform',camT(c));bgStyle(c);const a=svg.querySelector('#shd');if(a)a.setAttribute('transform',shT(1))}
function tick(){if(!cfg.depth||REDUCE||tkOn)return;tkOn=true;const f=()=>{const act=!!g||Date.now()-lastCamT<180,tg=act?1:0;LIFT+=(tg-LIFT)*.16;VEL.x*=.82;VEL.y*=.82;
const a=svg.querySelector('#shd'),b=svg.querySelector('#shd2');if(a)a.setAttribute('transform',shT(1));if(b)b.setAttribute('transform',shT(2));
if(act||Math.abs(tg-LIFT)>.01||Math.abs(VEL.x)>.3||Math.abs(VEL.y)>.3)requestAnimationFrame(f);else{LIFT=0;VEL.x=VEL.y=0;tkOn=false;if(a)a.setAttribute('transform',shT(1))}};requestAnimationFrame(f)}
function animKick(){if(animOn)return;animOn=true;const f=()=>{const now=performance.now();for(const[id,t0]of ANIM)if(now-t0>DUR)ANIM.delete(id);for(const[id,t0]of NANIM)if(now-t0>260)NANIM.delete(id);draw();if(ANIM.size||NANIM.size)requestAnimationFrame(f);else animOn=false};requestAnimationFrame(f)}
function reveal(){if(REDUCE||!S.edges.length||S.edges.length>120)return;const st=Math.min(70,1400/S.edges.length),now=performance.now();S.edges.forEach((e,i)=>ANIM.set(e.id,now+i*st));animKick()}
function mini(){const m=$('#mm');m.classList.toggle('off',!cfg.map);if(!cfg.map)return;const vb=viewB();
if(!mmDrag||!MM){const b=bbox();let x0=Math.min(b.x,vb.x)-30,y0=Math.min(b.y,vb.y)-30,x1=Math.max(b.x+b.w,vb.x+vb.w)+30,y1=Math.max(b.y+b.h,vb.y+vb.h)+30;const s=Math.min(180/(x1-x0),120/(y1-y0));MM={s,ox:(180-(x1-x0)*s)/2-x0*s,oy:(120-(y1-y0)*s)/2-y0*s}}
const{s,ox,oy}=MM,X=v=>v*s+ox,Y=v=>v*s+oy;let o='';
S.groups.forEach(gp=>{const q=gbox(gp);if(q)o+=`<rect x="${X(q.x)}" y="${Y(q.y)}" width="${q.w*s}" height="${q.h*s}" fill="${gp.color}" fill-opacity=".15" stroke="${gp.color}" stroke-width=".8"/>`});
S.edges.forEach(e=>{const a=NM.get(e.from),b=NM.get(e.to);if(a&&b)o+=`<line x1="${X(a.x+a.w/2)}" y1="${Y(a.y+a.h/2)}" x2="${X(b.x+b.w/2)}" y2="${Y(b.y+b.h/2)}" stroke="#9399b2" stroke-width=".7" opacity=".7"/>`});
S.nodes.forEach(n=>o+=`<rect x="${X(n.x)}" y="${Y(n.y)}" width="${Math.max(2,n.w*s)}" height="${Math.max(1.5,n.h*s)}" rx="1.5" fill="${n.color||T[n.type][1]}"/>`);
o+=`<polygon id="mmv" points="${vb.P.map(p=>X(p[0])+','+Y(p[1])).join(' ')}" fill="#f9e2af18" stroke="#f9e2af" stroke-width="1.4" stroke-linejoin="round"/>`;m.innerHTML=o}
function miniView(){if(!cfg.map||!MM)return;const vb=viewB(),{s,ox,oy}=MM,Q=vb.P.map(p=>[p[0]*s+ox,p[1]*s+oy]),v=$('#mmv');if(!v)return mini();if(!mmDrag&&Q.some(p=>p[0]<-4||p[1]<-4||p[0]>184||p[1]>124))return mini();v.setAttribute('points',Q.map(p=>p.join(',')).join(' '))}
function bbox(){if(!S.nodes.length)return{x:0,y:0,w:300,h:200};let a=1e9,b=1e9,c=-1e9,d=-1e9;const ad=(x,y,X,Y)=>{a=Math.min(a,x);b=Math.min(b,y);c=Math.max(c,X);d=Math.max(d,Y)};S.nodes.forEach(n=>ad(n.x,n.y,n.x+n.w,n.y+n.h));S.groups.forEach(g=>{const r=gbox(g);if(r)ad(r.x,r.y,r.x+r.w,r.y+r.h)});return{x:a,y:b,w:c-a,h:d-b}}
const cr=()=>S.cam.r||0;
function w2s(wx,wy){const c=S.cam,a=cr(),ca=Math.cos(a),sa=Math.sin(a);return[c.x+c.k*(ca*wx-sa*wy),c.y+c.k*(sa*wx+ca*wy)]}
function s2w(mx,my){const c=S.cam,a=-cr(),ca=Math.cos(a),sa=Math.sin(a),dx=mx-c.x,dy=my-c.y;return[(ca*dx-sa*dy)/c.k,(sa*dx+ca*dy)/c.k]}
function anchor(wx,wy,mx,my){const c=S.cam,a=cr(),ca=Math.cos(a),sa=Math.sin(a);c.x=mx-c.k*(ca*wx-sa*wy);c.y=my-c.k*(sa*wx+ca*wy)}
const camT=c=>`translate(${c.x} ${c.y}) rotate(${(cr()*180/Math.PI).toFixed(3)}) scale(${c.k})`;
function viewB(){const r=svg.getBoundingClientRect(),P=[[0,0],[r.width,0],[r.width,r.height],[0,r.height]].map(p=>s2w(p[0],p[1])),xs=P.map(p=>p[0]),ys=P.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);return{x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y,P}}
function fitRect(x,y,w,h,maxk=1.6,mink=.15){const r=svg.getBoundingClientRect(),a=cr(),ca=Math.abs(Math.cos(a)),sa=Math.abs(Math.sin(a)),W=Math.max(1,w*ca+h*sa),H=Math.max(1,w*sa+h*ca);S.cam.k=Math.max(mink,Math.min(maxk,Math.min((r.width-60)/W,(r.height-60)/H)));anchor(x+w/2,y+h/2,r.width/2,r.height/2);draw();save()}
function fit(){const b=bbox();fitRect(b.x,b.y,b.w,b.h)}
function zoomAt(f,cx,cy){const r=svg.getBoundingClientRect(),mx=cx-r.left,my=cy-r.top,w=s2w(mx,my);S.cam.k=Math.max(.1,Math.min(4,S.cam.k*f));anchor(w[0],w[1],mx,my);drawCam()}
const zoomC=f=>{const r=svg.getBoundingClientRect();zoomAt(f,r.left+r.width/2,r.top+r.height/2)};
function rotateBy(d,cx,cy){const r=svg.getBoundingClientRect(),mx=cx==null?r.width/2:cx-r.left,my=cy==null?r.height/2:cy-r.top,w=s2w(mx,my);S.cam.r=cr()+d;anchor(w[0],w[1],mx,my);drawCam()}
let rotAnim=0;
function rotateTo(target,dur=280){cancelAnimationFrame(rotAnim);const r=svg.getBoundingClientRect(),mx=r.width/2,my=r.height/2,w=s2w(mx,my),r0=cr(),d=target-r0,whole=Math.abs(target%(2*Math.PI))<1e-6;if(Math.abs(d)<.0005){if(whole)S.cam.r=0;return}
if(REDUCE){S.cam.r=whole?0:target;anchor(w[0],w[1],mx,my);drawCam();save();return}
const t0=performance.now(),f=now=>{const p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,3);S.cam.r=r0+d*e;anchor(w[0],w[1],mx,my);drawCam();if(p<1)rotAnim=requestAnimationFrame(f);else{if(whole){S.cam.r=0;anchor(w[0],w[1],mx,my);drawCam()}save()}};rotAnim=requestAnimationFrame(f)}
function snapRot(){const deg=cr()*180/Math.PI,n=((deg%360)+360)%360,t=[0,90,180,270,360].find(v=>Math.abs(n-v)<3.5);if(t!==undefined&&Math.abs(n-t)>.05)rotateTo((deg-n+t)*Math.PI/180,160)}
const unrot=()=>{const r=cr();if(Math.abs(r)<.001){toast('Лист уже ровный');return}rotateTo(Math.round(r/(2*Math.PI))*2*Math.PI)};
/* ---------- выделение и инспектор ---------- */
function setSel(ids,e=null,gid=null){sel=new Set(ids);selE=e;selG=gid;insp();draw()}
const ed=()=>S.edges.find(x=>x.id==selE),gr=()=>S.groups.find(x=>x.id==selG);
function insp(){const one=sel.size==1?N([...sel][0]):null,e=selE&&ed(),g=selG&&gr(),p=$('#insp'),P=PAL[cfg.bg];
p.hidden=!(sel.size||e||g);$('#ititle').textContent=one?NAMES[one.type]:sel.size>1?`Блоков: ${sel.size}`:e?'Связь':g?'Группа':'';$('#s-text').hidden=!one;$('#s-node').hidden=!sel.size;$('#s-multi').hidden=sel.size<2;$('#s-edge').hidden=!e;$('#s-grp').hidden=!g;
if(one){$('#pf').value=String(one.fs||14);$('#pb').value=one.bd||'';$('#lockBtn').textContent=one.lock?'🔓':'🔒';$('#pt').value=one.text;$('#pty').value=one.type;$('#pc').value=hex6(one.color||T[one.type][1])}else if(sel.size)$('#pc').value='#89b4fa';
if(e){$('#pl').value=e.label||'';$('#er').value=e.route||'';$('#ed').value=e.dash||'solid';$('#ea').value=e.arrow||'end';$('#ew').value=String(e.width||2);$('#ec').value=hex6(e.color||P.edge)||'#89b4fa'}
if(g){$('#gt').value=g.title;$('#gc').value=hex6(g.color)||'#89b4fa'}}
$('#pty').innerHTML=Object.keys(T).map(k=>`<option value="${k}">${NAMES[k]}`).join('');
$('#pt').oninput=e=>{const n=N([...sel][0]);if(n){n.text=e.target.value;dim(n);draw()}};
$('#pty').onchange=e=>{sel.forEach(i=>{const n=N(i);n.type=e.target.value;dim(n)});commit()};
$('#pc').oninput=e=>{sel.forEach(i=>N(i).color=e.target.value);draw()};
$('#pl').oninput=e=>{const x=ed();if(x){x.label=e.target.value;draw()}};
$('#gt').oninput=e=>{const g=gr();if(g){g.title=e.target.value;draw()}};
$('#gc').oninput=e=>{const g=gr();if(g){g.color=e.target.value;draw()}};
$('#ec').oninput=e=>{const x=ed();if(x){x.color=e.target.value;draw()}};
[['er','route',''],['ed','dash','solid'],['ea','arrow','end'],['ew','width','2']].forEach(([id,k,def])=>$('#'+id).onchange=e=>{const x=ed();if(!x)return;const v=e.target.value;if(v===''||v===def)delete x[k];else x[k]=k=='width'?+v:v;commit()});
['pt','pc','pl','gt','gc','ec'].forEach(i=>$('#'+i).onchange=commit);
function setTool(t){tool=t;linkFrom=null;document.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t==t));svg.style.cursor=t=='pan'?'grab':t=='link'?'crosshair':'default';draw()}
const cleanG=()=>{S.groups.forEach(g=>g.nodes=g.nodes.filter(i=>N(i)));S.groups=S.groups.filter(g=>g.nodes.length)};
function del(){if(selG){S.groups=S.groups.filter(x=>x.id!=selG);selG=null}else if(selE){S.edges=S.edges.filter(e=>e.id!=selE);selE=null}else if(sel.size){S.nodes=S.nodes.filter(n=>!sel.has(n.id));S.edges=S.edges.filter(e=>!sel.has(e.from)&&!sel.has(e.to));sel=new Set();cleanG()}else return;commit()}
function copy(){clip={n:S.nodes.filter(n=>sel.has(n.id)).map(n=>({...n})),e:S.edges.filter(e=>sel.has(e.from)&&sel.has(e.to)).map(e=>({...e})),g:S.groups.filter(g=>g.nodes.every(i=>sel.has(i))).map(g=>({...g,nodes:[...g.nodes]})),c:0};if(clip.n.length)toast('Скопировано')}
function paste(){if(!clip||!clip.n.length)return;clip.c++;const m=new Map(),o=clip.c*40;clip.n.forEach(n=>{const k=addNode(n.type,n.x+o,n.y+o,n.text,n.color);m.set(n.id,k.id)});clip.e.forEach(e=>{const k=addEdge(m.get(e.from),m.get(e.to),e.label);if(k)Object.assign(k,pick(e,['route','dash','arrow','color','width']))});clip.g.forEach(g=>S.groups.push({id:nid('g'),title:g.title,color:g.color,nodes:g.nodes.map(i=>m.get(i)).filter(Boolean)}));sel=new Set(m.values());selG=null;commit()}
function mkGroup(){const ids=[...sel];if(ids.length<2)return toast('Выделите 2+ блока: Shift + клик или рамка');S.groups.forEach(g=>g.nodes=g.nodes.filter(i=>!ids.includes(i)));cleanG();const g={id:nid('g'),title:'Группа',color:'#89b4fa',nodes:ids};S.groups.push(g);sel=new Set();selE=null;selG=g.id;commit();if(matchMedia('(pointer:fine)').matches){$('#gt').focus();$('#gt').select()}}
function ungrp(){const g=gr();if(!g)return;sel=new Set(g.nodes);S.groups=S.groups.filter(x=>x.id!=g.id);selG=null;commit()}
function addFromPalette(type){const r=svg.getBoundingClientRect(),c=S.cam,s=sel.size==1&&type!='note'?N([...sel][0]):null,o=(S.nodes.length%6)*20;let n;
if(s){n=addNode(type,s.x,s.y+s.h+60);addEdge(s.id,n.id)}else n=addNode(type,(r.width/2-c.x)/c.k-60+o,(r.height/2-c.y)/c.k-30+o);
sel=new Set([n.id]);selE=null;selG=null;commit()}
$('#pal').innerHTML=Object.keys(T).map(k=>`<button data-add="${k}">${miniIcon(k,40)}<span>${NAMES[k]}</span></button>`).join('');

/* ---------- жесты: мышь, палец, перо ---------- */
const toW=e=>{const r=svg.getBoundingClientRect(),p=s2w(e.clientX-r.left,e.clientY-r.top);return{x:p[0],y:p[1]}};
const hit=w=>[...S.nodes].reverse().find(n=>w.x>=n.x&&w.x<=n.x+n.w&&w.y>=n.y&&w.y<=n.y+n.h),P=new Map();
svg.addEventListener('pointerdown',e=>{if(e.button==2)return;ctxClose();svg.setPointerCapture(e.pointerId);P.set(e.pointerId,{x:e.clientX,y:e.clientY});lpStart(e);
if(P.size==2){const[a,b]=[...P.values()];g={t:'pinch',d:Math.hypot(a.x-b.x,a.y-b.y)||1,k:S.cam.k,w:toW({clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2}),a0:Math.atan2(b.y-a.y,b.x-a.x),r0:cr(),rot:false};return}
if(P.size>2)return;
if(e.altKey&&e.pointerType=='mouse'){const r=svg.getBoundingClientRect();g={t:'rot',cx:r.left+r.width/2,cy:r.top+r.height/2,a0:Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2)),r0:cr(),w:s2w(r.width/2,r.height/2),mx:r.width/2,my:r.height/2};return}
const w=toW(e),wm=e.target.closest('[data-wm]'),wp=e.target.closest('[data-wp]'),rs=e.target.closest('[data-rs]'),pe=e.target.closest('[data-p]'),ne=e.target.closest('[data-n]'),ge=e.target.closest('[data-g]'),ee=e.target.closest('[data-e]'),pan=tool=='pan'||space||e.button==1;
if(wm&&!pan){const[id,i]=wm.dataset.wm.split(':'),x=S.edges.find(q=>q.id==id);if(x){x.pts=x.pts||[];x.pts.splice(+i,0,[G(w.x),G(w.y)]);g={t:'wp',id,i:+i,w,mv:true};draw();return}}
if(wp&&!pan){const[id,i]=wp.dataset.wp.split(':'),x=S.edges.find(q=>q.id==id);if(x&&x.pts){if(last.id=='w'+wp.dataset.wp&&Date.now()-last.t<350){x.pts.splice(+i,1);if(!x.pts.length)delete x.pts;last={};commit();return}last={id:'w'+wp.dataset.wp,t:Date.now()};g={t:'wp',id,i:+i,w,mv:false}}return}
if(rs&&!pan){const[rid,cn]=rs.dataset.rs.split(':'),n=N(rid);if(last.id=='r'+rid+cn&&Date.now()-last.t<350){delete n.sw;delete n.sh;dim(n);last={};commit();return}last={id:'r'+rid+cn,t:Date.now()};g={t:'resize',id:n.id,c:cn||'se',w,ow:n.w,oh:n.h,ox:n.x,oy:n.y};return}
if(pe&&!pan){g={t:'link',from:pe.dataset.p,s:pe.dataset.s,w};return}
if(ne&&!pan){const id=ne.dataset.n;
if(tool=='link'){if(!linkFrom)linkFrom=id;else{if(addEdge(linkFrom,id))commit();linkFrom=null}draw();return}
selG=null;if(e.shiftKey||e.ctrlKey||e.metaKey){sel.has(id)?sel.delete(id):sel.add(id);selE=null}else if(!sel.has(id)){sel=new Set([id]);selE=null}
insp();if(last.id==id&&Date.now()-last.t<350&&sel.size==1){$('#pt').focus();$('#pt').select()}last={id,t:Date.now()};
const o=new Map();sel.forEach(i=>{const n=N(i);if(!n.lock)o.set(i,[n.x,n.y])});g={t:'drag',w,o,wo:wpSnap(o),mv:false};draw();return}
if(ge&&!pan){const gg=S.groups.find(x=>x.id==ge.dataset.g);if(!gg)return;sel=new Set();selE=null;selG=gg.id;insp();
if(last.id=='g'+gg.id&&Date.now()-last.t<350){$('#gt').focus();$('#gt').select()}last={id:'g'+gg.id,t:Date.now()};
const o=new Map();gg.nodes.forEach(i=>{const n=N(i);if(n)o.set(i,[n.x,n.y])});g={t:'drag',w,o,wo:wpSnap(o),mv:false};draw();return}
if(ee&&!pan){setSel([],ee.dataset.e);return}
g={t:pan||e.pointerType=='touch'?'pan':'box',w,x:e.clientX,y:e.clientY,cx:S.cam.x,cy:S.cam.y,add:e.shiftKey,mv:false}});
svg.addEventListener('pointermove',e=>{if(!P.has(e.pointerId))return;P.set(e.pointerId,{x:e.clientX,y:e.clientY});if(LP&&Math.hypot(e.clientX-LP.x,e.clientY-LP.y)>8)lpStop();if(!g)return;
if(g.t=='pinch'){if(P.size<2)return;const[a,b]=[...P.values()],r=svg.getBoundingClientRect(),k=Math.max(.1,Math.min(4,g.k*Math.hypot(a.x-b.x,a.y-b.y)/g.d)),mx=(a.x+b.x)/2-r.left,my=(a.y+b.y)/2-r.top;let da=Math.atan2(b.y-a.y,b.x-a.x)-g.a0;da=Math.atan2(Math.sin(da),Math.cos(da));if(Math.abs(da)>.12)g.rot=true;S.cam.k=k;S.cam.r=g.rot?g.r0+da:g.r0;anchor(g.w.x,g.w.y,mx,my);return drawCam()}
const w=toW(e);
if(g.t=='pan'){const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.hypot(dx,dy)>3)g.mv=true;S.cam.x=g.cx+dx;S.cam.y=g.cy+dy;return drawCam()}
else if(g.t=='drag'){const dx=w.x-g.w.x,dy=w.y-g.w.y;if(Math.hypot(dx,dy)*S.cam.k>4)g.mv=true;ov='';if(g.mv){g.o.forEach(([ox,oy],id)=>{const n=N(id);n.x=G(ox+dx);n.y=G(oy+dy)});if(cfg.guides)guides();shiftWp()}}
else if(g.t=='rot'){S.cam.r=g.r0+(Math.atan2(e.clientY-g.cy,e.clientX-g.cx)-g.a0);anchor(g.w[0],g.w[1],g.mx,g.my);return drawCam()}
else if(g.t=='wp'){const x=S.edges.find(q=>q.id==g.id);if(x&&x.pts&&x.pts[g.i]){x.pts[g.i]=[G(w.x),G(w.y)];g.mv=true}}
else if(g.t=='resize'){const n=N(g.id),dx=w.x-g.w.x,dy=w.y-g.w.y,L=g.c.includes('w'),Tp=g.c.includes('n');let nw=Math.max(60,G(g.ow+(L?-dx:dx))),nh=Math.max(36,G(g.oh+(Tp?-dy:dy)));if(n.type=='conn')nh=nw;n.sw=nw;n.sh=nh;dim(n);if(L)n.x=g.ox+g.ow-n.w;if(Tp)n.y=g.oy+g.oh-n.h;g.mv=true}
else if(g.t=='link'){const[px,py]=pt(N(g.from),g.s);g.mv=Math.hypot(w.x-px,w.y-py)>12;ov=`<path d="M${px} ${py}L${w.x} ${w.y}" stroke="#f9e2af" stroke-width="2.5" stroke-dasharray="6 5" fill="none"/>`}
else if(g.t=='box'){g.mv=true;g.e=w;ov=`<rect x="${Math.min(g.w.x,w.x)}" y="${Math.min(g.w.y,w.y)}" width="${Math.abs(w.x-g.w.x)}" height="${Math.abs(w.y-g.w.y)}" fill="#89b4fa22" stroke="#89b4fa" stroke-dasharray="4 3"/>`}
draw()});
const up=e=>{lpStop();P.delete(e.pointerId);if(!g)return;if(g.t=='pinch'){if(P.size<2){g=null;snapRot();save()}return}
const w=toW(e),t=g.t;
if(t=='rot'){g=null;snapRot();save();return}
if(t=='drag'&&g.mv&&cfg.noover&&resolveOverlaps([...g.o.keys()]))toast('Блоки не накладываются: сдвинул в свободное место');
if((t=='drag'||t=='resize'||t=='wp')&&g.mv)commit();
else if(t=='link'&&g.mv){const h=hit(w);if(h&&h.id!=g.from){if(addEdge(g.from,h.id))commit()}else if(!h){const n=addNode('process',w.x-60,w.y-28);addEdge(g.from,n.id);sel=new Set([n.id]);commit()}}
else if(t=='box'&&g.e){const x1=Math.min(g.w.x,g.e.x),x2=Math.max(g.w.x,g.e.x),y1=Math.min(g.w.y,g.e.y),y2=Math.max(g.w.y,g.e.y),ids=S.nodes.filter(n=>n.x<x2&&n.x+n.w>x1&&n.y<y2&&n.y+n.h>y1).map(n=>n.id);setSel(g.add?[...sel,...ids]:ids)}
else if((t=='box'||t=='pan')&&!g.mv)setSel([]);
if(t=='pan')save();g=null;ov='';draw();insp()};
svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',e=>{if(LP&&Date.now()-LP.t0>=260){const x=LP.x,y=LP.y;lpStop();lpFire(x,y);return}up(e)});
svg.addEventListener('dblclick',e=>{if(e.target.closest('[data-n],[data-e],[data-p],[data-g]')||tool!='select')return;const w=toW(e),n=addNode('process',w.x-60,w.y-28);sel=new Set([n.id]);selG=null;commit()});
svg.addEventListener('wheel',e=>{e.preventDefault();if(e.altKey){rotateBy((e.deltaY||e.deltaX)>0?.0873:-.0873,e.clientX,e.clientY);return}zoomAt(e.ctrlKey?Math.exp(-e.deltaY*.01):e.deltaY<0?1.12:1/1.12,e.clientX,e.clientY)},{passive:false});
/* мини-карта: тап или перетаскивание — переход к месту */
const mm=$('#mm');
function mmGo(e){if(!MM)return;const r=mm.getBoundingClientRect(),vr=svg.getBoundingClientRect(),wx=((e.clientX-r.left)/r.width*180-MM.ox)/MM.s,wy=((e.clientY-r.top)/r.height*120-MM.oy)/MM.s;anchor(wx,wy,vr.width/2,vr.height/2);drawCam()}
mm.addEventListener('pointerdown',e=>{e.stopPropagation();mm.setPointerCapture(e.pointerId);mmDrag=true;mmGo(e)});
mm.addEventListener('pointermove',e=>{if(mmDrag)mmGo(e)});
const mmUp=()=>{if(mmDrag){mmDrag=false;save();draw()}};mm.addEventListener('pointerup',mmUp);mm.addEventListener('pointercancel',mmUp);
addEventListener('keydown',e=>{if($('#menu').open)return;if(!$('#ctx').hidden&&e.key=='Escape'){ctxClose();return}if(document.body.classList.contains('vw')){if(e.key=='Escape')viewMode(false);else if(e.key.toLowerCase()=='f'&&!e.ctrlKey)fit();return}const typing=/INPUT|TEXTAREA|SELECT/.test(e.target.tagName),m=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
if(m&&k=='f'){e.preventDefault();ACT.find();return}
if(typing){if(k=='escape')e.target.blur();return}
if(e.code=='Space'){e.preventDefault();space=true;return}
if(m&&k=='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(m&&k=='y'){e.preventDefault();redo()}
else if(m&&k=='g'){e.preventDefault();e.shiftKey?ungrp():mkGroup()}
else if(m&&k=='c')copy();else if(m&&k=='v')paste();else if(m&&k=='d'){e.preventDefault();copy();paste()}
else if(m&&k=='a'){e.preventDefault();setSel(S.nodes.map(n=>n.id))}else if(m&&k=='s'){e.preventDefault();ACT.json()}
else if(k=='tab'){e.preventDefault();addChild()}else if(k=='enter'&&sel.size==1){e.preventDefault();$('#pt').focus();$('#pt').select()}
else if(k=='delete'||k=='backspace')del();else if(k=='escape'){linkFrom=null;setSel([])}
else if(k=='f')fit();else if(k=='v')setTool('select');else if(k=='h')setTool('pan');else if(k=='c')setTool('link');
else if(k=='[')rotateBy(-.2618);else if(k==']')rotateBy(.2618);
else if(k=='+'||k=='=')zoomC(1.25);else if(k=='-')zoomC(.8);
else if(k.startsWith('arrow')&&(sel.size||selG)){e.preventDefault();const d=e.shiftKey?100:20,[dx,dy]={arrowleft:[-d,0],arrowright:[d,0],arrowup:[0,-d],arrowdown:[0,d]}[k],ids=selG?gr().nodes:[...sel];ids.forEach(i=>{const n=N(i);if(n&&!n.lock){n.x+=dx;n.y+=dy}});commit()}});
addEventListener('keyup',e=>{if(e.code=='Space')space=false});
addEventListener('resize',draw);
/* ---------- экспорт / импорт ---------- */
function dl(b,name){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}
function svgStr(){const P=PAL[cfg.bg],b=bbox(),p=50,w=Math.round(b.w+2*p),h=Math.round(b.h+2*p+(cfg.sig?24:0)),x=b.x-p,y=b.y-p,bd=body(true);
return{w,h,s:`<svg xmlns="${NS}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" font-family="Inter,'Segoe UI',Arial,sans-serif">${defs()}${P.bg!='transparent'?`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${P.bg}"/>`:''}${bd}${cfg.sig?`<text x="${x+w-12}" y="${y+h-10}" text-anchor="end" font-size="12" fill="${P.edge}" opacity=".8">FlowForge Studio • github.com/smol0901-jpg</text>`:''}</svg>`}}
function canvas(sc,white){return new Promise((res,rej)=>{NM=new Map(S.nodes.map(n=>[n.id,n]));const{s,w,h}=svgStr(),im=new Image(),k=Math.min(sc,8000/Math.max(w,h)),c=document.createElement('canvas');c.width=w*k;c.height=h*k;const x=c.getContext('2d');if(white){x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height)}
im.onload=()=>{x.drawImage(im,0,0,c.width,c.height);res({c,w,h})};im.onerror=()=>rej(Error('render'));im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s)})}
function importText(t){try{const body=t.trim().replace(/^```(?:json|mermaid)?\s*/i,'').replace(/```\s*$/,'').trim(),mm=/^(flowchart|graph)\b/i.test(body),doc=mm?fromMermaid(body):JSON.parse(body);if(!mm&&doc&&doc.format=='flowforge-backup')return restoreBackup(doc);setDoc(doc);if(mm&&doc.dir=='LR')layout('LR');reveal();toast(`✅ ${mm?'Mermaid':'JSON'}: ${S.nodes.length} блоков, ${S.edges.length} связей`);return true}catch(e){toast('❌ Ошибка импорта: '+e.message);return false}}
const TYPES_DOC='terminal (овал: начало/конец), process (действие), decision (ромб: условие, 2 выхода «Да»/«Нет» в label связи), io (ввод/вывод), data (данные/БД), sub (подпроцесс), note (заметка), doc (документ), prep (подготовка, шестиугольник), conn (соединитель-кружок), manual (ручной ввод)';
const tplObj=()=>({format:'flowforge',version:'2.6',_instructions:{task:'ЗАМЕНИТЕ НА ВАШУ ЗАДАЧУ',types:TYPES_DOC,rules:['id — уникальные строки','x,y можно НЕ указывать: схема раскладывается автоматически','edges: {from,to,label?}','groups: рамки вокруг нескольких блоков (необязательно)'],edge_options:{route:'curve | ortho | line (необязательно)',dash:'solid | dashed | dotted | dashdot',arrow:'end | both | none',color:'#hex',width:'1..6'},example_node:{id:'n1',type:'terminal',text:'Начало'},example_edge:{from:'n1',to:'n2',label:'Да',dash:'dashed'},example_group:{id:'g1',title:'Склад',color:'#89b4fa',nodes:['n2','n3']}},nodes:[],edges:[],groups:[]});
const promptTxt=()=>`Ты — генератор блок-схем для FlowForge Studio.\n\nЗАДАЧА: ЗАМЕНИ ЭТУ СТРОКУ НА ОПИСАНИЕ ЗАДАЧИ.\n\nВерни ТОЛЬКО JSON без markdown:\n{"format":"flowforge","version":"2.1","nodes":[{"id":"n1","type":"terminal","text":"Начало"}],"edges":[{"from":"n1","to":"n2","label":"Да"}],"groups":[{"id":"g1","title":"Этап 1","nodes":["n2","n3"]}]}\n\nТипы блоков: ${TYPES_DOC}.\nКоординаты x,y не нужны — раскладка автоматическая. У decision — две исходящие связи с label «Да»/«Нет».\nНеобязательно для связей: dash (solid|dashed|dotted|dashdot), arrow (end|both|none), route (curve|ortho|line), color (#hex).\ngroups — только если нужно визуально объединить блоки в этап или участок.`;

const MENU=$('#menu'),ROUTE_N={curve:'плавные',ortho:'угловые',line:'прямые'};
function tab(n){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab==n));document.querySelectorAll('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!=n);if(n=='file')plist()}
function openMenu(n='file'){tab(n);if(!MENU.open)MENU.showModal();MENU.querySelector('.panes').scrollTop=0}
function syncUI(){document.querySelectorAll('#segRoute button').forEach(b=>b.classList.toggle('on',b.dataset.route==cfg.route));document.querySelectorAll('#segSc button').forEach(b=>b.classList.toggle('on',b.dataset.sc==cfg.sc));document.querySelectorAll('#bgs button').forEach(b=>b.classList.toggle('on',b.dataset.bg==cfg.bg));$('#snap').checked=cfg.snap;$('#map').checked=cfg.map;$('#sig').checked=cfg.sig;$('#grid').checked=cfg.grid;$('#guides').checked=cfg.guides;$('#depth').checked=cfg.depth;$('#splashSw').checked=cfg.splash;$('#nocross').checked=cfg.nocross;$('#noover').checked=cfg.noover;$('#trace').checked=cfg.trace;document.querySelectorAll('[data-rad]').forEach(b=>b.classList.toggle('on',+b.dataset.rad==(cfg.rad??10)));document.querySelectorAll('[data-gs]').forEach(b=>b.classList.toggle('on',+b.dataset.gs==(cfg.gs||20)));$('#flow').checked=cfg.flow;$('#pn').value=PJ[cfg.pid]?PJ[cfg.pid].n:'';$('#pnl').textContent=pname();$('#routeBtn').textContent={curve:'〰',ortho:'⌐',line:'╱'}[cfg.route]||'〰';$('#routeBtn').title='Линии: '+ROUTE_N[cfg.route]+' (нажмите, чтобы сменить)'}
const setCfg=(k,v)=>{cfg[k]=v;cfgSave();syncUI();draw();if(k=='bg'||k=='route')insp()};
$('#bgs').innerHTML=Object.keys(PAL).map(k=>`<button data-bg="${k}" style="background:${k=='none'?'conic-gradient(#8885 25%,#0000 0 50%,#8885 0 75%,#0000 0) 0 0/12px 12px,#2a2a3a':PAL[k].bg};color:${k=='none'?'#fff':ink(PAL[k].bg)}">${BGN[k]}</button>`).join('');
const ACT={undo,redo,fit,del,zin:()=>zoomC(1.25),zout:()=>zoomC(.8),menu:()=>openMenu('file'),grp:mkGroup,ungrp,
dup(){copy();paste()},rev(){const e=ed();if(e){[e.from,e.to]=[e.to,e.from];commit()}},resetc(){sel.forEach(i=>delete N(i).color);commit();insp()},resetec(){const x=ed();if(x){delete x.color;commit()}},
bg(){const k=Object.keys(PAL),n=k[(k.indexOf(cfg.bg)+1)%k.length];setCfg('bg',n);toast('Фон: '+BGN[n])},
route(){const k=['curve','ortho','line'],n=k[(k.indexOf(cfg.route)+1)%3];setCfg('route',n);toast('Линии: '+ROUTE_N[n])},
map(){setCfg('map',!cfg.map)},
new(){newProject();toast('Новая схема создана, прежняя сохранена в «Мои схемы»')},demo,tb:()=>layout('TB'),lr:()=>layout('LR'),open:()=>$('#fi').click(),
json:()=>dl(new Blob([JSON.stringify(ser(true),null,2)],{type:'application/json'}),`${slug(pname())}-${stamp()}.json`),
paste(){tab('ai');setTimeout(()=>$('#pasteBox').focus(),60)},tpl:()=>dl(new Blob([JSON.stringify(tplObj(),null,2)],{type:'application/json'}),'flowforge-template.json'),
prompt(){navigator.clipboard.writeText(promptTxt()).then(()=>toast('📋 Промпт скопирован'),()=>toast('Не удалось скопировать'))},
report(){const t=`FlowForge Studio v${VER}\n${navigator.userAgent}\nЭкран: ${innerWidth}x${innerHeight} (dpr ${devicePixelRatio})\nБлоков: ${S.nodes.length}, связей: ${S.edges.length}, групп: ${S.groups.length}\nФон: ${cfg.bg}, линии: ${cfg.route}, PWA: ${matchMedia('(display-mode: standalone)').matches?'да':'нет'}\n\nЧто случилось:`;navigator.clipboard.writeText(t).then(()=>toast('📎 Скопировано — вставьте в сообщение автору'),()=>toast('Не удалось скопировать'))},
async png(){if(!S.nodes.length)return toast('Схема пуста');const{c}=await canvas(+cfg.sc);c.toBlob(b=>dl(b,`${slug(pname())}-${stamp()}.png`))},
svg(){NM=new Map(S.nodes.map(n=>[n.id,n]));dl(new Blob([svgStr().s],{type:'image/svg+xml'}),`${slug(pname())}-${stamp()}.svg`)},
async pdf(){if(!window.jspdf)return toast('PDF: нужна сеть для jsPDF');const{c,w,h}=await canvas(2,true),d=new jspdf.jsPDF({orientation:w>h?'l':'p',unit:'px',format:[w,h]});d.addImage(c.toDataURL('image/png'),'PNG',0,0,w,h);d.save(`${slug(pname())}-${stamp()}.pdf`)},
async share(){const{c}=await canvas(2);c.toBlob(b=>{const f=new File([b],'flowforge.png',{type:'image/png'});navigator.canShare&&navigator.canShare({files:[f]})?navigator.share({files:[f]}).catch(()=>{}):dl(b,'flowforge.png')})},
install(){window.dp&&window.dp.prompt()}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a],[data-t],[data-add],[data-tab],[data-route],[data-sc],[data-bg],[data-close],[data-al],[data-tpl],[data-pj],[data-pdel],[data-lint],[data-rad],[data-gs]');if(!b)return;
if(b.hasAttribute('data-close'))return MENU.close();
if(b.dataset.al)return align(b.dataset.al);
if(b.dataset.lint!=null)return lintGo(+b.dataset.lint);
if(b.dataset.rad!=null)return setCfg('rad',+b.dataset.rad);if(b.dataset.gs)return setCfg('gs',+b.dataset.gs);
if(b.dataset.tpl!=null)return(MENU.close(),useTpl(+b.dataset.tpl));
if(b.dataset.pj)return(MENU.close(),openProject(b.dataset.pj));
if(b.dataset.pdel){if(b.dataset.arm){delete PJ[b.dataset.pdel];try{localStorage.ffProj=JSON.stringify(PJ)}catch{}return plist()}b.dataset.arm='1';b.textContent='Точно?';setTimeout(()=>{b.dataset.arm='';b.textContent='🗑'},2500);return}
if(b.dataset.tab)return tab(b.dataset.tab);
if(b.dataset.route)return setCfg('route',b.dataset.route);if(b.dataset.sc)return setCfg('sc',+b.dataset.sc);if(b.dataset.bg)return setCfg('bg',b.dataset.bg);
if(b.dataset.t)return setTool(b.dataset.t);if(b.dataset.add)return addFromPalette(b.dataset.add);
const a=b.dataset.a;if(MENU.open&&!b.hasAttribute('data-keep'))MENU.close();const r=ACT[a]&&ACT[a]();if(r&&r.catch)r.catch(()=>toast('❌ Ошибка экспорта'))});
MENU.addEventListener('click',e=>{if(e.target===MENU)MENU.close()});
$('#pasteGo').onclick=()=>{if(importText($('#pasteBox').value)){$('#pasteBox').value='';MENU.close()}};
$('#fi').onchange=e=>{const f=e.target.files[0];if(f)f.text().then(importText);e.target.value=''};
addEventListener('dragover',e=>e.preventDefault());addEventListener('drop',e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)f.text().then(importText)});
$('#snap').onchange=e=>setCfg('snap',e.target.checked);$('#map').onchange=e=>setCfg('map',e.target.checked);$('#sig').onchange=e=>setCfg('sig',e.target.checked);
addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.dp=e;$('#instBox').hidden=false});
addEventListener('appinstalled',()=>{$('#instBox').hidden=true;toast('✅ Установлено')});
if('serviceWorker' in navigator&&location.protocol!='file:'){const had=!!navigator.serviceWorker.controller;navigator.serviceWorker.register('sw.js').catch(()=>{});navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had)toast('🔄 Вышла новая версия. Перезапустите приложение, чтобы применить')})}
syncUI();
/* ---------- старт ---------- */
/* ===== v2.2: направляющие, раскладка без сети, выравнивание, поиск, проекты, Mermaid, шаблоны ===== */
function guides(){const mv=[...g.o.keys()].map(N).filter(Boolean);if(!mv.length)return;let a=1e9,b=1e9,c=-1e9,d=-1e9;mv.forEach(n=>{a=Math.min(a,n.x);b=Math.min(b,n.y);c=Math.max(c,n.x+n.w);d=Math.max(d,n.y+n.h)});
const th=7/S.cam.k,X=[a,(a+c)/2,c],Y=[b,(b+d)/2,d];let bx=null,by=null;
S.nodes.forEach(o=>{if(g.o.has(o.id))return;[o.x,o.x+o.w/2,o.x+o.w].forEach(v=>X.forEach(m=>{const df=v-m;if(Math.abs(df)<=th&&(!bx||Math.abs(df)<Math.abs(bx.df)))bx={df,v}}));[o.y,o.y+o.h/2,o.y+o.h].forEach(v=>Y.forEach(m=>{const df=v-m;if(Math.abs(df)<=th&&(!by||Math.abs(df)<Math.abs(by.df)))by={df,v}}))});
if(bx)mv.forEach(n=>n.x=Math.round(n.x+bx.df));if(by)mv.forEach(n=>n.y=Math.round(n.y+by.df));
const bb=bbox(),e=60,st='stroke="#f38ba8" stroke-width="1.2" stroke-dasharray="5 4"';ov=(bx?`<path d="M${bx.v} ${bb.y-e}V${bb.y+bb.h+e}" ${st}/>`:'')+(by?`<path d="M${bb.x-e} ${by.v}H${bb.x+bb.w+e}" ${st}/>`:'')}
/* раскладка без dagre: слои по длиннейшему пути, порядок по барицентрам */
function simpleLayout(dir){const nd=S.nodes,st=new Map(),back=new Set(),out=new Map(nd.map(n=>[n.id,[]]));S.edges.forEach(e=>out.get(e.from)&&out.get(e.from).push(e));
const dfs=u=>{st.set(u,1);for(const e of out.get(u)){const v=e.to;if(!st.get(v))dfs(v);else if(st.get(v)==1)back.add(e.id)}st.set(u,2)};
const hasIn=new Set(S.edges.map(e=>e.to));nd.filter(n=>!hasIn.has(n.id)).forEach(n=>{if(!st.get(n.id))dfs(n.id)});nd.forEach(n=>{if(!st.get(n.id))dfs(n.id)});
const rk=new Map(nd.map(n=>[n.id,0])),fe=S.edges.filter(e=>!back.has(e.id));
for(let it=0;it<nd.length;it++){let ch=false;fe.forEach(e=>{if(rk.get(e.to)<rk.get(e.from)+1){rk.set(e.to,rk.get(e.from)+1);ch=true}});if(!ch)break}
const L=[];nd.forEach(n=>{(L[rk.get(n.id)]=L[rk.get(n.id)]||[]).push(n)});const pos=new Map();
L.forEach(ly=>ly&&ly.forEach((n,i)=>pos.set(n.id,i)));
const bary=n=>{const p=fe.filter(e=>e.to==n.id).map(e=>pos.get(e.from)).filter(v=>v!=null);return p.length?p.reduce((s,v)=>s+v,0)/p.length:pos.get(n.id)};
for(let pass=0;pass<2;pass++)L.forEach((ly,ri)=>{if(!ly||!ri)return;ly.sort((a,b)=>bary(a)-bary(b));ly.forEach((n,i)=>pos.set(n.id,i))});
const LR=dir=='LR',gA=LR?90:70,gB=LR?40:50,size=n=>LR?n.h:n.w,sizes=L.map(ly=>ly.reduce((s,n)=>s+size(n)+gB,-gB)),mxs=Math.max(...sizes);let cur=0;
L.forEach((ly,ri)=>{const th=Math.max(...ly.map(n=>LR?n.w:n.h));let q=(mxs-sizes[ri])/2;ly.forEach(n=>{if(LR){n.x=G(cur+(th-n.w)/2);n.y=G(q)}else{n.x=G(q);n.y=G(cur+(th-n.h)/2)}q+=size(n)+gB});cur+=th+gA})}
/* выравнивание и распределение */
function align(k){const ns=[...sel].map(N).filter(n=>n&&!n.lock);if(ns.length<2)return;const mn=f=>Math.min(...ns.map(f)),mx=f=>Math.max(...ns.map(f));
if(k=='l'){const v=mn(n=>n.x);ns.forEach(n=>n.x=v)}else if(k=='r'){const v=mx(n=>n.x+n.w);ns.forEach(n=>n.x=v-n.w)}else if(k=='c'){const v=(mn(n=>n.x)+mx(n=>n.x+n.w))/2;ns.forEach(n=>n.x=Math.round(v-n.w/2))}
else if(k=='t'){const v=mn(n=>n.y);ns.forEach(n=>n.y=v)}else if(k=='b'){const v=mx(n=>n.y+n.h);ns.forEach(n=>n.y=v-n.h)}else if(k=='m'){const v=(mn(n=>n.y)+mx(n=>n.y+n.h))/2;ns.forEach(n=>n.y=Math.round(v-n.h/2))}
else if(k=='dh'||k=='dv'){const H=k=='dh',p=H?'x':'y',s=H?'w':'h';ns.sort((a,b)=>a[p]-b[p]);const lo=ns[0][p],hi=ns[ns.length-1][p]+ns[ns.length-1][s],tot=ns.reduce((t,n)=>t+n[s],0),gap=(hi-lo-tot)/(ns.length-1);let c=lo;ns.forEach(n=>{n[p]=Math.round(c);c+=n[s]+gap})}
commit()}
/* поиск блока */
let FM=[],fi=0;
function focusN(n){S.cam.k=Math.max(S.cam.k,.7);const r=svg.getBoundingClientRect();anchor(n.x+n.w/2,n.y+n.h/2,r.width/2,r.height/2);setSel([n.id]);save()}
function findRun(){const q=$('#fq').value.trim().toLowerCase();FM=q?S.nodes.filter(n=>n.text.toLowerCase().includes(q)):[];fi=0;$('#fc').textContent=q?(FM.length?`1/${FM.length}`:'0'):'';if(FM.length)focusN(FM[0])}
function findStep(d){if(!FM.length)return;fi=(fi+d+FM.length)%FM.length;$('#fc').textContent=`${fi+1}/${FM.length}`;focusN(FM[fi])}
$('#fq').oninput=findRun;$('#fq').onkeydown=e=>{if(e.key=='Enter'){e.preventDefault();findStep(e.shiftKey?-1:1)}else if(e.key=='Escape'){ACT.fclose()}};
/* мои схемы */
function newProject(name,doc){saveNow();hist=[];hi=-1;cfg.pid='p'+Date.now().toString(36);cfgSave();PJ[cfg.pid]={n:name||'Схема '+(Object.keys(PJ).length+1),t:Date.now(),d:{nodes:[],edges:[]}};
if(doc)setDoc(doc);else{S.nodes=[];S.edges=[];S.groups=[];sel=new Set();selE=null;selG=null;S.cam={x:60,y:40,k:1,r:0};commit()}syncUI()}
function openProject(id){const p=PJ[id];if(!p)return;saveNow();hist=[];hi=-1;cfg.pid=id;cfgSave();setDoc(p.d);syncUI();toast('Открыта: '+p.n)}
function plist(){const ids=Object.keys(PJ).sort((a,b)=>PJ[b].t-PJ[a].t);$('#plist').innerHTML=ids.map(id=>{const p=PJ[id],cur=id==cfg.pid;return`<div class="pr${cur?' cur':''}"><button class="po" data-pj="${id}"><b>${esc(p.n)}</b><small>${p.d.nodes.length} бл · ${new Date(p.t).toLocaleDateString('ru')}${cur?' · открыта':''}</small></button>${cur?'':`<button class="pd" data-pdel="${id}" title="Удалить">🗑</button>`}</div>`}).join('')||'<p class="note">Пока нет сохранённых схем</p>'}
$('#pn').oninput=e=>{const p=PJ[cfg.pid];if(p){p.n=e.target.value||'Без названия';save();$('#pnl').textContent=p.n}};
/* Mermaid: экспорт и импорт */
function toMermaid(){const ids=new Map(S.nodes.map((n,i)=>[n.id,'N'+(i+1)])),q=s=>String(s).replace(/"/g,"'").replace(/\n/g,'<br/>');
const sh={terminal:['(["','"])'],process:['["','"]'],decision:['{"','"}'],io:['[/"','"/]'],data:['[("','")]'],sub:['[["','"]]'],note:['>"','"]'],doc:['["','"]'],prep:['{{"','"}}'],conn:['(("','"))'],manual:['[/"','"\\]']};
const decl=n=>{const[a,b]=sh[n.type]||sh.process;return`${ids.get(n.id)}${a}${q(n.text)}${b}`},inG=new Set(S.groups.flatMap(g=>g.nodes));let o='flowchart TD\n';
S.nodes.filter(n=>!inG.has(n.id)).forEach(n=>o+='  '+decl(n)+'\n');
S.groups.forEach((g,i)=>{o+=`  subgraph G${i+1}["${q(g.title)}"]\n`;g.nodes.map(N).filter(Boolean).forEach(n=>o+='    '+decl(n)+'\n');o+='  end\n'});
S.edges.forEach(e=>{const ar=e.arrow=='none'?'---':e.arrow=='both'?'<-->':(e.dash&&e.dash!='solid')?'-.->':(e.width>=4?'==>':'-->');o+=`  ${ids.get(e.from)} ${ar}${e.label?`|"${q(e.label)}"|`:''} ${ids.get(e.to)}\n`});return o}
const MO=[['([',['])'],['terminal']],['[[',[']]'],['sub']],['[(',[')]'],['data']],['((',['))'],['conn']],['{{',['}}'],['prep']],['[/',['/]','\\]'],['io','manual']],['[\\',['\\]','/]'],['io','manual']],['[',[']'],['process']],['(',[')'],['process']],['{',['}'],['decision']],['>',[']'],['note']]];
function fromMermaid(src){const lines=src.replace(/```(?:mermaid)?/gi,'').replace(/%%[^\n]*/g,'').split(/\n|;/).map(s=>s.trim()).filter(Boolean);
const head=lines.shift()||'',hm=head.match(/^(?:flowchart|graph)(?:\s+(TB|TD|BT|LR|RL))?/i);if(!hm)throw Error('это не Mermaid (нужно «flowchart TD …»)');
let dir=(hm[1]||'TB').toUpperCase();if(dir=='TD'||dir=='BT')dir='TB';if(dir=='RL')dir='LR';
const nodes=new Map(),edges=[],groups=[],stack=[],ID=/^[\w\u0400-\u04FF]+/;
const getNode=(id,text,type)=>{let n=nodes.get(id);if(!n){n={id,type:type||'process',text:text??id};nodes.set(id,n)}else{if(text!=null)n.text=text;if(type)n.type=type}
 if(stack.length&&!groups.some(x=>x.nodes.includes(id)))stack[stack.length-1].nodes.push(id);return n};
const parseNode=(s,i)=>{const m=s.slice(i).match(ID);if(!m)return null;const id=m[0];let j=i+id.length,text=null,type=null;
 for(const[o,cl,ty]of MO){if(!s.startsWith(o,j))continue;let k=j+o.length;while(s[k]==' ')k++;let end=-1,ci=0,txt;
  if(s[k]=='"'){const q=s.indexOf('"',k+1);if(q<0)break;txt=s.slice(k+1,q);let z=q+1;while(s[z]==' ')z++;const cj=cl.findIndex(c=>s.startsWith(c,z));if(cj<0)break;end=z+cl[cj].length;ci=cj}
  else{let best=-1;cl.forEach((c,cj)=>{const p=s.indexOf(c,k);if(p>=0&&(best<0||p<best)){best=p;ci=cj}});if(best<0)break;txt=s.slice(k,best).trim();end=best+cl[ci].length}
  text=txt.replace(/<br\s*\/?>/gi,'\n').replace(/&quot;/g,'"');type=ty[Math.min(ci,ty.length-1)];j=end;break}
 return{id,text,type,end:j}};
const parseArrow=(s,i)=>{const r=s.slice(i);let m,len,body,both=false;
 if((m=r.match(/^(<)?--\s+(.+?)\s+(-->|---|--[xo])/))||(m=r.match(/^(<)?-\.\s+(.+?)\s+(\.->|\.-)/))||(m=r.match(/^(<)?==\s+(.+?)\s+(==>|===)/))){both=!!m[1];len=m[0].length;body=m[3];var lab=m[2]}
 else if(m=r.match(/^(<)?(-{2,}>|-{3,}|={2,}>|={3,}|-\.+->|-\.+-|--[xo])/)){both=!!m[1];len=m[0].length;body=m[2]}else return null;
 const lm=s.slice(i+len).match(/^\s*\|([^|]*)\|\s*/);let label=lab;if(lm){label=lm[1].replace(/^\s*"|"\s*$/g,'');len+=lm[0].length}else{const sp=s.slice(i+len).match(/^\s*/);len+=sp[0].length}
 const p={};if(label)p.label=String(label).replace(/<br\s*\/?>/gi,' ');if(body.includes('.'))p.dash='dashed';if(body.includes('='))p.width=4;if(!body.includes('>')&&!/[xo]$/.test(body)||/^---+$/.test(body))p.arrow=both?'both':'none';else if(both)p.arrow='both';return{len,props:p}};
for(const ln of lines){let m;
 if(m=ln.match(/^subgraph\s+(.*)$/i)){const rest=m[1].trim(),mm=rest.match(/^[\w\u0400-\u04FF]+\s*\[(.*)\]$/);let title=mm?mm[1]:rest;title=title.replace(/^"|"$/g,'').replace(/<br\s*\/?>/gi,' ');const gg={title,nodes:[]};groups.push(gg);stack.push(gg);continue}
 if(/^end$/i.test(ln)){stack.pop();continue}
 if(/^(direction|style|classDef|class|linkStyle|click|accTitle|accDescr)\b/i.test(ln))continue;
 let i=0;const skip=()=>{while(ln[i]==' ')i++};
 const readGroup=()=>{const gl=[];for(;;){skip();const n=parseNode(ln,i);if(!n)return gl.length?gl:null;i=n.end;gl.push(getNode(n.id,n.text,n.type).id);skip();if(ln[i]=='&'){i++;continue}return gl}};
 let prev=readGroup();
 while(prev){skip();if(i>=ln.length)break;const a=parseArrow(ln,i);if(!a)break;i+=a.len;const nx=readGroup();if(!nx)break;prev.forEach(p=>nx.forEach(q=>edges.push({from:p,to:q,...a.props})));prev=nx}}
if(!nodes.size)throw Error('в Mermaid не найдено блоков');
return{nodes:[...nodes.values()],edges,groups:groups.filter(x=>x.nodes.length).map((x,k)=>({id:'g'+(k+1),title:x.title,nodes:x.nodes})),dir}}
/* шаблоны (описаны в Mermaid) */
const TPLS=[
{i:'🌳',n:'ХАССП: дерево решений ККТ',d:'Определение критических контрольных точек',m:`flowchart TD
S(["Этап процесса и опасность"]) --> Q1{"Q1: Есть меры контроля?"}
Q1 -->|Да| Q2
Q1 -->|Нет| Q1a{"Контроль здесь нужен для безопасности?"}
Q1a -->|Да| M["Изменить этап, процесс или продукт"]
M --> Q1
Q1a -->|Нет| N1(["Не ККТ"])
Q2{"Q2: Этап снижает опасность до приемлемого уровня?"}
Q2 -->|Да| K1(["ККТ"])
Q2 -->|Нет| Q3{"Q3: Опасность может превысить допустимый уровень?"}
Q3 -->|Нет| N2(["Не ККТ"])
Q3 -->|Да| Q4{"Q4: Последующий этап устранит опасность?"}
Q4 -->|Да| N3(["Не ККТ"])
Q4 -->|Нет| K2(["ККТ"])`},
{i:'🍳',n:'Технологическая схема блюда',d:'От приёмки сырья до раздачи, с контролем t°',m:`flowchart TD
A(["Начало"]) --> B[/"Приёмка сырья"/]
B --> C{"Качество и t° в норме?"}
C -->|Нет| D["Возврат поставщику, акт"]
D --> Z(["Конец"])
C -->|Да| E[("Хранение: холод или сухой склад")]
E --> F["Подготовка: мытьё, очистка, нарезка"]
F --> G["Тепловая обработка"]
G --> H{"t° в центре не ниже 75 °C?"}
H -->|Нет| G
H -->|Да| I["Охлаждение или раздача"]
I --> J[["Запись в журнал"]]
J --> Z
subgraph P["Горячий цех"]
F
G
H
end`},
{i:'📦',n:'Входной контроль сырья',d:'Документы, температура, органолептика',m:`flowchart TD
A(["Поставка прибыла"]) --> B["Проверка документов"]
B --> C{"Сертификаты и накладная в порядке?"}
C -->|Нет| R(["Отказ в приёмке"])
C -->|Да| D["Осмотр упаковки и маркировки"]
D --> E["Замер температуры"]
E --> F{"Показатели в норме?"}
F -->|Нет| R
F -->|Да| G["Органолептическая оценка"]
G --> H{"Качество соответствует?"}
H -->|Нет| R
H -->|Да| I[["Запись в журнал входного контроля"]]
I --> J(["Приёмка и размещение на хранение"])
R --> K["Акт о несоответствии"]`},
{i:'⚠️',n:'Корректирующие действия',d:'Что делать при отклонении на ККТ',m:`flowchart TD
A(["Выявлено отклонение на ККТ"]) --> B["Остановить процесс"]
B --> C["Изолировать продукцию"]
C --> D{"Продукцию можно доработать?"}
D -->|Да| E["Доработка или повторная обработка"]
E --> F{"Повторный контроль пройден?"}
F -->|Да| G(["Продукция допущена"])
F -->|Нет| H["Утилизация"]
D -->|Нет| H
H --> I[["Запись в журнал отклонений"]]
G --> I
I --> J["Анализ причин и профилактика"]
J --> K(["Конец"])`},
{i:'✍️',n:'Согласование документа',d:'С группами по ролям: исполнитель и руководитель',m:`flowchart TD
subgraph U["Исполнитель"]
A(["Начало"])
B["Подготовить документ"]
end
subgraph R["Руководитель"]
C{"Согласовано?"}
D["Внести правки"]
end
A --> B
B --> C
C -->|Нет| D
D --> B
C -->|Да| E(["Утверждено"])`},
{i:'🧮',n:'Базовый алгоритм',d:'Ввод, условие, две ветки, вывод',m:`flowchart TD
A(["Начало"]) --> B[/"Ввод данных"/]
B --> C{"Условие выполнено?"}
C -->|Да| D["Действие 1"]
C -->|Нет| E["Действие 2"]
D --> F[/"Вывод результата"/]
E --> F
F --> G(["Конец"])`},
{i:'🧽',n:'Мойка и дезинфекция оборудования',d:'Порядок обработки и контроль результата',m:`flowchart TD
A(["Конец смены или смена продукта"]) --> B["Отключить оборудование от сети"]
B --> C["Разобрать, снять съёмные части"]
C --> D["Удалить остатки продукции"]
D --> E["Мойка моющим раствором"]
E --> F["Ополаскивание водой"]
F --> G["Дезинфекция по инструкции"]
G --> H["Ополаскивание и сушка"]
H --> I{"Визуальный контроль: чисто?"}
I -->|Нет| E
I -->|Да| J["Собрать оборудование"]
J --> K[["Запись в журнал мойки"]]
K --> L(["Готово к работе"])`},
{i:'❄️',n:'Охлаждение готовой продукции',d:'Контроль температуры и времени по вашей НТД',m:`flowchart TD
A(["Продукция готова"]) --> B["Замер температуры в центре"]
B --> C{"Режим тепловой обработки выдержан?"}
C -->|Нет| D["Доработать и повторить замер"]
D --> B
C -->|Да| E["Разложить в ёмкости, быстрое охлаждение"]
E --> F["Контроль температуры и времени"]
F --> G{"Температура и время по НТД?"}
G -->|Нет| H["Корректирующие действия"]
H --> I[["Запись в журнал отклонений"]]
G -->|Да| J["Маркировка: дата и время"]
J --> K[("Хранение в холодильнике")]
K --> L[["Запись в журнал"]]
I --> M(["Конец"])
L --> M`},
{i:'🗣️',n:'Работа с жалобой гостя',d:'От обращения до анализа причин',m:`flowchart TD
A(["Получена жалоба"]) --> B["Зафиксировать обращение"]
B --> C{"Есть угроза безопасности?"}
C -->|Да| D["Изолировать партию и уведомить ответственного"]
C -->|Нет| E["Разобраться в причине"]
D --> E
E --> F["Подготовить ответ гостю"]
F --> G["Компенсация или исправление"]
G --> H[["Запись в журнал жалоб"]]
H --> I["Анализ причин и меры, чтобы не повторилось"]
I --> J(["Закрыто"])`}];
$('#tpllist').innerHTML=TPLS.map((t,i)=>`<button class="card" data-tpl="${i}"><i>${t.i}</i><b>${t.n}</b><small>${t.d}</small></button>`).join('');
function useTpl(i){const t=TPLS[i],d=fromMermaid(t.m);newProject(t.n,d);if(d.dir=='LR')layout('LR');reveal();toast('Шаблон открыт как новая схема')}
Object.assign(ACT,{
lock(){const ns=[...sel].map(N).filter(Boolean);if(!ns.length)return;const v=!ns.every(n=>n.lock);ns.forEach(n=>v?n.lock=true:delete n.lock);commit();toast(v?'🔒 Закреплено':'🔓 Откреплено')},
front(){const ns=S.nodes.filter(n=>sel.has(n.id));S.nodes=[...S.nodes.filter(n=>!sel.has(n.id)),...ns];commit()},
back(){const ns=S.nodes.filter(n=>sel.has(n.id));S.nodes=[...ns,...S.nodes.filter(n=>!sel.has(n.id))];commit()},
autosz(){sel.forEach(i=>{const n=N(i);delete n.sw;delete n.sh;dim(n)});commit()},
find(){const f=$('#find');f.hidden=!f.hidden;if(!f.hidden){$('#fq').focus();$('#fq').select()}},
fclose(){$('#find').hidden=true;$('#fq').blur()},fprev(){findStep(-1)},fnext(){findStep(1)},
mmd(){navigator.clipboard.writeText(toMermaid()).then(()=>toast('📋 Mermaid скопирован'),()=>toast('Не удалось скопировать'))},
async copypng(){if(!S.nodes.length)return toast('Схема пуста');const{c}=await canvas(+cfg.sc);c.toBlob(b=>navigator.clipboard.write([new ClipboardItem({'image/png':b})]).then(()=>toast('✅ Картинка в буфере обмена'),()=>toast('Браузер не разрешил — используйте PNG')))}});
$('#pf').onchange=e=>{const v=+e.target.value;sel.forEach(i=>{const n=N(i);if(!n)return;v==14?delete n.fs:n.fs=v;dim(n)});commit()};
$('#grid').onchange=e=>setCfg('grid',e.target.checked);$('#guides').onchange=e=>setCfg('guides',e.target.checked);

/* ===== v2.3: изломы линий ===== */
function wpSnap(o){const wo=new Map();S.edges.forEach(e=>{if(e.pts&&o.has(e.from)&&o.has(e.to))wo.set(e.id,e.pts.map(v=>[...v]))});return wo}
function shiftWp(){if(!g.wo||!g.wo.size)return;const[id0,[ox0,oy0]]=[...g.o][0],n0=N(id0),dx=n0.x-ox0,dy=n0.y-oy0;g.wo.forEach((orig,eid)=>{const e=S.edges.find(x=>x.id==eid);if(e)e.pts=orig.map(([x,y])=>[x+dx,y+dy])})}
Object.assign(ACT,{rstpts(){const e=ed();if(e&&e.pts){delete e.pts;commit()}}});
$('#depth').onchange=e=>setCfg('depth',e.target.checked);$('#flow').onchange=e=>setCfg('flow',e.target.checked);

(()=>{const ua=navigator.userAgent,ios=/iPhone|iPad|iPod/.test(ua)||(navigator.platform=='MacIntel'&&navigator.maxTouchPoints>1),an=/Android/.test(ua),sa=matchMedia('(display-mode: standalone)').matches||navigator.standalone,el=document.getElementById(sa?'ins-pc':ios?'ins-ios':an?'ins-and':'ins-pc');if(el&&!sa)el.open=true;if(sa)$('#insDone').hidden=false})();
/* ===== v2.4: контакты, режим просмотра, проверка схемы, ссылка, резервная копия, Tab/Enter ===== */
const LINKS={tg:'https://t.me/ASV_prod',dzen:'https://dzen.ru/asv_prod',vk:'https://vk.com/smolyaninovchef',gh:'https://github.com/smol0901-jpg'};
document.querySelectorAll('[data-ln]').forEach(a=>a.href=LINKS[a.dataset.ln]);
let VWP=null,LL=[];
function viewMode(on){const b=document.body;on=on??!b.classList.contains('vw');b.classList.toggle('vw',on);
if(on){VWP=tool;setSel([]);setTool('pan');$('#lintp').hidden=true;$('#find').hidden=true;try{if(matchMedia('(pointer:fine)').matches&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{})}catch{}toast('Режим просмотра. Выход: Esc или кнопка справа вверху')}
else{setTool(VWP||'select');try{if(document.fullscreenElement)document.exitFullscreen()}catch{}}
setTimeout(()=>{fit();draw()},90)}
function addChild(){if(sel.size!=1)return;const s=N([...sel][0]);if(!s)return;const kids=S.edges.filter(e=>e.from==s.id).map(e=>N(e.to)).filter(Boolean),first=!kids.length,n=addNode('process',0,0);
n.x=G(first?s.x+(s.w-n.w)/2:Math.max(...kids.map(k=>k.x+k.w))+40);n.y=G(s.y+s.h+70);const lb=s.type=='decision'?(first?'Да':kids.length==1?'Нет':''):'';
addEdge(s.id,n.id,lb);sel=new Set([n.id]);selE=null;selG=null;commit();if(matchMedia('(pointer:fine)').matches)setTimeout(()=>{$('#pt').focus();$('#pt').select()},40)}
/* проверка схемы */
function lint(){const out=[],ns=S.nodes.filter(n=>n.type!='note');if(!ns.length)return[{l:'info',m:'Схема пуста',ids:[]}];
const inn=new Map(ns.map(n=>[n.id,0])),outn=new Map(ns.map(n=>[n.id,[]]));S.edges.forEach(e=>{if(inn.has(e.to))inn.set(e.to,inn.get(e.to)+1);if(outn.has(e.from))outn.get(e.from).push(e)});
const starts=ns.filter(n=>n.type=='terminal'&&!inn.get(n.id)),ends=ns.filter(n=>n.type=='terminal'&&!outn.get(n.id).length);
if(!starts.length)out.push({l:'warn',m:'Нет блока «Начало»: овал без входящих связей',ids:[]});
if(starts.length>1)out.push({l:'warn',m:`Несколько входов (${starts.length}): проверьте, что так задумано`,ids:starts.map(n=>n.id)});
if(!ends.length)out.push({l:'warn',m:'Нет блока «Конец»: овал без исходящих связей',ids:[]});
ns.forEach(n=>{const o=outn.get(n.id),i=inn.get(n.id),t=n.text.replace(/\s+/g,' ').trim().slice(0,28);
 if(!n.text.trim())out.push({l:'err',m:'Блок без текста',ids:[n.id]});
 if(!i&&!o.length&&n.type!='conn'){out.push({l:'err',m:`«${t||'без текста'}» ни с чем не соединён`,ids:[n.id]});return}
 if(n.type=='decision'){if(o.length<2)out.push({l:'err',m:`Условие «${t}»: нужно минимум 2 выхода, сейчас ${o.length}`,ids:[n.id]});else if(o.some(e=>!(e.label||'').trim()))out.push({l:'warn',m:`Условие «${t}»: подпишите ветки (Да / Нет)`,ids:[n.id]})}
 else if(!o.length&&n.type!='terminal'&&n.type!='conn')out.push({l:'warn',m:`«${t}»: тупик, нет выхода`,ids:[n.id]})});
if(starts.length){const seen=new Set(),q=starts.map(n=>n.id);while(q.length){const u=q.pop();if(seen.has(u))continue;seen.add(u);(outn.get(u)||[]).forEach(e=>q.push(e.to))}
 const un=ns.filter(n=>!seen.has(n.id)&&(inn.get(n.id)||outn.get(n.id).length)&&!(n.type=='terminal'&&!inn.get(n.id)));if(un.length)out.push({l:'warn',m:`Не достижимо от «Начала»: ${un.length} бл.`,ids:un.map(n=>n.id)})}
return out}
function lintShow(){LL=lint();const err=LL.filter(x=>x.l=='err').length,wr=LL.filter(x=>x.l=='warn').length;
$('#lintl').innerHTML=(LL.length&&LL[0].l!='info'?`<p class="lsum">Ошибок: ${err} · замечаний: ${wr}</p>`:LL.length?`<p class="lsum">${LL[0].m}</p>`:'<p class="lok">✅ Проблем не найдено. Схема выглядит цельной.</p>')+LL.filter(x=>x.l!='info').map((x,i)=>`<button class="li ${x.l}" data-lint="${LL.indexOf(x)}"><b>${x.l=='err'?'⛔':'⚠️'}</b><span>${esc(x.m)}</span></button>`).join('');$('#lintp').hidden=false}
function fitIds(ids){const ns=ids.map(N).filter(Boolean);if(!ns.length)return;let a=1e9,b=1e9,c=-1e9,d=-1e9;ns.forEach(n=>{a=Math.min(a,n.x);b=Math.min(b,n.y);c=Math.max(c,n.x+n.w);d=Math.max(d,n.y+n.h)});fitRect(a,b,c-a,d-b,1.4,.2)}
function lintGo(i){const it=LL[i];if(!it||!it.ids.length)return;setSel(it.ids);it.ids.length==1?focusN(N(it.ids[0])):fitIds(it.ids)}
/* ссылка на схему: данные внутри адреса, сервер не нужен */
const b64u=u=>{let s='';u.forEach(c=>s+=String.fromCharCode(c));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')},unb64u=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
async function pack(t){const u=new TextEncoder().encode(t);if(window.CompressionStream){const s=new Blob([u]).stream().pipeThrough(new CompressionStream('deflate-raw'));return'd='+b64u(new Uint8Array(await new Response(s).arrayBuffer()))}return'j='+b64u(u)}
async function unpack(h){const m=h.match(/^#?([dj])=(.+)$/);if(!m)return null;const u=unb64u(m[2]);if(m[1]=='j')return new TextDecoder().decode(u);const s=new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'));return new TextDecoder().decode(await new Response(s).arrayBuffer())}
function restoreBackup(b){let n=0;Object.entries(b.projects||{}).forEach(([id,p])=>{if(!p||!p.d||!Array.isArray(p.d.nodes))return;let k=id;while(PJ[k])k=id+'_'+Math.random().toString(36).slice(2,5);PJ[k]={n:p.n||'Схема',t:p.t||Date.now(),d:p.d};n++});try{localStorage.ffProj=JSON.stringify(PJ)}catch{}toast(n?`🛟 Восстановлено схем: ${n}. Они в «Мои схемы»`:'В файле нет схем');plist();return true}
Object.assign(ACT,{view:()=>viewMode(),lint:lintShow,lintx(){$('#lintp').hidden=true},
async link(){const url=location.href.split('#')[0]+'#'+await pack(JSON.stringify(ser()));try{if(navigator.share&&matchMedia('(pointer:coarse)').matches){await navigator.share({title:pname(),url});return}}catch{}
navigator.clipboard.writeText(url).then(()=>toast(url.length>6000?`🔗 Ссылка скопирована (${url.length} симв.). Длинная: в мессенджерах может обрезаться, надёжнее JSON`:'🔗 Ссылка на схему скопирована'),()=>toast('Не удалось скопировать'))},
backup(){saveNow();dl(new Blob([JSON.stringify({format:'flowforge-backup',version:1,ts:Date.now(),projects:PJ},null,2)],{type:'application/json'}),`flowforge-backup-${stamp()}.json`);toast('🛟 Резервная копия сохранена. Восстановление: «Открыть»')}});
$('#splashSw').onchange=e=>setCfg('splash',e.target.checked);
/* ===== v2.5: запрет пересечений, быстрые действия, размеры, наложение ===== */
function routeAll(){NCON=false;if(!cfg.nocross)return;if(S.edges.length>120){if(!NCW){NCW=true;toast('Запрет пересечений работает до 120 связей')}return}if(g&&g.t=='drag'&&g.mv)return;
const key=NSIG+'|'+cfg.route+'|'+S.edges.map(e=>e.id+e.from+e.to+(e.route||'')+(e.pts?e.pts.join():'')).join(';');
if(key!==NCK){NCK=key;NCV++;NCR=new Map();const segs=[],dist=e=>{const a=NM.get(e.from),b=NM.get(e.to);return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)},todo=S.edges.filter(e=>!(e.pts&&e.pts.length)&&(e.route||'ortho')=='ortho'&&NM.has(e.from)&&NM.has(e.to)).sort((u,v)=>dist(u)-dist(v));
 todo.forEach(e=>{const a=NM.get(e.from),b=NM.get(e.to),s1=side(a,b),s2=side(b,a),r=route(a,b,s1,s2,pt(a,s1),pt(b,s2),segs);NCR.set(e.id,r);for(let i=1;i<r.length;i++){const[x1,y1]=r[i-1],[x2,y2]=r[i];segs.push([Math.min(x1,x2),Math.min(y1,y2),Math.max(x1,x2),Math.max(y1,y2)])}});
 NCX=[];const H=segs.filter(s=>s[1]==s[3]),V=segs.filter(s=>s[0]==s[2]);H.forEach(h=>V.forEach(v=>{if(v[0]>h[0]&&v[0]<h[2]&&h[1]>v[1]&&h[1]<v[3])NCX.push([v[0],h[1]])}))}
NCON=true}
function resolveOverlaps(ids){const mv=ids.map(N).filter(Boolean),oth=S.nodes.filter(n=>!ids.includes(n.id));let moved=false;
for(let it=0;it<40;it++){let hit=false;for(const m of mv)for(const o of oth){const dx=Math.min(m.x+m.w,o.x+o.w)-Math.max(m.x,o.x),dy=Math.min(m.y+m.h,o.y+o.h)-Math.max(m.y,o.y);if(dx>0&&dy>0){hit=moved=true;const pad=14;if(dx<dy){const s=(m.x+m.w/2<o.x+o.w/2)?-1:1;mv.forEach(n=>n.x=Math.round(n.x+s*(dx+pad)))}else{const s=(m.y+m.h/2<o.y+o.h/2)?-1:1;mv.forEach(n=>n.y=Math.round(n.y+s*(dy+pad)))}}}if(!hit)break}return moved}
/* быстрые действия: правая кнопка и долгое нажатие */
const COLORS=['#a6e3a1','#89b4fa','#fab387','#cba6f7','#94e2d5','#f9e2af','#f38ba8','#f5c2e7','#cdd6f4'];
let CTXF=[];
function ctxClose(){const c=$('#ctx');if(!c)return;c.hidden=true;c.innerHTML='';CTXF=[]}
function ctxOpen(items,cx,cy){const c=$('#ctx');CTXF=[];const reg=f=>{CTXF.push(f);return CTXF.length-1};
c.innerHTML=items.filter(Boolean).map(it=>{if(it.sep)return'<hr>';if(it.h)return`<div class="ch">${esc(it.h)}</div>`;
 if(it.row)return`<div class="cr">${it.row.map(r=>`<button class="cb${r.on?' on':''}" title="${esc(r.t||'')}" data-cx="${reg(r.f)}"${r.c?` style="--c:${r.c}"`:''}>${r.c?'<span class="cs"></span>':(r.svg||esc(r.i||''))}${r.l?`<span>${esc(r.l)}</span>`:''}</button>`).join('')}</div>`;
 return`<button class="ci${it.d?' d':''}" data-cx="${reg(it.f)}"><i>${it.i||''}</i><span>${esc(it.t)}</span>${it.k?`<kbd>${esc(it.k)}</kbd>`:''}</button>`}).join('');
const sheet=matchMedia('(pointer:coarse)').matches||innerWidth<=700;c.classList.toggle('sheet',sheet);if(sheet){c.insertAdjacentHTML('afterbegin',`<div class="csh"><i></i><button data-cx="${reg(()=>{})}" aria-label="Закрыть">✕</button></div>`);c.hidden=false;c.style.left=c.style.top='';return}
c.hidden=false;const w=c.offsetWidth,h=c.offsetHeight;c.style.left=Math.max(6,Math.min(cx,innerWidth-w-6))+'px';c.style.top=Math.max(6,Math.min(cy,innerHeight-h-6))+'px'}
const setType=k=>{sel.forEach(i=>{const n=N(i);if(n){n.type=k;dim(n)}});commit()},setColor=c=>{sel.forEach(i=>{const n=N(i);if(n){c?n.color=c:delete n.color}});commit();insp()};
function selConnected(){const s=new Set(sel);S.edges.forEach(e=>{if(sel.has(e.from))s.add(e.to);if(sel.has(e.to))s.add(e.from)});setSel([...s])}
function addWpAt(cx,cy){const e=ed();if(!e)return;const w=toW({clientX:cx,clientY:cy}),q=NM.get(e.from)&&NM.get(e.to)&&geo(e);let bi=0,bd=1e18;((q&&q.hm)||[]).forEach((v,i)=>{const d=Math.hypot(v[0]-w.x,v[1]-w.y);if(d<bd){bd=d;bi=i}});e.pts=e.pts||[];e.pts.splice(bi,0,[G(w.x),G(w.y)]);commit()}
function nodeItems(){const ns=[...sel].map(N).filter(Boolean),one=ns.length==1?ns[0]:null,all=ns.every(n=>n.lock);
const it=[{h:one?NAMES[one.type]:`Блоков: ${ns.length}`}];
if(one)it.push({i:'✏️',t:'Править текст',k:'Enter',f:()=>{$('#pt').focus();$('#pt').select()}},{i:'➕',t:'Добавить следующий',k:'Tab',f:addChild});
it.push({i:'⧉',t:'Дублировать',k:'Ctrl+D',f:ACT.dup},{sep:1},{h:'Тип'},{row:Object.keys(T).map(k=>({svg:miniIcon(k,30),t:NAMES[k],on:one&&one.type==k,f:()=>setType(k)}))},
{h:'Цвет'},{row:[...COLORS.map(c=>({c,t:c,f:()=>setColor(c)})),{i:'↺',t:'Сбросить цвет',f:()=>setColor(null)}]},
{h:'Размер'},{row:[{l:'Авто',t:'Размер по тексту',f:ACT.autosz},{l:'Фикс',t:'Зафиксировать текущий размер',f:ACT.sizefix},{l:'−',t:'Меньше',f:ACT.sizeminus},{l:'+',t:'Больше',f:ACT.sizeplus}]},
{sep:1},{i:all?'🔓':'🔒',t:all?'Открепить':'Закрепить на месте',f:ACT.lock},{i:'⬆',t:'На передний план',f:ACT.front},{i:'⬇',t:'На задний план',f:ACT.back},{i:'🔗',t:'Выделить связанные',f:selConnected});
if(ns.length>1)it.push({sep:1},{h:'Выравнивание'},{row:[['l','⇤','По левому краю'],['c','↔','По центру'],['r','⇥','По правому краю'],['t','⤒','По верху'],['m','↕','По середине'],['b','⤓','По низу'],['dh','⋯','Распределить по ширине'],['dv','⋮','Распределить по высоте']].map(([k,i,t])=>({i,t,f:()=>align(k)}))},{i:'▣',t:'Объединить в группу',k:'Ctrl+G',f:mkGroup});
it.push({sep:1},{i:'🗑',t:'Удалить',k:'Del',d:1,f:del});return it}
function edgeItems(cx,cy){const e=ed();if(!e)return[];const sE=(k,v,def)=>()=>{const x=ed();if(!x)return;if(v===''||v===def)delete x[k];else x[k]=v;commit()};
return[{h:'Связь'},{i:'🏷',t:'Подпись…',f:()=>{$('#pl').focus();$('#pl').select()}},{h:'Линия'},
{row:[{l:'Авто',t:'Как в настройках',on:!e.route,f:sE('route','')},{l:'Плавная',on:e.route=='curve',f:sE('route','curve')},{l:'Угловая',on:e.route=='ortho',f:sE('route','ortho')},{l:'Прямая',on:e.route=='line',f:sE('route','line')}]},
{row:[['solid','—','Сплошная'],['dashed','- -','Пунктир'],['dotted','···','Точки'],['dashdot','-·-','Штрих-точка']].map(([v,i,t])=>({i,t,on:(e.dash||'solid')==v,f:sE('dash',v,'solid')}))},
{row:[['end','→','Стрелка'],['both','↔','Две стрелки'],['none','—','Без стрелок']].map(([v,i,t])=>({i,t,on:(e.arrow||'end')==v,f:sE('arrow',v,'end')})).concat([[1,'╌','Тонкая'],[2,'━','Обычная'],[3,'▬','Толстая'],[5,'█','Жирная']].map(([v,i,t])=>({i,t,on:(e.width||2)==v,f:sE('width',v,2)})))},
{h:'Цвет'},{row:[...COLORS.map(c=>({c,t:c,f:()=>{const x=ed();if(x){x.color=c;commit()}}})),{i:'↺',t:'Сбросить цвет',f:ACT.resetec}]},{sep:1},
{i:'📍',t:'Добавить излом здесь',f:()=>addWpAt(cx,cy)},e.pts&&e.pts.length?{i:'↯',t:'Убрать изломы',f:ACT.rstpts}:null,{i:'⇄',t:'Развернуть',f:ACT.rev},{sep:1},{i:'🗑',t:'Удалить связь',k:'Del',d:1,f:del}]}
function groupItems(){const g0=gr();if(!g0)return[];return[{h:'Группа'},{i:'✏️',t:'Переименовать',f:()=>{$('#gt').focus();$('#gt').select()}},{h:'Цвет'},{row:COLORS.map(c=>({c,t:c,f:()=>{const x=gr();if(x){x.color=c;commit();insp()}}}))},{sep:1},{i:'🎯',t:'Выделить блоки группы',f:()=>setSel(g0.nodes)},{i:'↘',t:'Разгруппировать',k:'Ctrl+Shift+G',f:ungrp},{i:'🗑',t:'Удалить рамку (блоки останутся)',d:1,f:del}]}
function canvasItems(cx,cy){const w=toW({clientX:cx,clientY:cy}),rot=Math.abs(cr())>.001;
return[{h:'Добавить блок здесь'},{row:Object.keys(T).map(k=>({svg:miniIcon(k,30),t:NAMES[k],f:()=>{const n=addNode(k,w.x-60,w.y-28);sel=new Set([n.id]);selE=null;selG=null;commit()}}))},{sep:1},
{i:'📋',t:'Вставить',k:'Ctrl+V',f:paste},{i:'☑',t:'Выделить всё',k:'Ctrl+A',f:()=>setSel(S.nodes.map(n=>n.id))},{sep:1},
{i:'⛶',t:'Показать всё',k:'F',f:fit},rot?{i:'🧭',t:'Выровнять лист',f:unrot}:null,{i:'↕',t:'Авто-раскладка вниз',f:()=>layout('TB')},{i:'↔',t:'Авто-раскладка вправо',f:()=>layout('LR')},{sep:1},
{i:'🩺',t:'Проверить схему',f:lintShow},{i:'▦',t:cfg.grid?'Скрыть сетку':'Показать сетку',f:()=>setCfg('grid',!cfg.grid)},{i:'👁',t:'Режим просмотра',f:()=>viewMode()},{i:'☰',t:'Меню и настройки',f:()=>openMenu('file')}]}
function ctxFor(t,cx,cy){ctxClose();const T0=t&&t.closest?t:null;
if(document.body.classList.contains('vw'))return ctxOpen([{i:'⛶',t:'Показать всё',k:'F',f:fit},Math.abs(cr())>.001?{i:'🧭',t:'Выровнять лист',f:unrot}:null,{i:'✕',t:'Выйти из просмотра',k:'Esc',f:()=>viewMode(false)}],cx,cy);
const ne=T0&&T0.closest('[data-n]'),ee=T0&&T0.closest('[data-e]'),ge=T0&&T0.closest('[data-g]');
if(ne){const id=ne.dataset.n;if(!sel.has(id))setSel([id]);return ctxOpen(nodeItems(),cx,cy)}
if(ee){setSel([],ee.dataset.e);return ctxOpen(edgeItems(cx,cy),cx,cy)}
if(ge){setSel([],null,ge.dataset.g);return ctxOpen(groupItems(),cx,cy)}
setSel([]);ctxOpen(canvasItems(cx,cy),cx,cy)}
function lpStop(){if(LP){clearTimeout(LP.t);LP=null}}
function lpFire(x,y){if(P.size!=1||!g||g.mv||['pinch','link','resize','wp','rot'].includes(g.t))return;const t=document.elementFromPoint(x,y);g=null;P.clear();ov='';ctxFor(t,x,y);try{navigator.vibrate&&navigator.vibrate(14)}catch{}}
function lpStart(e){lpStop();if(e.pointerType=='mouse')return;const x=e.clientX,y=e.clientY;LP={x,y,t0:Date.now(),t:setTimeout(()=>{LP=null;lpFire(x,y)},420)}}
svg.addEventListener('contextmenu',e=>{e.preventDefault();lpStop();ctxFor(e.target,e.clientX,e.clientY)});
$('#ctx').addEventListener('click',e=>{const b=e.target.closest('[data-cx]');if(!b)return;const f=CTXF[+b.dataset.cx];ctxClose();if(f)f()});
addEventListener('pointerdown',e=>{if(!e.target.closest('#ctx'))ctxClose()},true);addEventListener('wheel',()=>ctxClose(),{passive:true});addEventListener('resize',ctxClose);
Object.assign(ACT,{unrot,
ctxbtn(){const r=svg.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;ctxClose();if(document.body.classList.contains('vw'))return ctxFor(null,cx,cy);if(sel.size)ctxOpen(nodeItems(),cx,cy);else if(selE)ctxOpen(edgeItems(cx,cy),cx,cy);else if(selG)ctxOpen(groupItems(),cx,cy);else ctxOpen(canvasItems(cx,cy),cx,cy)},
inspmin(){const i=$('#insp').classList.toggle('min');$('#imin').textContent=i?'▴':'▾'},
sizefix(){sel.forEach(i=>{const n=N(i);if(n){n.sw=n.w;n.sh=n.h;dim(n)}});commit()},
sizeminus(){sel.forEach(i=>{const n=N(i);if(n){n.sw=Math.max(60,Math.round((n.sw||n.w)/1.12));n.sh=Math.max(36,Math.round((n.sh||n.h)/1.12));if(n.type=='conn')n.sh=n.sw;dim(n)}});commit()},
sizeplus(){sel.forEach(i=>{const n=N(i);if(n){n.sw=Math.round((n.sw||n.w)*1.12);n.sh=Math.round((n.sh||n.h)*1.12);if(n.type=='conn')n.sh=n.sw;dim(n)}});commit()}});
$('#pb').onchange=e=>{const v=e.target.value;sel.forEach(i=>{const n=N(i);if(n){v?n.bd=v:delete n.bd}});commit()};
$('#nocross').onchange=e=>{NCK='';NCW=false;setCfg('nocross',e.target.checked)};$('#noover').onchange=e=>setCfg('noover',e.target.checked);$('#trace').onchange=e=>setCfg('trace',e.target.checked);
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault()));
const saved=(PJ[cfg.pid]&&PJ[cfg.pid].d)||LS('ffDoc',null);
if(saved&&Array.isArray(saved.nodes)&&saved.nodes.length){try{setDoc(saved)}catch{demo()}}else demo();
setTool('select');syncUI();
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch{}
if(/^#[dj]=/.test(location.hash))unpack(location.hash).then(t=>{newProject('Схема по ссылке',JSON.parse(t));reveal();history.replaceState(null,'',location.href.split('#')[0]);toast('Открыта схема по ссылке')}).catch(()=>toast('Ссылка повреждена или неполная'));
