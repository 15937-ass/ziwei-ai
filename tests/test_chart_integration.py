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
