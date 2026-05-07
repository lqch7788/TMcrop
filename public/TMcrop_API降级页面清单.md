# TMcrop API降级页面/组件完整清单

> 仓库：lqch7788/TMcrop  
> 分支：planting-management  
> Commit：ba13cd23 (feat: 审批联动触发器 - 调用后端API更新业务表状态)  
> 生成时间：2026-05-06

---

## 一、真正运行时降级 fallback 的页面/组件

> **判定标准**：API调用失败 → catch错误 → 返回localStorage数据（try-catch + localStorage fallback）  
> **涉及服务文件**：`dictionaryService.ts`（departmentService.ts / greenhouseService.ts / warehouseService.ts 独立版本虽存在降级逻辑，但无页面直接导入）

| 文件路径 | 使用的服务 | 调用的函数 |
|---|---|---|
| `src/pages/authority/WarehouseManagement.tsx` | `dictionaryService.ts` | `getWarehouses()` |
| `src/pages/authority/BaseManagement.tsx` | `dictionaryService.ts` | `getBases()`, `saveBases()` |
| `src/pages/authority/SystemConfigManagement.tsx` | `dictionaryService.ts` | `getSystemConfigs()`, `saveSystemConfigs()` |
| `src/pages/authority/GreenhouseManagement.tsx` | `dictionaryService.ts` | `getGreenhouses()`, `saveGreenhouses()` |
| `src/pages/authority/DictionaryManagement.tsx` | `dictionaryService.ts` | `getDictionaries()`, `getDictionariesByCategory()`, `saveDictionaries()` |
| `src/pages/DictionaryManagement.tsx` | `dictionaryService.ts` | `getDictionaries()`, `getDictionariesByCategory()` |

### 降级模式说明

上述页面使用的 `dictionaryService.ts` 中的以下函数均实现了**真正的运行时降级**：

- `getDictionaries()` — fetch失败 → localStorage → DEFAULT_DICTIONARIES
- `getDictionaryCategories()` — fetch失败 → localStorage → 默认分类
- `getSystemConfigs()` — apiClient失败 → localStorage → DEFAULT_CONFIGS
- `getWarehouses()` — apiClient失败 → localStorage → DEFAULT_WAREHOUSES
- `getBases()` — apiClient失败 → localStorage → DEFAULT_BASES
- `getGreenhouses()` — apiClient失败 → localStorage → DEFAULT_GREENHOUSES

### 独立降级服务（有降级逻辑但未被页面使用）

以下服务文件存在运行时降级逻辑，但**无任何页面/组件直接导入**：

| 服务文件 | 降级函数 | 降级模式 |
|---|---|---|
| `src/services/departmentService.ts` | `getDepartments()` | USE_API=true时try-catch → localStorage fallback |
| `src/services/greenhouseService.ts` | `getGreenhouses()` | USE_API=true时try-catch → localStorage fallback |
| `src/services/warehouseService.ts` | `getWarehouses()` | USE_API=true时try-catch → localStorage fallback |

> 注：这3个独立服务与 `dictionaryService.ts` 中同名函数是**重复实现**，页面均使用 dictionaryService 中的版本。

---

## 二、使用编译时 USE_API 切换的页面/组件

> **判定标准**：不是运行时降级，只是检查 `USE_API` 标志，编译时即确定走API还是localStorage

### A. 直接导入 api*.ts 服务文件的页面/组件

