"""Generate a REAL end-to-end natal chart from the pinned iztro bridge.

Usage (repo root):
    python tools/demo_chart.py
    python tools/demo_chart.py examples/birth_input.example.json

Produces two files under audit_out/, suitable for CI artifact download.
Do not commit actual people's birth inputs or generated charts.
"""
from __future__ import annotations

from pathlib import Path
import json
import sys

from ziwei.chart import BirthInput, render_chart, validate_chart_snapshot
from ziwei.chart.contract import MAJOR_STARS

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "examples/birth_input.example.json"
    if len(sys.argv) > 2:
        raise SystemExit("usage: python tools/demo_chart.py [birth_input.json]")

    birth = BirthInput.from_dict(json.loads(source.read_text(encoding="utf-8")))
    chart = render_chart(birth)
    validate_chart_snapshot(chart)  # reject an incomplete or inconsistent chart
    natal = chart["natal"]
    time = chart["time"]

    palace_rows = []
    star_total = 0
    for p in natal["palaces"]:
        main_stars = [
            s["name"] + (f"（化{s['mutagen']}）" if s.get("mutagen") else "")
            for s in p["major_stars"] if s["name"] in MAJOR_STARS
        ]
        star_total += len(main_stars)
        all_minor = [s["name"] for s in p["minor_stars"]]
        palace_rows.append(
            "| {branch} | {stem}{branch} | {name} | {main} | {minor} |".format(
                branch=p["branch"], stem=p["stem"], name=p["name"],
                main="、".join(main_stars) or "—",
                minor="、".join(all_minor) or "—",
            )
        )
    assert star_total == 14, "demo must contain exactly 14 principal stars"
    assert len(palace_rows) == 12, "demo must contain exactly 12 palaces"

    summary = "\n".join([
        "# 紫微斗数排盘实测结果（合成测试输入）",
        "",
        "> 测试用例，非真实用户资料，也不包含命理推断。",
        "",
        f"- **出生民用时间**：{birth.civil_datetime}，{birth.timezone}",
        f"- **出生地**：{birth.birthplace_label}，东经 {birth.longitude_east_deg}°",
        f"- **性别**：{birth.gender}",
        f"- **真太阳时**：{time['true_solar_datetime']}（NOAA近似算法）",
        f"- **校正总时差**：{time['total_correction_minutes']:+.3f} 分钟",
        f"- **排盘输入日期 / 时辰索引**：{chart['input_to_engine']['solar_date']} / {time['time_index']}",
        f"- **历法农历**：{natal['lunar_date']}",
        f"- **命宫**：{natal['soul_palace_branch']}，**身宫**：{natal['body_palace_branch']}",
        f"- **五行局**：{natal['five_elements_class']}",
        f"- **命主 / 身主**：{natal['soul_star']} / {natal['body_star']}",
        f"- **排盘引擎**：{chart['engine']['name']} {chart['engine']['version']}",
        f"- **配置**：{chart['policy']['algorithm']}，00:00换日，王亭之十干四化",
        "",
        "## 十二宫与十四正曜",
        "",
        "| 地支 | 宫位干支 | 宫名 | 十四正曜 | 辅曜（部分） |",
        "| --- | --- | --- | --- | --- |",
        *palace_rows,
        "",
        "## 空曜正傍位置（单独来源字段）",
        "",
        f"- 截空：正空 {natal['source_void_pairs']['jiekong']['principal_branch']}，傍空 {natal['source_void_pairs']['jiekong']['secondary_branch']}",
        f"- 旬空：正空 {natal['source_void_pairs']['xunkong']['principal_branch']}，傍空 {natal['source_void_pairs']['xunkong']['secondary_branch']}",
        "",
        "## 校验结论",
        "",
        "- 完成 Python → 真太阳时 → iztro JS → Python ChartSnapshot 全流程。",
        "- 12个地支宫位互异、14正曜无缺失，输入校时与引擎输入一致。",
        "- 仅证明该样本排盘成功，不代表原典全部细节已获得100%认证。",
        "",
    ])

    out = ROOT / "audit_out"
    out.mkdir(exist_ok=True)
    (out / "example_chart_full.json").write_text(
        json.dumps(chart, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out / "example_chart_summary.md").write_text(summary, encoding="utf-8")
    print(summary)
    print("Full JSON: audit_out/example_chart_full.json", file=sys.stderr)


if __name__ == "__main__":
    main()
