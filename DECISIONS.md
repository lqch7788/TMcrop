# 项目决策记录（AI 协助决策，用户裁决）

> 本文件记录 AI 与用户协作过程中的**关键决策**，供 git 历史追溯与后续会话参考。
> 规划类文档（public/docs/agronomy-roadmap/）按项目规则不入 git，仅本机可见。

---

## 2026-09-02：PWA 离线缓存 / IndexedDB 离线队列 — 不做

**决策**：移动端不引入离线缓存层，保持「组件 → Store → enhancedApiClient → API」直连。

**背景**：
- 用户质询："现在系统所有数据库与前端都是 API 直接对接，为什么还要缓存？"
- 系统部署形态：Electron 桌面端 + 本地服务器（单农场主，局域网）
- `farm_operation_records` 实际 0 条（移动端上报从未被真实使用）
- V2.1 架构铁律明确禁止 IndexedDB / localStorage 兜底

**结论**：

| 项 | 状态 |
|---|---|
| vite-plugin-pwa 离线缓存 | ❌ 不做 |
| IndexedDB 离线队列 | ❌ 不做 |
| `/m/operation-report` 在线直报 H5 | ✅ 已实施（src/pages/mobile/OperationReportPage.tsx） |
| 后端 offline-sync API + operation_record_offline_queue 表 | ✅ 保留为备案扩展能力（前端不接缓存层） |
| 未来出现"田间 4G 无信号上报"真实场景 | ⚠️ 再评估，作为有明确前提的合规例外单独立项 |

**关联代码**：
- 前端在线直报：`src/pages/mobile/OperationReportPage.tsx`（提交走后端 offline-sync API）
- 后端扩展能力：`server/src/routes/offlineSync.ts` + `operation_record_offline_queue` 表
- 入口：Dashboard V3QuickAccessCard「📱 田间上报」

---

## 2026-09-02：15 个 AI 模块真实度审计 + 修复

**决策**：对 AIPanel 15 个 AI 模块逐行审计真实度（算法/数据/业务/可用性），修复 ≤7/10 的模块。

**结果**：14/15 真实可用 + 1/15 辅助可用（修复前仅 5 个可用）。
完整审计报告见 `AI_MODULES_REALITY_AUDIT_2026-09-02.md`（仓库根）。

---

## 2026-09-02：AI-09 病虫害模型类别映射修复

**决策**：修复训练/预测类别顺序不一致 bug（曾导致预测张冠李戴）+ Windows GBK 编码崩溃。

**结果**：5500 张合成图重训，验证准确率 100%（55 张抽样）。

---

## 2026-09-02：P2-X cron 自动调度

**决策**：服务启动时自动注册 3 个 cron 任务（每日/每月备份 + 提醒扫描），node-cron 为可选依赖。

---

## 2026-09-02：农事任务中心 AI 智能助手独立 Tab

**决策**：从智能任务中心原 3 tab 抽出 AI 智能助手，独立为第 4 tab；SmartDispatch 移除 AIPanel。

---

## 2026-08-31：农事管理 v0.3 扩展 + 不删改原则

**决策**：农事管理新增批次时间线/任务进度/SOP/问题整改/提醒/成本/合规/纸单/备份等功能。
**铁律**：现有农事任务中心 4 Tab 功能一律不删改，只能新增。
