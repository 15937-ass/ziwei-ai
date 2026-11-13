#!/usr/bin/env node
/**
 * Additional independent Wang Tingzhi formula checks:
 * printed pp.31-54. Not a proof of all 46 rule groups.
 */
import fs from "node:fs";
import { astro } from "iztro";
import { CONFIG } from "./render_chart.mjs";

const BR=[..."子丑寅卯辰巳午未申酉戌亥"],ST=[..."甲乙丙丁戊己庚辛壬癸"];
const S=n=>BR[(n%12+12)%12],I=s=>BR.indexOf(s);
const records=[],cache=new Map();
function chart(m=1,d=15,t=6,y=2000,g="female"){
 const key=JSON.stringify([m,d,t,y,g]);
 if(!cache.has(key)){
   const v=astro.withOptions({type:"lunar",dateStr:[y,m,d].join("-"),
     timeIndex:t,gender:g,fixLeap:true,isLeapMonth:false,
     astroType:"heaven",language:"zh-CN",config:CONFIG});
   cache.set(key,v.toJSON?v.toJSON():v);
 }
 return cache.get(key);
}
function yearChart(y,t=6,g="female"){
 const key=JSON.stringify(["s",y,t,g]);
 if(!cache.has(key)){
 const v=astro.withOptions({type:"solar",dateStr:y+"-07-16",
   timeIndex:t,gender:g,fixLeap:true,astroType:"heaven",
   language:"zh-CN",config:CONFIG});
 cache.set(key,v.toJSON?v.toJSON():v);
 }return cache.get(key);
}
function find(c,name){
 return [...new Set(c.palaces.flatMap(p=>
 [...(p.majorStars||[]),...(p.minorStars||[]),...(p.adjectiveStars||[])]
 .filter(x=>x.name===name).map(()=>p.earthlyBranch)))];
}
function record(rule,fixture,expected,actual,source_page,subject=""){
 const notAvailable=actual===null||actual===undefined||(Array.isArray(actual)&&actual.length===0);
 const isMatch=JSON.stringify(expected)===JSON.stringify(actual);
 records.push({rule,fixture,subject,source_page,expected,actual,
   status:notAvailable?"NOT_EXPOSED":isMatch?"PASS":"MISMATCH"});
}
function at(rule,c,name,pos,fixture,page){
 const found=find(c,name);
 record(rule,fixture,pos,found.length===1?found[0]:(found.length?found:null),page,name);
}
function contains(s,text){return s.includes(text)}
const PALACE_ORDER=["命","兄弟","夫妻","子女","财帛","疾厄","迁移","交友","事业","田宅","福德","父母"];
const PALACE_ALIASES={交友:["交友","仆役","奴仆"],事业:["事业","官禄"],命:["命"]};
function palaceMatch(name,required){
 const actual=name.replace(/宫$/u,"");
 return (PALACE_ALIASES[required]||[required]).includes(actual);
}
// 1, 2, 4 and 5: all months and twelve non-duplicate traditional hours.
for(let m=1;m<=12;m++)for(let t=0;t<12;t++){
 const c=chart(m,15,t),fixture="lunar 2000-"+m+"-15 time "+t;
 const life=S(2+m-1-t),body=S(2+m-1+t);
 record("01_life",fixture,life,c.earthlyBranchOfSoulPalace,31);
 record("01_body",fixture,body,c.earthlyBranchOfBodyPalace,31);
 const palaceAt = new Map(c.palaces.map(p=>[p.earthlyBranch,p.name]));
 for(let j=0;j<12;j++){
 const required=PALACE_ORDER[j],observed=palaceAt.get(S(I(life)-j));
 record("02_palace_order",fixture,true,observed?palaceMatch(observed,required):null,31,required);
 }
 if(m!==1||t!==0) continue;
 const lifePalace=c.palaces.find(p=>p.earthlyBranch===life);
 if(lifePalace){
 const stem=ST.indexOf(lifePalace.heavenlyStem),br=I(life);
 if(stem>=0&&br>=0){
  const sv=Math.floor(stem/2)+1,bv=[0,1,6,7].includes(br)?1:
    [2,3,8,9].includes(br)?2:3;
  const element=["土","木","金","水","火"][(sv+bv)%5];
  record("04_five_elements",fixture,true,
   (c.fiveElementsClass||"").startsWith(element),32,"命宫纳音");
 }
 }
}
// 3: five-tiger starting stem: 甲己丙,乙庚戊,丙辛庚,丁壬壬,戊癸甲.
const YIN_START={甲:"丙",乙:"戊",丙:"庚",丁:"壬",戊:"甲",
                 己:"丙",庚:"戊",辛:"庚",壬:"壬",癸:"甲"};
