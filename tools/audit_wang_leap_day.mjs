#!/usr/bin/env node
/**
 * Wang p58 leap-month FLOW-DAY rule, source-interpretation experiment.
 *
 * The text says for a leap 3rd lunar month: count regular month (30 days)
 * plus first 15 leap days as 45 days; following month likewise counts 45.
 * We encode that reading WITHOUT silently declaring it authoritative.
 *
 * Each fixture is checked with lunar-typescript calendar conversion,
 * and the result is a candidate discrepancy report (not a green gate).
 */
import fs from "node:fs";
import { astro } from "iztro";
import { Solar } from "lunar-typescript";
import { CONFIG } from "./render_chart.mjs";
const BR=[..."子丑寅卯辰巳午未申酉戌亥"];
const I=s=>BR.indexOf(s),S=n=>BR[((n%12)+12)%12];
const birthMonth=5,birthHour=3;
const subject=astro.withOptions({
 type:"lunar",dateStr:"2000-5-10",timeIndex:birthHour,gender:"male",
 fixLeap:true,isLeapMonth:false,astroType:"heaven",language:"zh-CN",config:CONFIG
});
const natal=subject.toJSON();
const studies=[
 {year:2020,yearBranch:"子",leap:4,precedingMonthDays:30,leapMonthDays:29,fixtures:[
  ["2020-05-22",4,30,"regular_previous"],
  ["2020-05-23",-4,1,"leap_early"],
  ["2020-06-06",-4,15,"leap_early"],
  ["2020-06-07",-4,16,"leap_late"],
  ["2020-06-20",-4,29,"leap_late"],
  ["2020-06-21",5,1,"regular_following"],
  ["2020-06-22",5,2,"regular_following"]
 ]},
 {year:2023,yearBranch:"卯",leap:2,precedingMonthDays:30,leapMonthDays:29,fixtures:[
  ["2023-03-21",2,30,"regular_previous"],
  ["2023-03-22",-2,1,"leap_early"],
  ["2023-04-05",-2,15,"leap_early"],
  ["2023-04-06",-2,16,"leap_late"],
  ["2023-04-19",-2,29,"leap_late"],
  ["2023-04-20",3,1,"regular_following"],
  ["2023-04-21",3,2,"regular_following"]
 ]}
];
const records=[];
for(const study of studies){
 const doujun=S(I(study.yearBranch)-(birthMonth-1)+birthHour);
 const previousMonthLife=S(I(doujun)+study.leap-1);
 const followingMonthLife=S(I(doujun)+study.leap);
 for(const [date,month,day,phase] of study.fixtures){
   const [y,m,d]=date.split("-").map(Number);
   const observedDate=Solar.fromYmd(y,m,d).getLunar();
   if(observedDate.getMonth()!==month||observedDate.getDay()!==day) {
      throw new Error("bad independent calendar fixture "+date);
   }
   const data=subject.horoscope(date,6);
   const idx=data.daily?.index;
   const actual=Number.isInteger(idx)?natal.palaces[idx]?.earthlyBranch:null;
   const actualMonthly=Number.isInteger(data.monthly?.index)?
      natal.palaces[data.monthly.index]?.earthlyBranch:null;
   let expected=null,accounting="";
   switch(phase){
    case "regular_previous":
       expected=S(I(previousMonthLife)+day-1);
       accounting="regular lunar month day N";break;
    case "leap_early":
       expected=S(I(previousMonthLife)+study.precedingMonthDays+day-1);
       accounting="regular previous month days + early leap day N";break;
    case "leap_late":
       expected=S(I(followingMonthLife)+day-16);
       accounting="next effective month, days 16.. treated as days 1..";break;
    case "regular_following":
       expected=S(I(followingMonthLife)+(study.leapMonthDays-15)+day-1);
       accounting="remaining leap month days (14 when leap month has 29 days) + following regular month day N";break;
    default:throw Error("unknown phase");
   }
   records.push({date,year:study.year,lunar:{month,day},phase,
     expected_on_literal_cumulative_reading:expected,iztro_day_palace:actual,
     iztro_month_palace:actualMonthly,
     previous_month_palace:previousMonthLife,
     following_month_palace:followingMonthLife,
     preceding_month_days:study.precedingMonthDays,leap_month_days:study.leapMonthDays,source_page:58,
     status:expected===actual?"AGREES_WITH_INTERPRETATION":"DIFFERS_FROM_INTERPRETATION",
     accounting});
 }
}
const summary={
 status:"SOURCE_INTERPRETATION_TEST_NOT_CERTIFICATION",
 rule:"printed p58 continuous leap-month day numbering, half assigned to prior/next month",
 total:records.length, agrees:records.filter(r=>r.status.startsWith("AGREES")).length,
 differences:records.filter(r=>r.status.startsWith("DIFFERS")).length,
 important:"An apparent mismatch requires source-edition verification and a second historical example before product source-certification; never mutate raw iztro output to fit it.",
};
fs.mkdirSync("audit_out",{recursive:true});
fs.writeFileSync("audit_out/wang_leap_day_interpretation.json",
 JSON.stringify({summary,records},null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
console.log(JSON.stringify(records,null,2));
