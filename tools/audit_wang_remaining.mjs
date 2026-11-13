#!/usr/bin/env node
/**
 * Wang Tingzhi source rules #16, #17, #24, #42–46:
 * independent edge checks and explicit observational limitations.
 * Source: 初级讲义 pp43,47–48,55–58 (printed).
 */
import fs from "node:fs";
import {astro} from "iztro";
import {CONFIG} from "./render_chart.mjs";

const BR=[..."子丑寅卯辰巳午未申酉戌亥"];
const S=n=>BR[((n%12)+12)%12],I=b=>BR.indexOf(b);
const STEM=[..."甲乙丙丁戊己庚辛壬癸"];
const KITCHEN={};
const rec=[],cache=new Map();
function chart(year,gender="male",lunarMonth=null,hour=6){
 const key=JSON.stringify([year,gender,lunarMonth,hour]);
 if(!cache.has(key)){
 const v=astro.withOptions({
    type:lunarMonth===null?"solar":"lunar",
    dateStr:lunarMonth===null?year+"-07-16":[year,lunarMonth,10].join("-"),
    timeIndex:hour,gender,fixLeap:true,isLeapMonth:false,
    language:"zh-CN",astroType:"heaven",config:CONFIG
 });
 cache.set(key,v.toJSON?v.toJSON():v);
 }return cache.get(key);
}
function record(rule,fixture,expected,actual,source_page,subject=""){
 const none=actual===null||actual===undefined||(Array.isArray(actual)&&actual.length===0);
 const isPartial=Array.isArray(expected) && expected.length===2 &&
    Array.isArray(actual) && actual.length===1 && expected.includes(actual[0]);
 const status=none?"NOT_EXPOSED":
    JSON.stringify(expected)===JSON.stringify(actual)?"PASS":
    isPartial?"PARTIAL_EXPOSURE":"MISMATCH";
 rec.push({rule,fixture,subject,source_page,expected,actual,status});
}
function positions(c,name){
 return [...new Set(c.palaces.flatMap(p=>
 [...(p.majorStars||[]),...(p.minorStars||[]),...(p.adjectiveStars||[])]
 .filter(s=>s.name===name).map(()=>p.earthlyBranch)))];
}
function at(rule,c,name,expected,fixture,page){
 const found=positions(c,name);
 record(rule,fixture,expected,found.length===1?found[0]:found.length?found:null,page,name);
}
// #16 截空 and #17 旬空 are split into TWO sites, unlike single placement.
const JIE={甲:["申","酉"],乙:["午","未"],丙:["辰","巳"],丁:["寅","卯"],戊:["子","丑"],
 己:["申","酉"],庚:["午","未"],辛:["辰","巳"],壬:["寅","卯"],癸:["子","丑"]};
