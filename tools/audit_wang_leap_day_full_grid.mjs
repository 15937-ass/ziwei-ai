#!/usr/bin/env node
/**
 * M0-3 research-only, independent source-interpretation stress audit.
 *
 *王亭之《中州派紫微斗数初级讲义》印刷第58页明确:
 * - flow day 1 begins at flow month's life palace, count forward;
 * - leap month first 15 days belong to previous month, late days to next;
 * - for e.g. leap 3rd month, original 3rd 30 days + leap first 15 are
 *   CONTINUOUS 45-day sequence; following month's sequence is likewise extended.
 *
 * "Continuous offsets" below are a literal FORMALIZATION CANDIDATE,
 * NOT a source-certified implementation. No modifications to production
 * iztro horoscope or ChartSnapshot are allowed by this test.
 *
 * Source oracle uses: independently declared target year's earthly branch,
 * native birth month/hour, Gregorian-to-lunar dates from lunar-typescript.
 * It never derives its expected life-palace branch from iztro's daily index.
 */
import fs from "node:fs";
import { Solar } from "lunar-typescript";
import { astro } from "iztro";
import { CONFIG } from "./render_chart.mjs";

const BR=[..."子丑寅卯辰巳午未申酉戌亥"];
const I=b=>BR.indexOf(b), S=n=>BR[((n%12)+12)%12];
const MONTHS = [
  // 2017 leap June has 30 days (contrast 2020/2023/2025: 29 days).
  {year:2017, branch:"酉", leap:6,
   starts:["2017-06-24","2017-07-23","2017-08-22","2017-09-20"]},
  {year:2020, branch:"子", leap:4,
   starts:["2020-04-23","2020-05-23","2020-06-21","2020-07-21"]},
  {year:2023, branch:"卯", leap:2,
   starts:["2023-02-20","2023-03-22","2023-04-20","2023-05-19"]},
  {year:2025, branch:"巳", leap:6,
   starts:["2025-06-25","2025-07-25","2025-08-23","2025-09-22"]},
];
const NATALS = [
  {id:"lunar-2000-05-10-mao",month:5,hour:3,gender:"male",dateStr:"2000-5-10"},
  {id:"lunar-2000-01-10-wu",month:1,hour:6,gender:"female",dateStr:"2000-1-10"}
];
const dayIndex=(d)=>Math.floor(Date.parse(d+"T00:00:00Z")/86400000);
const isoDay=(day)=>new Date(day*86400000).toISOString().slice(0,10);
// Calendar input is cross-checked against an external publisher, not
// merely iztro's transitive lunar-typescript dependency.
const hko=JSON.parse(fs.readFileSync(
  "data/audit/hko_lunar_boundaries_v1.json","utf8"));
if(hko.anchors.length!==32)throw Error("HKO independent anchors incomplete");
for(const anchor of hko.anchors){
  const [y,m,d]=anchor.date.split("-").map(Number);
  const l=Solar.fromYmd(y,m,d).getLunar();
  if(l.getYear()!==anchor.lunar_year||
     l.getMonth()!==anchor.lunar_month||l.getDay()!==anchor.lunar_day){
    throw Error("lunar-typescript vs HKO independent calendar anchor "+anchor.date+
        " expected "+JSON.stringify(anchor)+" actual "+
        JSON.stringify({year:l.getYear(),month:l.getMonth(),day:l.getDay()}));
  }
}

