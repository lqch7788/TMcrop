import { useState } from 'react';
import { ClipboardList, FileText, ClipboardCheck, BarChart3, DollarSign } from 'lucide-react';

// 类型导入
import { MaterialItem, MaterialReceivingRecord } from '../types/materialReceiving';
import { useApprovalContext } from '../contexts/ApprovalContext';

// 从数据文件导入所有Mock数据
import {
  materialReceivingDetails,
  CATEGORY_COLORS,
  categorySummaryData,
  categoryTrendData,
  trendChartData,
  departmentPieData,
  categoryPieData,
} from '../data/materialReceivingData';

// TanStack Query Hooks - V1.2 架构
import { useMaterialRequests, useMergedMaterialRequests, useRefreshMaterialRequests } from '../hooks/useMaterialRequestQueries';

// 弹窗组件
import { ExportTypeModal } from '../components/materialReceiving/modals/ExportTypeModal';
import { DetailModal } from '../components/materialReceiving/modals/DetailModal';
import { EditModal } from '../components/materialReceiving/modals/EditModal';
import { AddModal } from '../components/materialReceiving/modals/AddModal';
import { DeleteConfirm } from '../components/materialReceiving/modals/DeleteConfirm';
import { VoidModal } from '../components/materialReceiving/modals/VoidModal';
import { BatchEditModal } from '../components/materialReceiving/modals/BatchEditModal';
import { ExecuteBatchEditModal } from '../components/materialReceiving/modals/ExecuteBatchEditModal';
import { EditWarningModal } from '../components/materialReceiving/modals/EditWarningModal';
import { DeleteWarningModal } from '../components/materialReceiving/modals/DeleteWarningModal';
import { BatchDeleteConfirmModal } from '../components/materialReceiving/modals/BatchDeleteConfirmModal';
import { ExecuteEditWarningModal } from '../components/materialReceiving/modals/ExecuteEditWarningModal';
import { ExecuteDeleteWarningModal } from '../components/materialReceiving/modals/ExecuteDeleteWarningModal';
import { ExecuteBatchDeleteConfirmModal } from '../components/materialReceiving/modals/ExecuteBatchDeleteConfirmModal';
import { ExecuteDetailModal } from '../components/materialReceiving/modals/ExecuteDetailModal';
import { ExecuteAddModal } from '../components/materialReceiving/modals/ExecuteAddModal';
import { ExecuteEditModal } from '../components/materialReceiving/modals/ExecuteEditModal';
import { StatDetailModal } from '../components/materialReceiving/modals/StatDetailModal';
import { StatSearchBar } from '../components/materialReceiving/stats/StatSearchBar';

// 成本核算Tab组件
import CostTab from '../components/materialReceiving/tabs/CostTab';

// 领料统计Tab组件
import StatisticsTab from './material/tabs/StatisticsTab';
// 领料申请Tab组件
import ApplicationTab from './material/tabs/ApplicationTab';
// 领料出库Tab组件
import ExecuteTab from './material/tabs/ExecuteTab';

// 物料申请 API 服务类型
import type { MaterialRequestRecord } from '../services/apiMaterialRequestService';

// 将后端数据转换为前端格式（后端返回驼峰格式）
function mapBackendToFrontend(records: MaterialRequestRecord[]): MaterialReceivingRecord[] {
  return records.map((r) => ({
    id: r.requestCode ? hashCode(r.requestCode) : hashCode(r.id),
    code: r.requestCode || r.id,
    date: r.applyDate || '',
    applicant: r.applicantName || '',
    department: r.departmentName || '',
    warehouseLocation: r.warehouseName || '',
    plantArea: (r as any).plantArea || '',
    reviewer: '',
    productionBatchCode: (r as any).productionBatchCode || '',
    status: r.approvalStatus === 'approved' ? '已审批' : r.approvalStatus === 'rejected' ? '已拒绝' : r.approvalStatus === 'pending' ? '待审批' : (r as any).status || '待审批',
    statusClass: r.approvalStatus === 'approved' ? 'approved' : r.approvalStatus === 'rejected' ? 'rejected' : r.approvalStatus === 'pending' ? 'pending' : 'pending',
    materials: (r.materials || []) as MaterialItem[],
  }));
}

