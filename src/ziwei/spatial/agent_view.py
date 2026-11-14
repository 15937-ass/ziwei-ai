"""Wenmo-inspired, compact NATAL-ONLY Agent view with one C12 spatial preface.

This deliberately differs from NatalSpatialGraph: the graph is an internal,
reversible, provenance-rich representation; this view contains only the
agent-facing original-chart facts. No temporal horoscope or rule interpretation.
"""

from __future__ import annotations

from copy import deepcopy
import json
from typing import Any

from ziwei.chart.contract import MAJOR_STARS
from .normalizer import normalize_natal_snapshot
from .topology import BRANCHES, TOPOLOGY_CONTRACT_ID, topology_manifest

NATAL_AGENT_VIEW_VERSION = "NATAL_AGENT_VIEW_V1"


def build_natal_agent_view(
    snapshot: dict[str, Any], *, include_birth_details: bool = False
) -> dict[str, Any]:
    """Project a validated chart into a lean data view with one global topology.

    Birth details are excluded by default. The source graph remains the
    authority for original array indices, unknown fields and star provenance.
    """
    if not isinstance(include_birth_details, bool):
        raise TypeError("include_birth_details must be boolean")
    graph = normalize_natal_snapshot(snapshot)
    natal = graph["natal_metadata"]
    envelope = graph["source_envelope"]

    basic = {
        "gender": envelope["birth_input"]["gender"],
        "five_elements_class": natal.get("five_elements_class"),
        "soul_star": natal.get("soul_star"),
        "body_star": natal.get("body_star"),
        "soul_palace_branch": natal.get("soul_palace_branch"),
        "body_palace_branch": natal.get("body_palace_branch"),
        # Do not make phantom stars at the secondary void positions:
        "source_void_pairs": deepcopy(natal["source_void_pairs"]),
    }
    if include_birth_details:
        basic["birth_dates"] = {
            "solar_date": natal.get("solar_date"),
            "lunar_date": natal.get("lunar_date"),
            "chinese_date": natal.get("chinese_date"),
            "true_solar_datetime": envelope["time"].get("true_solar_datetime"),
        }

    palaces = []
    for node in graph["nodes"]:
        palace = node["palace"]
        palaces.append({
            "branch": node["branch"],
            "stem": palace["stem"],
            "role": palace["name"],
            "is_body_palace": palace["is_body_palace"],
            "is_original_palace": palace["is_original_palace"],
            "major_stars": deepcopy(palace["major_stars"]),
            "minor_stars": deepcopy(palace["minor_stars"]),
            "adjective_stars": deepcopy(palace["adjective_stars"]),
            "shensha": {
                "suiqian12": palace["suiqian12"],
                "jiangqian12": palace["jiangqian12"],
                "changsheng12": palace["changsheng12"],
                "boshi12": palace["boshi12"],
            },
        })
    assert len(palaces) == len(BRANCHES)

    return {
        "schema_version": NATAL_AGENT_VIEW_VERSION,
        "scope": "natal",
        "topology_contract_id": TOPOLOGY_CONTRACT_ID,
        "spatial_prelude": topology_manifest(),
        "source": {
            "chart_contract_id": envelope["contract_id"],
            "engine": deepcopy(envelope["engine"]),
            "source_sha256": graph["source_sha256"],
        },
        "basic": basic,
        "palaces": palaces,
    }


def _format_star(star: dict[str, Any]) -> str:
    """Show all meaningful star attributes without inventing arrows or origins."""
    name = star["name"]
    parts = [name]
    if star.get("brightness") is not None:
        parts.append(f"[{star['brightness']}]")
    if star.get("mutagen") is not None:
        parts.append(f"[生年{star['mutagen']}]")
    if star.get("scope") is not None and star["scope"] not in ("origin", "natal"):
        parts.append(f"[scope:{star['scope']}]")
    # The compact textual view retains unfamiliar future star fields too.
    for key, value in star.items():
        if key not in ("name", "brightness", "mutagen", "scope", "type") and value is not None:
            parts.append(f"[{key}={json.dumps(value, ensure_ascii=False, sort_keys=True)}]")
    return "".join(parts)


def _format_stars(stars: list[dict[str, Any]]) -> str:
    return "、".join(_format_star(star) for star in stars) or "无"


