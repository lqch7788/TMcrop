import { useState } from 'react';
import { Search, CheckCircle, XCircle, Clock, ChevronRight, Filter, AlertTriangle, X } from 'lucide-react';
import { approvals } from '../data/mockData';

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
      {showPartialModal && partialApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
              <h3 className="text-lg font-semibold text-white">部分通过审批</h3>
              <button onClick={() => setShowPartialModal(false)} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">领料单号</div>
                <div className="font-medium text-gray-900">{partialApproval.code}</div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">标题</div>
                <div className="font-medium text-gray-900">{partialApproval.title}</div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium text-gray-700 mb-2">物料明细 - 请填写实际发放数量</div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">物料编码</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">物料名称</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">申请数量</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">实际发放</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(partialApproval.materials || []).map((mat: any) => {
                        const insufficient = (partialQuantities[mat.materialCode] || 0) < mat.requestedQuantity;
                        return (
                          <tr key={mat.materialCode}>
                            <td className="px-3 py-2 text-gray-900">{mat.materialCode}</td>
                            <td className="px-3 py-2 text-gray-900">{mat.materialName}</td>
                            <td className="px-3 py-2 text-right text-gray-900">{mat.requestedQuantity}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                max={mat.requestedQuantity}
                                value={partialQuantities[mat.materialCode] || 0}
                                onChange={(e) => setPartialQuantities({
                                  ...partialQuantities,
                                  [mat.materialCode]: Number(e.target.value)
                                })}
                                className={`w-20 h-8 px-2 border rounded text-right text-sm focus:outline-none focus:border-blue-500 ${insufficient ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 提示信息 */}
              {Object.keys(partialQuantities).some(code => {
                const mat = partialApproval.materials?.find((m: any) => m.materialCode === code);
                return mat && (partialQuantities[code] || 0) < mat.requestedQuantity;
              }) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">部分物料数量不足</p>
                      <p className="mt-1">系统将自动生成新的待审批领料单，包含不足数量的物料。</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowPartialModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={confirmPartialApprove}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  确认部分通过
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
