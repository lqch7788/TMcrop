import { useState } from 'react';
import { ClipboardList, Search, Download, Eye, Edit, ChevronLeft, ChevronRight, Trash2, ChevronDown, ChevronRight as ChevronRightIcon, Plus, AlertTriangle, X, ClipboardCheck, BarChart3, DollarSign, FileText, RefreshCw, TrendingUp, TrendingDown, Package, MapPin, Calendar, BarChart2 } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import * as XLSX from 'xlsx';

// 类型导入
import { MaterialItem, ExecuteMaterialItem, MaterialReceivingRecord } from '../types/materialReceiving';
import { Approval, ApprovalType, ApprovalStatus } from '../types/approval';
import { useApprovalContext } from '../contexts/ApprovalContext';

// 从数据文件导入所有Mock数据
import {
  materialReceivingDetails,
  materialExecuteDetails,
  monthlyStatisticsData,
  materialStatisticsData,
  departmentStatisticsData,
  greenhouseStatisticsData,
  fieldStatisticsData,
  batchStatisticsData,
  CATEGORY_COLORS,
  categorySummaryData,
  categoryTrendData,
  trendChartData,
  departmentPieData,
  categoryPieData,
  getCategoryByCode,
  getMonthCategoryData,
  getMonthSummary,
  getMonthSummaries,
  getMonthDetails,
  getYearTotalQuantity,
  getYearTotalAmount,
  getSingleMonthTableData,
  getSingleMonthTotal,
} from '../data/materialReceivingData';

// 弹窗组件
import { ExportTypeModal } from '../components/materialReceiving/modals/ExportTypeModal';
import { DetailModal } from '../components/materialReceiving/modals/DetailModal';
import { EditModal } from '../components/materialReceiving/modals/EditModal';
import { AddModal } from '../components/materialReceiving/modals/AddModal';
import { UserSelect } from '../components/common/settings/UserSelect';
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

export default function MaterialReceiving() {
  // 领料申请数据状态化（支持 CRUD 操作）
  const [materialData, setMaterialData] = useState<MaterialReceivingRecord[]>(materialReceivingDetails);

  // 获取审批上下文（用于联动）
  const approvalContext = useApprovalContext();

  const [activeTab, setActiveTab] = useState('application');

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
        <ApplicationTab materialData={materialData} setMaterialData={setMaterialData} />
      </div>

      {/* 领料出库 Tab内容 */}
      <div className={activeTab === 'execute' ? '' : 'hidden'}>
        <ExecuteTab materialData={materialData} />
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
