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
const leap = JSON.parse(fs.readFileSync("audit_out/wang_leap_day_interpretation.json","utf8"));
const divergent = leap.records.filter(r=>r.status==="DIFFERS_FROM_INTERPRETATION");
if (leap.records.length !== 14 || divergent.length !== 12) {
  throw new Error("Wang p58 leap-day discrepancy pattern changed; require explicit source review");
}
console.log(JSON.stringify({
  source_dynamic_gate:"PASS_REGULAR_WITH_OPEN_LEAP_SOURCE_INTERPRETATION",
  dynamic_pass:dynamic.records.length,
  leap_interpretation_differences:divergent.length,
  full_source_certification:false
},null,2));
