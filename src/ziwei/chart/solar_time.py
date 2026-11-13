"""Location-aware civil time to local apparent solar time.

Astronomy: NOAA fractional-year equation-of-time approximation.
Historical astronomy policy is a *separate* concern from Wang Tingzhi's
Zhongzhou charting conventions. We preserve both in provenance.

Never supply already-corrected apparent time as a civil birth time.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
import math
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

BOUNDARY_TOLERANCE_SECONDS = 120
# Minimum supported range is an engineering / timezone-data policy, not Wang's rule.
MIN_YEAR, MAX_YEAR = 1901, 2100


@dataclass(frozen=True)
class BirthInput:
    """Civil Gregorian birth datetime and an unambiguous physical location.

    longitude_east_deg: East positive / West negative. NEVER infer this from
    country or UTC offset. timezone: IANA region, e.g. Asia/Shanghai.
    fold: only set 0/1 to disambiguate a DST clock repeat; omitted by default.
    """
    civil_datetime: str
    longitude_east_deg: float
    timezone: str
    gender: str
    birthplace_label: str = ""
    fold: int | None = None

    @classmethod
    def from_dict(cls, value: dict) -> "BirthInput":
        if not isinstance(value, dict):
            raise ValueError("birth input must be a JSON object")
        allowed = set(cls.__dataclass_fields__)
        extra = set(value) - allowed
        if extra:
            raise ValueError(f"unknown birth input field(s): {sorted(extra)}")
        return cls(**value)


@dataclass(frozen=True)
class SolarTimeResult:
    civil_datetime: str
    timezone: str
    longitude_east_deg: float
    utc_offset_minutes: float
    equation_of_time_minutes: float
    longitude_correction_minutes: float
    total_correction_minutes: float
    true_solar_datetime: str
    time_index: int
    near_shichen_boundary: bool
    model: str = "NOAA_FRACTIONAL_YEAR_APPROX_V1"
    time_basis: str = "local_apparent_solar_time"

    def to_dict(self) -> dict:
        return asdict(self)


def _validated_local_clock(birth: BirthInput) -> datetime:
    if birth.gender not in {"male", "female"}:
        raise ValueError("gender must be 'male' or 'female' (required for decadal direction)")
    if not isinstance(birth.longitude_east_deg, (int, float)) or isinstance(birth.longitude_east_deg, bool):
        raise ValueError("longitude_east_deg must be a number")
    if not math.isfinite(birth.longitude_east_deg) or not -180 <= birth.longitude_east_deg <= 180:
        raise ValueError("longitude_east_deg must be finite, between -180 and +180")
    if not isinstance(birth.timezone, str) or not birth.timezone or birth.timezone in {"UTC", "Etc/UTC"}:
        # UTC is a valid timezone for a location, but avoid treating it as a
        # substitute for a missing birthplace time zone.
        if birth.timezone not in {"UTC", "Etc/UTC"}:
            raise ValueError("provide an explicit IANA timezone")
    if not isinstance(birth.civil_datetime, str):
        raise ValueError("civil_datetime must be an ISO local date-time string")
    try:
        naive = datetime.fromisoformat(birth.civil_datetime)
    except ValueError as exc:
        raise ValueError("civil_datetime must be YYYY-MM-DDTHH:MM[:SS]") from exc
    if naive.tzinfo is not None:
        raise ValueError("civil_datetime must not contain an offset; supply timezone separately")
    if not MIN_YEAR <= naive.year <= MAX_YEAR:
        raise ValueError(f"supported civil birth years: {MIN_YEAR}..{MAX_YEAR}")
    if birth.fold is not None and (type(birth.fold) is not int or birth.fold not in (0, 1)):
        raise ValueError("fold must be 0 or 1 when supplied")
    try:
        tz = ZoneInfo(birth.timezone)
    except (ZoneInfoNotFoundError, KeyError) as exc:
        raise ValueError(f"unrecognized IANA timezone: {birth.timezone}") from exc

    # Reject nonexistent local times (DST spring forward) and require explicit
    # disambiguation on duplicated times (DST fall back).
    candidates = []
    for fold in (0, 1):
        x = naive.replace(tzinfo=tz, fold=fold)
        roundtrip = x.astimezone(timezone.utc).astimezone(tz).replace(tzinfo=None)
        if roundtrip == naive:
            candidates.append(x)
    if not candidates:
        raise ValueError("nonexistent local time in supplied timezone (DST gap)")
    if len(candidates) == 2 and candidates[0].utcoffset() != candidates[1].utcoffset():
        if birth.fold is None:
            raise ValueError("ambiguous DST local time: supply fold=0 or fold=1")
        return candidates[birth.fold]
    return candidates[0]


def _noaa_equation_of_time_minutes(dt: datetime) -> float:
    # NOAA: fractional year gamma and equation of time.
    # Approximation, not a precise astronomical ephemeris.
    days = 366 if (dt.year % 4 == 0 and (dt.year % 100 != 0 or dt.year % 400 == 0)) else 365
    gamma = (2 * math.pi / days) * (
        dt.timetuple().tm_yday - 1 +
        (dt.hour + dt.minute / 60 + dt.second / 3600 - 12) / 24
    )
    return 229.18 * (
        0.000075 + 0.001868 * math.cos(gamma)
        - 0.032077 * math.sin(gamma)
        - 0.014615 * math.cos(2 * gamma)
        - 0.040849 * math.sin(2 * gamma)
    )


def _time_index(dt: datetime) -> int:
    # iztro: 0=00:00-00:59; 1=01:00-02:59 ... 11=21:00-22:59;
    # 12=23:00-23:59. New date at midnight, not 23:00.
    return (dt.hour + 1) // 2


def _near_boundary(dt: datetime) -> bool:
    # Includes midnight as an additional boundary: late Zi vs early Zi.
    boundaries = [0] + [h * 3600 for h in range(1, 24, 2)] + [24 * 3600]
    seconds = dt.hour * 3600 + dt.minute * 60 + dt.second + dt.microsecond / 1_000_000
    return min(abs(seconds - b) for b in boundaries) <= BOUNDARY_TOLERANCE_SECONDS


def convert_to_true_solar_time(birth: BirthInput) -> SolarTimeResult:
    civil = _validated_local_clock(birth)
    utc_offset = civil.utcoffset()
    if utc_offset is None:
        raise ValueError("timezone offset cannot be determined")
    offset_minutes = utc_offset.total_seconds() / 60
    longitude_correction = 4 * birth.longitude_east_deg - offset_minutes
    eqtime = _noaa_equation_of_time_minutes(civil)
    correction = longitude_correction + eqtime
    # Apparent solar clock is not another timezone: retain naive wall date/time.
    true_solar = civil.replace(tzinfo=None) + timedelta(minutes=correction)
    return SolarTimeResult(
        civil_datetime=civil.replace(tzinfo=None).isoformat(timespec="seconds"),
        timezone=birth.timezone,
        longitude_east_deg=float(birth.longitude_east_deg),
        utc_offset_minutes=offset_minutes,
        equation_of_time_minutes=round(eqtime, 6),
        longitude_correction_minutes=round(longitude_correction, 6),
        total_correction_minutes=round(correction, 6),
        true_solar_datetime=true_solar.isoformat(timespec="seconds"),
        time_index=_time_index(true_solar),
        near_shichen_boundary=_near_boundary(true_solar),
    )
