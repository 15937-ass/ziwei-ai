"""Deterministic source-policy comparison; never changes actual charting mode.

Run: python -m ziwei.chart.time_reference_audit
Wang Tingzhi's printed pp.5-8 specify the Luoyang reference, while users
requested local apparent solar time. These two are NOT equivalent, and
neither is a substitute for a verified historical astronomy policy.
"""
from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict
from datetime import date, datetime, timedelta
import json
from pathlib import Path

from .luoyang_comparison import compare_local_to_luoyang
from .solar_time import BirthInput

LOCATIONS = (
    ("Shanghai", "Asia/Shanghai", 121.46),
    ("Hong Kong", "Asia/Hong_Kong", 114.15),
    ("Beijing", "Asia/Shanghai", 116.40),
)
DATES = ("2000-02-11", "2000-05-14", "2000-07-26", "2000-11-03")


def generate_audit() -> dict:
    rows = []
    sample_changes = []
    for location, timezone, longitude in LOCATIONS:
        for day in DATES:
            for n in range(96):
                civil = datetime.fromisoformat(day) + timedelta(minutes=n * 15)
                birth = BirthInput(
                    civil_datetime=civil.isoformat(timespec="minutes"),
                    longitude_east_deg=longitude,
                    timezone=timezone,
                    gender="male",
                    birthplace_label=location,
                )
                x = compare_local_to_luoyang(birth)
                row = {
                    "location": location,
                    "civil_clock": x.civil_time,
                    "local_solar": x.local_apparent_solar_time,
                    "luoyang_reference": x.luoyang_reference_apparent_time,
                    "difference_minutes": x.local_minus_luoyang_minutes,
                    "local_shichen": x.local_shichen,
                    "luoyang_shichen": x.luoyang_shichen,
                    "same_date": x.same_apparent_calendar_date,
                }
                rows.append(row)
                if not x.identical_shichen and len([r for r in sample_changes if r["location"] == location]) < 3:
                    sample_changes.append(row)
    summaries = {}
    for location, _, longitude in LOCATIONS:
        matching = [r for r in rows if r["location"] == location]
        changes = [r for r in matching if r["local_shichen"] != r["luoyang_shichen"]]
        date_changes = [r for r in matching if not r["same_date"]]
        summaries[location] = {
            "longitude_east_deg":longitude,
            "samples":len(matching),
            "clock_difference_minutes":round(matching[0]["difference_minutes"], 3),
            "different_shichen":len(changes),
            "different_calendar_date":len(date_changes),
            "rate_different_shichen":round(len(changes)/len(matching), 4),
        }
    return {
        "status": "RESEARCH_COMPARISON_ONLY",
        "not_a_wang_certified_conversion": True,
        "luoyang_longitude_used": 112.45,
        "no_historical_ancestral_or_validation_adjustment": True,
        "sample_grid": "4 seasonal dates x 96 quarter-hour civil times x 3 cities",
        "summary": summaries,
        "mismatch_examples": sample_changes,
    }


def main() -> None:
    out = generate_audit()
    Path("audit_out").mkdir(exist_ok=True)
    Path("audit_out/luoyang_clock_grid.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