for(let i=0;i<10;i++){
 const c=yearChart(2004+i),yearStem=ST[i];
 const yin=c.palaces.find(p=>p.earthlyBranch==="寅");
 record("03_five_tigers","solar "+(2004+i)+"-07-16",YIN_START[yearStem],
   yin?.heavenlyStem??null,31);
}
// 6, 7, 8: purple star from lunar birthday and five-element bureau, and
// both fourteen-star fixed relative layout. Uses original verse examples.
const MAIN_OFFSETS={
 "天机":-1,"太阳":-3,"武曲":-4,"天同":-5,"廉贞":-8
};
const FU_OFFSETS={
 "太阴":1,"贪狼":2,"巨门":3,"天相":4,"天梁":5,"七杀":6,"破军":10
};
for(const d of [1,2,3,4,5,6,10,12,15,20,22,29]){
 for(const month of [1,4,8]){
 const c=chart(month,d,4),fixture="lunar 2000-"+month+"-"+d+" time4";
 const bureau={"水":2,"木":3,"金":4,"土":5,"火":6}[(c.fiveElementsClass||"")[0]];
 if(!bureau) { record("06_ziwei",fixture,"2..6",null,34);continue; }
 let n=0;while((d+n)%bureau!==0&&n<6)n++;
 const quotient=(d+n)/bureau;
 const zi=S(2+quotient-1+(n%2===0?n:-n));
 at("06_ziwei",c,"紫微",zi,fixture,34);
 const fu=S(4-I(zi));
 at("07_tianfu",c,"天府",fu,fixture,37);
 for(const [name,offset] of Object.entries(MAIN_OFFSETS))
   at("08_ziwei_series",c,name,S(I(zi)+offset),fixture,37);
 for(const [name,offset] of Object.entries(FU_OFFSETS))
   at("08_tianfu_series",c,name,S(I(fu)+offset),fixture,37);
 }
}
// 5: first decade starts at bureau age and moves as yin/yang gender.
for(const [y,g] of [[2004,"male"],[2004,"female"],[2005,"male"],[2005,"female"]]){
 const c=yearChart(y,6,g),life=c.earthlyBranchOfSoulPalace,
       bureau={"水":2,"木":3,"金":4,"土":5,"火":6}[(c.fiveElementsClass||"")[0]];
 const palace=c.palaces.find(p=>p.earthlyBranch===life);
 const range=palace?.decadal?.range;
 const fixture="solar "+y+"-07-16 "+g;
 const start=Array.isArray(range)?range[0]:null;
 record("05_decade_starts",fixture,bureau,start,33);
 const sameYang=((y%2===0&&g==="male")||(y%2===1&&g==="female"));
 const next=c.palaces.find(p=>Array.isArray(p.decadal?.range)&&p.decadal.range[0]===bureau+10);
 record("05_decade_direction",fixture,S(I(life)+(sameYang?1:-1)),
  next?.earthlyBranch??null,33);
}
// 13, 21–23, 25–26 and 36–37: 12 year-branch samples.
for(let k=0;k<12;k++){
 const y=2000+k,c=yearChart(y),b=S(4+k),n=I(b),
       fixture="solar "+y+"-07-16 birth branch "+b;
 const grp = contains("申子辰",b)?"water":contains("寅午戌",b)?"fire":
             contains("巳酉丑",b)?"metal":"wood";
 const isolate={
  water:["巳","寅","戌"],fire:["亥","丑","卯"],
  metal:["寅","卯","戌"],wood:["申","酉","戌"]
 }[grp];
 record("22_jiesha",fixture,isolate[0],c.palaces.find(p=>p.jiangqian12==="劫煞")?.earthlyBranch??null,46,"劫煞/将前十二神字段");
 const baseFire=I(isolate[1]),baseBell=I(isolate[2]);
 at("13_huoxing",c,"火星",S(baseFire+6),fixture,41);
 at("13_lingxing",c,"铃星",S(baseBell+6),fixture,41);
 const lonely=contains("寅卯辰",b)?["巳","丑"]:
   contains("巳午未",b)?["申","辰"]:
   contains("申酉戌",b)?["亥","未"]:["寅","戌"];
 at("21_guchen",c,"孤辰",lonely[0],fixture,45);
 at("21_guasu",c,"寡宿",lonely[1],fixture,45);
 at("23_dahao",c,"大耗",S(n+6+(n%2===0?1:-1)),fixture,46);
 at("25_tiande",c,"天德",S(9+n),fixture,49);
 at("25_nianjie",c,"年解",S(10-n),fixture,49);
 at("26_tiancai",c,"天才",S(I(c.earthlyBranchOfSoulPalace)+n),fixture,49);
 at("26_tianshou",c,"天寿",S(I(c.earthlyBranchOfBodyPalace)+n),fixture,49);
 const soul={"子":"贪狼","丑":"巨门","亥":"巨门","寅":"禄存",
   "戌":"禄存","卯":"文曲","酉":"文曲","巳":"武曲","未":"武曲",
   "辰":"廉贞","申":"廉贞","午":"破军"}[b];
 const body={"子":"铃星","午":"火星","丑":"天相","未":"天相",
   "寅":"天梁","申":"天梁","卯":"天同","酉":"天同",
   "巳":"天机","亥":"天机","辰":"文昌","戌":"文昌"}[b];
 record("36_soul_ruler",fixture,soul,c.soul??null,54);
 record("37_body_ruler",fixture,body,c.body??null,54);
}
// 34/35: independent date-shift formula from 左辅/右弼 and 昌/曲.
for(const d of [1,2,3,10,15,20,29]){
 const c=chart(4,d,4),fixture="lunar 2000-4-"+d+" time4";
 const required=[["三台","左辅",d-1,34,53],["八座","右弼",-(d-1),34,53],
 ["恩光","文昌",d-2,35,54],["天贵","文曲",d-2,35,54]];
 for(const [name,anchor,shift,rule,page] of required){
  const a=find(c,anchor);
  if(a.length!==1){record(rule+"_"+name,fixture,anchor,null,page);continue;}
  at(rule+"_"+name,c,name,S(I(a[0])+shift),fixture,page);
 }
}


