import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, Plus, Edit2, Trash2, ArrowRight, Settings, Search, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';

interface ApprovalNode {
  id: string;
  name: string;
  approverRole: string;
  approverName?: string;
  timeoutHours: number;
  autoApproveOnTimeout: boolean;
  requireComment: boolean;
}

interface ApprovalWorkflow {
  id: string;
  name: string;
  code: string;
  description: string;
  module: string;
  triggerCondition: string;
  nodes: ApprovalNode[];
  status: 'active' | 'inactive';
  createdAt: string;
}

const STORAGE_KEY = 'approval_workflow_data';

const DEFAULT_WORKFLOWS: ApprovalWorkflow[] = [
  {
    id: '1',
    name: '生产计划审批',
    code: 'production_plan',
    description: '生产计划创建后的审批流程',
    module: 'production',
    triggerCondition: '创建生产计划时',
    status: 'active',
    createdAt: '2024-01-15',
    nodes: [
      { id: 'n1', name: '部门主管审批', approverRole: 'production_manager', timeoutHours: 24, autoApproveOnTimeout: false, requireComment: true },
      { id: 'n2', name: '总经理审批', approverRole: 'admin', timeoutHours: 48, autoApproveOnTimeout: false, requireComment: false },
    ],
  },
  {
    id: '2',
    name: '物料采购审批',
    code: 'material_purchase',
    description: '物料采购申请的审批流程',
    module: 'materials',
    triggerCondition: '采购金额 > 5000元',
    status: 'active',
    createdAt: '2024-01-20',
    nodes: [
      { id: 'n1', name: '仓库主管审批', approverRole: 'warehouse_manager', timeoutHours: 24, autoApproveOnTimeout: false, requireComment: true },
      { id: 'n2', name: '财务审批', approverRole: 'finance', timeoutHours: 24, autoApproveOnTimeout: false, requireComment: true },
      { id: 'n3', name: '总经理审批', approverRole: 'admin', timeoutHours: 48, autoApproveOnTimeout: false, requireComment: false },
    ],
  },
  {
    id: '3',
    name: '人员入职审批',
    code: 'hr_onboard',
    description: '新员工入职审批流程',
    module: 'hr',
    triggerCondition: '新员工入职时',
    status: 'active',
    createdAt: '2024-02-01',
    nodes: [
      { id: 'n1', name: 'HR主管审批', approverRole: 'hr_manager', timeoutHours: 24, autoApproveOnTimeout: false, requireComment: true },
      { id: 'n2', name: '部门主管确认', approverRole: 'production_manager', timeoutHours: 24, autoApproveOnTimeout: false, requireComment: false },
    ],
  },
  {
    id: '4',
    name: '技术方案审批',
    code: 'tech_solution',
    description: '农业技术方案审批',
    module: 'tech',
    triggerCondition: '技术方案发布前',
    status: 'active',
    createdAt: '2024-02-10',
    nodes: [
      { id: 'n1', name: '技术主管审批', approverRole: 'tech_manager', timeoutHours: 48, autoApproveOnTimeout: false, requireComment: true },
      { id: 'n2', name: '生产主管确认', approverRole: 'production_manager', timeoutHours: 24, autoApproveOnTimeout: false, requireComment: false },
    ],
  },
];

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

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setWorkflows(JSON.parse(saved));
    } else {
      setWorkflows(DEFAULT_WORKFLOWS);
    }
  }, []);

  useEffect(() => {
    if (workflows.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
    }
  }, [workflows]);

  const filteredWorkflows = workflows.filter(w =>
    w.name.includes(searchTerm) || w.code.includes(searchTerm) || w.module.includes(searchTerm)
  );

  const toggleExpand = (id: string) => {
    setExpandedWorkflows(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSaveWorkflow = () => {
    if (editingWorkflow) {
      setWorkflows(workflows.map(w =>
        w.id === editingWorkflow.id ? { ...w, ...newWorkflow } as ApprovalWorkflow : w
      ));
    } else {
      setWorkflows([...workflows, {
        ...newWorkflow,
        id: Date.now().toString(),
        createdAt: new Date().toISOString().split('T')[0],
        nodes: newWorkflow.nodes || [],
      } as ApprovalWorkflow]);
    }
    setShowModal(false);
    setEditingWorkflow(null);
    setNewWorkflow({ status: 'active', nodes: [] });
  };

  const deleteWorkflow = (id: string) => {
    if (confirm('确定删除该审批流程吗？')) {
      setWorkflows(workflows.filter(w => w.id !== id));
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

  const toggleWorkflowStatus = (id: string) => {
    setWorkflows(workflows.map(w =>
      w.id === id ? { ...w, status: w.status === 'active' ? 'inactive' : 'active' } : w
    ));
  };

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
          <button
            onClick={() => { setEditingWorkflow(null); setNewWorkflow({ status: 'active', nodes: [] }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            新增流程
          </button>
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
                  <button onClick={() => toggleWorkflowStatus(workflow.id)} className="text-sm text-emerald-600 hover:underline">
                    {workflow.status === 'active' ? '停用' : '启用'}
                  </button>
                  <button onClick={() => editWorkflow(workflow)} className="p-1.5 hover:bg-gray-100 rounded">
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={() => deleteWorkflow(workflow.id)} className="p-1.5 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{workflow.description}</p>
              <div className="text-xs text-gray-500 mb-3">
                <span className="font-medium">触发条件：</span>{workflow.triggerCondition}
              </div>

              {/* 展开/收起按钮 */}
              <button
                onClick={() => toggleExpand(workflow.id)}
                className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700"
              >
                {expandedWorkflows.includes(workflow.id) ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {expandedWorkflows.includes(workflow.id) ? '收起节点' : '查看审批节点'} ({workflow.nodes.length})
              </button>

              {/* 审批节点 */}
              {expandedWorkflows.includes(workflow.id) && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {workflow.nodes.map((node, index) => (
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
                        {index < workflow.nodes.length - 1 && (
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
                  <button
                    onClick={addNode}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 text-sm"
                  >
                    <Plus className="w-3 h-3" />
                    添加节点
                  </button>
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
                        <button onClick={() => removeNode(node.id)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">取消</button>
              <button onClick={handleSaveWorkflow} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
