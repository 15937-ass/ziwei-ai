"""Immutable, school-agnostic twelve-branch topology (not an astrological engine).

The canonical coordinate order is 子=0, 丑=1, ..., 亥=11.  This is a
mathematical branch ring, independent of chart display order, palace roles,
star placements and any decade/year/month algorithms.

All relations are defined *relative to an anchor branch*.  In particular,
flanks are named PREVIOUS/NEXT by canonical branch order, not visual left/right
(which changes with the chart renderer's orientation).
"""

from __future__ import annotations

from enum import Enum
from types import MappingProxyType
from typing import Final

TOPOLOGY_CONTRACT_ID: Final = "EARTHLY_BRANCH_C12_V1"
BRANCHES: Final[tuple[str, ...]] = (
    "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"
)
BRANCH_INDEX = MappingProxyType({branch: i for i, branch in enumerate(BRANCHES)})
RING_SIZE: Final = len(BRANCHES)


class Relation(str, Enum):
    """Physical branch relations; no semantic rule is implied by an edge."""

    SELF = "SELF"
    TRINE = "TRINE"
    OPPOSITE = "OPPOSITE"
    FLANK_PREVIOUS = "FLANK_PREVIOUS"
    FLANK_NEXT = "FLANK_NEXT"


# A relation is an offset in Z/12Z. FOUR_DIRECTIONS is a *compound* query,
# deliberately not a new edge, to keep the graph sparse and unambiguous.
_OFFSETS: Final = MappingProxyType({
    Relation.SELF: (0,),
    Relation.TRINE: (4, 8),
    Relation.OPPOSITE: (6,),
    Relation.FLANK_PREVIOUS: (11,),
    Relation.FLANK_NEXT: (1,),
})


def branch_index(branch: str) -> int:
    """Return stable integer coordinate 0..11; reject unknown names."""
    if not isinstance(branch, str):
        raise TypeError("branch must be a Chinese earthly-branch string")
    try:
        return BRANCH_INDEX[branch]
    except KeyError as exc:
        raise ValueError(f"unknown earthly branch: {branch!r}") from exc


def branch_at(index: int) -> str:
    """Resolve an integer ring coordinate, modulo 12."""
    if isinstance(index, bool) or not isinstance(index, int):
        raise TypeError("index must be an integer, not bool or float")
    return BRANCHES[index % RING_SIZE]


def rotate(branch: str, steps: int) -> str:
    """Rotate a *coordinate* by signed steps; never mutates natal placements."""
    if isinstance(steps, bool) or not isinstance(steps, int):
        raise TypeError("steps must be an integer")
    return branch_at(branch_index(branch) + steps)


def rotation_permutation(steps: int) -> tuple[int, ...]:
    """Map old index i -> (i + steps) mod 12, for future role-view adapters."""
    if isinstance(steps, bool) or not isinstance(steps, int):
        raise TypeError("steps must be an integer")
    return tuple((i + steps) % RING_SIZE for i in range(RING_SIZE))


def neighbors(branch: str, relation: Relation) -> tuple[str, ...]:
    """Return branch targets in the specified deterministic offset order."""
    anchor = branch_index(branch)
    if not isinstance(relation, Relation):
        raise TypeError("relation must be a Relation enum value")
    return tuple(branch_at(anchor + offset) for offset in _OFFSETS[relation])


def opposite(branch: str) -> str:
    return neighbors(branch, Relation.OPPOSITE)[0]


def trines(branch: str) -> tuple[str, str]:
    a, b = neighbors(branch, Relation.TRINE)
    return a, b


def flanks(branch: str) -> tuple[str, str]:
    """Return (previous -1, next +1), not UI-dependent (left, right)."""
    return (
        neighbors(branch, Relation.FLANK_PREVIOUS)[0],
        neighbors(branch, Relation.FLANK_NEXT)[0],
    )


def four_directions(branch: str) -> tuple[str, str, str, str]:
    """Self + 2 trines + opposite (三方四正), no extra star semantics."""
    return branch, *trines(branch), opposite(branch)


def relation_between(anchor: str, target: str) -> Relation | None:
    """Identify the direct physical relation, or None for unrelated branches."""
    delta = (branch_index(target) - branch_index(anchor)) % RING_SIZE
    for kind, offsets in _OFFSETS.items():
        if delta in offsets:
            return kind
    return None


def adjacency_matrix(relation: Relation) -> tuple[tuple[int, ...], ...]:
    """Binary 12x12 adjacency in BRANCHES order; rows are anchor branches."""
    if not isinstance(relation, Relation):
        raise TypeError("relation must be a Relation enum value")
    offsets = _OFFSETS[relation]
    return tuple(
        tuple(int((j - i) % RING_SIZE in offsets) for j in range(RING_SIZE))
        for i in range(RING_SIZE)
    )


def topology_manifest() -> dict[str, object]:
    """Safe, serializable minimal contract for chart and rule adapters."""
    return {
        "contract_id": TOPOLOGY_CONTRACT_ID,
        "coordinate_system": "EARTHLY_BRANCH_C12",
        "branch_order": list(BRANCHES),
        "relations": {
            relation.value: list(offsets) for relation, offsets in _OFFSETS.items()
        },
        "four_directions_offsets": [0, 4, 8, 6],
        "flank_orientation": "PREVIOUS=-1;NEXT=+1 IN CANONICAL BRANCH ORDER",
    }
