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
