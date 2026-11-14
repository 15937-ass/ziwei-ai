"""Shared twelve-branch spatial vocabulary for future chart and rule adapters."""

from .normalizer import (
    NATAL_SPATIAL_SCHEMA_VERSION,
    STAR_BUCKETS,
    normalize_natal_snapshot,
    resolve_star_reference,
    restore_chart_snapshot,
    snapshot_sha256,
)

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
    "NATAL_SPATIAL_SCHEMA_VERSION", "STAR_BUCKETS", "normalize_natal_snapshot",
    "resolve_star_reference", "restore_chart_snapshot", "snapshot_sha256",
]
