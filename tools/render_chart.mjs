#!/usr/bin/env node
/**
 * A strict, one-request/one-response iztro chart bridge.
 * Input: JSON { solar_date, time_index, gender }
 * Output: JSON chart object with engine and explicit school policy.
 * stdout is JSON-only. Rejects caller-supplied school/config overrides.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { astro } from "iztro";

const VERSION = "2.6.5";
// Wang Tingzhi, 初级讲义 printed p39; ordered 禄、权、科、忌.
export const WANG_MUTAGENS = Object.freeze({
  "甲": [
    "廉贞",
    "破军",
    "武曲",
    "太阳"
  ],
  "乙": [
    "天机",
    "天梁",
    "紫微",
    "太阴"
  ],
  "丙": [
    "天同",
    "天机",
    "文昌",
    "廉贞"
  ],
  "丁": [
    "太阴",
    "天同",
    "天机",
    "巨门"
  ],
  "戊": [
    "贪狼",
    "太阴",
    "太阳",
    "天机"
  ],
  "己": [
    "武曲",
    "贪狼",
    "天梁",
    "文曲"
  ],
  "庚": [
    "太阳",
    "武曲",
    "天府",
    "天同"
  ],
  "辛": [
    "巨门",
    "太阳",
    "文曲",
    "文昌"
  ],
  "壬": [
    "天梁",
    "紫微",
    "天府",
    "武曲"
  ],
  "癸": [
    "破军",
    "巨门",
    "太阴",
    "贪狼"
  ]
});
export const CONFIG = Object.freeze({
  algorithm: "zhongzhou",
  dayDivide: "current", // Wang Tingzhi: next day begins 00:00, not 23:00
  yearDivide: "normal",
  horoscopeDivide: "normal",
  ageDivide: "normal",
  mutagens: WANG_MUTAGENS,
});
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const MAJORS = new Set([
  "紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府",
  "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"
]);

// From Wang's 初级讲义 printed p43: both 截空 and 旬空 have 正空、傍空
// locations; iztro 2.6.5 only exposes the principal location as one star.
const STEMS = [..."甲乙丙丁戊己庚辛壬癸"];
const JIEKONG_PAIRS = Object.freeze({
  甲:["申","酉"],乙:["午","未"],丙:["辰","巳"],丁:["寅","卯"],戊:["子","丑"],
  己:["申","酉"],庚:["午","未"],辛:["辰","巳"],壬:["寅","卯"],癸:["子","丑"]
});
const modulo = (v,n) => ((v%n)+n)%n;
function sourceVoidPairs(raw) {
  // Do not infer Chinese birth year from Gregorian year: near CNY can differ.
  const m = String(raw.chineseDate ?? "").match(/^([甲乙丙丁戊己庚辛壬癸])([子丑寅卯辰巳午未申酉戌亥])(?:\s|$)/u);
  if (!m) throw new Error("cannot identify birth year gan-zhi in iztro Chinese date");
  const stem=m[1], branch=m[2], stemIdx=STEMS.indexOf(stem);
  const jie=JIEKONG_PAIRS[stem];
  const xunStart=modulo(BRANCHES.indexOf(branch)-stemIdx+10,12);
  const xun=[BRANCHES[xunStart],BRANCHES[modulo(xunStart+1,12)]];
  const observed=(name)=>raw.palaces.flatMap(p=>
    [...(p.majorStars??[]),...(p.minorStars??[]),...(p.adjectiveStars??[])]
      .filter(s=>s.name===name).map(()=>p.earthlyBranch));
  const make=(name,pair)=>{
    const main=pair.find(b=>BRANCHES.indexOf(b)%2===stemIdx%2);
    const secondary=pair.find(b=>b!==main);
    const engine=observed(name);
    if (engine.length!==1 || engine[0]!==main) {
      throw new Error(name+" main branch does not match Wang p43 oracle");
    }
    return {
      principal_branch:main,
      secondary_branch:secondary,
      engine_star_branch:engine[0],
      source:"WANG_TINGZHI_CHUJI_PRINTED_P43",
      method:"source_pair_plus_yin_yang_principal"
    };
  };
  return {
    birth_year_stem:stem,
    birth_year_branch:branch,
    jiekong:make("截空",jie),
    xunkong:make("旬空",xun)
  };
}

function installedVersion() {
  let dir = path.dirname(fileURLToPath(import.meta.resolve("iztro")));
  while (true) {
    const packagePath = path.join(dir, "package.json");
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
      if (pkg.name === "iztro") return pkg.version;
    }
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("could not determine installed iztro version");
    dir = parent;
  }
}
function starRecord(star) {
  return {
    name: star.name,
    type: star.type ?? null,
    brightness: star.brightness ?? null,
    mutagen: star.mutagen ?? null,
    scope: star.scope ?? null,
  };
}
function cleanPalace(p) {
  return {
    name: p.name,
    stem: p.heavenlyStem,
    branch: p.earthlyBranch,
    is_body_palace: Boolean(p.isBodyPalace),
    is_original_palace: Boolean(p.isOriginalPalace),
    palace_index: p.index,
    changsheng12: p.changsheng12 ?? null,
    boshi12: p.boshi12 ?? null,
    jiangqian12: p.jiangqian12 ?? null,
    suiqian12: p.suiqian12 ?? null,
    small_limit_ages: p.ages ?? [],
    major_stars: (p.majorStars ?? []).map(starRecord),
    minor_stars: (p.minorStars ?? []).map(starRecord),
    adjective_stars: (p.adjectiveStars ?? []).map(starRecord),
    decadal: p.decadal ? {
      range: p.decadal.range ?? null,
      stem: p.decadal.heavenlyStem ?? null,
      branch: p.decadal.earthlyBranch ?? null
    } : null
  };
}

export function render(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      Object.keys(payload).sort().join(",") !== "gender,solar_date,time_index") {
    throw new Error("expected exactly {gender, solar_date, time_index}; configuration overrides are forbidden");
  }
  if (installedVersion() !== VERSION) throw new Error("iztro version mismatch");
  const {solar_date, time_index, gender} = payload;
  if (typeof solar_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(solar_date)) {
    throw new Error("solar_date must be YYYY-MM-DD");
  }
  if (!Number.isInteger(time_index) || time_index < 0 || time_index > 12) {
    throw new Error("time_index must be integer 0..12");
  }
  if (!["male", "female"].includes(gender)) throw new Error("gender must be male/female");
  const chart = astro.withOptions({
    type: "solar",
    dateStr: solar_date,
    timeIndex: time_index,
    gender,
    isLeapMonth: false,
    fixLeap: true,
    language: "zh-CN",
    astroType: "heaven",
    config: CONFIG
  });
  const raw = typeof chart.toJSON === "function" ? chart.toJSON() : chart;
  if (!Array.isArray(raw.palaces) || raw.palaces.length !== 12) {
    throw new Error("iztro returned wrong palace count");
  }
  const palaces = raw.palaces.map(cleanPalace)
    .sort((a,b) => BRANCHES.indexOf(a.branch) - BRANCHES.indexOf(b.branch));
  if (palaces.some(p => !BRANCHES.includes(p.branch)) ||
      new Set(palaces.map(p=>p.branch)).size !== 12 ||
      new Set(palaces.map(p=>p.name)).size !== 12) {
    throw new Error("iztro returned incomplete/duplicate palace identity");
  }
  // iztro's majorStars may also contain 禄存 / 天马. Validate the 14
  // principal stars specifically; preserve all remaining star records.
  const allMajors = palaces.flatMap(p=>p.major_stars.map(s=>s.name))
    .filter(name => MAJORS.has(name));
  if (allMajors.length !== 14 || new Set(allMajors).size !== 14) {
    throw new Error("iztro returned invalid 14 principal stars");
  }
  return {
    engine: { name:"iztro-js", version:VERSION },
    policy: {
      school:"zhongzhou", algorithm:"zhongzhou", astro_type:"heaven", fix_leap:true,
      day_divide:CONFIG.dayDivide, year_divide:CONFIG.yearDivide,
      horoscope_divide:CONFIG.horoscopeDivide, age_divide:CONFIG.ageDivide,
      language:"zh-CN", mutagens: WANG_MUTAGENS
    },
    input: payload,
    natal: {
      solar_date:String(raw.solarDate).split("-").map((part,i) => i === 0 ? part.padStart(4,"0") : part.padStart(2,"0")).join("-"),
      lunar_date:raw.lunarDate,
      chinese_date:raw.chineseDate,
      time:raw.time,
      time_range:raw.timeRange,
      five_elements_class:raw.fiveElementsClass,
      soul_star:raw.soul,
      body_star:raw.body,
      soul_palace_branch:raw.earthlyBranchOfSoulPalace,
      body_palace_branch:raw.earthlyBranchOfBodyPalace,
      source_void_pairs:sourceVoidPairs(raw),
      palaces
    }
  };
}

const runningAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runningAsScript) {
  try {
    const raw = fs.readFileSync(0, "utf8");
    const result = render(JSON.parse(raw));
    process.stdout.write(JSON.stringify(result) + "\n");
  } catch (error) {
    console.error("CHART_BRIDGE_ERROR:", error?.message ?? String(error));
    process.exitCode = 1;
  }
}
