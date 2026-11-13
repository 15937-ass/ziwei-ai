# Fixed twelve-branch topology v1

The stable canonical ring uses the earthly branches `子丑寅卯辰巳午未申酉戌亥`, indices `0..11`. `EARTHLY_BRANCH_C12_V1` names the coordinate contract, independent of the original chart and all temporal layers.

For anchor index `i`, relation offsets in `Z/12Z` are:

| Predicate | Offset(s) | Meaning |
|---|---|---|
| `SELF` | `0` | 本宫 |
| `TRINE` | `+4`, `+8` | 三合宫 |
| `OPPOSITE` | `+6` | 对宫 |
| `FLANK_PREVIOUS` | `-1` (`+11`) | 地支序列前一个夹宫 |
| `FLANK_NEXT` | `+1` | 地支序列后一个夹宫 |
| `four_directions(anchor)` | `0`, `4`, `8`, `6` | 本宫 + 两三合 + 对宫 |

The `PREVIOUS`/`NEXT` names are **not** visual left/right: display orientation is not part of the topology. `TRINE`, `OPPOSITE`, `SELF` are symmetric; the two flank directions are not and reverse across an edge. `FOUR_DIRECTIONS` is a derived set, not an additional primitive edge.

API (`ziwei.spatial`): `branch_index`, `branch_at`, `rotate`, `rotation_permutation`, `neighbors`, `trines`, `opposite`, `flanks`, `four_directions`, `relation_between`, `adjacency_matrix`, `topology_manifest`. Input coordinates are branch names or explicitly typed zero-based integers. No dependence on third-party libraries, birth data, stars, temporal algorithm, rule meanings or model inference.

In later adapters, resolve any external engine's palace-array index to a **branch name using that engine's original array** before entering this ring. The ring order must not be confused with a UI layout or pre-sorted chart snapshot. Rotations are *pure coordinate permutations*, not a claim that natal star positions rotate; temporal role maps and moving stars remain separate future data layers.

This step deliberately **does not** implement chart normalization, a star distribution matrix, rule matching, inference, or any large/small limit or year/month layer. Test the topology alone via `python -m pytest -q tests/test_spatial_topology.py`.