const sorted=p=>[...p].sort((a,b)=>I(a)-I(b));
for(let k=0;k<10;k++){
 const y=2004+k,c=chart(y),stem=STEM[k],branch=S(8+k),
       fixture="solar "+y+"-07-16";
 const jie=sorted(JIE[stem]);
 const actualJie=sorted(positions(c,"截空"));
 const primaryJie=jie.find(p=>I(p)%2===k%2);
 record("16_jiekong_primary",fixture,primaryJie,actualJie[0]??null,43);
 record("16_jiekong_pair",fixture,jie,actualJie,43,"应输出正空+傍空，现有星曜数组仅一宫");
 const b=I(branch),j=(b+10-k)%12;
 const xun=[S(j),S(j+1)];
 const actualXun=sorted(positions(c,"旬空"));
 const primaryXun=xun.find(p=>I(p)%2===k%2);
 record("17_xunkong_primary",fixture,primaryXun,actualXun[0]??null,43);
 record("17_xunkong_pair",fixture,sorted(xun),actualXun,43,"应输出正空+傍空，现有星曜数组仅一宫");
}
// #24: six year-branch stars. Source p47–48 and Figure 21.
const F_LIAN=["申","酉","戌","巳","午","未","寅","卯","辰","亥","子","丑"];
const PO_SUI=["巳","丑","酉"];
function trigram(b){
 return "申子辰".includes(b)?"water":
        "寅午戌".includes(b)?"fire":
        "巳酉丑".includes(b)?"metal":"wood";
}
for(let k=0;k<12;k++){
 const y=2000+k,c=chart(y),b=S(4+k),i=I(b),group=trigram(b),
     fixture="solar "+y+"-07-16 birth branch "+b;
 const hua={water:"辰",fire:"戌",metal:"丑",wood:"未"}[group];
 const xian={water:"酉",fire:"卯",metal:"午",wood:"子"}[group];
 for(const [rule,name,pos] of [
  ["24_feilian","蜚廉",F_LIAN[i]],
  ["24_posui","破碎",PO_SUI[i%3]],
  ["24_huagai","华盖",hua],
  ["24_xianchi","咸池",xian],
  ["24_longde","龙德",S(7+i)],
  ["24_yuede","月德",S(5+i)]
 ])at(rule,c,name,pos,fixture,47);
}
// #44 小限 starts age 1 at one of four tomb-opposite palaces;
// male follows branch order, female reverses, never yin/yang dependent.
for(const y of [2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011])
for(const gender of ["male","female"]){
 const c=chart(y,gender),b=S(4+y-2000),grp=trigram(b),
       start={water:"戌",fire:"辰",metal:"未",wood:"丑"}[grp],
       sign=gender==="male"?1:-1,
       fixture="solar "+y+"-07-16 "+gender;
 for(let n=1;n<=12;n++){
   const found=c.palaces.filter(p=>(p.ages||[]).includes(n));
   record("44_small_limit",fixture,S(I(start)+(n-1)*sign),
     found.length===1?found[0].earthlyBranch:found.length?found.map(p=>p.earthlyBranch):null,56,"age="+n);
 }
}
// #45 annual tai sui straightforward and #43 annually flowing four hua:
// year stem is from target Gregorian date in July, not calendar boundary.
const FLOW_WENCHANG = ["巳","午","申","酉","申","酉","亥","子","寅","卯"];
const FLOW_WENQU = ["酉","申","午","巳","午","巳","卯","寅","子","亥"];
const HUA_LABELS=["禄","权","科","忌"],HUA=CONFIG.mutagens;
const horoscopeHolder=astro.withOptions({
 type:"lunar", dateStr:"2000-5-10", timeIndex:4, gender:"male",
 fixLeap:true, isLeapMonth:false, language:"zh-CN",
 astroType:"heaven", config:CONFIG
});
for(let k=0;k<10;k++){
 const y=2004+k,stem=STEM[k],branch=S(8+k),fixture="target "+y+"-07-16";
 const h=horoscopeHolder.horoscope(y+"-07-16",6);
 const v=h.toJSON?h.toJSON():h;
 const natalForIndex=horoscopeHolder.toJSON?horoscopeHolder.toJSON():horoscopeHolder;
 const annualLifeBranch=Number.isInteger(v.yearly?.index) ?
   natalForIndex.palaces[v.yearly.index]?.earthlyBranch??null:null;
 record("45_annual_palace_index",fixture,branch,annualLifeBranch,57,"流年命宫位置由 yearly.index 提取");
 record("45_annual_taisui",fixture,branch,v.yearly?.earthlyBranch??null,57);
 for(let j=0;j<4;j++)
  record("43_annual_four_hua",fixture,HUA[stem][j],
    v.yearly?.mutagen?.[j]??null,55,HUA_LABELS[j]);
 // #42 flow Wen Chang/Qu: compare the actual annual added stars
 // to source p56. Source's two-step clockwise/counterclockwise with
 // 四墓 removed needs a separate table-derived mapping before PASS verdict.
 const yearlyStars=v.yearly?.stars??[];
 const natal=horoscopeHolder.toJSON ? horoscopeHolder.toJSON() : horoscopeHolder;
 const namedBranch=(star)=>{
   const idx=yearlyStars.findIndex(stars=>(stars||[]).some(s=>s.name===star));
   return idx>=0?natal.palaces[idx]?.earthlyBranch??null:null;
 };
 record("42_liuchang",fixture,FLOW_WENCHANG[k],namedBranch("流昌"),56,"王亭之第56页十干安流昌表");
 record("42_liuchu",fixture,FLOW_WENQU[k],namedBranch("流曲"),56,"王亭之第56页十干安流曲表");
}
// #46 Dou Jun: source example 子年五月卯时→亥, year adds +1
// The engine does not expose a direct doujun field in natal/horoscope;
// compare only as a documented independent source oracle, not falsely PASS.
const docExample={birth_lunar_month:5, birth_time_index:3,
  target_year_branch:"子", expected_doujun:"亥"};