| 文件路径 | 使用的 api 服务 | 调用的函数/导入方式 |
|---|---|---|
| `src/components/common/settings/SupplierSelect.tsx` | `apiSupplierService.ts` | `getActiveSuppliers()` |
| `src/components/inventory/ProduceInventoryPage.tsx` | `apiCropVarietyService.ts`, `apiInventoryService.ts` | `getAllVarieties()`, `* as inventoryService` |
| `src/components/farm/planting/components/PlantingTable.tsx` | `apiCropVarietyService.ts` | `* as cropVarietyService` |
| `src/components/farm/planting/modals/AddModal.tsx` | `apiPlantingService.ts`, `apiSeedSourceService.ts`, `apiSeedlingService.ts`, `apiCropInstanceService.ts` | `addPlanting()`, `getSeedSources()`, `getSeedlings()`, `* as cropInstanceService` |
| `src/components/farm/planting/modals/HarvestModal.tsx` | `apiPlantingService.ts` | `harvestPlanting()` |
| `src/components/farm/planting/PlantingPage.tsx` | `apiPlantingService.ts` | `* as plantingService` |
| `src/components/farm/instance/InstancePage.tsx` | `apiCropInstanceService.ts` | `* as cropInstanceService` |
| `src/components/farm/seed-source/components/SeedSourceTable.tsx` | `apiCropVarietyService.ts` | `* as cropVarietyService` |
| `src/components/farm/seed-source/modals/AddModal.tsx` | `apiSeedSourceService.ts` | `addSeedSource()`, `updateSeedSource()`, `generateSeedCode()` |
| `src/components/farm/seed-source/modals/EditModal.tsx` | `apiSeedSourceService.ts` | `updateSeedSource()` |
| `src/components/farm/seed-source/SeedSourcePage.tsx` | `apiSeedSourceService.ts` | `* as seedSourceService` |
| `src/components/farm/harvest/HarvestPage.tsx` | `apiHarvestService.ts`, `apiCropInstanceService.ts` | `* as harvestService`, `* as cropInstanceService` |
| `src/components/farm/seedling/SeedlingPage.tsx` | `apiSeedlingService.ts`, `apiSeedSourceService.ts` | `* as seedlingService`, `* as seedSourceService` |
| `src/components/farm/seedling/components/SeedlingTable.tsx` | `apiCropVarietyService.ts` | `* as cropVarietyService` |
| `src/components/farm/seedling/modals/AddModal.tsx` | `apiSeedlingService.ts`, `apiSeedSourceService.ts`, `apiCropInstanceService.ts` | `addSeedling()`, `decreaseAvailableCount()`, `getSeedSourceById()`, `* as cropInstanceService` |
| `src/components/farm/seedling/modals/DailyRecordModal.tsx` | `apiSeedlingService.ts` | `addDailyRecord()` |
| `src/components/farm/seedling/modals/EditModal.tsx` | `apiSeedlingService.ts` | `updateSeedling()` |
| `src/components/farm/seedling/modals/TransplantModal.tsx` | `apiSeedlingService.ts`, `apiPlantingService.ts` | `increasePlantedCount()`, `addPlanting()` |
| `src/components/farm/crop-variety/CropVarietyTable.tsx` | `apiCropVarietyService.ts` | `deleteVariety()` |
| `src/components/farm/crop-variety/modals/AddCropVarietyModal.tsx` | `apiCropVarietyService.ts` | `createVariety()` (as `addVarietyApi`) |
| `src/components/farm/crop-variety/modals/EditCropVarietyModal.tsx` | `apiCropVarietyService.ts` | `updateVariety()` |
| `src/components/farm/order/modals/AddModal.tsx` | `apiCropOrderService.ts` | `* as cropOrderService` |
| `src/components/farm/order/OrderPage.tsx` | `apiCropOrderService.ts`, `apiCropInstanceService.ts`, `apiCropVarietyService.ts` | `* as cropOrderService`, `* as cropInstanceService`, `* as cropVarietyService` |

### B. 直接使用 apiClient + USE_API 标志的页面/组件

| 文件路径 | 使用方式 |
|---|---|
| `src/components/labor/attendance/hooks/useWorkerAttendance.ts` | `import { apiClient, USE_API } from '../../../../services/apiClient'` |
| `src/components/warehouse/WarehouseMaterialsPage.tsx` | `import { apiClient, USE_API } from '../../services/apiClient'` |
| `src/components/production/ProductionPage.tsx` | `import { apiClient, USE_API } from '../../services/apiClient'` |

---

## 三、纯 localStorage 无 API 的页面/组件

> **判定标准**：使用旧版 localStorage 服务文件（非 api*.ts 版本），无 API 调用能力

### A. 使用旧版服务文件的页面/组件

