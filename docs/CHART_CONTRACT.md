# 排盘契约 v0.3 — 中州派（待逐项来源核验）

状态：**可测试的工程实现，不是“王亭之所有安星细则已认证”的声明**。

## 目标与入口

- 输入：出生的**公历当地民用时间** `civil_datetime`（年月日、时、分；秒可选）、出生地东经 `longitude_east_deg`、对应历史民用时区 `timezone`（IANA ID）、性别 `gender`（male/female，影响大限顺逆）。
- 出生地名称 `birthplace_label` 只用于标识，**不能替代经度**；当前不自动地理编码或凭省市猜经度。
- 精确时间发生在夏令时回拨的重复小时，要求提供 `fold=0/1`；不存在的民用时刻拒绝。
- 不能把已经换算过的真太阳时再次当作民用出生时间输入。
- 工程支持的出生年份 1901–2100。该范围是测试和时区数据库约束，非古籍规定。

## 文献中直接支持的中州派口径

王亭之《中州派紫微斗数初级讲义》：

1. PDF p.4，书内页 7–8，“出生时换算法”：强调出生地经度、标准时间和夏令时间的差异；并述洛阳时间参照。
2. PDF p.4，书内页 8，子时注记：**午夜零时才是一日的新开始**；23:00–23:59 属当日的晚子时，00:00–00:59 属次日的早子时。
3. PDF p.5–6，书内页 9–10，“闰月推算法”：闰月初一至十五按前一个月，十六日至月底按下一个月处理；日期和时辰本身不变。日期应以农历月为基础而不是以立春改动生日所属的斗数月。

旧仓库 issue #977 记录了 iztro 2.6.1、`zhongzhou`、`heaven`、`fixLeap=true`，但使用 `dayDivide=forward`；后续 issue #981 提议 v1.1 修正为 `dayDivide=current`，并要求在 iztro 上游完成地点校时。

## 现代计时工程（与古籍分开标注）

用户要求按出生地校正为**当地视太阳时（真太阳时）**；这里采用 NOAA《General Solar Position Calculations》近似式：

```
correction_minutes =
  4 * longitude_east_deg - civil_utc_offset_minutes + equation_of_time_minutes

local_apparent_solar_datetime = civil_local_datetime + correction_minutes
```

- 时间差使用 **出生当时** 时区法规（包括实际夏令时），非今天的 UTC 偏移。
- `equation_of_time_minutes` 由 NOAA fractional-year Fourier 近似式计算；不应把近似精度宣传为秒级天文历表精度。
- 时辰以**换算后的本地视太阳日期和时刻**决定。发生跨公历日时，传给 iztro 的日期随之改变。
- 如换算后距离子时或其他时辰边界 <=2 分钟，置 `near_shichen_boundary=true`；商用自动判盘前需要精确算法或人工核实。
- 真太阳时计算本身**不是王亭之原著提供的 NOAA 公式**。原著还有“以洛阳地区为绝对标准”的历史参照；“当地真太阳时”与“按洛阳参考经线换算”的对应关系，仍需做来源审查与真实教材命盘差分，**目前不可宣称完全一致**。

NOAA: https://gml.noaa.gov/grad/solcalc/solareqns.PDF

## 固定 iztro 排盘配置

- JS `iztro@2.6.5`（显式固定版本）；旧仓库采用 2.6.1。之所以不机械复用旧版：2.6.4 的变更记录包含统一处理晚子时换日逻辑；这一变化需要单独回归测试。
- `algorithm=zhongzhou`
- `astroType=heaven`
- `fixLeap=true`
- `dayDivide=current`
- `yearDivide=normal`
- `horoscopeDivide=normal`
- `ageDivide=normal`
- `language=zh-CN`

iztro 官方接口：https://www.iztro.com/posts/astrolabe
配置参考：https://docs.iztro.com/posts/config-n-plugin

iztro 本身允许多流派配置，因此仅凭 `algorithm=zhongzhou` 不等于每一项中州派排星法已被独立验证。尤其需要校对王亭之指出有流派差异的四化、特定辅煞曜、闰月以及大限/流年时序。

## 数据契约

`ChartSnapshot` 必须包括：

- `contract_id`、固定 engine/version/adapter、完整固定排盘配置。
- 原始民用出生时间、时区、经度、性别；不得隐式猜测出生地。
- NOAA 方程时差、经度时差、历史时区偏移、换算后真太阳日期、时辰索引、近边界标志。
- 引擎真正接收到的公历日期与时辰索引，以及由 iztro 生成的完整十二宫星曜与五行局、命身宫信息。
- Python 调用 JS 时必须**恰好一次**校时；JS bridge 只接受已校时的三个字段，禁止用户覆盖排盘口径。
- JS 排盘不满足十二宫、十四主星覆盖等结构检验时，必须报错而不是由 LLM 修盘。

## 验证等级与已知缺口

**A：工程一致性**：日期跨界、00:00/23:00 子时、经度与时区、夏令时、十二宫、十四主星、版本记录；本次 CI 覆盖。

**B：原典一致性**：以王亭之书中具备明确出生地、原始出生时刻、安星锚点的完整个案逐项验证十二宫、主辅杂曜、四化、闰月和大限。**尚未完成**。

**C：历史天文精度与洛阳参照**：用更高精度天文历表验证接近交界的个案，核定古籍洛阳参照与“当地视太阳时”输入约定。**尚未完成**。

目前只能称为“中州派配置下可复现的排盘原型”，不得将 A 测试通过写成“王亭之全规则100%通过”。

## 运行（开发环境）

```bash
python -m pip install -e '.[dev]'
npm install --ignore-scripts --no-audit --no-fund
python -m ziwei.chart examples/birth_input.example.json
python -m pytest -q
npm test
```

此原型不会连接 LLM、不读取旧仓库知识或实际用户出生资料。


## v0.3 原典对照修订（2026-11-13）

- 固定 iztro 2.6.5 并在内部 config 注入王亭之印刷第39页的完整十干四化；未采用 iztro 默认南派四化，不做输出后改写。
- `ChartSnapshot.natal.source_void_pairs` 补充第43页「截空、旬空正空/傍空」两个宫位，保留原引擎报告的主位置用于交叉核验。
- 完整输出宫垣 `changsheng12`, `boshi12`, `jiangqian12`, `suiqian12`, `small_limit_ages`，不再从 API 裁掉这些已安立字段。
- 对 `monthly.earthlyBranch`（月干支）和 `monthly.index`（流月命宫索引）实行概念分离。
- 洛阳参照与当地真太阳时两路并存，仅本地视太阳时进入正式排盘；结果差异和剩余来源核验见 [王亭之安星审计](WANG_ANXING_AUDIT_2026-11-13.md)。

本版本仅通过当前样本回归，不等于全部中州派历法、流曜、庙旺性质已完成认证。
