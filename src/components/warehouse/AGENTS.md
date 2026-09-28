<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-02 | Updated: 2026-04-02 -->

# warehouse/ (仓库物料管理模块)

## Purpose
仓库物料管理模块，包含物料总览、物料入库两大功能。遵循组件拆分模式，每个功能组件独立文件。

## Key Files

| File | Description |
|------|-------------|
| ~~`WarehouseMaterialsPage.tsx`~~ | **已废弃（死代码）** — 实际主页面是 `src/pages/warehouse/WarehouseOverviewPage.tsx`，此文件已删除 |
| `MaterialFilters.tsx` | 筛选器组件 |
| `MaterialsTable.tsx` | 物料表格组件 |
| `MaterialDetailModal.tsx` | 物料详情弹窗 |
| `MaterialEditModal.tsx` | 物料编辑/删除确认弹窗 |
| `MaterialBatchEditModal.tsx` | 批量编辑物料弹窗 |
| `MaterialExportModal.tsx` | 导出格式选择弹窗 |
| ~~`DeleteWarningDialog.tsx`~~ | **已删除（2026-09-28）** — 工具栏"删除"改为直接进入复选框模式，该警告弹窗已无引用被移除 |
| `BatchDeleteConfirmDialog.tsx` | 批量删除确认弹窗（工具栏"删除"→ 勾选 → 确认删除 的最终二次确认） |
| ~~`InboundModals.tsx`~~ | **已删除（2026-09-28）** — 旧弹窗集，与 MaterialInboundTab 互相引用形成无入口死岛 |
| ~~`MaterialInboundTab.tsx`~~ | **已删除（2026-09-28）** — 旧入库标签页，同上；现役实现在 `src/pages/warehouse/` |

## Subdirectories
无子目录

## Component Pattern (组件模式)

### 状态管理
- 实际主页面是 `src/pages/warehouse/WarehouseOverviewPage.tsx`，使用 Zustand Store 走 enhancedApiClient（V2.1 架构）
- 本目录下的 `MaterialFilters.tsx` / `MaterialsTable.tsx` 等子组件由父级 WarehouseOverviewPage 调用，自身无业务数据
- 子组件通过 props 接收状态和回调

### Modal 组件命名规范
- `*Modal` - 弹窗组件
- `*Dialog` - 对话框组件
- `*ConfirmModal` - 确认类弹窗

### Props 接口命名
```typescript
interface ComponentNameProps {
  isOpen: boolean;
  onClose: () => void;
  // ... 其他props
}
```

## For AI Agents

### Working In This Directory
- 修改后运行 `npm run build` 验证构建
- 遵循现有组件拆分模式
- Modal 组件放在 `*Modal.tsx` 文件中

### Material Data Structure (物料数据结构)
```typescript
interface Material {
  id: number;
  code: string;
  name: string;
  category: string;
  specification: string;
  barcode: string;
  unit: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  price: string;
  supplier: string;
  location: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  lastUpdateTime: string;
  dataStatus: string;
}
```

### Inbound Record Structure (入库记录结构)
```typescript
interface InboundRecord {
  id: number;
  code: string;
  inboundDate: string;
  supplier: string;
  operator: string;
  status: 'pending' | 'completed';
  materials: InboundMaterial[];
}
```

## Dependencies

### Internal
- `MaterialFilters.tsx` - 筛选器


### External
- `lucide-react` - 图标库
- `recharts` - 图表库

<!-- MANUAL: -->
