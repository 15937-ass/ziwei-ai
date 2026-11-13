"""Real pinned JS-engine end-to-end tests; run after npm install."""
from datetime import datetime
import json
from pathlib import Path

import pytest
from ziwei.chart import BirthInput, render_chart, validate_chart_snapshot
from ziwei.chart.contract import CHART_CONTRACT_ID, CHART_POLICY


pytestmark = pytest.mark.skipif(
    not (Path(__file__).resolve().parents[1] / "node_modules" / "iztro").exists(),
    reason="npm dependencies not installed (CI runs this after npm install)",
)


def make_birth(clock: str, longitude: float = 116.4, gender: str = "female"):
    return BirthInput(clock, longitude, "Asia/Shanghai", gender, "fixture")


def test_end_to_end_chart_has_full_wang_policy() -> None:
    chart = render_chart(make_birth("2000-08-16T12:00"))
    validate_chart_snapshot(chart)
    assert chart["contract_id"] == CHART_CONTRACT_ID
    assert chart["policy"] == CHART_POLICY
    assert chart["policy"]["day_divide"] == "current"
    assert chart["policy"]["fix_leap"] is True
    assert len(chart["natal"]["palaces"]) == 12
    assert len({p["branch"] for p in chart["natal"]["palaces"]}) == 12
    assert chart["input_to_engine"]["solar_date"] == "2000-08-16"


def test_correction_changes_engine_birth_date() -> None:
    chart = render_chart(make_birth("2000-08-16T00:15"))
    assert chart["input_to_engine"]["solar_date"] == "2000-08-15"
    assert chart["input_to_engine"]["time_index"] == 12
    assert chart["natal"]["solar_date"] == "2000-08-15"


def test_crossing_forward_produces_early_zi_next_date() -> None:
    chart = render_chart(make_birth("2000-08-16T23:59", 121.5))
    assert chart["input_to_engine"]["solar_date"] == "2000-08-17"
    assert chart["input_to_engine"]["time_index"] == 0


def test_incomplete_or_tampered_chart_is_rejected() -> None:
    chart = render_chart(make_birth("2000-08-16T12:00"))
    chart["policy"]["day_divide"] = "forward"
    with pytest.raises(ValueError, match="policy"):
        validate_chart_snapshot(chart)


def test_leap_month_fixture_runs_in_pinned_engine() -> None:
    # 2023-04-06 is in the second half of leap lunar month 2.
    # This test verifies the route and recorded fixLeap policy. A separate
    # source-anchored palace oracle is still required to certify Wang fidelity.
    chart = render_chart(make_birth("2023-04-06T12:00"))
    assert "闰" in chart["natal"]["lunar_date"]
    assert chart["policy"]["fix_leap"] is True

def test_wang_1938_calendar_example() -> None:
    # Wang Tingzhi, 初级讲义, 出生月日换算法:
    # 1938-12-27 => 农历十一月初六.
    # His 08:00 Hong Kong example requires longitude/timezone correction.
    chart = render_chart(BirthInput(
        "1938-12-27T08:00", 114.17, "Asia/Hong_Kong", "female", "Hong Kong source illustration"
    ))
    assert chart["input_to_engine"]["solar_date"] == "1938-12-27"
    assert "初六" in chart["natal"]["lunar_date"]

def test_void_pairs_and_twelve_cycles_preserved() -> None:
    c=render_chart(make_birth("2004-07-16T12:00",gender="male"))
    v=c["natal"]["source_void_pairs"]
    assert v["birth_year_stem"] == "甲"
    assert v["birth_year_branch"] == "申"
    assert v["jiekong"]["principal_branch"] == "申"
    assert v["jiekong"]["secondary_branch"] == "酉"
    assert v["xunkong"]["principal_branch"] == "午"
    assert v["xunkong"]["secondary_branch"] == "未"
    for p in c["natal"]["palaces"]:
        assert isinstance(p["changsheng12"],str)
        assert isinstance(p["suiqian12"],str)
        assert isinstance(p["jiangqian12"],str)
        assert isinstance(p["boshi12"],str)
        assert isinstance(p["small_limit_ages"],list)


def test_tampered_void_branch_rejected() -> None:
    c=render_chart(make_birth("2004-07-16T12:00",gender="male"))
    c["natal"]["source_void_pairs"]["jiekong"]["principal_branch"]="子"
    with pytest.raises(ValueError,match="source void"):
        validate_chart_snapshot(c)
