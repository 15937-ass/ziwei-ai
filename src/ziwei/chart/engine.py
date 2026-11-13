"""Python authoritative snapshot builder around the pinned iztro JS engine."""
from __future__ import annotations

from datetime import datetime
import json
from pathlib import Path
import subprocess
from typing import Any

from .contract import (
    ADAPTER_VERSION, BRANCHES, CHART_CONTRACT_ID, CHART_POLICY,
    ENGINE_NAME, ENGINE_VERSION, MAJOR_STARS,
)
from .solar_time import BirthInput, convert_to_true_solar_time

REPO_ROOT = Path(__file__).resolve().parents[3]
BRIDGE = REPO_ROOT / "tools" / "render_chart.mjs"


def validate_chart_snapshot(snapshot: dict[str, Any]) -> None:
    """Fail closed on provenance, configuration, structural and date drift."""
    if not isinstance(snapshot, dict):
        raise ValueError("chart snapshot must be object")
    if snapshot.get("contract_id") != CHART_CONTRACT_ID:
        raise ValueError("invalid chart contract ID")
    if snapshot.get("engine") != {
        "name": ENGINE_NAME, "version": ENGINE_VERSION, "adapter_version": ADAPTER_VERSION
    }:
        raise ValueError("chart engine/version does not match pinned contract")
    if snapshot.get("policy") != CHART_POLICY:
        raise ValueError("chart policy mismatch")
    time = snapshot.get("time")
    if not isinstance(time, dict) or time.get("time_basis") != "local_apparent_solar_time":
        raise ValueError("missing or wrong time basis")
    if not isinstance(time.get("true_solar_datetime"), str) or not isinstance(time.get("time_index"), int):
        raise ValueError("missing true solar date/time")
    t = datetime.fromisoformat(time["true_solar_datetime"])
    if time["time_index"] != (t.hour + 1) // 2:
        raise ValueError("time index inconsistent with corrected time")
    if snapshot.get("input_to_engine") != {
        "solar_date": t.date().isoformat(),
        "time_index": time["time_index"],
        "gender": snapshot.get("birth_input", {}).get("gender"),
    }:
        raise ValueError("engine input differs from time conversion")
    natal = snapshot.get("natal")
    if not isinstance(natal, dict):
        raise ValueError("missing natal chart")
    if natal.get("solar_date") != t.date().isoformat():
        raise ValueError("natal solar date differs from true solar time")
    palaces = natal.get("palaces")
    if not isinstance(palaces, list) or len(palaces) != 12:
        raise ValueError("must contain exactly 12 palaces")
    branches = [p.get("branch") for p in palaces if isinstance(p, dict)]
    if len(branches) != 12 or set(branches) != set(BRANCHES):
        raise ValueError("palace branch set invalid")
    names = [p.get("name") for p in palaces]
    if len(set(names)) != 12:
        raise ValueError("palace functional names duplicated")
    stars = [s.get("name") for p in palaces for s in p.get("major_stars", [])
             if s.get("name") in MAJOR_STARS]
    if len(stars) != 14 or set(stars) != MAJOR_STARS:
        raise ValueError("14 principal stars missing or duplicated")

    for palace in palaces:
        if not all(isinstance(palace.get(field), str) for field in
                   ("changsheng12", "boshi12", "jiangqian12", "suiqian12")):
            raise ValueError("missing 12-cycle palace metadata")
        if not isinstance(palace.get("small_limit_ages"), list):
            raise ValueError("missing small-limit age cycle")
    voids = natal.get("source_void_pairs")
    if not isinstance(voids, dict):
        raise ValueError("missing source-derived void pairs")
    for key, star_name in (("jiekong", "截空"), ("xunkong", "旬空")):
        pair = voids.get(key)
        if not isinstance(pair, dict):
            raise ValueError("missing " + key + " source void pair")
        primary = pair.get("principal_branch")
        secondary = pair.get("secondary_branch")
        if (primary not in BRANCHES or secondary not in BRANCHES or primary == secondary or
                pair.get("engine_star_branch") != primary or
                pair.get("source") != "WANG_TINGZHI_CHUJI_PRINTED_P43"):
            raise ValueError("invalid " + key + " source void provenance")
        raw_pos = [p["branch"] for p in palaces for category in
                   ("major_stars", "minor_stars", "adjective_stars")
                   for star in p.get(category, []) if star.get("name") == star_name]
        if raw_pos != [primary]:
            raise ValueError(key + " principal position disagrees with iztro")


def render_chart(birth: BirthInput, *, timeout_seconds: float = 15) -> dict[str, Any]:
    """Compute location apparent solar time ONCE, then use iztro for astrology.

    No fallback chart engine; never allow the LLM to calculate/correct facts.
    """
    solar = convert_to_true_solar_time(birth)
    date = datetime.fromisoformat(solar.true_solar_datetime).date().isoformat()
    request = {"solar_date": date, "time_index": solar.time_index, "gender": birth.gender}
    try:
        proc = subprocess.run(
            ["node", str(BRIDGE)], input=json.dumps(request), text=True,
            capture_output=True, timeout=timeout_seconds, check=False,
            cwd=str(REPO_ROOT)
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise RuntimeError("iztro JS chart bridge unavailable or timed out") from exc
    if proc.returncode != 0:
        raise RuntimeError("iztro chart bridge rejected input: " + proc.stderr[:800])
    try:
        payload = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("iztro chart bridge returned non-JSON output") from exc
    if payload.get("engine") != {"name":ENGINE_NAME, "version":ENGINE_VERSION}:
        raise ValueError("unexpected iztro engine/version")
    if payload.get("policy") != CHART_POLICY:
        raise ValueError("unexpected iztro chart configuration")
    if payload.get("input") != request:
        raise ValueError("iztro changed input facts")
    snapshot = {
        "schema_version": "0.2",
        "contract_id": CHART_CONTRACT_ID,
        "engine": {"name":ENGINE_NAME, "version":ENGINE_VERSION,
                   "adapter_version":ADAPTER_VERSION},
        "policy": CHART_POLICY.copy(),
        "birth_input": {
            "civil_datetime": birth.civil_datetime,
            "timezone": birth.timezone,
            "longitude_east_deg": birth.longitude_east_deg,
            "birthplace_label": birth.birthplace_label,
            "gender": birth.gender,
            "fold": birth.fold,
        },
        "time": solar.to_dict(),
        "input_to_engine": request,
        "natal": payload["natal"],
    }
    validate_chart_snapshot(snapshot)
    return snapshot