const rows=[], groups=[], examples=[];
for(const cal of MONTHS) {
 const [before,leapStart,following,end]=cal.starts.map(dayIndex);
 const precedingDays=leapStart-before, leapDays=following-leapStart,
   followingDays=end-following;
 if(![29,30].includes(precedingDays)||![29,30].includes(leapDays)||
    ![29,30].includes(followingDays))throw new Error("Invalid lunar month boundary fixture");
 for(const natalInput of NATALS) {
   const subject=astro.withOptions({
     type:"lunar",dateStr:natalInput.dateStr,timeIndex:natalInput.hour,
     gender:natalInput.gender,isLeapMonth:false,fixLeap:true,
     astroType:"heaven",language:"zh-CN",config:CONFIG
   });
   const original=subject.toJSON();
   const doujun=S(I(cal.branch)-(natalInput.month-1)+natalInput.hour);
   const priorMonthPalace=S(I(doujun)+cal.leap-1);
   const nextMonthPalace=S(I(doujun)+cal.leap);
   const scopeRows=[];
   for(let day=before;day<end;day++) {
      const date=isoDay(day);
      const solar=Solar.fromYmd(...date.split("-").map(Number));
      const lunar=solar.getLunar();
      const lmonth=lunar.getMonth(),lday=lunar.getDay();
      let phase,expectedMonth,continuousOffset;
      if(day<leapStart) {
         phase="previous_regular";expectedMonth=cal.leap;
         continuousOffset=lday-1;
      } else if(day<following) {
         if(lday<=15) {
            phase="leap_early";expectedMonth=-cal.leap;
            continuousOffset=precedingDays+lday-1;
         } else {
            phase="leap_late";expectedMonth=-cal.leap;
            continuousOffset=lday-16;
         }
      } else {
         phase="next_regular";expectedMonth=cal.leap+1;
         continuousOffset=(leapDays-15)+lday-1;
      }
      if (lunar.getYear()!==cal.year||lmonth!==expectedMonth) {
        throw new Error("Calendar fixture mismatch "+date+": "+
           JSON.stringify({actual:[lunar.getYear(),lmonth,lday],expected:[cal.year,expectedMonth]}));
      }
      const expectedMonthPalace=(phase==="previous_regular"||phase==="leap_early")?
          priorMonthPalace:nextMonthPalace;
      const expectedContiguous=S(I(expectedMonthPalace)+continuousOffset);
      const expectedReset=S(I(expectedMonthPalace)+lday-1);
      const flow=subject.horoscope(date,6);
      const monthly=Number.isInteger(flow.monthly?.index)?
        original.palaces[flow.monthly.index]?.earthlyBranch??null:null;
      const daily=Number.isInteger(flow.daily?.index)?
        original.palaces[flow.daily.index]?.earthlyBranch??null:null;
      if(!monthly||!daily) throw new Error("Engine did not expose month/day palace "+date);
      const supportBasis=phase==="previous_regular"?
         "general_source_rule":
        phase==="leap_early"?(precedingDays===30?
         "explicit_source_30_plus_15_example":"29_day_previous_month_extrapolation"):
        phase==="leap_late"?
         "interpreted_late_half_day_renumbering":
         (leapDays===30?"example_45_day_next_month_continuation":
         "29_day_leap_next_month_extrapolation");
      const record={
        case_id:natalInput.id,year:cal.year,date,lunar_month:lmonth,lunar_day:lday,
        phase,source_support_basis:supportBasis,
        prior_month_days:precedingDays,leap_month_days:leapDays,
        expected_month_palace:expectedMonthPalace,actual_month_palace:monthly,
        expected_continuous_day_palace:expectedContiguous,
        expected_reset_day_palace:expectedReset,actual_day_palace:daily,
        continuous_elapsed_days:continuousOffset,
        source_reference:"WANG_CHUJI_PRINTED_P58",
        continuous_candidate_match:daily===expectedContiguous,
        reset_baseline_match:daily===expectedReset
      };
      rows.push(record);scopeRows.push(record);
   }
   const count=(items,pred)=>items.filter(pred).length;
   groups.push({
     year:cal.year,leap_month:cal.leap,
     natal_case:natalInput.id,
     preceding_month_days:precedingDays,
     leap_month_days:leapDays,
     following_month_days:followingDays,
     total:scopeRows.length,
     month_oracle_mismatches:count(scopeRows,r=>r.expected_month_palace!==r.actual_month_palace),
     source_continuous_mismatches:count(scopeRows,r=>!r.continuous_candidate_match),
     simple_reset_mismatches:count(scopeRows,r=>!r.reset_baseline_match),
     by_phase:Object.fromEntries(["previous_regular","leap_early","leap_late","next_regular"].map(p=>{
       const part=scopeRows.filter(r=>r.phase===p);
       return [p,{total:part.length,source_differences:count(part,r=>!r.continuous_candidate_match),
         reset_differences:count(part,r=>!r.reset_baseline_match)}];
     }))
   });
   for(const phase of ["leap_early","leap_late","next_regular"]) {
      const example=scopeRows.find(r=>r.phase===phase);
      if(example)examples.push(example);
   }
 }
}
const aggregate=(arr,key)=>arr.reduce((a,r)=>a+(r[key]?1:0),0);
const summary={
 status:"SOURCE_INTERPRETATION_COMPARISON_NOT_CERTIFIED",
 source:"王亭之《中州派紫微斗数初级讲义》印刷第58页",
 recorded_natal_charts:NATALS.length,
 years:MONTHS.map(x=>x.year),
 includes_30_day_leap:true,
 independent_calendar_fixture_from:"lunar-typescript with 32 externally checked HKO calendar anchors",
 independent_hko_anchors_checked:hko.anchors.length,
 rows:rows.length,
 by_source_support_basis:Object.fromEntries(
    [...new Set(rows.map(r=>r.source_support_basis))].map(b=>{
       const subset=rows.filter(r=>r.source_support_basis===b);
       return [b,{samples:subset.length,source_differences:subset.filter(r=>!r.continuous_candidate_match).length}];
    })
 ),
 month_source_matches:rows.filter(r=>r.expected_month_palace===r.actual_month_palace).length,
 source_continuous_matches:aggregate(rows,"continuous_candidate_match"),
 reset_baseline_matches:aggregate(rows,"reset_baseline_match"),
 by_year:groups,
 caveat:"A consistent mismatch with this source reading is not, by itself, source-certified proof of an iztro bug. Need manuscript/edition review and validate original calendar data independently."
};
fs.mkdirSync("audit_out",{recursive:true});
fs.writeFileSync("audit_out/wang_leap_day_full_grid.json",
  JSON.stringify({summary,examples,rows},null,2)+"\n");
console.log(JSON.stringify({...summary,by_year:groups.map(g=>({
  year:g.year,natal_case:g.natal_case,leap_month_days:g.leap_month_days,
  total:g.total,month_oracle_mismatches:g.month_oracle_mismatches,
  source_continuous_mismatches:g.source_continuous_mismatches,
  simple_reset_mismatches:g.simple_reset_mismatches
}))},null,2));
