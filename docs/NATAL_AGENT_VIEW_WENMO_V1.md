# Natal Agent Output v1 — 文墨式分宫表达 + 一次性 C12 空间前置条件

**Status:** implemented Agent-facing formatter on top of `ChartSnapshot` and `NatalSpatialGraph`.

## Design decision

The full internal `NatalSpatialGraph` remains a **reversible, private, source-of-truth derivative**. It is **not** the model input and does not dictate model serialization.

The Agent-facing **natal-only** output borrows the *organization* of the supplied 文墨天机 text report:

1. **One shared spatial preface**, before the palace entries;
2. A compact **基本信息** block (without precise birth time/place by default);
3. **命盘十二宫**, in stable earthly-branch order, each listing stem+branch, original palace role, 主星, 辅星, 小星 and 神煞;
4. Source-verified 截空/旬空 正傍位置 once, without inventing secondary star occurrences.

**No repeated per-palace `neighbors`, trines, opposites or ring indices.**
**No large/small limits, flow years/months or inference results in this view.**

## Shared spatial precondition (at head of a new Agent analysis request)

```text
C12 topology: 子(0)→丑(1)→...→亥(11)→子(0)
本宫 i
三合 i+4/i+8
对宫 i+6
夹宫 i-1/i+1
三方四正 i/i+4/i+8/i+6
All offsets modulo 12; flank direction follows the canonical branch ring,
not screen layout. Palace role and physical branch coordinate are distinct.
For exact relation matching use the deterministic spatial tool.
```

This is *once per assembled task context*, **not once for each palace**. It is a fixed prefix that may be reused across independent LLM requests but does not persist as supernatural model memory. The code returns the same contract in `spatial_prelude` for a structured consumer.

## Supported API

```python
from ziwei.spatial import build_natal_agent_view, render_natal_agent_text

chart = render_chart(birth_input)  # existing pinned iztro bridge
view = build_natal_agent_view(chart)        # compact structured Python dict
prompt_body = render_natal_agent_text(chart)  # Wenmo-style natal text
```

Both call the existing chart validator through the reversible normalizer.

`build_natal_agent_view` contains `schema_version`, `scope=natal`,
`topology_contract_id`, one `spatial_prelude`, `source` (snapshot digest
and engine contract), `basic`, and `palaces[12]`. Each palace keeps
`branch,stem,role,is_body_palace,is_original_palace`, the three source star
arrays (full star record objects), and `shensha` values. No repeated spatial
relationship fields or engine/source array indices.

`render_natal_agent_text` is a **lossy reading projection** of the above
structured facts. The authoritative lossless roundtrip remains
`normalize_natal_snapshot` → `restore_chart_snapshot`.

### Display taxonomy / provenance boundary

文墨's display headings do not exactly match iztro's internal star buckets.
For the *text display only*:

- **主星:** 14 principal stars from `major_stars`, as defined in pinned `MAJOR_STARS`;
- **辅星:** any non-principal entry in iztro `major_stars`, followed by `minor_stars`;
- **小星:** `adjective_stars` entries.

This does **not** change the raw star bucket or add/remove star occurrences.
The structured view retains the exact original buckets. Original brightness,
natal `mutagen`, star scope and future extra attributes remain in the
structured view. Text prints brightness and natal `mutagen` as
`[生年禄/权/科/忌]`; it never synthesizes 文墨-specific `↑`/`↓` marks
or unsupported `来因宫` identities. `is_original_palace` is rendered as
the neutral `[原始宫标记]` unless a later source audit approves a semantic name.

The Shen-sha groups map to `suiqian12` (岁前星),
`jiangqian12` (将前星), `changsheng12` (十二长生),
`boshi12` (博士十二神), without guessing unexposed star data.

### Privacy and scope

The default Agent payload **does not contain** birth civil date/time,
precise location, solar time or the full internal source envelope.
A caller can explicitly opt into birth date and corrected datetime for
a trusted user-facing report via `include_birth_details=True`. Do not
send the original `NatalSpatialGraph` to the model.

The text is explicitly for **original chart (原局)** only.
`palace.decadal` and `small_limit_ages` are left in the authoritative
snapshot / private normalized graph but excluded from Agent view; annual and
monthly data must be developed separately.

## Demo, tests and CI

```bash
python tools/demo_chart.py
# audit_out/example_chart_full.json         full, private
# audit_out/example_chart_summary.md        older human summary
# audit_out/example_natal_agent_view.txt    new compact Agent text

python -m pytest -q tests/test_natal_agent_view.py
```

The CI demo uploads all three to the `demo-chart-example` artifact.
The sample is **iztro generated from the checked-in synthetic/example birth
input**, not transcribed or re-computed from the attached 文墨 report.
Third-party 文墨 and pinned iztro may disagree on school/feature displays:
do not silently migrate a 文墨-specific field into the production chart.

Tests enforce twelve nodes, global contract exactly once, no repeated
`neighbors`, preserved star records/attributes and principal-star count,
correct original-chart-only scope, no birth-time/location leakage by default,
and real iztro integration.
