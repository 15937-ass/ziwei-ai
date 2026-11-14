"""Lossless C12 natal normalizer tests; synthetic fixture plus actual iztro integration."""

from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path

import pytest

from ziwei.chart import BirthInput, render_chart, validate_chart_snapshot
from ziwei.chart.contract import (
    ADAPTER_VERSION, CHART_CONTRACT_ID, CHART_POLICY,
    ENGINE_NAME, ENGINE_VERSION, MAJOR_STARS,
)
from ziwei.spatial import BRANCHES, TOPOLOGY_CONTRACT_ID, flanks, opposite, trines
from ziwei.spatial.normalizer import (
    NATAL_SPATIAL_SCHEMA_VERSION, normalize_natal_snapshot,
    restore_chart_snapshot, resolve_star_reference, snapshot_sha256,
)


def fixture_chart() -> dict:
    """An intentionally synthetic, structurally valid snapshot; not a forecast."""
    names = (
        "命宫", "兄弟宫", "夫妻宫", "子女宫", "财帛宫", "疾厄宫",
        "迁移宫", "交友宫", "官禄宫", "田宅宫", "福德宫", "父母宫",
    )
    majors = sorted(MAJOR_STARS)
    palaces = []
    for i, branch in enumerate(BRANCHES):
        major = [dict(name=majors[i], type="major", brightness="庙",
                      mutagen=None, scope="natal", extra_attr={"n": i})]
        if i == 0:
            major.extend([
                {"name": majors[12], "type": "major", "brightness": "旺", "mutagen": "禄"},
                {"name": "禄存", "type": "major", "brightness": None, "scope": "natal"},
            ])
        if i == 1:
            major.append({"name": majors[13], "type": "major", "brightness": "陷"})
        minor = [{"name": "文昌", "type": "soft", "brightness": "庙"}] if i == 0 else []
        if branch == "申":
            minor.append({"name": "截空", "type": "adjective"})
        if branch == "午":
            minor.append({"name": "旬空", "type": "adjective"})
        adjective = [
            {"name": "天喜", "type": "adjective", "scope": "natal", "extra": {"k": [1, 2]}},
            {"name": "天喜", "type": "adjective", "scope": "natal", "extra": {"k": [3, 4]}},
        ] if branch == "子" else []
        palaces.append({
            "name": names[i], "stem": "甲", "branch": branch,
            "palace_index": (i + 5) % 12,
            "is_body_palace": branch == "卯",
            "is_original_palace": branch == "子",
            "changsheng12": "长生", "boshi12": "博士",
            "jiangqian12": "岁驿", "suiqian12": "岁建",
            "small_limit_ages": [i + 1, i + 13],
            "major_stars": major, "minor_stars": minor,
            "adjective_stars": adjective,
            "decadal": {"range": [i + 1, i + 10], "stem": "甲", "branch": branch},
            "future_field": {"no_loss": [branch, None, False]},
        })
    palaces.reverse()  # Deliberately NOT the canonical ring order
    chart = {
        "schema_version": "0.2", "contract_id": CHART_CONTRACT_ID,
        "engine": {
            "name": ENGINE_NAME, "version": ENGINE_VERSION,
            "adapter_version": ADAPTER_VERSION,
        },
        "policy": deepcopy(CHART_POLICY),
        "birth_input": {
            "civil_datetime": "2000-08-16T12:30:00",
            "timezone": "Asia/Shanghai", "longitude_east_deg": 116.4,
            "birthplace_label": "synthetic", "gender": "male", "fold": 0,
        },
        "time": {
            "time_basis": "local_apparent_solar_time",
            "true_solar_datetime": "2000-08-16T12:30:00",
            "time_index": 6,
        },
        "input_to_engine": {
            "solar_date": "2000-08-16", "time_index": 6, "gender": "male",
        },
        "natal": {
            "solar_date": "2000-08-16",
            "lunar_date": "synthetic", "chinese_date": "synthetic",
            "soul_palace_branch": "子", "body_palace_branch": "卯",
            "source_void_pairs": {
                "jiekong": {
                    "principal_branch": "申", "secondary_branch": "酉",
                    "engine_star_branch": "申",
                    "source": "WANG_TINGZHI_CHUJI_PRINTED_P43",
                },
                "xunkong": {
                    "principal_branch": "午", "secondary_branch": "未",
                    "engine_star_branch": "午",
                    "source": "WANG_TINGZHI_CHUJI_PRINTED_P43",
                },
            },
            "palaces": palaces,
            "unknown_natal_metadata": {"keep": [1, 2, {"x": "y"}]},
        },
        "future_root_field": {"keep": ["any", "source", "field"]},
    }
    validate_chart_snapshot(chart)
    return chart


def test_round_trip_exactly_retains_all_fields_and_original_order():
    snapshot = fixture_chart()
    before = deepcopy(snapshot)
    graph = normalize_natal_snapshot(snapshot)
    assert graph["schema_version"] == NATAL_SPATIAL_SCHEMA_VERSION
    assert graph["topology_contract_id"] == TOPOLOGY_CONTRACT_ID
    assert graph["source_sha256"] == snapshot_sha256(snapshot)
    assert [node["branch"] for node in graph["nodes"]] == list(BRANCHES)
    assert [node["ring_index"] for node in graph["nodes"]] == list(range(12))
    assert [node["source_array_index"] for node in graph["nodes"]] == list(reversed(range(12)))
    assert restore_chart_snapshot(graph) == snapshot == before
    assert graph["natal_metadata"]["source_void_pairs"] == snapshot["natal"]["source_void_pairs"]
    assert graph["natal_metadata"]["unknown_natal_metadata"] == snapshot["natal"]["unknown_natal_metadata"]
    assert graph["source_envelope"]["future_root_field"] == snapshot["future_root_field"]
    assert graph["nodes"][0]["palace"]["future_field"] == snapshot["natal"]["palaces"][11]["future_field"]


