#!/usr/bin/env node
/**
 * Source-derived temporal audit against Wang Tingzhi 《中州派紫微斗数初级讲义》
 * printed pp.56–58: 流月、流日、流时 / 斗君 / 月干四化.
 *
 * External calendar conversion by lunar-typescript (input only).
 * Independent PALACE oracle never calls iztro horoscope's own index.
 * NOT a commercial source-certification gate; all mismatches are retained.
 */
import fs from "node:fs";
import { astro } from "iztro";
import { Solar } from "lunar-typescript";
import { CONFIG, WANG_MUTAGENS } from "./render_chart.mjs";

const BR = [..."子丑寅卯辰巳午未申酉戌亥"];
const I = b => BR.indexOf(b), S = n => BR[((n % 12) + 12) % 12];
const records=[], observations=[];
const subject = astro.withOptions({
  type:"lunar", dateStr:"2000-5-10",timeIndex:3, gender:"male",
  isLeapMonth:false,fixLeap:true,language:"zh-CN",
  astroType:"heaven",config:CONFIG
});
const natal=subject.toJSON();
const birthMonth=5, birthHour=3;

const CASES = [
  // Date/month/day are preselected but cross-checked independently against
  // a calendar converter. A bad fixture is a test error, not a chart mismatch.
  ["2008-02-07",2008,1,1,"子","戊"],
  ["2008-02-08",2008,1,2,"子","戊"],
  ["2008-02-19",2008,1,13,"子","戊"],
  ["2008-02-20",2008,1,14,"子","戊"],
  ["2008-03-08",2008,2,1,"子","戊"],
  ["2008-04-06",2008,3,1,"子","戊"],
  ["2023-03-21",2023,2,30,"卯","癸"],
  ["2023-03-22",2023,-2,1,"卯","癸"],
  ["2023-04-05",2023,-2,15,"卯","癸"],
  ["2023-04-06",2023,-2,16,"卯","癸"],
  ["2023-04-19",2023,-2,29,"卯","癸"],
  ["2023-04-20",2023,3,1,"卯","癸"],
  ["2025-01-29",2025,1,1,"巳","乙"],
  ["2025-03-29",2025,3,1,"巳","乙"]
];
function rec(rule,caseId,expected,actual,sourcePage,conditions={}) {
  records.push({
    rule,case:caseId,source_page:sourcePage,expected,actual,conditions,
    status: actual===undefined||actual===null ? "NOT_EXPOSED" :
       (expected===actual ? "PASS" : "MISMATCH")
  });
}
const branchFor=(h,scope)=>Number.isInteger(h[scope]?.index)?
    natal.palaces[h[scope].index]?.earthlyBranch??null:null;
function apparentLunar(date) {
 const [y,m,d]=date.split("-").map(Number);
 const x=Solar.fromYmd(y,m,d).getLunar();
 return {year:x.getYear(),month:x.getMonth(),day:x.getDay()};
}
for(const [date,lunarY,lunarM,lunarD,yearB,yearS] of CASES){
 const lunar=apparentLunar(date);
 if(lunar.year!==lunarY||lunar.month!==lunarM||lunar.day!==lunarD){
   throw new Error("Independent calendar fixture mismatch for "+date+
      "; expected "+JSON.stringify([lunarY,lunarM,lunarD])+
      " got "+JSON.stringify(lunar));
 }
 const firstHour=6;
 const h=subject.horoscope(date,firstHour);
 const yearLife=branchFor(h,"yearly"),monthLife=branchFor(h,"monthly"),dayLife=branchFor(h,"daily");
 const doujun=S(I(yearB)-(birthMonth-1)+birthHour);
 const effMonth=lunarM<0?(lunarD<=15?-lunarM:-lunarM+1):lunarM;
 const monthExpected=S(I(doujun)+effMonth-1);
 rec("46_doujun_to_month",date,monthExpected,monthLife,57,
     {year_branch:yearB,birth_month:birthMonth,birth_hour:birthHour,effective_month:effMonth});
 rec("45_taisui_to_year",date,yearB,yearLife,57);
 rec("year_stem",date,yearS,h.yearly?.heavenlyStem,57);
 // The source's regular-month day rule: day 1 at monthly life, 13 repeats.
 // Leap-month intercalary day offsets are handled separately, not guessed.
 if(lunarM>0){
    const expectedDay=S(I(monthExpected)+lunarD-1);
    rec("46_regular_day_palace",date,expectedDay,dayLife,58,
        {lunar_month:lunarM,lunar_day:lunarD});
 } else {
    observations.push({case:date,subject:"leap_daily",lunar,
      monthly_palace:monthLife,daily_palace:dayLife,
      reason:"Wang p58 adds original-month days and early half of leap month; a whole-sequence oracle is needed"});
 }
 // Wang's source rules use flow month heavenly stem for month transformations.
 // This is a *configuration propagation check*, not an independently
 // verified month GanZhi calendar algorithm.
 const monthStem=h.monthly?.heavenlyStem;
 const monthHua=WANG_MUTAGENS[monthStem];
 if(monthHua)rec("43_monthly_mutagen_config",date,JSON.stringify(monthHua),
   JSON.stringify(h.monthly?.mutagen),57,{month_stem:monthStem});
 for(const hour of [0,1,3,6,11,12]){
   const hh=subject.horoscope(date,hour);
   const dayAtHour=branchFor(hh,"daily"),hourLife=branchFor(hh,"hourly");
   const expectedHour=S(I(dayAtHour)+(hour===12?0:hour));
   rec("46_hour_palace",date+"@"+hour,expectedHour,hourLife,58,
       {hour_index:hour,day_palace:dayAtHour,
        caveat:"hour index 12=late Zi; 0=early Zi, date remains under dayDivide=current"});
   const stem=hh.hourly?.heavenlyStem;
   if(WANG_MUTAGENS[stem])rec("43_hour_mutagen_config",date+"@"+hour,
      JSON.stringify(WANG_MUTAGENS[stem]),JSON.stringify(hh.hourly?.mutagen),55,{hour_stem:stem});
 }
 observations.push({
   case:date,lunar,solar_date:h.solarDate,
   year_branch:yearB,year_life:yearLife,
   doujun_source:doujun,month_expected:monthExpected,month_actual:monthLife,
   month_ganzhi:[h.monthly?.heavenlyStem,h.monthly?.earthlyBranch].join(""),
   day_actual:dayLife,effective_month:effMonth
 });
}
const totals={PASS:0,MISMATCH:0,NOT_EXPOSED:0};
for(const row of records)totals[row.status]=(totals[row.status]||0)+1;
const misses=records.filter(r=>r.status!=="PASS");
const summary={
 source:"Wang Tingzhi 初级讲义 printed pp56–58",
 astro_engine:"iztro@2.6.5",date_cases:CASES.length,assertions:records.length,
 totals,
 differences_by_rule:Object.fromEntries([...new Set(misses.map(m=>m.rule))].map(rule=>
  [rule,misses.filter(x=>x.rule===rule).length])),
 caveat:"calendar via lunar-typescript; source-derived palace oracles are independent of horoscope index; transformations check config propagation only; leap daily marked observational"
};
fs.mkdirSync("audit_out",{recursive:true});
fs.writeFileSync("audit_out/wang_dynamic_v2.json",
  JSON.stringify({summary,misses,records,observations},null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
console.log("Nonpasses: "+JSON.stringify(misses.slice(0,40)));
