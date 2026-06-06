/**
 * 采购计划页面状态 Hook (H-1 抽取)
 * 把 30 行 useState 集中到独立 hook，Page 主体可读性提升
 * 拆出来的状态：筛选 / 分页 / 模式 / 选中 / 弹窗可见
 * 表单 / 批量编辑 / 详情等"业务进行中"状态保留在 Page（避免过度拆分）
 */
import { useState } from 'react';

export function usePurchasePlanPageState() {
  // 筛选状态（9 个）
  const [relatedBatchCode, setRelatedBatchCode] = useState('');
  const [purchaseType, setPurchaseType] = useState('all');
  const [status, setStatus] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [applicant, setApplicant] = useState('');
  const [applicantDepartment, setApplicantDepartment] = useState('');
  const [priority, setPriority] = useState('all');
  const [requiredStartDate, setRequiredStartDate] = useState('');
  const [requiredEndDate, setRequiredEndDate] = useState('');

  // 分页（2 个）+ 模式（3 个）+ 选中（2 个）
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMode, setExportMode] = useState(false);
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState('excel');

  // 弹窗可见（7 个）
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showEditItemsExpanded, setShowEditItemsExpanded] = useState(false);
  const [batchSelectOpen, setBatchSelectOpen] = useState(false);

  return {
    // 筛选
    relatedBatchCode, setRelatedBatchCode,
    purchaseType, setPurchaseType,
    status, setStatus,
    alertFilter, setAlertFilter,
    applicant, setApplicant,
    applicantDepartment, setApplicantDepartment,
    priority, setPriority,
    requiredStartDate, setRequiredStartDate,
    requiredEndDate, setRequiredEndDate,
    // 分页
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    // 模式
    exportMode, setExportMode,
    batchEditMode, setBatchEditMode,
    batchDeleteMode, setBatchDeleteMode,
    // 选中
    selectedRows, setSelectedRows,
    exportFormat, setExportFormat,
    // 弹窗
    showDeleteModal, setShowDeleteModal,
    showExportModal, setShowExportModal,
    showCreateModal, setShowCreateModal,
    showDetailModal, setShowDetailModal,
    showBatchEditModal, setShowBatchEditModal,
    showEditItemsExpanded, setShowEditItemsExpanded,
    batchSelectOpen, setBatchSelectOpen,
  };
}

export type PurchasePlanPageState = ReturnType<typeof usePurchasePlanPageState>;