// 14 and 15: year-stem auspicious stars anchored to source pp.41–42.
// The abbreviated 戊玉兔 verse is withheld for later source/image review.
const OFFICIAL={
  甲:["未","酉"],乙:["辰","申"],丙:["巳","子"],丁:["寅","亥"],
  己:["酉","寅"],庚:["亥","午"],辛:["酉","巳"],壬:["戌","午"],癸:["午","巳"]
};
const KITCHEN={
  甲:"巳",乙:"午",丙:"子",丁:"巳",戊:"午",己:"申",
  庚:"寅",辛:"午",壬:"酉",癸:"亥"
};
for(let k=0;k<10;k++){
 const stem=ST[k],c=yearChart(2004+k),fixture="solar "+(2004+k)+"-07-16";
 if(OFFICIAL[stem]){
  at("14_tianguan",c,"天官",OFFICIAL[stem][0],fixture,41);
  at("14_tianfu",c,"天福",OFFICIAL[stem][1],fixture,41);
 }
 at("15_tianchu",c,"天厨",KITCHEN[stem],fixture,42);
}

// 38,39,40,41: 12 divine cycles are palace metadata (not star arrays).
const CHANGE=["长生","沐浴","冠带","临官","帝旺","衰","病","死","墓","绝","胎","养"];
const SUI=["岁建","晦气","丧门","贯索","官符","小耗","岁破","龙德","白虎","天德","吊客","病符"];
const JIANG=["将星","攀鞍","岁驿","息神","华盖","劫煞","灾煞","天煞","指背","咸池","月煞","亡神"];
const BOSHI=["博士","力士","青龙","小耗","将军","奏书","飞廉","喜神","病符","大耗","伏兵","官府"];
const LU={甲:"寅",乙:"卯",丙:"巳",丁:"午",戊:"巳",己:"午",
           庚:"申",辛:"酉",壬:"亥",癸:"子"};
