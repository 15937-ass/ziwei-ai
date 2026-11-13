"""Explicit and versioned chart policy; never inherit iztro defaults silently."""

CHART_CONTRACT_ID = "ZHONGZHOU_WANG_IZTRO_2_6_5_INPUT_V0_3"
ENGINE_NAME = "iztro-js"
ENGINE_VERSION = "2.6.5"
ADAPTER_VERSION = "0.2"
WANG_MUTAGENS = {
    "甲": [
        "廉贞",
        "破军",
        "武曲",
        "太阳"
    ],
    "乙": [
        "天机",
        "天梁",
        "紫微",
        "太阴"
    ],
    "丙": [
        "天同",
        "天机",
        "文昌",
        "廉贞"
    ],
    "丁": [
        "太阴",
        "天同",
        "天机",
        "巨门"
    ],
    "戊": [
        "贪狼",
        "太阴",
        "太阳",
        "天机"
    ],
    "己": [
        "武曲",
        "贪狼",
        "天梁",
        "文曲"
    ],
    "庚": [
        "太阳",
        "武曲",
        "天府",
        "天同"
    ],
    "辛": [
        "巨门",
        "太阳",
        "文曲",
        "文昌"
    ],
    "壬": [
        "天梁",
        "紫微",
        "天府",
        "武曲"
    ],
    "癸": [
        "破军",
        "巨门",
        "太阴",
        "贪狼"
    ]
}
CHART_POLICY = {
    "school": "zhongzhou",
    "algorithm": "zhongzhou",
    "astro_type": "heaven",
    "fix_leap": True,
    "day_divide": "current",
    "year_divide": "normal",
    "horoscope_divide": "normal",
    "age_divide": "normal",
    "language": "zh-CN",
    "mutagens": WANG_MUTAGENS,
}
BRANCHES = ("子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥")
MAJOR_STARS = frozenset(("紫微", "天机", "太阳", "武曲", "天同", "廉贞",
                         "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"))


# Temporal flow-day is a separate policy from the natal chart contract.
# User decision 2026-11-13: do not block core product development on an
# unresolved Wang source interpretation of leap-month continuous day counts.
# Future temporal adapters must return iztro's native horoscope().daily
# unless the user explicitly chooses a separately source-certified policy.
FLOW_DAY_POLICY = {
    "policy_id": "FLOW_DAY_IZTRO_NATIVE_V1",
    "provider": "iztro-js",
    "provider_version": ENGINE_VERSION,
    "mode": "native_horoscope_daily",
    "wang_leap_continuous_source_status": "unresolved_nonblocking",
    "wang_full_conformance_claim": False,
}
