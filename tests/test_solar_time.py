"""Time normalization tests independent of the iztro bridge."""
from datetime import datetime
import math
import pytest

from ziwei.chart import BirthInput, convert_to_true_solar_time
from ziwei.chart.solar_time import _time_index


def birth(clock: str, longitude: float = 116.4,
          timezone: str = "Asia/Shanghai", fold=None) -> BirthInput:
    return BirthInput(clock, longitude, timezone, "male", "test place", fold)


def test_longitude_and_equation_of_time_are_both_applied() -> None:
    result = convert_to_true_solar_time(birth("2000-08-16T12:00"))
    assert result.utc_offset_minutes == 480
    assert result.longitude_correction_minutes == pytest.approx(-14.4, abs=1e-4)
    assert result.equation_of_time_minutes == pytest.approx(-4.60, abs=0.2)
    assert result.total_correction_minutes == pytest.approx(-19, abs=0.3)
    assert result.true_solar_datetime.startswith("2000-08-16T11:40")


def test_correction_crosses_back_into_previous_day() -> None:
    result = convert_to_true_solar_time(birth("2000-08-16T00:15"))
    assert result.true_solar_datetime.startswith("2000-08-15T23:55")
    assert result.time_index == 12  # 晚子 remains same apparent-solar date


def test_correction_can_cross_into_following_day() -> None:
    result = convert_to_true_solar_time(birth("2000-08-16T23:59", 121.5))
    assert result.true_solar_datetime.startswith("2000-08-17T00:")
    assert result.time_index == 0  # 00:00 is the *next* date


@pytest.mark.parametrize("hour,expected", [
    (0,0),(1,1),(2,1),(3,2),(20,10),(21,11),(22,11),(23,12),
])
def test_iztro_shichen_index(hour, expected) -> None:
    assert _time_index(datetime(2000, 8, 16, hour)) == expected


def test_different_longitudes_change_the_corrected_time() -> None:
    west = convert_to_true_solar_time(birth("2000-08-16T12:00", 100))
    east = convert_to_true_solar_time(birth("2000-08-16T12:00", 130))
    assert east.total_correction_minutes - west.total_correction_minutes == pytest.approx(120)
    assert east.time_index != west.time_index


def test_dst_gap_is_rejected() -> None:
    with pytest.raises(ValueError, match="nonexistent"):
        convert_to_true_solar_time(birth("2021-03-14T02:30", -74, "America/New_York"))


def test_dst_fold_requires_disambiguation() -> None:
    with pytest.raises(ValueError, match="ambiguous"):
        convert_to_true_solar_time(birth("2021-11-07T01:30", -74, "America/New_York"))
    first = convert_to_true_solar_time(birth("2021-11-07T01:30", -74, "America/New_York", 0))
    second = convert_to_true_solar_time(birth("2021-11-07T01:30", -74, "America/New_York", 1))
    assert second.utc_offset_minutes - first.utc_offset_minutes == -60


@pytest.mark.parametrize("bad", [
    {"civil_datetime":"2000-08-16T12:00+08:00", "longitude_east_deg":116.4,
     "timezone":"Asia/Shanghai", "gender":"male"},
    {"civil_datetime":"2000-02-30T12:00", "longitude_east_deg":116.4,
     "timezone":"Asia/Shanghai", "gender":"male"},
    {"civil_datetime":"2000-08-16T12:00", "longitude_east_deg":181,
     "timezone":"Asia/Shanghai", "gender":"male"},
    {"civil_datetime":"2000-08-16T12:00", "longitude_east_deg":116.4,
     "timezone":"Invalid/City", "gender":"male"},
    {"civil_datetime":"2000-08-16T12:00", "longitude_east_deg":116.4,
     "timezone":"Asia/Shanghai", "gender":"other"},
])
def test_invalid_input_is_rejected(bad) -> None:
    with pytest.raises(ValueError):
        convert_to_true_solar_time(BirthInput.from_dict(bad))


def test_unknown_input_fields_are_not_ignored() -> None:
    with pytest.raises(ValueError, match="unknown birth input"):
        BirthInput.from_dict({
            "civil_datetime": "2000-08-16T12:00", "longitude_east_deg":116.4,
            "timezone": "Asia/Shanghai", "gender": "male",
            "chart_override": "default"
        })


def test_near_boundary_is_exposed_not_silently_hidden() -> None:
    result = convert_to_true_solar_time(birth("2000-08-16T23:59", 121.5))
    assert result.near_shichen_boundary
