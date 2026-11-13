"""Shared twelve-branch spatial vocabulary for future chart and rule adapters."""

from .topology import (
    BRANCHES,
    BRANCH_INDEX,
    RING_SIZE,
    TOPOLOGY_CONTRACT_ID,
    Relation,
    adjacency_matrix,
    branch_at,
    branch_index,
    flanks,
    four_directions,
    neighbors,
    opposite,
    relation_between,
    rotate,
    rotation_permutation,
    topology_manifest,
    trines,
)

__all__ = [
    "BRANCHES", "BRANCH_INDEX", "RING_SIZE", "TOPOLOGY_CONTRACT_ID",
    "Relation", "adjacency_matrix", "branch_at", "branch_index", "flanks",
    "four_directions", "neighbors", "opposite", "relation_between", "rotate",
    "rotation_permutation", "topology_manifest", "trines",
]
