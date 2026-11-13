import test from "node:test";
import assert from "node:assert/strict";
import { render, CONFIG } from "../../tools/render_chart.mjs";

test("Zhongzhou late-Zi and calendar settings are explicit", () => {
  assert.equal(CONFIG.algorithm, "zhongzhou");
  assert.equal(CONFIG.dayDivide, "current");
  assert.equal(CONFIG.yearDivide, "normal");
  assert.equal(CONFIG.horoscopeDivide, "normal");
});

test("engine produces all 12 branches and 14 principal stars", () => {
  const result = render({ solar_date: "2000-08-16", time_index: 2, gender: "female" });
  assert.equal(result.engine.version, "2.6.5");
  assert.equal(result.policy.fix_leap, true);
  assert.equal(result.policy.day_divide, "current");
  assert.equal(result.natal.palaces.length, 12);
  assert.equal(result.natal.soul_palace_branch, "午"); // published iztro example; check regressions
  const majors = new Set(["紫微","天机","太阳","武曲","天同","廉贞","天府","太阴","贪狼","巨门","天相","天梁","七杀","破军"]);
  const seen = result.natal.palaces.flatMap(p=>p.major_stars.map(s=>s.name)).filter(n=>majors.has(n));
  assert.equal(seen.length, 14);
  assert.equal(new Set(seen).size, 14);
});

test("unknown chart overrides are rejected", () => {
  assert.throws(
    ()=>render({solar_date:"2000-08-16",time_index:2,gender:"female",algorithm:"default"}),
    /overrides are forbidden/
  );
});

test("late Zi is passed to engine as the same calendar date", () => {
  const result=render({solar_date:"2000-08-16",time_index:12,gender:"male"});
  assert.equal(result.natal.solar_date,"2000-08-16");
});

test("leap-month first half and second half change the effective month", async () => {
  const { astro } = await import("iztro");
  const base = (dateStr, fixLeap) => astro.withOptions({
    type: "solar", dateStr, timeIndex: 6, gender: "female",
    fixLeap, language: "zh-CN", astroType: "heaven", config: CONFIG
  });
  // Gregorian Apr 5/6 2023 = leap lunar month 2 day 15/16.
  const earlyFixed = base("2023-04-05", true);
  const earlyRaw = base("2023-04-05", false);
  const lateFixed = base("2023-04-06", true);
  const lateRaw = base("2023-04-06", false);
  assert.equal(earlyFixed.earthlyBranchOfSoulPalace, earlyRaw.earthlyBranchOfSoulPalace);
  assert.notEqual(lateFixed.earthlyBranchOfSoulPalace, lateRaw.earthlyBranchOfSoulPalace);
  assert.match(String(lateFixed.lunarDate), /闰/);
});
