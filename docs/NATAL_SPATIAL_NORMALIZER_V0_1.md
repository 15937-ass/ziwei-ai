# Natal spatial normalizer — v0.1

## Goal and non-goals

Turn the existing, validated Python `ChartSnapshot` (iztro@2.6.5, Wang-configured) into a **reversible twelve-node graph** on the existing `EARTHLY_BRANCH_C12_V1` topology. This stage does **not** add interpretations, star-system rules, temporal overlays, new star placements, or database tables.

The graph is an **internal lossless storage/processing representation**. It is **not** the compact redacted Agent view; in particular, `source_envelope.birth_input` and `source_envelope.time` can contain private birth information and must not be sent wholesale to an LLM.

## Data format

```text
NatalSpatialGraph
  schema_version = NATAL_SPATIAL_V0_1
  topology_contract_id = EARTHLY_BRANCH_C12_V1
  source_sha256             # SHA-256 of canonical JSON ChartSnapshot contents
  source_envelope           # original root keys except natal; immutable source provenance
  natal_metadata            # original natal keys except palaces; includes source_void_pairs
  nodes[12]                 # sorted by 子丑寅卯辰巳午未申酉戌亥
    branch                  # canonical physical coordinate
    ring_index              # 0..11
    source_array_index      # exact original natal.palaces[] position
    engine_palace_index     # original iztro palace_index (different concept)
    natal_role              # original palace name, not an inferred temporal role
    neighbors               # pure C12 relations: trine, opposite, flanks, four_directions
    star_refs[]             # occurrence-level index into original palace star arrays
    palace                  # complete unmodified raw source palace JSON
```

Preserving the **entire** `palace` object and all source metadata ensures no recognized or future field is silently dropped, including stars in `major_stars`, `minor_stars`, `adjective_stars`, their attributes, the twelve cycles, small-limit ages, and decadal metadata. No 14-main-star-only filtering is performed.

## Source reference scheme

A star occurrence is identified by **(`source_sha256`, `source_path`)**. Example:

```text
source_sha256 = <full 64-character SHA-256>
source_path = natal.palaces[3].minor_stars[2]
```

The path is relative to the **original ChartSnapshot** `natal.palaces` ordering, not the sorted node array and not iztro's underlying `palace_index`. A second star with the same name receives a distinct index/path. `resolve_star_reference(graph, path)` returns a deep copy of the exact source star record, including all fields; it never executes arbitrary paths.

`source_void_pairs` is original natal-level provenance, not another set of phantom star occurrences. The converter carries this source-specific field unchanged.

## API

```python
from ziwei.spatial import (
    normalize_natal_snapshot, restore_chart_snapshot,
    resolve_star_reference, snapshot_sha256,
)

graph = normalize_natal_snapshot(snapshot)
assert restore_chart_snapshot(graph) == snapshot
ref = graph["nodes"][0]["star_refs"][0]["source_path"]
original_star = resolve_star_reference(graph, ref)
```

- Normalization validates the canonical chart snapshot first and deep-copies it.
- The inverse validates the topology contract, node order, source array positions, star-index mapping, derived spatial relations and SHA-256 digest, then validates the restored chart.
- The source digest detects accidental mutation or divergence, **not** adversarial forgery (it is not an HMAC or signature).
- A canonical hash is deterministic for JSON-compatible object values, not a guarantee of preserving original textual JSON formatting, key order or whitespace.
- The normalized graph is a derived document. Database storage can keep `ChartSnapshot` authoritative and regenerate this view by hash; storing both is optional. Do not confuse it with a separate natal interpretation or inference memory.

## Acceptance checks

`python -m pytest -q tests/test_spatial_normalizer.py`

Tests cover exact roundtrip and source order, all star categories and duplicate names, full attribute preservation including unknown future fields, deterministic canonical digest, graph JSON serialization, mutation isolation/tamper detection, physical relations, and real iztro-generated charts whenever JS dependencies are installed. Existing suite also validates the independent C12 topology.

Future tasks: star distribution matrix and derived condition indexes; redacted Agent-facing global/narrow views; rule matching; decadal/year/month role overlays. None is implemented by this converter.
