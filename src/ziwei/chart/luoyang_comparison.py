"""Research-only comparison: local apparent solar clock vs Luoyang meridian.

Wang Tingzhi states his school uses Luoyang reference time, quoting
~35 min Shanghai and ~7.5 min Hong Kong relative to Luoyang.
This module deliberately DOES NOT change production chart timestamps.
The numerical 'Luoyang apparent clock' is a hypothesis to audit against
source examples, not an authoritative Wang-certified conversion algorithm.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timedelta

from .solar_time import BirthInput, convert_to_true_solar_time

LUOYANG_LONGITUDE_EAST = 112.45  # present-day city-center approximation


def _index(value: datetime) -> int:
    return (value.hour + 1) // 2


@dataclass(frozen=True)
class ClockComparison:
    civil_time: str
    local_apparent_solar_time: str
    luoyang_reference_apparent_time: str
    longitude_difference_degrees: float
    local_minus_luoyang_minutes: float
    local_shichen: int
    luoyang_shichen: int
    same_apparent_calendar_date: bool
    identical_shichen: bool
    is_analytical_counterfactual: bool = True

    def to_dict(self) -> dict:
        return asdict(self)


def compare_local_to_luoyang(birth: BirthInput) -> ClockComparison:
    local = convert_to_true_solar_time(birth)
    local_clock = datetime.fromisoformat(local.true_solar_datetime)
    diff_degrees = float(birth.longitude_east_deg) - LUOYANG_LONGITUDE_EAST
    diff_minutes = 4 * diff_degrees
    luoyang = local_clock - timedelta(minutes=diff_minutes)
    return ClockComparison(
        civil_time=local.civil_datetime,
        local_apparent_solar_time=local_clock.isoformat(timespec="seconds"),
        luoyang_reference_apparent_time=luoyang.isoformat(timespec="seconds"),
        longitude_difference_degrees=round(diff_degrees, 6),
        local_minus_luoyang_minutes=round(diff_minutes, 6),
        local_shichen=_index(local_clock),
        luoyang_shichen=_index(luoyang),
        same_apparent_calendar_date=(local_clock.date()==luoyang.date()),
        identical_shichen=_index(local_clock)==_index(luoyang),
    )
