# 出库记录 10 轮次端到端验证 (V3.1)

**测试日期**：2026-06-04
**实施人**：Claude (claude.ai/code)
**前提**：V1.1 后端已重启（PID 29356 → 杀 + `cd server && npm run dev`）

> ⚠️ **本次未执行**：写计划时后端没重启，API 调用被旧代码响应（"库存不存在"）。等用户重启后实际跑。

---

## 验证步骤

### Round 1: 默认本月（V3.1 关键 — useEffect 同步设值避免 400）

```bash
# 1. 后端 list API（无参数 — 模拟 V3.1 默认本月 + 兼容）
curl -s "http://localhost:3001/api/inventory/transactions?from=$(date -d '2026-06-01' +%Y-%m-%d)&to=$(date +%Y-%m-%d)&limit=5" | python -m json.tool | head -30
```

**预期**：
- HTTP 200
- `data.rows` 数组，每行 `transactionType === 'outbound'`
- `data.total` 是数字
- `data.summary.totalCount / totalQuantity / todayCount / byStockType / byBusinessType` 全部存在

### Round 2: 改时间范围

```bash
curl -s "http://localhost:3001/api/inventory/transactions?from=2026-01-01&to=2026-06-30&limit=5" | python -m json.tool | head -20
```

**预期**：`data.total` 大于默认本月结果

### Round 3: 库存类型筛选

```bash
curl -s "http://localhost:3001/api/inventory/transactions?from=2026-01-01&to=2026-06-30&stock_type=product&limit=3" | python -c "
import json, sys
d = json.load(sys.stdin)
rows = d.get('data', {}).get('rows', [])
print('count:', len(rows), 'all product:', all(r['stockType'] == 'product' for r in rows))
"
```

**预期**：所有 `rows[i].stockType === 'product'`

### Round 4: 仓库 + 品种筛选（LEFT JOIN ON 子句）

```bash
# 删一个 stock，让出库流水变成 LEFT JOIN null
curl -s -X DELETE "http://localhost:3001/api/inventory/STK-FIX-0" 2>&1
# 查 product + 该仓库
curl -s "http://localhost:3001/api/inventory/transactions?from=2026-01-01&to=2026-06-30&stock_type=product&warehouse_id=WH001&limit=3" | python -c "
import json, sys
d = json.load(sys.stdin)
rows = d.get('data', {}).get('rows', [])
print('count:', len(rows), 'all WH001:', all(r['warehouseName'] == '成品冷库A区' for r in rows))
"
```

**预期**：所有行 warehouseName === '成品冷库A区'；删除的 stock 关联的流水仍出现（LEFT JOIN null → cropName 为 null）

### Round 5: 业务类型筛选

```bash
curl -s "http://localhost:3001/api/inventory/transactions?from=2026-01-01&to=2026-06-30&business_type=harvest&limit=3" | python -c "
import json, sys
d = json.load(sys.stdin)
rows = d.get('data', {}).get('rows', [])
print('count:', len(rows), 'all harvest:', all(r['businessType'] == 'harvest' for r in rows))
"
```

### Round 6: 导出 CSV（后端）

```bash
curl -s "http://localhost:3001/api/inventory/transactions/export?from=2026-06-01&to=2026-06-30&format=csv" -o /tmp/outbound.csv
ls -lh /tmp/outbound.csv
head -3 /tmp/outbound.csv | iconv -f UTF-8 -t UTF-8 | head -3
```

**预期**：
- 文件大小 > 1KB
- 第一行是 18 列表头（业务单号,操作时间,实例ID,...）
- 内容 UTF-8 中文不乱码（CSV 加了 BOM）

### Round 7: 导出 PDF（前端，浏览器内）

**手动**：打开 `http://localhost:5188/crop/outbound-records` → 点击「PDF」按钮 → 下载 → PDF 正常打开

### Round 8: 导出 XLSX（前端）

**手动**：点击「XLSX」按钮 → 下载 → Excel 打开 → 「明细」+「汇总」两个 sheet

### Round 9: 详情跳转（实例ID → InventoryDetailModal）

**手动**：点击任意行的「实例ID」链接 → 详情弹窗打开 → 3 Tab（基本信息/操作历史/上下游追溯）正常显示

### Round 10: 边界 — 删 stock 后流水仍能查（LEFT JOIN null）

```bash
# Round 4 已删 STK-FIX-0，流水还在
curl -s "http://localhost:3001/api/inventory/transactions?from=2026-06-01&to=2026-06-30&limit=200" | python -c "
import json, sys
d = json.load(sys.stdin)
rows = d.get('data', {}).get('rows', [])
# 找关联到 STK-FIX-0 instanceId 的（如果还存在的）
ipxr = [r for r in rows if r['instanceId'] in ['IPR-FIX-0000', 'IPR-FIX-0001', 'IPR-FIX-0002']]
print('LEFT JOIN 验证: 存在', len(ipxr), '条关联 FIX stock 的流水')
if ipxr:
    print('  示例 cropName:', ipxr[0].get('cropName'), '| 应为 None 或 关联 stock 的作物名')
"
```

**预期**：能查到（即使 stock 被删），cropName 可能是 null 或 关联 stock 残留

---

## 端到端（手动浏览器 10 轮次）

1. 浏览器 `Ctrl+Shift+R` 硬刷
2. 左侧菜单「作物管理」→「出库记录」→ 进入页面
3. 默认本月（本月 1 号到今天）显示
4. 改时间范围为 2026-01-01 ~ 2026-06-30 → 列表 + 统计实时更新
5. 选库存类型=成品 → 列表过滤
6. 输入品种="番茄" → 模糊匹配
7. 选业务类型=采收 → 列表过滤
8. 导出 CSV → 文件下载，行数对得上
9. 导出 XLSX → Excel 打开，多 sheet
10. 导出 PDF（≤2000 行）→ 浏览器预览正常

**边界测试**：
- 11. 删 1 条 stock → 该条详情显示「已删除」（LEFT JOIN null）
- 12. 时间范围 > 1 年：PDF 按钮禁用，CSV/XLSX 可用
- 13. 改 from > to：Alert「开始日期不能晚于结束日期」
- 14. 空数据：EmptyState + 「重置筛选」按钮
- 15. 点实例ID：详情弹窗 + 15 列对齐

---

## 通过标准

- ✅ Round 1-10 全部 PASS
- ✅ 边界测试 11-15 全部 PASS
- ✅ 错误率 0%（不允许 silent fail）
- ✅ 导出文件能在 Excel/Chrome PDF viewer 正常打开
- ✅ 详情弹窗 19 字段与规格 §7.3 表对齐

---

**报告状态**：⏳ 等用户重启 V1.1 后端后实际执行
