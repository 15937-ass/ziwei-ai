#!/usr/bin/env node
/**
 * Source-first independent location oracles from Wang Tingzhi,
 * 《中州派紫微斗数初级讲义》, printed pp.31–58 (PDF pp.16–29).
 *
 * NOT an iztro self-comparison: every expected position below is computed
 * independently from the source's verses. JSON is an audit artifact,
 * so mismatch doesn't prevent the report from being saved.
 */
import fs from "node:fs";
import { WANG_MUTAGENS } from "./render_chart.mjs";
import path from "node:path";
import { astro } from "iztro";

const cfg = Object.freeze({
  algorithm:"zhongzhou", dayDivide:"current",
  yearDivide:"normal", horoscopeDivide:"normal", ageDivide:"normal",
  mutagens:WANG_MUTAGENS
});
const BR = [..."子丑寅卯辰巳午未申酉戌亥"];
const STEMS = [..."甲乙丙丁戊己庚辛壬癸"];
const S = (n) => BR[((n % 12) + 12) % 12];
const I = (s) => BR.indexOf(s);
const records = [];
const cache = new Map();

function lunar(month, day=15, hour=6, year=2000, gender="female") {
  const key = JSON.stringify(["l",year,month,day,hour,gender]);
  if (!cache.has(key)) {
    const raw = astro.withOptions({
      type:"lunar", dateStr: [year,month,day].join("-"),
      timeIndex:hour, gender, isLeapMonth:false, fixLeap:true,
      astroType:"heaven", language:"zh-CN", config:cfg
    });
    cache.set(key, typeof raw.toJSON === "function" ? raw.toJSON() : raw);
  }
  return cache.get(key);
}
function solar(year, hour=6, gender="female") {
  const key = JSON.stringify(["s",year,hour,gender]);
  if (!cache.has(key)) {
    const raw = astro.withOptions({
      type:"solar", dateStr:year+"-07-16",timeIndex:hour,
      gender, fixLeap:true, astroType:"heaven",
      language:"zh-CN", config:cfg
    });
    cache.set(key, typeof raw.toJSON === "function" ? raw.toJSON() : raw);
  }
  return cache.get(key);
}
function locate(chart, name) {
  const found=[];
  for (const p of chart.palaces) {
    for (const s of [...(p.majorStars||[]),...(p.minorStars||[]),...(p.adjectiveStars||[])]) {
      if (s.name === name) found.push(p.earthlyBranch);
    }
  }
  return [...new Set(found)];
}
function assertPlace(rule, chart, star, expected, fixture, source_page) {
  const actual=locate(chart,star);
  records.push({
    rule, star, fixture, source_page,
    expected, actual,
    status:actual.length===0 ? "NOT_EXPOSED" :
      (actual.length===1 && actual[0]===expected ? "PASS" : "MISMATCH")
  });
}
function compareValue(rule, expected, actual, fixture, source_page) {
  records.push({
    rule, fixture, source_page, expected, actual,
    status:actual==null ? "NOT_EXPOSED" : (actual===expected?"PASS":"MISMATCH")
  });
}

// All 10 birth-year stems, independent oracles for Wang's year-stem stars.
const FOUR_HUA = {
  "甲":["廉贞","破军","武曲","太阳"],
  "乙":["天机","天梁","紫微","太阴"],
  "丙":["天同","天机","文昌","廉贞"],
  "丁":["太阴","天同","天机","巨门"],
  "戊":["贪狼","太阴","太阳","天机"],
  "己":["武曲","贪狼","天梁","文曲"],
  "庚":["太阳","武曲","天府","天同"],
  "辛":["巨门","太阳","文曲","文昌"],
  "壬":["天梁","紫微","天府","武曲"],
  "癸":["破军","巨门","太阴","贪狼"]
};
const HUA_LABELS = ["禄","权","科","忌"];
const GUI_KUI = {
  甲:["丑","未"],乙:["子","申"],丙:["亥","酉"],丁:["亥","酉"],
  戊:["丑","未"],己:["子","申"],庚:["丑","未"],辛:["午","寅"],
  壬:["卯","巳"],癸:["卯","巳"]
};
const LUCUN = {甲:"寅",乙:"卯",丙:"巳",丁:"午",戊:"巳",
               己:"午",庚:"申",辛:"酉",壬:"亥",癸:"子"};
for (let idx=0;idx<10;idx++) {
  const stem=STEMS[idx], year=2004+idx, chart=solar(year);
  const fixture="solar "+year+"-07-16 female 午";
  // Mutagens are read from any of the star categories; no inference from
  // the author's own four-hua table or the currently selected algorithm.
  for (let j=0;j<4;j++) {
    const starName=FOUR_HUA[stem][j], label=HUA_LABELS[j];
    const observed=chart.palaces.flatMap(p=>
      [...(p.majorStars||[]),...(p.minorStars||[]),...(p.adjectiveStars||[])]
        .filter(s=>s.mutagen===label).map(s=>s.name)
    );
    compareValue("10_four_hua_"+label,starName,observed.length===1?observed[0]:
                 observed.length===0?null:observed.join(","),fixture,39);
  }
  assertPlace("11_tiankui",chart,"天魁",GUI_KUI[stem][0],fixture,39);
  assertPlace("11_tianyue",chart,"天钺",GUI_KUI[stem][1],fixture,39);
  const lu=LUCUN[stem], index=I(lu);
  assertPlace("12_lucun",chart,"禄存",lu,fixture,40);
  assertPlace("12_qingyang",chart,"擎羊",S(index+1),fixture,40);
  assertPlace("12_tuoluo",chart,"陀罗",S(index-1),fixture,40);
}