// 简单的哈希函数，用于生成稳定的数字ID
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export default function MaterialReceiving() {
  // 获取审批上下文（用于联动）
  const approvalContext = useApprovalContext();

  const [activeTab, setActiveTab] = useState('application');

  // V1.2 架构：使用 TanStack Query 获取数据，自动降级
  const { data: apiData, isLoading, error, refetch } = useMaterialRequests({ limit: 100 });
  const refreshData = useRefreshMaterialRequests();

  // 本地状态管理，用于 ApplicationTab 的数据更新
  const [localData, setLocalData] = useState<MaterialReceivingRecord[]>([]);

  // 合并后端数据与 Mock 种子数据（包含本地新增的数据）
  // 排序优先级：本地新增 > 后端数据 > Mock种子数据
  const mergedData = (() => {
    const mapped = mapBackendToFrontend(apiData || []);
    // 使用 code 作为 key 来去重，本地新增的记录会覆盖已存在的记录
    const codeMap = new Map<string, MaterialReceivingRecord>();
    // 先添加 Mock 数据（种子数据）
    materialReceivingDetails.forEach(item => codeMap.set(item.code, item));
    // 后端数据覆盖 Mock 数据
    mapped.forEach(item => codeMap.set(item.code, item));
    // 本地新增的数据覆盖后端数据（确保最新添加的显示在最前面）
    localData.forEach(item => codeMap.set(item.code, item));
    // 转换为数组后排序：本地新增的排在最前面
    const result = Array.from(codeMap.values());
    // 按日期倒序 + 本地新增优先的排序
    return result.sort((a, b) => {
      // 本地新增的记录（code 以 MR 或 LL 开头且包含时间戳特征）优先显示
      const aIsLocal = a.code && (a.code.startsWith('MR') || a.code.startsWith('LL')) && a.code.length > 15;
      const bIsLocal = b.code && (b.code.startsWith('MR') || b.code.startsWith('LL')) && b.code.length > 15;
      if (aIsLocal && !bIsLocal) return -1;
      if (!aIsLocal && bIsLocal) return 1;
      // 都是本地新增或都不是，按日期倒序
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  })();

  // loading 状态
  const loading = isLoading;

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">生产领料</h1>
            <p className="text-gray-500">生产领料记录管理</p>
          </div>
          {loading && <span className="ml-auto text-sm text-gray-500">加载中...</span>}
          {error && <span className="ml-auto text-sm text-red-500">加载失败</span>}
          {!loading && !error && (
            <button
              onClick={() => refreshData()}
              className="ml-auto text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              刷新数据
            </button>
          )}
        </div>
      </div>

      {/* Tab切换区域 - 顶部标签页样式 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 pt-6 pb-0 mb-4">
        <div className="flex gap-8 border-b border-gray-200">
          {[
            { key: 'application', label: '申请领料', icon: FileText },
            { key: 'execute', label: '领料出库', icon: ClipboardCheck },
            { key: 'statistics', label: '领料统计', icon: BarChart3 },
            { key: 'cost', label: '成本核算', icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 text-base font-semibold transition-all relative ${
                activeTab === tab.key
                  ? 'text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

    {/* Tab内容区域 */}
    <div>
      {/* 领料申请 Tab内容 */}
      <div className={activeTab === 'application' ? '' : 'hidden'}>
        <ApplicationTab materialData={mergedData} setMaterialData={setLocalData} />
      </div>

      {/* 领料出库 Tab内容 */}
      <div className={activeTab === 'execute' ? '' : 'hidden'}>
        <ExecuteTab materialData={mergedData} />
      </div>

      {/* 领料统计 Tab内容 */}
      <div className={activeTab === 'statistics' ? '' : 'hidden'}>
        <StatisticsTab />
      </div>

      {/* 成本核算 Tab内容 */}
      <div className={activeTab === 'cost' ? '' : 'hidden'}>
        <CostTab />
      </div>
      </div>
    </div>
  );
}
