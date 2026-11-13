# Ziwei AI · 紫微斗数 AI

一个以 **确定性排盘 + 有出处的知识 + 可验证的 LLM 推断** 为目标的渐进式研究项目。

## 已实现：M0-1 中州派排盘原型

- Python 处理输入、出生地经度 / 历史时区 / 夏令时与当地真太阳时；此处的 NOAA 近似计算独立于王亭之传统安星规则。
- 固定 iztro JS `2.6.5`，`zhongzhou`、`heaven`、`fixLeap=true`、`dayDivide=current`（午夜 00:00 换日），年界与运限年界为 `normal`。
- 输出可核验的 `ChartSnapshot`，记录民用时间、校时来源、引擎输入、十二宫和主辅杂曜、命身宫与大限范围。
- 配套自动测试涵盖时差跨日、早晚子时、闰月十五/十六、历史夏令时、王亭之历法示例以及 iztro 实际排盘。
- **尚未认证王亭之全部安星细节**：洛阳参照基准、特殊曜与四化等需要继续按原书逐项差分审查。详见 [排盘契约与研究边界](docs/CHART_CONTRACT.md)。

## 本地运行

要求 Python 3.11+ 与 Node.js 22+：

```bash
python -m pip install -e '.[dev]'
npm ci --ignore-scripts --no-audit --no-fund
python -m ziwei.chart examples/birth_input.example.json
npm test
python -m pytest -q
```

输入采用出生地民用公历时间 `civil_datetime`、东经 `longitude_east_deg`、历史时区 `timezone`、用于顺逆的 `gender`。**此版不支持只输入省市名称来猜经度**，也不接受已校正真太阳时直接作为民用时间重复修正。

## 研究与商用边界

- 命盘事实、原典规则和模型推断必须分离；LLM 不允许重新计算或修改排盘。
- 排盘属于传统术数算法的工程复现，不意味着命运预测已具实证有效性。
- 近时辰边界、历史时区不确定、洛阳与当地真太阳时口径差异须核验后才能用于正式精确断盘。
- 不提交真实用户出生信息、受版权限制的原始著作、密钥及未经审核知识。
- 当前是**测试原型**，不是已上线的商用排盘服务。

下一步：用更多王亭之原书明确案例逐项检验宫位、十四主星、四化与辅煞曜，再建立正式知识层。
