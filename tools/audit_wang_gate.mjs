#!/usr/bin/env node
/**
 * Regression gate for sampled Wang source oracles.
 * Distinguishes a known, documented *raw iztro exposure limitation*
 * from a new mathematical mismatch. Success does NOT certify all 46 rules.
 */
import fs from "node:fs";
const files = [
  ["audit_out/wang_location_audit.json",370],
  ["audit_out/wang_extra_audit.json",2931],
  ["audit_out/wang_remaining_audit.json",481]
];
const knownPartial=new Set(["16_jiekong_pair","17_xunkong_pair"]);
let matched=0,partial=0;
for(const [path,minCount] of files){
  const d=JSON.parse(fs.readFileSync(path,"utf8"));
  if(!Array.isArray(d.records)||d.records.length<minCount) {
    throw new Error(path+" oracle count dropped below audited baseline");
  }
  for(const row of d.records){
    if(row.status==="PASS"){matched++;continue;}
    if(row.status==="PARTIAL_EXPOSURE"&&knownPartial.has(row.rule)){
      partial++;continue;
    }
    throw new Error("Unexpected source mismatch in "+path+": "+JSON.stringify(row));
  }
}
if(partial!==20) throw new Error("Known void-only partial sample count changed: "+partial);
console.log(JSON.stringify({
  source_sample_gate:"PASS_WITH_DOCUMENTED_RAW_VOID_GAPS",
  matched, raw_void_partial:partial, full_wang_certification:false
},null,2));


// New source-derived dynamic observations must not silently regress.
// Intercalary FLOW-DAY interpretation remains an explicitly unresolved,
 // separately measured source-policy gap; do not claim a green certification.
const dynamic = JSON.parse(fs.readFileSync("audit_out/wang_dynamic_v2.json","utf8"));
if (dynamic.records.length < 239) throw new Error("Wang dynamic oracle coverage regressed");
for (const row of dynamic.records) {
  if (row.status !== "PASS") {
    throw new Error("Wang normal-date/doujun oracle mismatch: " + JSON.stringify(row));
  }
}
// The user selected iztro's native flow-day implementation as the current
// product baseline. The Wang p58 continuous-count reading remains research
// evidence, not a blocking release constraint. Do not encode a disputed
// source interpretation's exact mismatch count into the release gate.
const leap = JSON.parse(fs.readFileSync("audit_out/wang_leap_day_interpretation.json","utf8"));
if (!Array.isArray(leap.records) || leap.records.length < 14) {
  throw new Error("Historical leap-day research samples are missing");
}
const grid=JSON.parse(fs.readFileSync("audit_out/wang_leap_day_full_grid.json","utf8"));
const gs=grid.summary;
if (gs.rows!==708 || gs.independent_hko_anchors_checked!==32 ||
    gs.month_source_matches!==gs.rows || gs.reset_baseline_matches!==gs.rows ||
    !gs.includes_30_day_leap) {
  throw new Error("Pinned iztro native flow-day or calendar anchoring regressed: "+
    JSON.stringify({rows:gs.rows,anchors:gs.independent_hko_anchors_checked,
      monthMatches:gs.month_source_matches,nativeMatches:gs.reset_baseline_matches}));
}
console.log(JSON.stringify({
  active_flow_day_policy:"FLOW_DAY_IZTRO_NATIVE_V1",
  native_iztro_regression:"PASS",
  native_rows:gs.reset_baseline_matches,
  source_interpretation_status:"UNRESOLVED_NONBLOCKING",
  source_candidate_matches:gs.source_continuous_matches,
  source_candidate_differences:gs.rows-gs.source_continuous_matches,
  full_wang_certification:false
},null,2));