| 文件路径 | 使用的旧服务 | 备注 |
|---|---|---|
| `src/components/farm/seed-source/modals/PrintLabelModal.tsx` | `seedSourceService.ts` | |
| `src/components/farm/seed-source/SeedSourcePage.tsx` | `seedSourceService.ts` | **同时使用了 apiSeedSourceService.ts** |
| `src/components/farm/seedling/SeedlingPage.tsx` | `seedlingService.ts`, `seedSourceService.ts` | **同时使用了 apiSeedlingService.ts / apiSeedSourceService.ts** |
| `src/components/farm/seedling/modals/AddModal.tsx` | `seedlingService.ts` | |
| `src/components/farm/seedling/modals/PrintLabelModal.tsx` | `seedlingService.ts` | |
| `src/components/farm/seedling/modals/TransplantHistoryModal.tsx` | `seedlingService.ts` | |
| `src/components/farm/planting/modals/PrintLabelModal.tsx` | `plantingService.ts` | |
| `src/components/farm/planting/PlantingPage.tsx` | `plantingService.ts` | **同时使用了 apiPlantingService.ts** |
| `src/components/farm/harvest/HarvestPage.tsx` | `harvestService.ts` | **同时使用了 apiHarvestService.ts** |
| `src/components/farm/planting/modals/AddModal.tsx` | `cropInstanceService.ts` | **同时使用了 apiCropInstanceService.ts** |
| `src/components/farm/instance/InstancePage.tsx` | `cropInstanceService.ts` | **同时使用了 apiCropInstanceService.ts** |
| `src/components/farm/seed-source/modals/AddModal.tsx` | `cropInstanceService.ts` | **同时使用了 apiCropInstanceService.ts** |
| `src/components/farm/seedling/modals/AddModal.tsx` | `cropInstanceService.ts` | **同时使用了 apiCropInstanceService.ts** |
| `src/components/farm/order/OrderPage.tsx` | `cropInstanceService.ts`, `cropOrderService.ts` | **同时使用了 apiCropInstanceService.ts / apiCropOrderService.ts** |
| `src/components/farm/order/modals/AddModal.tsx` | `cropOrderService.ts` | **同时使用了 apiCropOrderService.ts** |
| `src/components/production/modals/CreateBatchModal.tsx` | `cropVarietyService.ts` | |
| `src/components/farm/planting/components/PlantingTable.tsx` | `cropVarietyService.ts` | **同时使用了 apiCropVarietyService.ts** |
| `src/components/farm/planting/modals/AddModal.tsx` | `cropVarietyService.ts` | **同时使用了 apiCropVarietyService.ts** |
| `src/components/farm/planting/PlantingPage.tsx` | `cropVarietyService.ts` | **同时使用了 apiCropVarietyService.ts** |
| `src/components/farm/seed-source/components/SeedSourceTable.tsx` | `cropVarietyService.ts` | **同时使用了 apiCropVarietyService.ts** |
| `src/components/farm/seed-source/modals/AddModal.tsx` | `cropVarietyService.ts` | **同时使用了 apiCropVarietyService.ts** |
| `src/components/farm/harvest/HarvestPage.tsx` | `cropVarietyService.ts` | **同时使用了 apiCropVarietyService.ts** |
| `src/components/farm/seedling/SeedlingPage.tsx` | `cropVarietyService.ts` | **同时使用了 apiCropVarietyService.ts** |
| `src/components/farm/seedling/components/SeedlingTable.tsx` | `cropVarietyService.ts` | **同时使用了 apiCropVarietyService.ts** |
| `src/components/farm/crop-variety/CropVarietyManagement.tsx` | `cropVarietyService.ts`, `cropVarietyExtensionService.ts` | |
| `src/components/farm/crop-variety/hooks/useVarietyTree.ts` | `cropVarietyService.ts`, `cropVarietyExtensionService.ts` | |
| `src/components/farm/crop-variety/CropVarietyTable.tsx` | `cropVarietyService.ts` | **同时使用了 apiCropVarietyService.ts** |
| `src/components/farm/crop-variety/modals/QuickAddModal.tsx` | `cropVarietyService.ts` | |
| `src/components/farm/crop-variety/modals/AddCropVarietyModal.tsx` | `cropVarietyService.ts` | **同时使用了 apiCropVarietyService.ts** |
| `src/components/farm/crop-variety/VarietyTree.tsx` | `cropVarietyService.ts` | |
| `src/components/farm/order/modals/AddModal.tsx` | `cropVarietyService.ts` | **同时使用了 apiCropVarietyService.ts** |
| `src/components/farm/order/OrderPage.tsx` | `cropVarietyService.ts` | **同时使用了 apiCropVarietyService.ts** |
| `src/components/farm/common/CropCodeSelector.tsx` | `cropVarietyService.ts` | |
| `src/components/farm/crop-variety/VarietyTreeNode.tsx` | `cropVarietyExtensionService.ts` | |
| `src/components/farm/planting/PlantingPage.tsx` | `cropBatchService.ts` | |
| `src/components/farm/seed-source/SeedSourcePage.tsx` | `cropBatchService.ts` | |
| `src/components/farm/seedling/SeedlingPage.tsx` | `cropBatchService.ts` | |
| `src/pages/InventoryV3.tsx` | `inventoryService.ts` | |
| `src/components/inventory/ProduceInventoryPage.tsx` | `inventoryService.ts` | **同时使用了 apiInventoryService.ts** |
| `src/components/farm/harvest/HarvestPage.tsx` | `inventoryService.ts` | |
| `src/components/farm/seed-source/modals/AddModal.tsx` | `supplierService.ts` | |
| `src/pages/labor/LeavePage.tsx` | `leaveQuotaService.ts` | |
| `src/pages/labor/OvertimePage.tsx` | `overtimeCalculationService.ts` | |
| `src/pages/labor/SalaryBudgetPage.tsx` | `salaryCalculationService.ts` | |
| `src/components/production/modals/BatchDetailModal.tsx` | `productionPlanService.ts` | |
| `src/components/farm/trace/TraceChain.tsx` | `inventoryIntegration.ts` | |

