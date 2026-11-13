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
export const CONFIG = Object.freeze({
  algorithm: "zhongzhou",
  dayDivide: "current", // Wang Tingzhi: next day begins 00:00, not 23:00
  yearDivide: "normal",
  horoscopeDivide: "normal",
  ageDivide: "normal",
});
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const MAJORS = new Set([
  "紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府",
  "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"
]);

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
  const allMajors = palaces.flatMap(p=>p.major_stars.map(s=>s.name));
  if (allMajors.length !== 14 || new Set(allMajors).size !== 14 ||
      allMajors.some(s=>!MAJORS.has(s))) {
    throw new Error("iztro returned invalid 14 major stars");
  }
  return {
    engine: { name:"iztro-js", version:VERSION },
    policy: {
      school:"zhongzhou", astro_type:"heaven", fix_leap:true,
      day_divide:CONFIG.dayDivide, year_divide:CONFIG.yearDivide,
      horoscope_divide:CONFIG.horoscopeDivide, age_divide:CONFIG.ageDivide,
      language:"zh-CN"
    },
    input: payload,
    natal: {
      solar_date:raw.solarDate,
      lunar_date:raw.lunarDate,
      chinese_date:raw.chineseDate,
      time:raw.time,
      time_range:raw.timeRange,
      five_elements_class:raw.fiveElementsClass,
      soul_star:raw.soul,
      body_star:raw.body,
      soul_palace_branch:raw.earthlyBranchOfSoulPalace,
      body_palace_branch:raw.earthlyBranchOfBodyPalace,
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
