/**
 * 库存总览页面
 * 数据来源：Zustand Store → enhancedApiClient → API
 * 三级降级：API → IndexedDB → localStorage
 */

import { useState, useMemo, useEffect } from 'react';
import { MaterialFilters, MaterialFiltersState, filterMaterials, Material } from '../../components/warehouse/MaterialFilters';
import { MaterialsTable } from '../../components/warehouse/MaterialsTable';
import { MaterialDetailModal } from '../../components/warehouse/MaterialDetailModal';
import { MaterialEditModal, MaterialDeleteConfirmModal } from '../../components/warehouse/MaterialEditModal';
import { MaterialBatchEditModal } from '../../components/warehouse/MaterialBatchEditModal';
import { BatchEditWarningModal } from '../../components/warehouse/BatchEditWarningModal';
import { DeleteWarningDialog } from '../../components/warehouse/DeleteWarningDialog';
import { BatchDeleteConfirmDialog } from '../../components/warehouse/BatchDeleteConfirmDialog';
import { MaterialExportModal } from '../../components/warehouse/MaterialExportModal';
import PageHeader from '../../components/warehouse/PageHeader';
import ActionToolbar from '../../components/warehouse/ActionToolbar';
import { useWarehouseMaterialStore } from '../../stores';

const categoryConfig: Record<string, { name: string; categories: Record<string, { name: string; subCategories: Record<string, { name: string; prefix: string }> }> }> = {
  'SP': { name: '生产投入类', categories: {
    '01': { name: '种质资源', subCategories: {
      '01': { name: '粮食作物种子', prefix: 'SP0101' },
      '02': { name: '经济作物种子', prefix: 'SP0102' },
      '03': { name: '蔬菜种子', prefix: 'SP0103' },
      '04': { name: '蔬菜种苗', prefix: 'SP0104' },
      '05': { name: '水果苗木种苗', prefix: 'SP0105' },
      '06': { name: '水果苗木种子', prefix: 'SP0106' },
      '07': { name: '花卉与观赏植物', prefix: 'SP0107' },
      '08': { name: '食用菌菌种', prefix: 'SP0108' },
      '99': { name: '其他种质资源', prefix: 'SP0199' },
    }},
    '02': { name: '肥料与土壤改良剂', subCategories: {
      '01': { name: '有机肥', prefix: 'SP0201' },
      '02': { name: '化学肥料', prefix: 'SP0202' },
      '03': { name: '水溶肥', prefix: 'SP0203' },
      '04': { name: '叶面肥', prefix: 'SP0204' },
      '05': { name: '微生物菌剂', prefix: 'SP0205' },
      '06': { name: '土壤调理剂', prefix: 'SP0206' },
      '07': { name: '育苗基质', prefix: 'SP0207' },
      '99': { name: '其他类型', prefix: 'SP0299' },
    }},
    '03': { name: '农药与植保产品', subCategories: {
      '01': { name: '杀虫剂', prefix: 'SP0301' },
      '02': { name: '杀菌剂', prefix: 'SP0302' },
      '03': { name: '杀螨剂', prefix: 'SP0303' },
      '04': { name: '除草剂', prefix: 'SP0304' },
      '05': { name: '植物生长调节剂', prefix: 'SP0305' },
      '06': { name: '物理防控用品', prefix: 'SP0306' },
      '07': { name: '生物农药', prefix: 'SP0307' },
      '99': { name: '其他类型', prefix: 'SP0399' },
    }},
  }},
  'EQ': { name: '设施与装备类', categories: {
    '01': { name: '农业机械', subCategories: {
      '01': { name: '耕作机械', prefix: 'EQ0101' },
      '02': { name: '播种/移栽设备', prefix: 'EQ0102' },
      '03': { name: '植保机械', prefix: 'EQ0103' },
      '04': { name: '收获机械', prefix: 'EQ0104' },
      '05': { name: '初加工设备', prefix: 'EQ0105' },
      '99': { name: '其他相关机械', prefix: 'EQ0199' },
    }},
    '02': { name: '设施农业系统', subCategories: {
      '01': { name: '骨架结构材料', prefix: 'EQ0201' },
      '02': { name: '覆盖材料', prefix: 'EQ0202' },
      '03': { name: '通风降温设备', prefix: 'EQ0203' },
      '04': { name: '加温设备', prefix: 'EQ0204' },
      '05': { name: '补光系统', prefix: 'EQ0205' },
      '06': { name: '自动化控制设备', prefix: 'EQ0206' },
      '99': { name: '其他相关设施设备', prefix: 'EQ0299' },
    }},
    '03': { name: '灌溉与水肥系统', subCategories: {
      '01': { name: '水源与泵站', prefix: 'EQ0301' },
      '02': { name: '水肥一体机', prefix: 'EQ0302' },
      '03': { name: '输水管网', prefix: 'EQ0303' },
      '04': { name: '过滤系统', prefix: 'EQ0304' },
      '05': { name: '施肥装置', prefix: 'EQ0305' },
      '06': { name: '灌溉终端', prefix: 'EQ0306' },
      '99': { name: '其他相关灌溉系统设备', prefix: 'EQ0399' },
    }},
  }},
  'OP': { name: '作业支持类', categories: {
    '01': { name: '劳保与防护用品', subCategories: {
      '01': { name: '手部防护', prefix: 'OP0101' },
      '02': { name: '足部防护', prefix: 'OP0102' },
      '03': { name: '身体防护', prefix: 'OP0103' },
      '04': { name: '呼吸/眼部防护', prefix: 'OP0104' },
      '05': { name: '防晒防暑用品', prefix: 'OP0105' },
      '99': { name: '其他劳保防护类', prefix: 'OP0199' },
    }},
    '02': { name: '日常劳动工具', subCategories: {
      '01': { name: '手动农具', prefix: 'OP0201' },
      '02': { name: '修剪工具', prefix: 'OP0202' },
      '03': { name: '小型电动工具', prefix: 'OP0203' },
      '04': { name: '清洁工具', prefix: 'OP0204' },
      '05': { name: '小型运输车', prefix: 'OP0205' },
      '99': { name: '其他劳动工具', prefix: 'OP0299' },
    }},
    '03': { name: '标识与记录用品', subCategories: {
      '01': { name: '田间标牌/标签', prefix: 'OP0301' },
      '02': { name: '记录本、记号笔', prefix: 'OP0302' },
      '03': { name: '二维码/RFID标签', prefix: 'OP0303' },
      '99': { name: '其他标识记录用品', prefix: 'OP0399' },
    }},
  }},
  'PH': { name: '采后处理与流通类', categories: {
    '01': { name: '采收容器', subCategories: {
      '01': { name: '塑料周转箱', prefix: 'PH0101' },
      '02': { name: '采摘篮/筐', prefix: 'PH0102' },
      '03': { name: '吨袋/编织袋', prefix: 'PH0103' },
      '04': { name: '包装材料', prefix: 'PH0104' },
      '05': { name: '纸箱', prefix: 'PH0105' },
      '06': { name: '泡沫网套/隔板', prefix: 'PH0106' },
      '07': { name: '胶带、封口耗材', prefix: 'PH0107' },
      '08': { name: '商品标签/追溯标签', prefix: 'PH0108' },
      '99': { name: '其他采收材料', prefix: 'PH0199' },
    }},
    '02': { name: '冷链与仓储设备', subCategories: {
      '01': { name: '预冷库/冷藏库', prefix: 'PH0201' },
      '02': { name: '冷藏运输设备', prefix: 'PH0202' },
      '03': { name: '保温箱、冰袋', prefix: 'PH0203' },
      '99': { name: '其他', prefix: 'PH0299' },
    }},
  }},
  'IT': { name: '数字化与管理类', categories: {
    '01': { name: '监测设备', subCategories: {
      '01': { name: '空气/土壤/光照等传感器', prefix: 'IT0101' },
      '02': { name: '手持检测类设备', prefix: 'IT0102' },
      '03': { name: '气象站', prefix: 'IT0103' },
      '04': { name: '虫情测报灯', prefix: 'IT0104' },
      '05': { name: '视频监控设备', prefix: 'IT0105' },
      '99': { name: '其他检测相关设备', prefix: 'IT0199' },
    }},
    '02': { name: '控制设备', subCategories: {
      '01': { name: '环境参数感知设备', prefix: 'IT0201' },
      '02': { name: '执行控制设备', prefix: 'IT0202' },
      '03': { name: '人机交互与本地操作设备', prefix: 'IT0203' },
      '04': { name: '通信与联网设备', prefix: 'IT0204' },
      '05': { name: '电源与辅助控制设备', prefix: 'IT0205' },
      '99': { name: '其他相关控制设备', prefix: 'IT0299' },
    }},
    '03': { name: '软件与服务', subCategories: {
      '01': { name: 'ERP模块许可', prefix: 'IT0301' },
      '02': { name: '温室大棚控制系统web', prefix: 'IT0302' },
      '03': { name: '温室大棚控制系统小程序', prefix: 'IT0303' },
      '04': { name: '数据分析服务', prefix: 'IT0304' },
      '05': { name: '产品检测服务', prefix: 'IT0305' },
      '99': { name: '其他软件与服务', prefix: 'IT0399' },
    }},
  }},
  'EC': { name: '能源与通用耗材', categories: {
    '01': { name: '能源类', subCategories: {
      '01': { name: '柴油/汽油', prefix: 'EC0101' },
      '02': { name: '电力', prefix: 'EC0102' },
      '03': { name: '太阳能板及配件', prefix: 'EC0103' },
      '99': { name: '其他能源类', prefix: 'EC0199' },
    }},
    '02': { name: '通用耗材', subCategories: {
      '01': { name: '电线、电缆', prefix: 'EC0201' },
      '02': { name: '扎带、螺丝、密封胶', prefix: 'EC0202' },
      '03': { name: '电池', prefix: 'EC0203' },
      '04': { name: '润滑油、润滑脂', prefix: 'EC0204' },
      '99': { name: '其他耗材', prefix: 'EC0299' },
    }},
  }},
  'OT': { name: '其他类', categories: {
    '01': { name: '未分类资材', subCategories: {
      '01': { name: '其他未分类资材', prefix: 'OT0101' },
    }},
  }},
};

