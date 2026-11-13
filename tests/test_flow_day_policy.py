"""Flow-day product-policy decision is independent from natal chart contract."""
from ziwei.chart.contract import FLOW_DAY_POLICY, ENGINE_VERSION


def test_native_iztro_is_selected_without_source_certification() -> None:
    assert FLOW_DAY_POLICY["policy_id"] == "FLOW_DAY_IZTRO_NATIVE_V1"
    assert FLOW_DAY_POLICY["provider"] == "iztro-js"
    assert FLOW_DAY_POLICY["provider_version"] == ENGINE_VERSION
    assert FLOW_DAY_POLICY["mode"] == "native_horoscope_daily"
    assert FLOW_DAY_POLICY["wang_leap_continuous_source_status"] == "unresolved_nonblocking"
    assert FLOW_DAY_POLICY["wang_full_conformance_claim"] is False
