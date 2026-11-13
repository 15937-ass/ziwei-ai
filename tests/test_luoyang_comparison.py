"""Independent longitudinal checks; not an approval of Wang source semantics."""
from ziwei.chart import BirthInput, convert_to_true_solar_time
from ziwei.chart.luoyang_comparison import compare_local_to_luoyang


def test_shanghai_longitude_difference_matches_wang_rough_scale():
    x=compare_local_to_luoyang(BirthInput(
        "2000-08-16T12:00",121.46,"Asia/Shanghai","female","Shanghai example"))
    # Wang: around 35 minutes. City longitude comparison gives ~36 minutes.
    assert 35 < x.local_minus_luoyang_minutes < 37


def test_hongkong_longitude_difference_matches_wang_rough_scale():
    x=compare_local_to_luoyang(BirthInput(
        "2000-08-16T12:00",114.15,"Asia/Hong_Kong","female","HK example"))
    # Wang: around 7.5 minutes. City longitude comparison gives ~6.8 minutes.
    assert 6 < x.local_minus_luoyang_minutes < 8


def test_two_clock_hypotheses_can_change_birth_shichen():
    x=compare_local_to_luoyang(BirthInput(
        "2000-08-16T01:15",121.46,"Asia/Shanghai","female","Shanghai near boundary"))
    assert x.local_shichen != x.luoyang_shichen
    assert not x.identical_shichen


def test_historical_hk_dst_recognized_before_mean_solar_correction():
    result=convert_to_true_solar_time(BirthInput(
        "1958-05-10T20:00",114.15,"Asia/Hong_Kong","male","HK historical DST"))
    # Wang: summer clock 20:00 means standard time 19:00.
    assert result.utc_offset_minutes==540
    assert result.true_solar_datetime[:10]=="1958-05-10"
    assert result.true_solar_datetime[11:13]=="18"