export default function WarehouseOverviewPage() {
  // Zustand Store 数据
  const { items: allMaterials, isLoading, loadItems, addItem, updateItem, deleteItem, deleteItems } = useWarehouseMaterialStore();

  // 初始化加载
  useEffect(() => { loadItems(); }, [loadItems]);

  // 筛选状态
  const [filters, setFilters] = useState<MaterialFiltersState>({
    code: '', name: '', category: '全部', supplier: '', location: '',
    searchBigCategory: '', searchMidCategory: '', searchSubCategory: '', showLowStock: false,
  });

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 选择/模式状态
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);

  // 筛选数据
  const filteredMaterials = useMemo(() => filterMaterials(allMaterials, filters), [allMaterials, filters]);

  // 低库存数量
  const lowStockCount = useMemo(() => allMaterials.filter(m => m.quantity < m.minStock).length, [allMaterials]);

  // 选择操作
  const handleSelectAll = () => {
    if (selectedRows.length === filteredMaterials.length) setSelectedRows([]);
    else setSelectedRows(filteredMaterials.map(m => m.id));
  };
  const handleSelectRow = (id: number) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };
  const handleCancelSelection = () => {
    setExportMode(false); setBatchEditMode(false); setDeleteMode(false); setSelectedRows([]);
  };

  // UI 状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchEditWarning, setShowBatchEditWarning] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [batchEditedMaterials, setBatchEditedMaterials] = useState<Record<number, any>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // 筛选变化
  const handleFiltersChange = (newFilters: MaterialFiltersState) => {
    setFilters(newFilters); setCurrentPage(1);
  };

  // 删除操作（通过Store调用API）
  const handleConfirmDelete = async (id: number) => {
    await deleteItem(id);
    await loadItems();
  };

  const handleBatchDelete = async (ids: number[]) => {
    await deleteItems(ids);
    await loadItems();
  };

  // 导出处理
  const handleDoExport = async () => {
    const selectedData = filteredMaterials.filter(m => selectedRows.includes(m.id));
    const headers = ['物料编码', '物料名称', '分类', '规格', '单位', '库存数量', '最低库存', '最高库存', '单价', '供应商', '存放位置', '数据状态'];
    const rows = selectedData.map(m => [
      m.code, m.name, m.category, m.specification, m.unit,
      m.quantity, m.minStock, m.maxStock, m.price, m.supplier, m.location, m.dataStatus
    ]);
    let content = `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    rows.forEach(row => { content += `<tr>${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}</tr>`; });
    content += '</table></body></html>';
    const mimeType = 'application/vnd.ms-excel;charset=utf-8';
    const fileName = `物料汇总表_${new Date().toISOString().slice(0, 10)}.xls`;
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ accept: { [mimeType]: ['.xls'] } }] });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
      }
    }
    setShowExportModal(false); setExportMode(false); setSelectedRows([]);
  };

  // 查看/编辑/删除操作
  const handleView = (material: Material) => { setSelectedMaterial(material); setShowDetailModal(true); };
  const handleEdit = (material: Material) => { setSelectedMaterial(material); setShowEditModal(true); };
  const handleDelete = (material: Material) => { setSelectedMaterial(material); setShowDeleteModal(true); };

  const handleConfirmDeleteAction = () => {
    if (selectedMaterial) handleConfirmDelete(selectedMaterial.id);
    setShowDeleteModal(false); setSelectedMaterial(null);
  };

  const handleSaveEdit = async (material: Material) => {
    await updateItem(material.id, material);
    await loadItems();
    setShowEditModal(false); setSelectedMaterial(null);
  };

  // ActionToolbar callbacks
  const handleLowStockToggle = () => handleFiltersChange({ ...filters, showLowStock: !filters.showLowStock });
  const handleBatchEditClick = () => setShowBatchEditWarning(true);
  const handleDeleteWarning = () => setShowDeleteWarning(true);
  const handleExport = () => { setExportMode(true); setSelectedRows([]); };
  const handleConfirmBatchEdit = () => {
    if (selectedRows.length === 1) {
      const material = filteredMaterials.find(m => m.id === selectedRows[0]);
      if (material) { setSelectedMaterial(material); setShowEditModal(true); setBatchEditMode(false); setSelectedRows([]); }
    } else { setShowBatchEditModal(true); }
  };
  const handleCancelBatchEdit = () => { setBatchEditMode(false); setSelectedRows([]); };
  const handleConfirmBatchDeleteAction = () => { setShowBatchDeleteConfirm(true); };
  const handleCancelDeleteAction = () => { setDeleteMode(false); setSelectedRows([]); };
  const handleConfirmExportClick = () => setShowExportModal(true);
  const handleCancelExportAction = () => { setExportMode(false); setSelectedRows([]); };

  // 批量删除确认
  const handleBatchDeleteConfirm = () => {
    handleBatchDelete(selectedRows);
    setShowBatchDeleteConfirm(false); setDeleteMode(false); setSelectedRows([]);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="库存总览" subtitle="仓库物料库存总览" />

      <MaterialFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        lowStockCount={lowStockCount}
        onLowStockClick={handleLowStockToggle}
        categoryConfig={categoryConfig}
      />

      <ActionToolbar
        title="物料汇总表"
        batchEditMode={batchEditMode}
        deleteMode={deleteMode}
        exportMode={exportMode}
        selectedRows={selectedRows}
        lowStockCount={lowStockCount}
        filters={filters}
        onLowStockToggle={handleLowStockToggle}
        onBatchEdit={handleBatchEditClick}
        onDelete={handleDeleteWarning}
        onExport={handleExport}
        onConfirmBatchEdit={handleConfirmBatchEdit}
        onCancelBatchEdit={handleCancelBatchEdit}
        onConfirmDelete={handleConfirmBatchDeleteAction}
        onCancelDelete={handleCancelDeleteAction}
        onConfirmExport={handleConfirmExportClick}
        onCancelExport={handleCancelExportAction}
      />

      <MaterialsTable
        materials={filteredMaterials}
        currentPage={currentPage}
        pageSize={pageSize}
        selectedRows={selectedRows}
        exportMode={exportMode}
        batchEditMode={batchEditMode}
        deleteMode={deleteMode}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCancelSelection={handleCancelSelection}
        onConfirmExport={handleConfirmExportClick}
      />

      <MaterialDetailModal
        material={selectedMaterial}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />

      <MaterialEditModal
        material={selectedMaterial}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
      />

      <MaterialDeleteConfirmModal
        material={selectedMaterial}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDeleteAction}
      />

      <DeleteWarningDialog
        isOpen={showDeleteWarning}
        onClose={() => setShowDeleteWarning(false)}
        onConfirm={() => {
          setShowDeleteWarning(false);
          setDeleteMode(true);
        }}
      />

      <BatchDeleteConfirmDialog
        isOpen={showBatchDeleteConfirm}
        selectedMaterials={filteredMaterials.filter(m => selectedRows.includes(m.id))}
        onClose={() => { setShowBatchDeleteConfirm(false); setDeleteMode(false); setSelectedRows([]); }}
        onConfirm={handleBatchDeleteConfirm}
      />

      <MaterialBatchEditModal
        isOpen={showBatchEditModal}
        selectedRows={selectedRows}
        filteredMaterials={filteredMaterials}
        batchEditedMaterials={batchEditedMaterials}
        currentBatchEditIndex={currentBatchEditIndex}
        onClose={() => { setShowBatchEditModal(false); setBatchEditedMaterials({}); setCurrentBatchEditIndex(0); }}
        onMaterialSelect={(idx) => setCurrentBatchEditIndex(idx)}
        onFieldChange={(materialId, field, value) => {
          const currentMaterial = filteredMaterials.find(m => m.id === materialId);
          const currentData = batchEditedMaterials[materialId] || currentMaterial || {};
          setBatchEditedMaterials({
            ...batchEditedMaterials,
            [materialId]: { ...currentData, [field]: value }
          });
        }}
        onSaveAll={() => {
          setShowBatchEditModal(false);
          setBatchEditMode(false);
          setSelectedRows([]);
          setBatchEditedMaterials({});
          setCurrentBatchEditIndex(0);
        }}
        onNext={() => {
          const nextIndex = currentBatchEditIndex + 1;
          if (nextIndex < selectedRows.length) {
            setCurrentBatchEditIndex(nextIndex);
          } else {
            setCurrentBatchEditIndex(0);
          }
        }}
      />

      <BatchEditWarningModal
        isOpen={showBatchEditWarning}
        selectedCount={selectedRows.length}
        onClose={() => setShowBatchEditWarning(false)}
        onConfirm={() => {
          setShowBatchEditWarning(false);
          setBatchEditMode(true);
        }}
      />

      <MaterialExportModal
        isOpen={showExportModal}
        selectedCount={selectedRows.length}
        exportFormat={exportFormat}
        onClose={() => setShowExportModal(false)}
        onFormatChange={setExportFormat}
        onExport={handleDoExport}
      />
    </div>
  );
}
