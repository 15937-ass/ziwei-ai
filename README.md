# Ziwei AI

Evidence-grounded Zi Wei Dou Shu AI inference research and product prototype.

## Goal

Build a reliable charting and knowledge-grounded inference system, starting with a small, testable product and progressively researching rule execution, palace relationships, temporal reasoning, and interpretable star-system interaction representations.

## Initial architecture direction

- **Chart facts**: deterministic charting, versioned configuration, and immutable chart snapshots.
- **Knowledge**: source-traceable structured rules and documented review status.
- **Reasoning**: Python-controlled LLM API calls with bounded, read-only tool access.
- **Verification**: check chart facts, rule identifiers, applicable conditions, and known exceptions; do not claim proof of unrestricted semantic inference.
- **State**: preserve versions and evidence references, rather than trusting raw chat history as canonical knowledge.

## Development principles

1. Build a working vertical slice before introducing complex infrastructure.
2. Keep chart facts, source knowledge, and inferred hypotheses separate.
3. Evaluate architectural changes against fixed examples and baselines.
4. Treat novel latent-state representations as research hypotheses, not prerequisites.
5. Do not commit copyright-restricted source texts, real birth data, secrets, or customer information.

## Status

**Repository initialization only.** Charting, inference, and deployment are not implemented yet.

## Next milestone

Specify and test the first deterministic `ChartSnapshot` contract before ingesting knowledge or connecting an LLM.