def test_engine_palace_index_never_confused_with_source_array_position():
    snapshot = fixture_chart()
    graph = normalize_natal_snapshot(snapshot)
    first = graph["nodes"][0]
    assert first["branch"] == "子"
    assert first["source_array_index"] == 11
    assert first["engine_palace_index"] == 5
    assert first["palace"]["palace_index"] == 5


def test_all_star_occurrences_and_exact_attributes_preserved():
    snapshot = fixture_chart()
    graph = normalize_natal_snapshot(snapshot)
    all_refs = [ref for node in graph["nodes"] for ref in node["star_refs"]]
    original_stars = sum(
        len(p[bucket])
        for p in snapshot["natal"]["palaces"]
        for bucket in ("major_stars", "minor_stars", "adjective_stars")
    )
    assert len(all_refs) == original_stars
    assert len({r["source_path"] for r in all_refs}) == original_stars
    assert sum(r["name"] in MAJOR_STARS for r in all_refs if r["bucket"] == "major_stars") == 14
    duplicates = [r for r in all_refs if r["name"] == "天喜"]
    assert len(duplicates) == 2
    assert duplicates[0]["source_path"] != duplicates[1]["source_path"]
    assert resolve_star_reference(graph, duplicates[0]["source_path"]) != resolve_star_reference(
        graph, duplicates[1]["source_path"]
    )
    for node in graph["nodes"]:
        for ref in node["star_refs"]:
            original = snapshot["natal"]["palaces"][node["source_array_index"]]
            assert resolve_star_reference(graph, ref["source_path"]) == original[
                ref["bucket"]
            ][ref["index"]]


def test_neighbors_and_flanks_are_physical_not_display_orientation():
    graph = normalize_natal_snapshot(fixture_chart())
    for node in graph["nodes"]:
        b = node["branch"]
        assert node["neighbors"] == {
            "self": b,
            "trine": list(trines(b)),
            "opposite": opposite(b),
            "flank_previous": flanks(b)[0],
            "flank_next": flanks(b)[1],
            "four_directions": [b, *trines(b), opposite(b)],
        }


def test_graph_json_serialization_roundtrip_is_lossless():
    chart = fixture_chart()
    graph = normalize_natal_snapshot(chart)
    wire = json.loads(json.dumps(graph, ensure_ascii=False))
    assert wire == graph
    assert restore_chart_snapshot(wire) == chart
    assert snapshot_sha256(json.loads(json.dumps(chart, ensure_ascii=False, sort_keys=True))) == graph["source_sha256"]


def test_deep_copy_no_aliasing_and_digest_detects_mutations():
    snapshot = fixture_chart()
    graph = normalize_natal_snapshot(snapshot)
    snapshot["natal"]["palaces"][0]["major_stars"][0]["brightness"] = "mutated"
    assert restore_chart_snapshot(graph)["natal"]["palaces"][0]["major_stars"][0]["brightness"] != "mutated"
    tampered = deepcopy(graph)
    tampered["nodes"][0]["palace"]["major_stars"][0]["brightness"] = "changed"
    with pytest.raises(ValueError, match="digest"):
        restore_chart_snapshot(tampered)


def test_rejects_modified_star_paths_relations_and_missing_node():
    graph = normalize_natal_snapshot(fixture_chart())
    tampered = deepcopy(graph)
    tampered["nodes"][0]["neighbors"]["opposite"] = "子"
    with pytest.raises(ValueError, match="provenance or relation"):
        restore_chart_snapshot(tampered)
    tampered = deepcopy(graph)
    tampered["nodes"][0]["star_refs"][0]["source_path"] = "natal.palaces[99].major_stars[0]"
    with pytest.raises(ValueError, match="provenance or relation"):
        restore_chart_snapshot(tampered)
    tampered = deepcopy(graph)
    tampered["nodes"].pop()
    with pytest.raises(ValueError, match="twelve nodes"):
        restore_chart_snapshot(tampered)
    with pytest.raises(KeyError, match="unknown source star"):
        resolve_star_reference(graph, "natal.palaces[99].major_stars[0]")


def test_rejects_invalid_source_snapshot_and_contract():
    chart = fixture_chart()
    chart["policy"]["day_divide"] = "forward"
    with pytest.raises(ValueError, match="policy"):
        normalize_natal_snapshot(chart)
    graph = normalize_natal_snapshot(fixture_chart())
    graph["topology_contract_id"] = "DIFFERENT_RING"
    with pytest.raises(ValueError, match="contract"):
        restore_chart_snapshot(graph)


@pytest.mark.skipif(
    not (Path(__file__).resolve().parents[1] / "node_modules" / "iztro").exists(),
    reason="npm dependencies not installed (CI installs pinned iztro)",
)
@pytest.mark.parametrize("date,gender", [
    ("2000-08-16T12:00", "female"),
    ("2004-07-16T12:00", "male"),
])
def test_real_iztro_chart_roundtrip(date: str, gender: str):
    birth = BirthInput(date, 116.4, "Asia/Shanghai", gender, "synthetic fixture")
    chart = render_chart(birth)
    graph = normalize_natal_snapshot(chart)
    assert restore_chart_snapshot(graph) == chart
    assert graph["source_sha256"] == snapshot_sha256(chart)
    assert len(graph["nodes"]) == 12
    for node in graph["nodes"]:
        source = chart["natal"]["palaces"][node["source_array_index"]]
        assert node["palace"] == source
        assert node["branch"] == source["branch"]
        for ref in node["star_refs"]:
            assert resolve_star_reference(graph, ref["source_path"]) == source[ref["bucket"]][ref["index"]]