### B. 未找到使用者的旧服务文件

以下旧版 localStorage 服务文件在 `src/pages/` 和 `src/components/` 中**无任何页面/组件导入**：

| 服务文件 | 说明 |
|---|---|
| `src/services/authorityService.ts` | |
| `src/services/approvalBusinessIntegration.ts` | |
| `src/services/approvalDelegationService.ts` | |
| `src/services/approvalSubmitService.ts` | |
| `src/services/approvalTimeoutService.ts` | |
| `src/services/hrApprovalService.ts` | |
| `src/services/fieldMapping.ts` | |

---

## 四、统计摘要

| 类别 | 页面/组件数量 | 说明 |
|---|---|---|
| **类别1：真正运行时降级** | **6 个** | 全部使用 `dictionaryService.ts` |
| **类别2：编译时 USE_API 切换** | **26 个** | 23个直接导入 api*.ts + 3个使用 apiClient/USE_API |
| **类别3：纯 localStorage** | **约 40+ 个文件涉及** | 部分文件同时使用了类别2的api服务 |
| **有降级逻辑但未被使用** | 3 个服务文件 | departmentService.ts / greenhouseService.ts / warehouseService.ts（独立版）|

---

## 五、关键发现

1. **`dictionaryService.ts` 是唯一被页面实际使用的运行时降级服务**。它集中封装了数据字典、基地、温室、仓库、系统配置等API，所有API调用均带 try-catch + localStorage fallback。

2. **独立的 `departmentService.ts` / `greenhouseService.ts` / `warehouseService.ts` 处于"僵尸"状态** — 它们有自己的降级逻辑，但没有任何页面导入它们。页面都走 `dictionaryService.ts` 的同名函数。

3. **大量页面同时使用了新旧两套服务**（如 SeedSourcePage 同时导入 `apiSeedSourceService` 和 `seedSourceService`），表明系统处于 API 迁移的过渡阶段。

4. **`services/index.ts` 的三级存储代理方案（api → dexie → localStorage → mock）无任何页面/组件使用**，所有页面要么直接导入 api*.ts，要么直接导入旧服务文件。