const LONG_START={水:"申",木:"亥",金:"巳",土:"申",火:"寅"};
for(const [year,gender] of [[2004,"male"],[2004,"female"],[2005,"male"],[2005,"female"]]){
 const c=yearChart(year,6,gender),stem=ST[(year-2004)%10],
   branch=S(4+(year-2000)),v=I(branch),
   yangYear=ST.indexOf(stem)%2===0,forward=(yangYear&&gender==="male")||(!yangYear&&gender==="female"),
   sign=forward?1:-1,element=(c.fiveElementsClass||"")[0],
   start=I(LONG_START[element]),lu=I(LU[stem]),
   wangCenter=I("申子辰".includes(branch)?"子":"寅午戌".includes(branch)?"午":
               "巳酉丑".includes(branch)?"酉":"卯"),
   fixture="solar "+year+"-07-16 "+gender;
 for(let i=0;i<12;i++){
  const p=c.palaces.find(p=>p.earthlyBranch===S(start+sign*i));
  record("38_changsheng12",fixture,CHANGE[i],p?.changsheng12??null,54,"step="+i);
  const q=c.palaces.find(p=>p.earthlyBranch===S(v+i));
  record("39_suiqian12",fixture,SUI[i],q?.suiqian12??null,54,"step="+i);
  const h=c.palaces.find(p=>p.earthlyBranch===S(wangCenter+i));
  record("40_jiangqian12",fixture,JIANG[i],h?.jiangqian12??null,54,"step="+i);
  const b=c.palaces.find(p=>p.earthlyBranch===S(lu+sign*i));
  record("41_boshi12",fixture,BOSHI[i],b?.boshi12??null,55,"step="+i);
 }
}

const diagnosticChart=yearChart(2000);
const debugSummary={
  keys_first_palace:Object.keys(diagnosticChart.palaces[0]),
  palaces:diagnosticChart.palaces.map(p=>({
    branch:p.earthlyBranch,
    palace_name:p.name,
    jiangqian12:p.jiangqian12??null,
    suiqian12:p.suiqian12??null,
    boshi12:p.boshi12??null,
    changsheng12:p.changsheng12??null
  })),
  soul:diagnosticChart.soul,
  body:diagnosticChart.body,
  five_elements_class:diagnosticChart.fiveElementsClass
};
fs.writeFileSync("audit_out/engine_schema_probe.json",JSON.stringify(debugSummary,null,2)+"\n");


const hsrc=astro.withOptions({
 type:"lunar",dateStr:"2000-5-10",timeIndex:4,gender:"male",
 fixLeap:true,astroType:"heaven",language:"zh-CN",config:CONFIG
});
const hr=hsrc.horoscope("2008-07-16",6);
const horo=typeof hr.toJSON==="function"?hr.toJSON():hr;
fs.writeFileSync("audit_out/temporal_schema_probe.json",JSON.stringify({
 top_keys:Object.keys(horo),
 yearly_keys:Object.keys(horo.yearly||{}),
 monthly_keys:Object.keys(horo.monthly||{}),
 age_keys:Object.keys(horo.age||{}),
 year:{index:horo.yearly?.index, branch:horo.yearly?.earthlyBranch,
       names:horo.yearly?.palaceNames,mutagen:horo.yearly?.mutagen,
       stars:horo.yearly?.stars},
 month:{index:horo.monthly?.index,branch:horo.monthly?.earthlyBranch,
       names:horo.monthly?.palaceNames},
 ages:yearChart(2000).palaces.map(p=>({branch:p.earthlyBranch,ages:p.ages})),
 special:yearChart(2000).palaces.map(p=>({
   branch:p.earthlyBranch,
   names:[...(p.majorStars||[]),...(p.minorStars||[]),...(p.adjectiveStars||[])]
        .map(s=>s.name).filter(s=>/空|煞|劫|破碎|龙德|月德|蜚廉/.test(s))
 }))
},null,2)+"\n");

const totals={PASS:0,MISMATCH:0,NOT_EXPOSED:0};
for(const row of records)totals[row.status]=(totals[row.status]||0)+1;
const differences=records.filter(r=>r.status!=="PASS");
const summary={
 source:"王亭之《中州派紫微斗数初级讲义》初级讲义印刷31–54页",
 engine:"iztro-js@2.6.5",fixture_count:cache.size,assertion_count:records.length,
 totals, differences_by_rule:Object.fromEntries([...new Set(differences.map(r=>r.rule))]
 .map(rule=>[rule,records.filter(r=>r.rule===rule&&r.status!=="PASS").length]))
};
fs.mkdirSync("audit_out",{recursive:true});
fs.writeFileSync("audit_out/wang_extra_audit.json",
 JSON.stringify({summary,differences,records},null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
console.log("Nonpass sample (up to 30): "+JSON.stringify(differences.slice(0,30)));