def render_natal_agent_text(
    snapshot: dict[str, Any], *, include_birth_details: bool = False
) -> str:
    """Produce Wenmo-style readable natal text; C12 contract appears once.

    Display-only star grouping: the 14 major principals -> 主星;
    every non-principal item in iztro major_stars and all minor_stars -> 辅星;
    adjective_stars -> 小星. Raw classification is NOT modified.
    """
    view = build_natal_agent_view(
        snapshot, include_birth_details=include_birth_details
    )
    basic = view["basic"]
    topology = view["spatial_prelude"]
    relations = topology["relations"]
    ring = "→".join(topology["branch_order"]) + "→子"

    lines = [
        "原局命盘（Agent 结构化阅读版）",
        f"├输出契约: {view['schema_version']}",
        f"├空间前置结构[{view['topology_contract_id']}]",
        f"│ ├固定地支环(0..11): {ring}",
        (f"│ ├空间偏移(模12): 本宫{relations['SELF'][0]:+d}; "
         f"三合{relations['TRINE'][0]:+d}/{relations['TRINE'][1]:+d}; "
         f"对宫{relations['OPPOSITE'][0]:+d}; "
         f"前夹{relations['FLANK_PREVIOUS'][0]:+d}(-1)/后夹{relations['FLANK_NEXT'][0]:+d}"),
        "│ ├三方四正: 本宫 + 两个三合宫 + 对宫",
        "│ └判读约定: 地支是固定坐标；宫名是原局功能；夹宫前后不等于界面左右；空间关系由C12程序计算",
        "├符号定义: [庙/旺/陷等]=原始亮度; [生年禄/权/科/忌]=原局星曜四化标记; 无=该类别无星",
        "├基本信息",
        f"│ ├性别: {basic['gender']}",
        f"│ ├五行局数: {basic['five_elements_class'] or '未提供'}",
        f"│ ├命主: {basic['soul_star'] or '未提供'}; 身主: {basic['body_star'] or '未提供'}",
        f"│ ├命宫地支: {basic['soul_palace_branch']}; 身宫地支: {basic['body_palace_branch']}",
    ]
    if include_birth_details:
        birth = basic["birth_dates"]
        lines.extend([
            f"│ ├公历日期: {birth['solar_date']}",
            f"│ ├农历日期: {birth['lunar_date']}",
            f"│ ├干支日期: {birth['chinese_date']}",
            f"│ └真太阳时: {birth['true_solar_datetime']}",
        ])

    lines.append("├命盘十二宫（按固定地支顺序）")
    for palace in view["palaces"]:
        main = [s for s in palace["major_stars"] if s["name"] in MAJOR_STARS]
        support = [
            s for s in palace["major_stars"] if s["name"] not in MAJOR_STARS
        ] + palace["minor_stars"]
        small = palace["adjective_stars"]
        labels = []
        if palace["is_body_palace"]:
            labels.append("[身宫]")
        if palace["is_original_palace"]:
            # Do not equate an engine flag with a school's 来因宫 rule.
            labels.append("[原始宫标记]")
        lines.extend([
            f"│ ├{palace['role']}[{palace['stem']}{palace['branch']}]{''.join(labels)}",
            f"│ │ ├主星: {_format_stars(main)}",
            f"│ │ ├辅星: {_format_stars(support)}",
            f"│ │ ├小星: {_format_stars(small)}",
            "│ │ └神煞: "
            f"岁前星={palace['shensha']['suiqian12']}; "
            f"将前星={palace['shensha']['jiangqian12']}; "
            f"十二长生={palace['shensha']['changsheng12']}; "
            f"博士十二神={palace['shensha']['boshi12']}",
        ])

    voids = basic["source_void_pairs"]
    lines.extend([
        "└空曜正傍位置（来源校核字段，傍空不额外生成星曜）",
        "  ├截空: 正空={}; 傍空={}".format(
            voids["jiekong"]["principal_branch"],
            voids["jiekong"]["secondary_branch"],
        ),
        "  └旬空: 正空={}; 傍空={}".format(
            voids["xunkong"]["principal_branch"],
            voids["xunkong"]["secondary_branch"],
        ),
    ])
    return "\n".join(lines) + "\n"
