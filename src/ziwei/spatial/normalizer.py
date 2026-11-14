"""Reversible ChartSnapshot -> twelve-node spatial view.

This is a *lossless internal representation*, NOT an LLM payload: it contains
the birth_input/time provenance and should be protected like ChartSnapshot.
A later context builder must construct a separate redacted Agent view.

Every original palace and top-level field is retained exactly, including
unknown future keys. Derived relations and star references never replace facts.
"""

from __future__ import annotations

from copy import deepcopy
import hashlib
import json
from typing import Any, Mapping

from ziwei.chart.engine import validate_chart_snapshot
from .topology import (
    BRANCHES,
    TOPOLOGY_CONTRACT_ID,
    branch_index,
    flanks,
    four_directions,
    opposite,
    trines,
)

NATAL_SPATIAL_SCHEMA_VERSION = "NATAL_SPATIAL_V0_1"
STAR_BUCKETS = ("major_stars", "minor_stars", "adjective_stars")


def snapshot_sha256(snapshot: Mapping[str, Any]) -> str:
    """Canonical hash of JSON-native snapshot *contents*, not Python identity."""
    canonical = json.dumps(
        snapshot, ensure_ascii=False, sort_keys=True,
        separators=(",", ":"), allow_nan=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _neighbors(branch: str) -> dict[str, Any]:
    previous, next_ = flanks(branch)
    return {
        "self": branch,
        "trine": list(trines(branch)),
        "opposite": opposite(branch),
        "flank_previous": previous,
        "flank_next": next_,
        "four_directions": list(four_directions(branch)),
    }


def _star_refs(
    palace: Mapping[str, Any], source_array_index: int
) -> list[dict[str, Any]]:
    """Index *occurrences*, not unique star names; retain duplicates intact."""
    result: list[dict[str, Any]] = []
    for bucket in STAR_BUCKETS:
        stars = palace.get(bucket)
        if not isinstance(stars, list):
            raise ValueError(f"{bucket} must be an array")
        for index, star in enumerate(stars):
            if not isinstance(star, dict) or not isinstance(star.get("name"), str):
                raise ValueError(f"{bucket}[{index}] must be a named star object")
            result.append({
                "source_path": f"natal.palaces[{source_array_index}].{bucket}[{index}]",
                "bucket": bucket,
                "index": index,
                "name": star["name"],
            })
    return result


def normalize_natal_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Produce a standalone reversible graph, with C12-sorted physical nodes.

    Important: source_array_index identifies the current ChartSnapshot array.
    palace.palace_index is an *iztro engine index* and is NOT interchangeable.
    No interpretation of stars or dynamic palace roles is attempted here.
    """
    validate_chart_snapshot(snapshot)
    original = deepcopy(snapshot)
    natal = original["natal"]
    by_branch = {
        p["branch"]: (source_array_index, p)
        for source_array_index, p in enumerate(natal["palaces"])
    }
    if len(by_branch) != len(BRANCHES):
        raise ValueError("duplicate or missing palace branch")

    nodes: list[dict[str, Any]] = []
    for branch in BRANCHES:
        source_array_index, palace = by_branch[branch]
        nodes.append({
            "branch": branch,
            "ring_index": branch_index(branch),
            "source_array_index": source_array_index,
            "engine_palace_index": palace.get("palace_index"),
            "natal_role": palace["name"],
            "neighbors": _neighbors(branch),
            "star_refs": _star_refs(palace, source_array_index),
            "palace": palace,
        })

    result = {
        "schema_version": NATAL_SPATIAL_SCHEMA_VERSION,
        "topology_contract_id": TOPOLOGY_CONTRACT_ID,
        "source_sha256": snapshot_sha256(original),
        # The envelope includes raw birth details; DO NOT send to the LLM.
        "source_envelope": {
            key: value for key, value in original.items() if key != "natal"
        },
        # Preserve every natal field, including source_void_pairs and new keys.
        "natal_metadata": {
            key: value for key, value in natal.items() if key != "palaces"
        },
        "nodes": nodes,
    }
    # Ensures the projection is independently sufficient for full restoration.
    if restore_chart_snapshot(result) != original:
        raise ValueError("natal spatial normalization did not round-trip")
    return result


def restore_chart_snapshot(graph: Mapping[str, Any]) -> dict[str, Any]:
    """Fail-closed inverse: require intact topology, refs and source digest."""
    if not isinstance(graph, Mapping):
        raise ValueError("spatial graph must be a mapping")
    if (graph.get("schema_version") != NATAL_SPATIAL_SCHEMA_VERSION or
            graph.get("topology_contract_id") != TOPOLOGY_CONTRACT_ID):
        raise ValueError("unsupported spatial or topology contract")
    envelope = graph.get("source_envelope")
    natal_metadata = graph.get("natal_metadata")
    nodes = graph.get("nodes")
    if not isinstance(envelope, dict) or "natal" in envelope:
        raise ValueError("invalid source envelope")
    if not isinstance(natal_metadata, dict) or "palaces" in natal_metadata:
        raise ValueError("invalid natal metadata")
    if not isinstance(nodes, list) or len(nodes) != len(BRANCHES):
        raise ValueError("spatial graph must have exactly twelve nodes")

    original_order: list[dict[str, Any] | None] = [None] * len(BRANCHES)
    for i, branch in enumerate(BRANCHES):
        node = nodes[i]
        if not isinstance(node, dict):
            raise ValueError("invalid spatial node")
        source_index = node.get("source_array_index")
        if (node.get("branch") != branch or node.get("ring_index") != i or
                isinstance(source_index, bool) or not isinstance(source_index, int) or
                not 0 <= source_index < len(BRANCHES) or
                original_order[source_index] is not None):
            raise ValueError("invalid branch or source palace index")
        palace = node.get("palace")
        if not isinstance(palace, dict) or palace.get("branch") != branch:
            raise ValueError("node and raw palace disagree on branch")
        if (node.get("engine_palace_index") != palace.get("palace_index") or
                node.get("natal_role") != palace.get("name") or
                node.get("neighbors") != _neighbors(branch) or
                node.get("star_refs") != _star_refs(palace, source_index)):
            raise ValueError("spatial node provenance or relation mismatch")
        original_order[source_index] = palace

    if any(p is None for p in original_order):
        raise ValueError("source palace array has gaps")
    restored = deepcopy(envelope)
    restored["natal"] = deepcopy(natal_metadata)
    restored["natal"]["palaces"] = deepcopy(original_order)
    validate_chart_snapshot(restored)
    if graph.get("source_sha256") != snapshot_sha256(restored):
        raise ValueError("spatial graph source digest mismatch")
    return restored


def resolve_star_reference(
    graph: Mapping[str, Any], source_path: str
) -> dict[str, Any]:
    """Resolve an indexed occurrence to the exact source star JSON object.

    This deliberately does not parse arbitrary JSON paths or evaluate input.
    """
    restore_chart_snapshot(graph)
    if not isinstance(source_path, str):
        raise TypeError("source_path must be a string")
    for node in graph["nodes"]:
        for ref in node["star_refs"]:
            if ref["source_path"] == source_path:
                return deepcopy(node["palace"][ref["bucket"]][ref["index"]])
    raise KeyError(f"unknown source star reference: {source_path!r}")
