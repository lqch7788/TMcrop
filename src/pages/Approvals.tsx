import { useState } from 'react';
import { Search, CheckCircle, XCircle, Clock, ChevronRight, Filter, AlertTriangle } from 'lucide-react';
import { approvals } from '../data/mockData';
import { PartialApprovalModal } from '../components/approvals/PartialApprovalModal';

export default function Approvals() {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialApproval, setPartialApproval] = useState<any>(null);
  const [partialQuantities, setPartialQuantities] = useState<Record<string, number>>({});
  const [approvalList, setApprovalList] = useState([...approvals]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const filteredApprovals = approvalList.filter(a => {
    const matchTab = activeTab === 'all' || a.status === activeTab;
    const matchSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.applicantName.includes(searchTerm);
    return matchTab && matchSearch;
  });

  const handleApprove = (id: number) => {
    setApprovalList(approvalList.map(a =>
      a.id === id ? { ...a, status: 'approved' } : a
    ));
  };

  const handleReject = (id: number) => {
    setApprovalList(approvalList.map(a =>
      a.id === id ? { ...a, status: 'rejected' } : a
    ));
  };

  const handlePartialApprove = (approval: any) => {
    // 初始化部分数量为申请数量
    const initialQuantities: Record<string, number> = {};
    if (approval.materials) {
      approval.materials.forEach((mat: any) => {
        initialQuantities[mat.materialCode] = mat.requestedQuantity;
      });
    }
    setPartialApproval(approval);
    setPartialQuantities(initialQuantities);
    setShowPartialModal(true);
  };

  const confirmPartialApprove = () => {
    if (!partialApproval) return;

    // 计算哪些物料数量不足
    const insufficientMaterials: any[] = [];
    const updatedMaterials = partialApproval.materials?.map((mat: any) => {
      const actualQty = partialQuantities[mat.materialCode] || 0;
      if (actualQty < mat.requestedQuantity) {
        insufficientMaterials.push({
          ...mat,
          requestedQuantity: mat.requestedQuantity - actualQty,
          actualQuantity: 0
        });
      }
      return { ...mat, actualQuantity: actualQty };
    }) || [];

    // 更新当前单据为部分执行
    const updatedApproval = {
      ...partialApproval,
      status: 'partial',
      materials: updatedMaterials,
      title: partialApproval.title + ' [部分执行]'
    };

    let newList = approvalList.map(a =>
      a.id === partialApproval.id ? updatedApproval : a
    );

    // 如果有不足的物料，创建新的待审批单据
    if (insufficientMaterials.length > 0) {
      const newId = Date.now();
      const newApproval = {
        ...partialApproval,
        id: newId,
        status: 'pending',
        title: '【自动生成】' + partialApproval.title + ' [补货后待审批]',
        materials: insufficientMaterials,
        currentStep: 1
      };
      newList = [...newList, newApproval];
    }

    setApprovalList(newList);
    setShowPartialModal(false);
    setPartialApproval(null);
    setPartialQuantities({});
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">审批中心</h1>
            <p className="text-gray-500">管理各类审批单据</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl p-1 inline-flex shadow-sm">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === tab ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {tab === 'pending' ? '待审批' : tab === 'approved' ? '已通过' : tab === 'rejected' ? '已拒绝' : '全部'}
            {tab === 'pending' && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{approvalList.filter(a => a.status === 'pending').length}</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索审批单标题、申请人..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Approval List */}
      <div className="space-y-3">
        {filteredApprovals.map(approval => (
          <div key={approval.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {getStatusIcon(approval.status)}
                <div>
                  <h3 className="font-semibold text-gray-900">{approval.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {approval.applicantName} · {approval.applicantDepartment} · {approval.applyDate}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">{approval.typeName}</span>
                    <span className="text-xs text-gray-400">审批进度：{approval.currentStep}/{approval.totalSteps}</span>
                  </div>
                </div>
              </div>
              <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1">
                查看详情 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {approval.status === 'pending' && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => handleApprove(approval.id)}
                  className="h-10 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                >
                  通过
                </button>
                <button
                  onClick={() => handlePartialApprove(approval)}
                  className="h-10 px-4 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
                >
                  部分通过
                </button>
                <button
                  onClick={() => handleReject(approval.id)}
                  className="h-10 px-4 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                >
                  拒绝
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 部分通过弹窗 */}
      <PartialApprovalModal
        isOpen={showPartialModal}
        onClose={() => setShowPartialModal(false)}
        partialApproval={partialApproval}
        partialQuantities={partialQuantities}
        onQuantityChange={setPartialQuantities}
        onConfirm={confirmPartialApprove}
      />
    </div>
  );
}
