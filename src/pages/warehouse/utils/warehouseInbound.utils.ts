/**
 * 仓库入库工具函数
 * 从 WarehouseInboundPage 拆分出来，集中管理工具函数
 */

import { InboundRecord, InboundSearchFilters, CodeGenState, categoryConfig } from '../../../types/warehouseInbound.types';

/**
 * 编码生成函数
 * 根据选择的大类、中类、小类生成物料编码
 */
export const handleCodeGen = (
  codeGen: CodeGenState,
  setCodeGen: React.Dispatch<React.SetStateAction<CodeGenState>>,
  setCodeGenError: React.Dispatch<React.SetStateAction<string>>,
  setCodeGenSuccess: React.Dispatch<React.SetStateAction<string>>
) => {
  if (!codeGen.bigCategory || !codeGen.midCategory || !codeGen.subCategory) {
    setCodeGenError('请选择完整的分类');
    setCodeGenSuccess('');
    return;
  }
  const baseCode = `${codeGen.bigCategory}${codeGen.midCategory}${codeGen.subCategory}`;
  const seq = Math.floor(Math.random() * 999) + 1;
  const generatedCode = `${baseCode}${String(seq).padStart(3, '0')}`;
  setCodeGen(prev => ({ ...prev, generatedCode }));
  setCodeGenSuccess(`生成成功: ${generatedCode}`);
  setCodeGenError('');
};

/**
 * 复制编码到剪贴板
 */
export const copyToClipboard = (
  text: string,
  setCopySuccess: React.Dispatch<React.SetStateAction<boolean>>
) => {
  navigator.clipboard.writeText(text);
  setCopySuccess(true);
  setTimeout(() => setCopySuccess(false), 2000);
};

/**
 * 重置编码生成器状态
 */
export const resetCodeGen = (
  setCodeGen: React.Dispatch<React.SetStateAction<CodeGenState>>,
  setCodeGenError: React.Dispatch<React.SetStateAction<string>>,
  setCodeGenSuccess: React.Dispatch<React.SetStateAction<string>>
) => {
  setCodeGen({ bigCategory: '', midCategory: '', subCategory: '', generatedCode: '' });
  setCodeGenError('');
  setCodeGenSuccess('');
};

/**
 * 生成顺序入库单号
 */
export const generateSequentialOrderCode = (inboundRecords: InboundRecord[]): string => {
  const today = new Date().toISOString().split('T')[0];
  const todayPrefix = `RK${today.replace(/-/g, '')}-`;
  const todayRecords = inboundRecords.filter(r => r.code.startsWith(todayPrefix));

  let maxSeq = 0;
  todayRecords.forEach(r => {
    const seqStr = r.code.replace(todayPrefix, '');
    const seq = parseInt(seqStr, 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  });

  const newSeq = maxSeq + 1;
  if (newSeq > 9999) {
    return `${todayPrefix}ERR`;
  }

  return `${todayPrefix}${String(newSeq).padStart(4, '0')}`;
};

/**
 * 过滤入库记录
 */
export const filterInboundRecords = (
  records: InboundRecord[],
  filters: InboundSearchFilters
): InboundRecord[] => {
  return records.filter(record => {
    // 入库单号搜索
    if (filters.code && !record.code.toLowerCase().includes(filters.code.toLowerCase())) {
      return false;
    }
    // 供应商搜索
    if (filters.supplier && !record.supplier.toLowerCase().includes(filters.supplier.toLowerCase())) {
      return false;
    }
    // 状态搜索
    if (filters.status && record.status !== filters.status) {
      return false;
    }
    // 物料名称或编码搜索（匹配任意物料明细）
    if (filters.materialName || filters.materialCode) {
      const hasMatch = record.materials.some(m => {
        const nameMatch = !filters.materialName || (m.materialName && m.materialName.toLowerCase().includes(filters.materialName.toLowerCase()));
        const codeMatch = !filters.materialCode || (m.materialCode && m.materialCode.toLowerCase().includes(filters.materialCode.toLowerCase()));
        return nameMatch && codeMatch;
      });
      if (!hasMatch) return false;
    }
    return true;
  });
};

/**
 * 计算分页数据
 */
export const calculatePagination = (
  total: number,
  page: number,
  pageSize: number
) => {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  return { totalPages, startIdx, endIdx };
};

/**
 * 获取状态显示文本
 */
export const getStatusText = (status: string): string => {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'voided':
      return '已作废';
    case 'pending':
    default:
      return '待审核';
  }
};

/**
 * 获取状态样式类
 */
export const getStatusClassName = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'voided':
      return 'bg-gray-100 text-gray-500';
    case 'pending':
    default:
      return 'bg-amber-100 text-amber-700';
  }
};

/**
 * 判断是否全选
 */
export const isAllSelected = (
  displayedRecords: InboundRecord[],
  selectedRows: number[],
  deleteMode: boolean
): boolean => {
  if (deleteMode) {
    return displayedRecords.filter(r => r.status === 'pending').every(r => selectedRows.includes(r.id));
  }
  return displayedRecords.length > 0 && selectedRows.length === displayedRecords.length;
};

/**
 * 处理全选/取消全选
 */
export const handleSelectAll = (
  displayedRecords: InboundRecord[],
  selectedRows: number[],
  deleteMode: boolean,
  setSelectedRows: React.Dispatch<React.SetStateAction<number[]>>
) => {
  if (deleteMode) {
    const pendingIds = displayedRecords.filter(r => r.status === 'pending').map(r => r.id);
    const allPendingSelected = pendingIds.every(id => selectedRows.includes(id));
    if (allPendingSelected) {
      setSelectedRows(selectedRows.filter(id => !pendingIds.includes(id)));
    } else {
      setSelectedRows([...selectedRows.filter(id => !pendingIds.includes(id)), ...pendingIds]);
    }
  } else {
    if (selectedRows.length === displayedRecords.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(displayedRecords.map(r => r.id));
    }
  }
};

/**
 * 处理单行选择/取消选择
 */
export const handleSelectRow = (
  id: number,
  selectedRows: number[],
  setSelectedRows: React.Dispatch<React.SetStateAction<number[]>>
) => {
  if (selectedRows.includes(id)) {
    setSelectedRows(selectedRows.filter(r => r !== id));
  } else {
    setSelectedRows([...selectedRows, id]);
  }
};

/**
 * 取消选择模式
 */
export const handleCancelSelection = (
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>,
  setDeleteMode: React.Dispatch<React.SetStateAction<boolean>>,
  setExportMode: React.Dispatch<React.SetStateAction<boolean>>,
  setSelectedRows: React.Dispatch<React.SetStateAction<number[]>>
) => {
  setEditMode(false);
  setDeleteMode(false);
  setExportMode(false);
  setSelectedRows([]);
};

/**
 * 获取中类列表
 */
export const getMidCategories = (bigCategoryCode: string) => {
  const bigCat = categoryConfig[bigCategoryCode];
  if (!bigCat) return [];
  return Object.entries(bigCat.categories).map(([code, data]) => ({
    code,
    name: data.name,
  }));
};

/**
 * 获取小类列表
 */
export const getSubCategories = (bigCategoryCode: string, midCategoryCode: string) => {
  const bigCat = categoryConfig[bigCategoryCode];
  if (!bigCat) return [];
  const midCat = bigCat.categories[midCategoryCode];
  if (!midCat) return [];
  return Object.entries(midCat.subCategories).map(([code, data]) => ({
    code,
    name: data.name,
    prefix: data.prefix,
  }));
};
