/**
 * 种源管理主页面
 * 功能：种源列表展示、筛选、新增、编辑、删除、标签打印、图片查看、导出Excel
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Printer, Eye, Image, Package, ClipboardList } from 'lucide-react';
import { SeedSourceFilter } from './components/SeedSourceFilter';
import { SeedSourceTable } from './components/SeedSourceTable';
import { AddModal } from './modals/AddModal';
import { EditModal } from './modals/EditModal';
import { DetailModal } from './modals/DetailModal';
import { PrintLabelModal } from './modals/PrintLabelModal';
import { ImageLightboxModal } from './modals/ImageLightboxModal';
import { ExportFormatModal } from './modals/ExportFormatModal';
import { PropagationRecordModal } from './modals/PropagationRecordModal';
import { PropagationStageModal } from './modals/PropagationStageModal';
import { Button } from '../../../components/ui/button';
import {
  cropCategories,
  suppliers,
  units,
  seedSourceStatusOptions
} from '../../../data/cropData';
import { SeedSource, SeedSourceFilters, StockStatus, SourceType } from '../../../types/crop';
import * as cropBatchService from '../../../services/apiCropBatchService';
import { useAuthPermission } from '../../../hooks/usePermission';
import { useSeedSourceStore } from '../../../stores/useSeedSourceStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useToastStore } from '../../../stores/useToastStore';
import { enhancedApiClient } from '../../../lib/apiClient';
import { computeStockStatus } from '../../../lib/stockStatus';
import * as XLSX from 'xlsx';
import { showAlert, showConfirm } from '@/lib/dialogService';
// 2026-06-04: 移除 RefreshCw import（重算按钮已删除）

export default function SeedSourcePage() {
  // 2026-06-05: 跳转到繁殖过程记录全量查看页
  const navigate = useNavigate();
  // 权限检查 - 已取消，所有人可使用所有功能
  // const { can } = useAuthPermission();
  // 种源模块权限 - 已取消，直接设置为 true
  const canCreate = true;
  const canEdit = true;
  const canDelete = true;
  const canExport = true;
  const canPrint = true;

  // 从 Zustand Store 获取种源数据和操作方法
  const {
    items: seedSources,
    isLoading,
    loadItems,
    deleteItem,
    deleteItems,
    updateItem,
  } = useSeedSourceStore();

  // Toast 通知
  const toast = useToastStore((s) => s.toast);

  // 状态
  const [filters, setFilters] = useState<SeedSourceFilters>({
    cropCategory: '',
    cropName: '',
    seedCode: '',
    sourceType: '',
    supplierName: '',
    startDate: '',
    endDate: '',
    status: '',
    createBy: '',
    cropType: '',
    orgId: '',
    recorderId: '',
    surplusMin: undefined,
    surplusMax: undefined,
    propagationType: undefined,
    propagationStatus: undefined
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // 组件挂载时加载数据
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // 2026-06-04: status 改为实时计算，移除静默重算 useEffect（不再需要）

  // 弹窗状态
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<SeedSource | null>(null);
  const [currentImages, setCurrentImages] = useState<string[]>([]);

  // 导出状态
  const [exportMode, setExportMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showExportModal, setShowExportModal] = useState(false);

  // 操作模式状态（用于批量操作：编辑、删除、导出、打印）
  const [operationMode, setOperationMode] = useState<'normal' | 'edit' | 'delete' | 'export' | 'print'>('normal');

  // 打印模式状态
  const [printMode, setPrintMode] = useState(false);
  const [printRecords, setPrintRecords] = useState<SeedSource[]>([]);

  // 繁殖途径弹窗状态
  const [propagationRecordOpen, setPropagationRecordOpen] = useState(false);
  const [propagationStageOpen, setPropagationStageOpen] = useState(false);
  const [propagationRecord, setPropagationRecord] = useState<SeedSource | null>(null);

  // 留种初始化数据（从种植页面跳转来）
  const [seedSavingInit, setSeedSavingInit] = useState<{
    linkedPlantingId?: string;
    linkedPlantingCode?: string;
    cropName?: string;
  } | null>(null);

  // 处理从种植页面跳转来的留种请求
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'seed-saving') {
      const plantingId = params.get('plantingId') || '';
      const plantingCode = params.get('plantingCode') || '';
      const cropName = params.get('cropName') || '';
      setSeedSavingInit({ linkedPlantingId: plantingId, linkedPlantingCode: plantingCode, cropName });
      setAddModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // 筛选后的数据（按创建时间倒序，新数据在前）
  const filteredData = useMemo(() => {
    // 方案1.3: 记录人ID转名称（用于级联筛选）
    let recorderName = '';
    if (filters.recorderId) {
      const userStore = useUserStore.getState();
      const user = userStore.users.find((u: any) => (u.oid || u.id) === filters.recorderId);
      recorderName = user?.name || '';
    }

    const filtered = seedSources.filter(item => {
      if (filters.cropCategory && filters.cropCategory !== '__all__' && item.cropCategory !== filters.cropCategory) return false;
      if (filters.cropName && !item.cropName.includes(filters.cropName)) return false;
      // 方案1.3: 作物类型筛选（按cropCategory匹配）
      if (filters.cropType && filters.cropType !== '__all__' && item.cropCategory !== filters.cropType) return false;
      if (filters.seedCode && !item.seedCode.includes(filters.seedCode)) return false;
      if (filters.sourceType && filters.sourceType !== '__all__' && item.sourceType !== filters.sourceType) return false;
      if (filters.supplierName && filters.supplierName !== '__all__' && !item.supplierName.includes(filters.supplierName)) return false;
      // 2026-06-04: status 改为实时计算，筛选比较用 computeStockStatus
      if (filters.status && filters.status !== '__all__' && computeStockStatus(item.availableCount, item.initialCount) !== filters.status) return false;
      if (filters.startDate && item.purchaseDate < filters.startDate) return false;
      if (filters.endDate && item.purchaseDate > filters.endDate) return false;
      if (filters.createBy && !item.createBy.includes(filters.createBy)) return false;
      // 方案1.3: 记录人筛选
      if (recorderName && item.createBy !== recorderName) return false;
      // 方案1.3: 剩余数量范围筛选 (surplus = availableCount)
      if (filters.surplusMin !== undefined && item.availableCount < filters.surplusMin) return false;
      if (filters.surplusMax !== undefined && item.availableCount > filters.surplusMax) return false;
      // 繁殖途径筛选
      if (filters.propagationType) {
        const itemPropType = (item as any).propagationType || 'external';
        if (itemPropType !== filters.propagationType) return false;
      }
      if (filters.propagationStatus) {
        const itemPropStatus = (item as any).propagationStatus;
        if (itemPropStatus !== filters.propagationStatus) return false;
      }
      return true;
    });
    // 按创建时间倒序排列（最新的在前）
    return filtered.sort((a, b) => {
      const timeA = a.createTime ? new Date(a.createTime).getTime() : 0;
      const timeB = b.createTime ? new Date(b.createTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [filters, seedSources]);

  // 2026-06-05: 顶部统计卡片已删除（user 要求）

  // 处理搜索
  const handleSearch = () => {
    setPagination({ ...pagination, current: 1 });
  };

  // 处理重置
  const handleReset = () => {
    setFilters({
      cropCategory: '',
      cropName: '',
      seedCode: '',
      sourceType: '',
      supplierName: '',
      startDate: '',
      endDate: '',
      status: '',
      createBy: '',
      cropType: '',
      orgId: '',
      recorderId: '',
      surplusMin: undefined,
      surplusMax: undefined,
      propagationType: undefined,
      propagationStatus: undefined
    });
    setPagination({ ...pagination, current: 1 });
  };

  // 2026-06-04: handleRecalculateStatus 已删除，status 改为实时计算，无需手动重算

  // 处理新增
  const handleAdd = () => {
    setCurrentRecord(null);
    setAddModalOpen(true);
  };

  // 处理编辑
  const handleEdit = (record: SeedSource) => {
    setCurrentRecord(record);
    setEditModalOpen(true);
  };

  // 处理详情
  const handleDetail = (record: SeedSource) => {
    setCurrentRecord(record);
    setDetailModalOpen(true);
  };

  // 处理打印
  const handlePrint = (record: SeedSource) => {
    setCurrentRecord(record);
    setPrintModalOpen(true);
  };

  // 处理图片放大
  const handleImageClick = (images: string[]) => {
    setCurrentImages(images);
    setLightboxOpen(true);
  };

  // 处理删除（通过 Store，删除前检查关联引用）
  // 2026-06-04 升级：弹窗展示具体被哪些模块/记录引用，附"前往处理"按钮
  const handleDelete = async (ids: string[]) => {
    for (const id of ids) {
      try {
        const res = await enhancedApiClient.get<{
          deletable: boolean;
          references: Array<{
            module: string;
            moduleCode: string;
            id: string;
            code: string;
            cropName?: string;
            cropVariety?: string;
            date?: string;
            status?: string;
          }>;
        }>(`/seed-sources/${id}/check-deletable`);

        if (res && !res.deletable && res.references?.length) {
          const lines = res.references.slice(0, 10).map((r) => {
            const parts = [r.module, `「${r.code}」`];
            if (r.cropName) parts.push(r.cropName);
            if (r.cropVariety) parts.push(r.cropVariety);
            if (r.date) parts.push(r.date);
            if (r.status) parts.push(`状态:${r.status}`);
            return '  • ' + parts.join(' · ');
          });
          const more = res.references.length > 10 ? `\n  …及其他 ${res.references.length - 10} 条` : '';
          await showAlert(
            `该种源被 ${res.references.length} 条关联记录引用，无法删除：\n\n${lines.join('\n')}${more}\n\n请先到对应模块处理关联后再删除。`
          );
          return;
        }
      } catch { /* 降级策略：检查失败时允许继续删除 */ }
    }
    const success = await deleteItems(ids);
    if (success) {
      setSelectedRows([]);
    }
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    if (selectedRows.length === 0) {
      toast.warning('请先选择要删除的记录');
      return;
    }
    handleDelete(selectedRows);
  };

  // 处理结束计划
  const handleEnd = async (record: SeedSource, endType: 'normal' | 'abnormal') => {
    // 2026-06-05: 统一强结 — 不管有没有关联生产计划，都走强结逻辑
    // （生产计划存在时由用户选择联动结束或强结；查不到时直接强结）
    const hasPlan = !!record.productionPlanCode;
    let batch: Awaited<ReturnType<typeof cropBatchService.getCropBatchByCode>> | null = null;
    if (hasPlan) {
      batch = await cropBatchService.getCropBatchByCode(record.productionPlanCode!);
    }

    // 分支 1: 有生产计划且能找到 → 走原"结束生产计划"流程
    if (hasPlan && batch) {
      if (batch.batchStatus === 'completed') {
        await showAlert('该生产计划已完成结束，不能重复结束');
        return;
      }
      const completionRate = cropBatchService.getCompletionRate(batch, record.initialCount);
      const isNormal = endType === 'normal';
      const confirmMsg = isNormal
        ? `确认正常结束此生产计划？\n\n入库完成比例：${Math.round(completionRate * 100)}%\n结束后禁止一切入库和补录操作`
        : `确认异常结束此生产计划？\n\n入库完成比例：${Math.round(completionRate * 100)}%\n结束后如需补录，需提交审核申请`;

      if (!await showConfirm(confirmMsg)) return;

      const result = await cropBatchService.endCropBatch(batch.id, endType);
      if (result) {
        await showAlert(isNormal ? '生产计划已正常结束' : '生产计划已异常结束');
        await loadItems();
      } else {
        await showAlert('结束失败');
      }
      return;
    }

    // 分支 2: 没有生产计划 / 查不到 → 强结种源本身
    const isNormal = endType === 'normal';
    const reason = !hasPlan
      ? '该种源未关联生产计划。'
      : `未找到关联的生产计划 [${record.productionPlanCode}]，可能已被删除。`;
    const confirmed = await showConfirm(
      `${reason}\n是否${isNormal ? '正常' : '异常'}结束该种源订单？\n` +
      `（结束后将${hasPlan ? '解除生产计划关联并' : ''}记录结束标记）`
    );
    if (!confirmed) return;

    try {
      await updateItem(record.id, {
        endType,
        endTime: new Date().toISOString(),
        ...(hasPlan ? { productionPlanCode: null as unknown as string } : {}), // 有生产计划才清空
      });
      await showAlert(isNormal ? '种源订单已正常结束（强结）' : '种源订单已异常结束（强结）');
      await loadItems();
    } catch (e: any) {
      console.error('[强结失败]', e);
      await showAlert(`强结失败：${e?.message || String(e)}`);
    }
  };

  // 导出相关处理
  const handleExportClick = () => {
    setOperationMode('export');
    setExportMode(true);
    setSelectedRows([]);
  };

  const handleExportSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => item.id));
    }
  };

  const handleExportCancel = () => {
    setExportMode(false);
    setOperationMode('normal');
    setSelectedRows([]);
  };

  const handleExportClickConfirm = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  // 确认打印
  const handlePrintConfirm = (records: SeedSource[]) => {
    if (records.length === 0) {
      showAlert('请先选择要打印的记录');
      return;
    }
    setPrintRecords(records);
    setCurrentRecord(records[0]);
    setPrintModalOpen(true);
    setPrintMode(false);
    setSelectedRows([]);
  };

  // 处理繁殖过程记录
  const handlePropagationRecord = (record: SeedSource) => {
    setPropagationRecord(record);
    setPropagationRecordOpen(true);
  };

  // 处理繁殖阶段推进
  const handlePropagationStage = (record: SeedSource) => {
    setPropagationRecord(record);
    setPropagationStageOpen(true);
  };

  const handleConfirmExport = async () => {
    const selectedData = filteredData.filter(item => selectedRows.includes(item.id));

    // 导出表头（含图片列）
    const headers = ['种源图片', '种源批号', '种源类型', '作物类别', '作物品种', '品种路径', '供应商', '采购日期', '采购数量', '单位', '单价(元)', '总金额(元)', '初始数量', '可用数量', '库存状态', '溯源码', '创建人', '创建时间', '备注'];

    // 生成导出数据
    const exportData = selectedData.map(record => ({
      '种源图片': (record.pictures && record.pictures.length > 0) ? record.pictures[0] : '',
      '种源批号': record.seedCode,
      '种源类型': record.sourceType === SourceType.SEED ? '种子' :
                  record.sourceType === SourceType.SEEDLING ? '种苗/实生苗' :
                  record.sourceType === SourceType.CUTTING ? '扦插苗' :
                  record.sourceType === SourceType.GRAFTING ? '嫁接苗' :
                  record.sourceType === SourceType.TISSUE_CULTURE ? '组培苗' :
                  record.sourceType === SourceType.SPLIT ? '分株苗' :
                  record.sourceType === SourceType.BULB ? '种球/球根' :
                  record.sourceType === SourceType.SELF_PRODUCED ? '自繁苗' :
                  record.sourceType === SourceType.EXTERNAL ? '外购苗' : '其他',
      '作物类别': record.cropCategory,
      '作物品种（最细化）': record.cropName,
      '作物品种': record.cropVariety,
      '供应商': record.supplierName,
      '采购日期': record.purchaseDate,
      '采购数量': record.quantity,
      '单位': record.unit,
      '单价(元)': record.unitPrice,
      '总金额(元)': record.totalAmount,
      '初始数量': record.initialCount,
      '可用数量': record.availableCount,
      '库存状态': (() => {
        // 2026-06-04: 实时计算 status
        const live = computeStockStatus(record.availableCount, record.initialCount);
        return live === StockStatus.SUFFICIENT ? '充足' : live === StockStatus.LOW ? '不足' : '耗尽';
      })(),
      '溯源码': record.traceabilityCode || '',
      '创建人': record.createBy,
      '创建时间': record.createTime,
      '备注': record.remarks || ''
    }));

    const fileName = `种源管理_${new Date().toISOString().slice(0, 10)}.${exportFormat}`;

    try {
      if (exportFormat === 'xlsx') {
        // 使用 SheetJS 导出 xlsx（含图片列）
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData, { header: headers });
        // 设置图片列宽约 240px (30字符) + 行高
        ws['!cols'] = headers.map((h, i) => {
          if (h === '种源图片') return { wch: 30 }; // 图片列宽
          if (h === '备注') return { wch: 25 };
          return { wch: 15 };
        });
        XLSX.utils.book_append_sheet(wb, ws, '种源记录');
        XLSX.writeFile(wb, fileName);

        // 如果有图片数据，尝试嵌入base64图片（xlsx原生图片支持）
        selectedData.forEach((record, rowIdx) => {
          if (record.pictures && record.pictures.length > 0) {
            const imgData = record.pictures[0];
            if (imgData.startsWith('data:image/')) {
              try {
                // 将base64图片嵌入到单元格（通过xlsx cell comment方式存储URL）
                const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: 0 });
                if (ws[cellRef]) {
                  ws[cellRef].l = { Target: imgData }; // 存储为超链接
                }
              } catch { /* 图片嵌入失败不影响导出 */ }
            }
          }
        });
      } else if (exportFormat === 'csv') {
        const content = headers.join(',') + '\n' + exportData.map(row =>
          headers.map(h => `"${typeof row[h] === 'string' ? row[h].replace(/"/g, '""') : row[h] || ''}"`).join(',')
        ).join('\n');
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
        const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace('xlsx', 'xls');
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // logger.error('Export failed:', err);
      // 降级：xls格式
      const content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`).join('')}</table></body></html>`;
      const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `种源管理_${new Date().toISOString().slice(0, 10)}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    }

    setExportMode(false);
    setSelectedRows([]);
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6">
      {/* 标题卡片 */}
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">种源管理</h1>
              <p className="text-gray-500">管理种源批次、采购入库和库存记录</p>
            </div>
          </div>
          {/* 2026-06-05: 繁殖过程记录全量查看入口 — 2026-06-05 改蓝色背景 */}
          <div className="flex items-center gap-2">
            <Button
              variant="blue"
              onClick={() => navigate('/crop/propagation-records')}
            >
              <ClipboardList className="w-4 h-4 mr-1" />
              繁殖过程记录
            </Button>
          </div>
        </div>
      </div>

      {/* 2026-06-05: 顶部统计卡片已删除（user 要求） */}

      {/* 2026-06-04: 移除重算库存状态按钮，status 改为实时计算无需手动重算 */}
      <SeedSourceFilter
        filters={filters}
        onChange={setFilters}
        onSearch={handleSearch}
        onReset={handleReset}
        cropCategories={cropCategories}
        suppliers={suppliers}
        statusOptions={seedSourceStatusOptions}
      />

      {/* 数据表格 */}
      <SeedSourceTable
        data={filteredData}
        pagination={pagination}
        onChange={setPagination}
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
        onEdit={handleEdit}
        onDetail={handleDetail}
        onPrint={handlePrint}
        onDelete={handleDelete}
        onImageClick={handleImageClick}
        onEnd={handleEnd}
        onAdd={handleAdd}
        operationMode={operationMode}
        onOperationModeChange={setOperationMode}
        exportMode={exportMode}
        onExportSelectAll={handleExportSelectAll}
        onExportCancel={handleExportCancel}
        onConfirmExport={handleExportClickConfirm}
        printMode={printMode}
        onPrintModeChange={setPrintMode}
        onConfirmPrint={handlePrintConfirm}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canExport={canExport}
        canPrint={canPrint}
        onPropagationRecord={handlePropagationRecord}
        onPropagationStage={handlePropagationStage}
      />

      {/* 弹窗 */}
      <AddModal
        isOpen={addModalOpen}
        onClose={() => { setAddModalOpen(false); setSeedSavingInit(null); }}
        onSuccess={() => { loadItems(); setSeedSavingInit(null); }}
        units={units}
        seedSavingInit={seedSavingInit}
      />

      {currentRecord && (
        <EditModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={loadItems}
          record={currentRecord}
          suppliers={suppliers}
        />
      )}

      {currentRecord && (
        <DetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          record={currentRecord}
        />
      )}

      {currentRecord && (
        <PrintLabelModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          record={currentRecord}
        />
      )}

      <ImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={currentImages}
      />

      {/* 导出格式选择弹窗 */}
      <ExportFormatModal
        isOpen={showExportModal}
        exportFileType={exportFormat}
        onChange={setExportFormat}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
        selectedCount={selectedRows.length}
      />

      {/* 繁殖途径弹窗 */}
      <PropagationRecordModal
        isOpen={propagationRecordOpen}
        onClose={() => setPropagationRecordOpen(false)}
        record={propagationRecord}
        onSuccess={loadItems}
      />

      <PropagationStageModal
        isOpen={propagationStageOpen}
        onClose={() => setPropagationStageOpen(false)}
        record={propagationRecord}
        onSuccess={loadItems}
      />
    </div>
  );
}
