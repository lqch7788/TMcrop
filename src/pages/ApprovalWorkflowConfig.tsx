import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, Plus, Edit2, Trash2, ArrowRight, Settings, Search, ChevronDown, ChevronUp, ChevronLeft, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  getWorkflows,
  createWorkflow,
  updateWorkflow as updateWorkflowApi,
  deleteWorkflow as deleteWorkflowApi,
  toggleWorkflow,
  ApprovalNode,
  ApprovalWorkflow,
} from '../services/apiApprovalWorkflowService';

const MODULE_OPTIONS = [
  { value: 'production', label: '生产管理' },
  { value: 'materials', label: '物料管理' },
  { value: 'hr', label: '人事管理' },
  { value: 'tech', label: '技术方案' },
  { value: 'purchase', label: '采购管理' },
  { value: 'finance', label: '财务管理' },
];

export default function ApprovalWorkflowConfig() {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [expandedWorkflows, setExpandedWorkflows] = useState<string[]>([]);
  const [newWorkflow, setNewWorkflow] = useState<Partial<ApprovalWorkflow>>({
    status: 'active',
    nodes: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载审批工作流数据
  const loadWorkflows = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWorkflows();
      setWorkflows(data);
    } catch (err) {
      console.error('加载审批工作流失败:', err);
      setError('加载审批工作流失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const filteredWorkflows = workflows.filter(w =>
    w.name.includes(searchTerm) || w.code.includes(searchTerm) || w.module.includes(searchTerm)
  );

  const toggleExpand = (id: string) => {
    setExpandedWorkflows(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSaveWorkflow = async () => {
    try {
      const payload = {
        name: newWorkflow.name,
        code: newWorkflow.code,
        description: newWorkflow.description || '',
        module: newWorkflow.module || '',
        triggerCondition: newWorkflow.triggerCondition || '',
        nodes: newWorkflow.nodes || [],
        status: newWorkflow.status || 'active',
      };

      if (editingWorkflow) {
        await updateWorkflowApi(editingWorkflow.id, payload);
      } else {
        await createWorkflow(payload);
      }

      await loadWorkflows();
      setShowModal(false);
      setEditingWorkflow(null);
      setNewWorkflow({ status: 'active', nodes: [] });
    } catch (err) {
      console.error('保存审批工作流失败:', err);
      alert('保存审批工作流失败');
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('确定删除该审批流程吗？')) return;
    try {
      await deleteWorkflowApi(id);
      await loadWorkflows();
    } catch (err) {
      console.error('删除审批工作流失败:', err);
      alert('删除失败');
    }
  };

  const editWorkflow = (workflow: ApprovalWorkflow) => {
    setEditingWorkflow(workflow);
    setNewWorkflow(workflow);
    setShowModal(true);
  };

  const addNode = () => {
    const newNode: ApprovalNode = {
      id: `n${Date.now()}`,
      name: '',
      approverRole: '',
      timeoutHours: 24,
      autoApproveOnTimeout: false,
      requireComment: true,
    };
    setNewWorkflow({
      ...newWorkflow,
      nodes: [...(newWorkflow.nodes || []), newNode],
    });
  };

  const updateNode = (nodeId: string, updates: Partial<ApprovalNode>) => {
    setNewWorkflow({
      ...newWorkflow,
      nodes: (newWorkflow.nodes || []).map(n =>
        n.id === nodeId ? { ...n, ...updates } : n
      ),
    });
  };

  const removeNode = (nodeId: string) => {
    setNewWorkflow({
      ...newWorkflow,
      nodes: (newWorkflow.nodes || []).filter(n => n.id !== nodeId),
    });
  };

  const toggleWorkflowStatus = async (id: string) => {
    try {
      await toggleWorkflow(id);
      await loadWorkflows();
    } catch (err) {
      console.error('切换审批工作流状态失败:', err);
      alert('切换状态失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <span className="ml-2 text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h2 className="text-xl font-bold text-gray-900">审批流程配置</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索审批流程..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <Button
            onClick={() => { setEditingWorkflow(null); setNewWorkflow({ status: 'active', nodes: [] }); setShowModal(true); }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新增流程
          </Button>
        </div>
      </div>

      {/* 流程列表 */}
      <div className="space-y-4">
        {filteredWorkflows.map(workflow => (
          <div key={workflow.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <GitBranch className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                    <p className="text-xs text-gray-500">{workflow.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    workflow.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {workflow.status === 'active' ? '启用' : '停用'}
                  </span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                    {MODULE_OPTIONS.find(m => m.value === workflow.module)?.label || workflow.module}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => toggleWorkflowStatus(workflow.id)} className="text-sm text-emerald-600 hover:underline">
                    {workflow.status === 'active' ? '停用' : '启用'}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => editWorkflow(workflow)} className="p-1.5 hover:bg-gray-100 rounded">
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteWorkflow(workflow.id)} className="p-1.5 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{workflow.description}</p>
              <div className="text-xs text-gray-500 mb-3">
                <span className="font-medium">触发条件：</span>{workflow.triggerCondition}
              </div>

              {/* 展开/收起按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpand(workflow.id)}
                className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
              >
                {expandedWorkflows.includes(workflow.id) ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {expandedWorkflows.includes(workflow.id) ? '收起节点' : '查看审批节点'} ({workflow.nodes?.length || 0})
              </Button>

              {/* 审批节点 */}
              {expandedWorkflows.includes(workflow.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {(workflow.nodes || []).map((node, index) => (
                      <div key={node.id} className="flex items-center">
                        <div className="px-4 py-3 bg-gray-50 rounded-lg min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{node.name}</p>
                              <p className="text-xs text-gray-500">{node.approverRole}</p>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500 space-y-1">
                            <p>超时：{node.timeoutHours}小时</p>
                            <p>{node.autoApproveOnTimeout ? '自动通过' : '超时待审'}</p>
                            <p>{node.requireComment ? '必须填写意见' : '可选意见'}</p>
                          </div>
                        </div>
                        {index < (workflow.nodes?.length || 0) - 1 && (
                          <ArrowRight className="w-5 h-5 text-gray-400 mx-2 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{editingWorkflow ? '编辑审批流程' : '新增审批流程'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">流程名称</label>
                  <input
                    type="text"
                    value={newWorkflow.name || ''}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">流程代码</label>
                  <input
                    type="text"
                    value={newWorkflow.code || ''}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={newWorkflow.description || ''}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">所属模块</label>
                  <select
                    value={newWorkflow.module || ''}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, module: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择模块</option>
                    {MODULE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">触发条件</label>
                  <input
                    type="text"
                    value={newWorkflow.triggerCondition || ''}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, triggerCondition: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 审批节点配置 */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-900">审批节点</h4>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={addNode}
                    className="flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    添加节点
                  </Button>
                </div>
                <div className="space-y-3">
                  {(newWorkflow.nodes || []).map((node, index) => (
                    <div key={node.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900">节点 {index + 1}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeNode(node.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">节点名称</label>
                          <input
                            type="text"
                            value={node.name}
                            onChange={(e) => updateNode(node.id, { name: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">审批角色</label>
                          <input
                            type="text"
                            value={node.approverRole}
                            onChange={(e) => updateNode(node.id, { approverRole: e.target.value })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">超时时间（小时）</label>
                          <input
                            type="number"
                            value={node.timeoutHours}
                            onChange={(e) => updateNode(node.id, { timeoutHours: parseInt(e.target.value) })}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={node.autoApproveOnTimeout}
                              onChange={(e) => updateNode(node.id, { autoApproveOnTimeout: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-gray-600">超时自动通过</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={node.requireComment}
                              onChange={(e) => updateNode(node.id, { requireComment: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-gray-600">必须填写意见</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowModal(false)}>取消</Button>
              <Button onClick={handleSaveWorkflow}>保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
