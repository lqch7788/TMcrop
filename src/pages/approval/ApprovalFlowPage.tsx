/**
 * 审批流程管理页面
 * 用于配置和管理审批流程模板
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GitBranch,
  Plus,
  Edit2,
  Trash2,
  ArrowRight,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  X,
  Save,
  GripVertical,
  User,
  Users,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// ============================================================
// 审批流程数据类型定义
// ============================================================

/** 审批节点 */
export interface ApprovalNode {
  oid: string;
  nodeCode: string;
  nodeName: string;
  nodeType: 'start' | 'approval' | 'end';
  approverType: 'role' | 'user' | 'department';
  approverId: string;
  approverName: string;
  sortOrder: number;
  timeoutHours: number;
  autoApproveOnTimeout: boolean;
  requireComment: boolean;
}

/** 审批流程 */
export interface ApprovalFlow {
  oid: string;
  flowCode: string;
  flowName: string;
  businessType: string;
  description: string;
  nodes: ApprovalNode[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 业务类型选项
// ============================================================

const BUSINESS_TYPE_OPTIONS = [
  { value: 'purchase', label: '采购管理' },
  { value: 'material', label: '物料管理' },
  { value: 'production', label: '生产管理' },
  { value: 'hr', label: '人事管理' },
  { value: 'harvest', label: '采收管理' },
  { value: 'seed', label: '种源管理' },
  { value: 'seedling', label: '育苗管理' },
];

// 审批人类型选项
const APPROVER_TYPE_OPTIONS = [
  { value: 'role', label: '角色', icon: Users },
  { value: 'user', label: '人员', icon: User },
  { value: 'department', label: '部门', icon: Building2 },
];

// 模拟角色数据
const ROLE_OPTIONS = [
  { value: 'admin', label: '系统管理员' },
  { value: 'manager', label: '部门经理' },
  { value: 'production_manager', label: '生产主管' },
  { value: 'warehouse_manager', label: '仓库主管' },
  { value: 'hr_manager', label: '人事主管' },
  { value: 'finance', label: '财务人员' },
  { value: 'tech_manager', label: '技术主管' },
];

// 模拟人员数据
const USER_OPTIONS = [
  { value: 'U001', label: '王建华' },
  { value: 'U002', label: '李明辉' },
  { value: 'U003', label: '王建国' },
  { value: 'U006', label: '陈小芳' },
  { value: 'U007', label: '周志强' },
  { value: 'U008', label: '吴美丽' },
  { value: 'U009', label: '郑胜利' },
  { value: 'U012', label: '黄敏' },
];

// 模拟部门数据
const DEPARTMENT_OPTIONS = [
  { value: 'D001', label: '生产部' },
  { value: 'D002', label: '采购部' },
  { value: 'D003', label: '仓储部' },
  { value: ' D004', label: '财务部' },
  { value: 'D005', label: '人事部' },
  { value: 'D006', label: '技术部' },
];

// ============================================================
// LocalStorage 配置
// ============================================================

const STORAGE_KEY = 'approval_flow_data';

// 默认流程数据
const DEFAULT_FLOWS: ApprovalFlow[] = [
  {
    oid: 'flow-001',
    flowCode: 'purchase_approve',
    flowName: '采购申请审批流程',
    businessType: 'purchase',
    description: '适用于采购申请的审批流程',
    isActive: true,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    nodes: [
      {
        oid: 'node-001',
        nodeCode: 'N001',
        nodeName: '仓库主管审批',
        nodeType: 'approval',
        approverType: 'role',
        approverId: 'warehouse_manager',
        approverName: '仓库主管',
        sortOrder: 1,
        timeoutHours: 24,
        autoApproveOnTimeout: false,
        requireComment: true,
      },
      {
        oid: 'node-002',
        nodeCode: 'N002',
        nodeName: '财务审批',
        nodeType: 'approval',
        approverType: 'role',
        approverId: 'finance',
        approverName: '财务人员',
        sortOrder: 2,
        timeoutHours: 24,
        autoApproveOnTimeout: false,
        requireComment: true,
      },
      {
        oid: 'node-003',
        nodeCode: 'N003',
        nodeName: '总经理审批',
        nodeType: 'approval',
        approverType: 'role',
        approverId: 'admin',
        approverName: '系统管理员',
        sortOrder: 3,
        timeoutHours: 48,
        autoApproveOnTimeout: false,
        requireComment: false,
      },
    ],
  },
  {
    oid: 'flow-002',
    flowCode: 'material_approve',
    flowName: '物料领用审批流程',
    businessType: 'material',
    description: '适用于物料领用的审批流程',
    isActive: true,
    createdAt: '2024-01-20',
    updatedAt: '2024-01-20',
    nodes: [
      {
        oid: 'node-004',
        nodeCode: 'N001',
        nodeName: '部门主管审批',
        nodeType: 'approval',
        approverType: 'role',
        approverId: 'manager',
        approverName: '部门经理',
        sortOrder: 1,
        timeoutHours: 12,
        autoApproveOnTimeout: false,
        requireComment: true,
      },
      {
        oid: 'node-005',
        nodeCode: 'N002',
        nodeName: '仓库主管确认',
        nodeType: 'approval',
        approverType: 'role',
        approverId: 'warehouse_manager',
        approverName: '仓库主管',
        sortOrder: 2,
        timeoutHours: 24,
        autoApproveOnTimeout: true,
        requireComment: false,
      },
    ],
  },
  {
    oid: 'flow-003',
    flowCode: 'hr_onboard',
    flowName: '员工入职审批流程',
    businessType: 'hr',
    description: '适用于新员工入职的审批流程',
    isActive: true,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-01',
    nodes: [
      {
        oid: 'node-006',
        nodeCode: 'N001',
        nodeName: '人事主管审批',
        nodeType: 'approval',
        approverType: 'role',
        approverId: 'hr_manager',
        approverName: '人事主管',
        sortOrder: 1,
        timeoutHours: 24,
        autoApproveOnTimeout: false,
        requireComment: true,
      },
      {
        oid: 'node-007',
        nodeCode: 'N002',
        nodeName: '部门主管确认',
        nodeType: 'approval',
        approverType: 'role',
        approverId: 'production_manager',
        approverName: '生产主管',
        sortOrder: 2,
        timeoutHours: 24,
        autoApproveOnTimeout: false,
        requireComment: false,
      },
    ],
  },
];

// ============================================================
// 主组件
// ============================================================

export default function ApprovalFlowPage() {
  // 流程列表状态
  const [flows, setFlows] = useState<ApprovalFlow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFlows, setExpandedFlows] = useState<string[]>([]);

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ApprovalFlow | null>(null);

  // 表单状态
  const [formData, setFormData] = useState<Partial<ApprovalFlow>>({
    flowName: '',
    flowCode: '',
    businessType: '',
    description: '',
    isActive: true,
    nodes: [],
  });

  // 加载数据
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFlows(JSON.parse(saved));
      } catch {
        setFlows(DEFAULT_FLOWS);
      }
    } else {
      setFlows(DEFAULT_FLOWS);
    }
  }, []);

  // 保存数据到 localStorage
  useEffect(() => {
    if (flows.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
    }
  }, [flows]);

  // 筛选流程
  const filteredFlows = flows.filter(
    (flow) =>
      flow.flowName.includes(searchTerm) ||
      flow.flowCode.includes(searchTerm) ||
      flow.businessType.includes(searchTerm)
  );

  // 展开/收起流程
  const toggleExpand = (oid: string) => {
    setExpandedFlows((prev) =>
      prev.includes(oid) ? prev.filter((id) => id !== oid) : [...prev, oid]
    );
  };

  // 获取业务类型名称
  const getBusinessTypeName = (value: string) => {
    return BUSINESS_TYPE_OPTIONS.find((opt) => opt.value === value)?.label || value;
  };

  // 获取审批人选项
  const getApproverOptions = (type: 'role' | 'user' | 'department') => {
    switch (type) {
      case 'role':
        return ROLE_OPTIONS;
      case 'user':
        return USER_OPTIONS;
      case 'department':
        return DEPARTMENT_OPTIONS;
      default:
        return [];
    }
  };

  // 打开新增弹窗
  const openCreateModal = () => {
    setEditingFlow(null);
    setFormData({
      flowName: '',
      flowCode: '',
      businessType: '',
      description: '',
      isActive: true,
      nodes: [],
    });
    setShowModal(true);
  };

  // 打开编辑弹窗
  const openEditModal = (flow: ApprovalFlow) => {
    setEditingFlow(flow);
    setFormData({ ...flow });
    setShowModal(true);
  };

  // 删除流程
  const deleteFlow = (oid: string) => {
    if (confirm('确定删除该审批流程吗？')) {
      setFlows(flows.filter((f) => f.oid !== oid));
    }
  };

  // 切换流程状态
  const toggleFlowStatus = (oid: string) => {
    setFlows(
      flows.map((f) =>
        f.oid === oid ? { ...f, isActive: !f.isActive } : f
      )
    );
  };

  // 保存流程
  const handleSave = () => {
    if (!formData.flowName || !formData.flowCode || !formData.businessType) {
      alert('请填写必填字段');
      return;
    }

    if (editingFlow) {
      // 更新
      setFlows(
        flows.map((f) =>
          f.oid === editingFlow.oid
            ? {
                ...formData,
                oid: editingFlow.oid,
                updatedAt: new Date().toISOString().split('T')[0],
              } as ApprovalFlow
            : f
        )
      );
    } else {
      // 新增
      const newFlow: ApprovalFlow = {
        ...formData,
        oid: `flow-${Date.now()}`,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        nodes: formData.nodes || [],
      } as ApprovalFlow;
      setFlows([...flows, newFlow]);
    }

    setShowModal(false);
  };

  // 添加审批节点
  const addNode = () => {
    const newNode: ApprovalNode = {
      oid: `node-${Date.now()}`,
      nodeCode: `N${(formData.nodes?.length || 0) + 1}`,
      nodeName: '',
      nodeType: 'approval',
      approverType: 'role',
      approverId: '',
      approverName: '',
      sortOrder: (formData.nodes?.length || 0) + 1,
      timeoutHours: 24,
      autoApproveOnTimeout: false,
      requireComment: true,
    };
    setFormData({
      ...formData,
      nodes: [...(formData.nodes || []), newNode],
    });
  };

  // 更新节点
  const updateNode = (nodeOid: string, updates: Partial<ApprovalNode>) => {
    setFormData({
      ...formData,
      nodes: (formData.nodes || []).map((n) =>
        n.oid === nodeOid ? { ...n, ...updates } : n
      ),
    });
  };

  // 删除节点
  const removeNode = (nodeOid: string) => {
    setFormData({
      ...formData,
      nodes: (formData.nodes || [])
        .filter((n) => n.oid !== nodeOid)
        .map((n, index) => ({ ...n, sortOrder: index + 1 })),
    });
  };

  // 节点上移
  const moveNodeUp = (nodeOid: string) => {
    const nodes = formData.nodes || [];
    const index = nodes.findIndex((n) => n.oid === nodeOid);
    if (index <= 0) return;
    const newNodes = [...nodes];
    [newNodes[index - 1], newNodes[index]] = [newNodes[index], newNodes[index - 1]];
    setFormData({
      ...formData,
      nodes: newNodes.map((n, i) => ({ ...n, sortOrder: i + 1 })),
    });
  };

  // 节点下移
  const moveNodeDown = (nodeOid: string) => {
    const nodes = formData.nodes || [];
    const index = nodes.findIndex((n) => n.oid === nodeOid);
    if (index < 0 || index >= nodes.length - 1) return;
    const newNodes = [...nodes];
    [newNodes[index], newNodes[index + 1]] = [newNodes[index + 1], newNodes[index]];
    setFormData({
      ...formData,
      nodes: newNodes.map((n, i) => ({ ...n, sortOrder: i + 1 })),
    });
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">审批流程管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              配置和管理审批流程模板
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索流程名称或编码..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            新增流程
          </button>
        </div>
      </div>

      {/* 流程列表 */}
      <div className="space-y-4">
        {filteredFlows.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
            <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无审批流程</p>
            <button
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
            >
              创建第一个流程
            </button>
          </div>
        ) : (
          filteredFlows.map((flow) => (
            <div
              key={flow.oid}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <GitBranch className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {flow.flowName}
                      </h3>
                      <p className="text-xs text-gray-500">{flow.flowCode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 text-xs rounded-full ${
                        flow.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {flow.isActive ? '启用' : '停用'}
                    </span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                      {getBusinessTypeName(flow.businessType)}
                    </span>
                    <button
                      onClick={() => toggleFlowStatus(flow.oid)}
                      className="text-sm text-emerald-600 hover:underline"
                    >
                      {flow.isActive ? '停用' : '启用'}
                    </button>
                    <button
                      onClick={() => openEditModal(flow)}
                      className="p-1.5 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => deleteFlow(flow.oid)}
                      className="p-1.5 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {flow.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    创建时间：{flow.createdAt}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    共{flow.nodes.length}个节点
                  </span>
                </div>

                {/* 展开/收起按钮 */}
                <button
                  onClick={() => toggleExpand(flow.oid)}
                  className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 mt-4"
                >
                  {expandedFlows.includes(flow.oid) ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      收起节点
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      查看审批节点
                    </>
                  )}
                </button>

                {/* 审批节点 */}
                {expandedFlows.includes(flow.oid) && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {flow.nodes.map((node, index) => (
                        <div key={node.oid} className="flex items-center">
                          <div className="px-4 py-3 bg-gray-50 rounded-lg min-w-[180px]">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                {index + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {node.nodeName || '未命名节点'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {node.approverName || '未设置'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 space-y-1">
                              <p className="flex items-center gap-1">
                                {node.approverType === 'role' && (
                                  <Users className="w-3 h-3" />
                                )}
                                {node.approverType === 'user' && (
                                  <User className="w-3 h-3" />
                                )}
                                {node.approverType === 'department' && (
                                  <Building2 className="w-3 h-3" />
                                )}
                                审批类型：{' '}
                                {APPROVER_TYPE_OPTIONS.find(
                                  (t) => t.value === node.approverType
                                )?.label || node.approverType}
                              </p>
                              <p>超时：{node.timeoutHours}小时</p>
                              <p>
                                {node.autoApproveOnTimeout
                                  ? '超时自动通过'
                                  : '超时待审'}
                              </p>
                              <p>
                                {node.requireComment
                                  ? '必须填写意见'
                                  : '可选意见'}
                              </p>
                            </div>
                          </div>
                          {index < flow.nodes.length - 1 && (
                            <ArrowRight className="w-5 h-5 text-gray-400 mx-2 flex-shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* 弹窗头部 */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingFlow ? '编辑审批流程' : '新增审批流程'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">
                  基本信息
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      流程名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.flowName || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, flowName: e.target.value })
                      }
                      placeholder="请输入流程名称"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      流程编码 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.flowCode || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, flowCode: e.target.value })
                      }
                      placeholder="请输入流程编码"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      业务类型 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.businessType || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">请选择业务类型</option>
                      {BUSINESS_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 h-full pt-7">
                      <input
                        type="checkbox"
                        checked={formData.isActive ?? true}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <span>启用流程</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="请输入流程描述"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 审批节点配置 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="text-sm font-semibold text-gray-900">
                    审批节点
                  </h4>
                  <button
                    onClick={addNode}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 text-sm"
                  >
                    <Plus className="w-3 h-3" />
                    添加节点
                  </button>
                </div>

                {(formData.nodes || []).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                    暂无审批节点，点击上方按钮添加
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(formData.nodes || []).map((node, index) => (
                      <div
                        key={node.oid}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              节点 {index + 1}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveNodeUp(node.oid)}
                              disabled={index === 0}
                              className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                              title="上移"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveNodeDown(node.oid)}
                              disabled={index === (formData.nodes?.length || 0) - 1}
                              className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                              title="下移"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeNode(node.oid)}
                              className="p-1 hover:bg-red-50 rounded text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              节点名称
                            </label>
                            <input
                              type="text"
                              value={node.nodeName}
                              onChange={(e) =>
                                updateNode(node.oid, {
                                  nodeName: e.target.value,
                                })
                              }
                              placeholder="如：部门主管审批"
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              审批人类型
                            </label>
                            <select
                              value={node.approverType}
                              onChange={(e) =>
                                updateNode(node.oid, {
                                  approverType: e.target.value as
                                    | 'role'
                                    | 'user'
                                    | 'department',
                                  approverId: '',
                                  approverName: '',
                                })
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            >
                              {APPROVER_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              审批人
                            </label>
                            <select
                              value={node.approverId}
                              onChange={(e) => {
                                const options = getApproverOptions(
                                  node.approverType
                                );
                                const selected = options.find(
                                  (o) => o.value === e.target.value
                                );
                                updateNode(node.oid, {
                                  approverId: e.target.value,
                                  approverName: selected?.label || '',
                                });
                              }}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            >
                              <option value="">请选择审批人</option>
                              {getApproverOptions(node.approverType).map(
                                (opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              超时时间（小时）
                            </label>
                            <input
                              type="number"
                              value={node.timeoutHours}
                              onChange={(e) =>
                                updateNode(node.oid, {
                                  timeoutHours: parseInt(e.target.value) || 24,
                                })
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div className="col-span-2 flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={node.autoApproveOnTimeout}
                                onChange={(e) =>
                                  updateNode(node.oid, {
                                    autoApproveOnTimeout: e.target.checked,
                                  })
                                }
                                className="rounded"
                              />
                              <span className="text-gray-600">
                                超时自动通过
                              </span>
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={node.requireComment}
                                onChange={(e) =>
                                  updateNode(node.oid, {
                                    requireComment: e.target.checked,
                                  })
                                }
                                className="rounded"
                              />
                              <span className="text-gray-600">
                                必须填写意见
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