const computed=S(I(docExample.target_year_branch)-(docExample.birth_lunar_month-1)+docExample.birth_time_index);
// Compare the source Doujun formula to iztro's practical monthly location:
 // in 子年 first lunar month should start at 亥 for birth 五月卯时.
const testSubject=astro.withOptions({
 type:"lunar",dateStr:"2000-5-10",timeIndex:3,gender:"male",
 fixLeap:true,isLeapMonth:false,astroType:"heaven",language:"zh-CN",config:CONFIG
});
const firstMonth=testSubject.horoscope("2008-02-20",6);
const firstMonthData=firstMonth.toJSON?firstMonth.toJSON():firstMonth;
const natalDebug=testSubject.toJSON?testSubject.toJSON():testSubject;
fs.mkdirSync("audit_out",{recursive:true});
fs.writeFileSync("audit_out/doujun_case_debug.json",JSON.stringify({
  source_case:"王亭之初级讲义 p57 子年五月卯时斗君在亥，子年正月命宫亥",
  birth_chart:{lunar_date:natalDebug.lunarDate,chinese_date:natalDebug.chineseDate,time:natalDebug.time,
    soul_palace:natalDebug.earthlyBranchOfSoulPalace},
  target:{lunar_date:firstMonthData.lunarDate,solar_date:firstMonthData.solarDate,
    yearly:firstMonthData.yearly,monthly:firstMonthData.monthly,
    age:firstMonthData.age},
  expected_monthly_branch:"亥",actual_monthly_life_branch:monthLifeBranch,
  monthly_calendar_branch:firstMonthData.monthly?.earthlyBranch??null
},null,2)+"\n");

const monthLifeIndex=firstMonthData.monthly?.index;
const monthLifeBranch=Number.isInteger(monthLifeIndex) ?
  natalDebug.palaces[monthLifeIndex]?.earthlyBranch??null : null;
record("46_doujun_monthly_projection","birth lunar 2000-5-10 卯, target 子年正月 (2008-02-20)",
 docExample.expected_doujun,monthLifeBranch,57,
 "流月命宫应按 monthly.index 对应原局地支；monthly.earthlyBranch 是当月干支而非命宫");
const sourceSelfCheck={expected:docExample.expected_doujun,computed,match:computed===docExample.expected_doujun};
const totals={PASS:0,MISMATCH:0,NOT_EXPOSED:0,PARTIAL_EXPOSURE:0};
for(const row of rec)totals[row.status]=(totals[row.status]||0)+1;
const differences=rec.filter(x=>x.status!=="PASS");
const summary={
 source_formula_check:sourceSelfCheck,
 source:"王亭之《中州派紫微斗数初级讲义》印刷43/47–48/55–58页",
 engine:"iztro-js@2.6.5",fixture_count:cache.size,assertion_count:rec.length,
 totals,
 differences_by_rule:Object.fromEntries([...new Set(differences.map(x=>x.rule))].map(rule=>
   [rule,differences.filter(x=>x.rule===rule).length])),
 caveat:"第46项原文公式自检不等于引擎对照，另增流月正月位置投影；第42项对照第56页表列宫位。"
};
fs.mkdirSync("audit_out",{recursive:true});
fs.writeFileSync("audit_out/wang_remaining_audit.json",
 JSON.stringify({summary,differences,records:rec},null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
console.log("Non-pass sample: "+JSON.stringify(differences.slice(0,30)));