// Full 12-branch annual cycle: Wang's year-branch placement rules.
for (let k=0;k<12;k++) {
  const year=2000+k, branch=S(4+k), b=I(branch),
        chart=solar(year),fixture="solar "+year+"-07-16 birth year "+branch;
  const horse = "申子辰".includes(branch)?"寅":
    "寅午戌".includes(branch)?"申":
    "巳酉丑".includes(branch)?"亥":"巳";
  const hongluan=S(3-b);
  const yearStars = [
    ["18_tianma","天马",horse,44],
    ["18_tiankong","天空",S(b+1),44],
    ["19_tianku","天哭",S(6-b),45],
    ["19_tianxu","天虚",S(6+b),45],
    ["20_hongluan","红鸾",hongluan,45],
    ["20_tianxi","天喜",S(I(hongluan)+6),45],
    ["27_longchi","龙池",S(4+b),50],
    ["27_fengge","凤阁",S(10-b),50],
  ];
  for (const [rule,star,pos,page] of yearStars) {
    assertPlace(rule,chart,star,pos,fixture,page);
  }
}

// All 12 lunar months, month-based stars and left/right assistants.
const TIAN_YUE = ["戌","巳","辰","寅","未","卯","亥","未","寅","午","戌","寅"];
const YIN_SHA = ["寅","子","戌","申","午","辰"];
const WU = ["巳","申","寅","亥"];
const YUE_JIE = ["申","戌","子","寅","辰","午"];
for (let m=1;m<=12;m++) {
  const chart=lunar(m);
  const fixture="lunar 2000-"+m+"-15 female 午", v=m-1;
  const expected = [
    ["09_zuofu","左辅",S(4+v),38],
    ["09_youbi","右弼",S(10-v),38],
    ["29_tianxing","天刑",S(9+v),50],
    ["29_tianyao","天姚",S(1+v),50],
    ["30_yuejie","解神",YUE_JIE[Math.floor(v/2)],50],
    ["30_tianwu","天巫",WU[v%4],51],
    ["31_tianyue","天月",TIAN_YUE[v],51],
    ["32_yinsha","阴煞",YIN_SHA[v%6],52]
  ];
  for (const [rule,star,pos,page] of expected) {
    assertPlace(rule,chart,star,pos,fixture,page);
  }
}

// Full hour cycle: Wenqu/Wenchang, Dikong/Dijie and Taifu/Fenggao.
for (let t=0;t<12;t++) {
  const chart=lunar(4,10,t);
  const fixture="lunar 2000-4-10 timeIndex="+t;
  const expected=[
    ["09_wenqu","文曲",S(4+t),38],
    ["09_wenchang","文昌",S(10-t),38],
    ["09_dijie","地劫",S(11+t),38],
    ["09_dikong","地空",S(11-t),38],
    ["28_taifu","台辅",S(6+t),50],
    ["28_fenggao","封诰",S(2+t),50]
  ];
  for (const [rule,star,pos,page] of expected) {
    assertPlace(rule,chart,star,pos,fixture,page);
  }
}

// Standard birth-hour 12 = late Zi; source treats 00:00 as new day.
for (const hour of [0,12]) {
  const chart=lunar(4,10,hour);
  for (const [star,pos,page] of [
    ["文曲","辰",38],["文昌","戌",38],
    ["地劫","亥",38],["地空","亥",38],
  ]) assertPlace("09_zi_hour_equivalence",chart,star,pos,
                 "lunar 2000-4-10 timeIndex="+hour,page);
}

// Sensitive gender/annual yin-yang rule: Tian-shang/Tian-shi swap.
for (const [year,gender,normal] of [
  [2004,"male",true],[2004,"female",false],
  [2005,"male",false],[2005,"female",true]
]) {
  const chart=solar(year,6,gender);
  const friends=chart.palaces.find(p=>/交友|奴仆|仆役/.test(p.name));
  const health=chart.palaces.find(p=>/疾厄/.test(p.name));
  const fixture="solar "+year+"-07-16 "+gender;
  if (!friends||!health) {
    compareValue("33_tianshang_tianshi","friends+health palaces","NOT_FOUND",fixture,52);
    continue;
  }
  assertPlace("33_tianshang",chart,"天伤",normal?friends.earthlyBranch:health.earthlyBranch,fixture,52);
  assertPlace("33_tianshi",chart,"天使",normal?health.earthlyBranch:friends.earthlyBranch,fixture,52);
}

const totals={PASS:0,MISMATCH:0,NOT_EXPOSED:0};
for (const row of records) totals[row.status] = (totals[row.status]||0)+1;
const mismatches=records.filter(r=>r.status!=="PASS");
const summary={
  engine:"iztro-js@2.6.5",algorithm:"zhongzhou", 
  source:"王亭之《中州派紫微斗数初级讲义》印刷页31-58",
  source_scope:"独立规则位置 oracle，不含未录入之45类规则",
  fixture_count:cache.size,assertion_count:records.length,totals,
  differences_by_rule:Object.fromEntries([...new Set(mismatches.map(r=>r.rule))].map(k=>[
    k, records.filter(r=>r.rule===k&&r.status!=="PASS").length
  ]))
};
fs.mkdirSync("audit_out",{recursive:true});
fs.writeFileSync("audit_out/wang_location_audit.json",
  JSON.stringify({summary,mismatches,records},null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
console.log("Non-pass sample (up to 20): "+JSON.stringify(mismatches.slice(0,20)));
// Intentionally no failure exit: mismatches are what the audit is meant to find.
// Formal production admissions must never treat this audit as a PASS if nonpass>0.
