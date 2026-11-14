"""Agent-facing natal formatting tests based on the existing normalizer fixture.

All astrology data here is synthetic except the explicit iztro integration case.
"""
from __future__ import annotations

from copy import deepcopy
import re
from pathlib import Path

import pytest

from test_spatial_normalizer import fixture_chart
from ziwei.chart import BirthInput, render_chart
from ziwei.chart.contract import MAJOR_STARS
from ziwei.spatial import BRANCHES, normalize_natal_snapshot, restore_chart_snapshot
from ziwei.spatial.agent_view import (
    NATAL_AGENT_VIEW_VERSION,
    build_natal_agent_view,
    render_natal_agent_text,
)


def test_single_global_topology_and_twelve_wenmo_style_palaces():
    chart = fixture_chart()
    view = build_natal_agent_view(chart)
    text = render_natal_agent_text(chart)
    assert view["schema_version"] == NATAL_AGENT_VIEW_VERSION
    assert view["scope"] == "natal"
    assert view["spatial_prelude"]["branch_order"] == list(BRANCHES)
    assert [p["branch"] for p in view["palaces"]] == list(BRANCHES)
    assert view["palaces"][0]["role"] == "命宫"
    assert view["palaces"][-1]["branch"] == "亥"
    assert text.count("├空间前置结构") == 1
    assert text.count("三方四正") == 1
    assert len(re.findall(r"^│ ├.+宫\\[", text, flags=re.M)) == 12
    assert "前夹+11(-1)/后夹+1" in text
    assert "│ ├主星:" not in text  # nested category, not a global palace
    assert "│ │ ├主星:" in text
    assert "│ │ ├辅星:" in text
    assert "│ │ ├小星:" in text
    assert "│ │ └神煞:" in text
    assert "│ ├命宫[甲子]" in text
    assert "│ ├夫妻宫[甲寅]" in text


def test_no_per_palace_spatial_repetition_or_temporal_data():
    chart = fixture_chart()
    view = build_natal_agent_view(chart)
    text = render_natal_agent_text(chart)
    assert all("neighbors" not in p for p in view["palaces"])
    assert all("star_refs" not in p for p in view["palaces"])
    assert all("decadal" not in p for p in view["palaces"])
    assert all("small_limit_ages" not in p for p in view["palaces"])
    assert "流年" not in text and "流月" not in text and "大限" not in text
    assert "source_array_index" not in text
    assert "ring_index" not in text
    assert "neighbors" not in text


def test_stars_brightness_mutagens_and_shensha_are_visible_without_invention():
    chart = fixture_chart()
    view = build_natal_agent_view(chart)
    text = render_natal_agent_text(chart)
    assert sum(
        star["name"] in MAJOR_STARS
        for p in view["palaces"]
        for star in p["major_stars"]
    ) == 14
    assert "[旺][生年禄]" in text
    assert "天喜" in text
    assert text.count("天喜") == 2  # duplicate occurrences preserved
    assert "禄存" in text  # iztro major bucket non-principal shown as support
    assert "文昌" in text
    assert "岁前星=岁建" in text
    assert "将前星=岁驿" in text
    assert "十二长生=长生" in text
    assert "博士十二神=博士" in text
    assert "截空: 正空=申; 傍空=酉" in text
    assert "旬空: 正空=午; 傍空=未" in text
    assert "[原始宫标记]" in text
    assert "[身宫]" in text
    assert "↑" not in text and "↓" not in text  # no invented fly-star signs


def test_birth_details_are_excluded_by_default_and_optional_when_requested():
    chart = fixture_chart()
    plain = build_natal_agent_view(chart)
    text = render_natal_agent_text(chart)
    assert "birth_dates" not in plain["basic"]
    for sensitive in (
        "2000-08-16", "2000-08-16T12:30:00", "116.4",
        "Asia/Shanghai", "longitude_east_deg", "birth_input",
    ):
        assert sensitive not in text
    assert "source_envelope" not in plain
    assert "true_solar_datetime" not in str(plain)
    explicit = build_natal_agent_view(chart, include_birth_details=True)
    assert explicit["basic"]["birth_dates"]["solar_date"] == "2000-08-16"
    assert "公历日期: 2000-08-16" in render_natal_agent_text(
        chart, include_birth_details=True
    )
    with pytest.raises(TypeError):
        build_natal_agent_view(chart, include_birth_details="true")


def test_internal_snapshot_untouched_after_agent_formatting():
    chart = fixture_chart()
    original = deepcopy(chart)
    _ = render_natal_agent_text(chart)
    _ = build_natal_agent_view(chart)
    assert chart == original
    graph = normalize_natal_snapshot(chart)
    assert restore_chart_snapshot(graph) == original
    assert view_stars_match_source(build_natal_agent_view(chart), graph)


def view_stars_match_source(view: dict, graph: dict) -> bool:
    for palace, node in zip(view["palaces"], graph["nodes"]):
        for bucket in ("major_stars", "minor_stars", "adjective_stars"):
            if palace[bucket] != node["palace"][bucket]:
                return False
    return True


@pytest.mark.skipif(
    not (Path(__file__).resolve().parents[1] / "node_modules" / "iztro").exists(),
    reason="npm dependencies not installed (CI installs pinned iztro)",
)
def test_real_iztro_chart_is_renderable_with_no_star_loss():
    chart = render_chart(BirthInput(
        "2000-08-16T12:00", 116.4, "Asia/Shanghai", "female", "synthetic example"
    ))
    view = build_natal_agent_view(chart)
    text = render_natal_agent_text(chart)
    assert len(view["palaces"]) == 12
    assert [x["branch"] for x in view["palaces"]] == list(BRANCHES)
    originals = {p["branch"]: p for p in chart["natal"]["palaces"]}
    for p in view["palaces"]:
        src = originals[p["branch"]]
        for field in ("major_stars", "minor_stars", "adjective_stars"):
            assert p[field] == src[field]
    assert text.count("├空间前置结构") == 1
    assert "命盘十二宫" in text
