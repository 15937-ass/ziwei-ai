"""Explicit and versioned chart policy; never inherit iztro defaults silently."""

CHART_CONTRACT_ID = "ZHONGZHOU_WANG_IZTRO_2_6_5_INPUT_V0_1"
ENGINE_NAME = "iztro-js"
ENGINE_VERSION = "2.6.5"
ADAPTER_VERSION = "0.1"
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
}
BRANCHES = ("子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥")
MAJOR_STARS = frozenset(("紫微", "天机", "太阳", "武曲", "天同", "廉贞",
                         "天府", "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军"))
