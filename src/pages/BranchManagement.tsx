/**
 * 基地管理页面
 * 功能：基地信息的新增、编辑、删除、查询
 */

import { useState } from 'react';
import { MapPin, Building2, Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal, FormField, Input, Textarea } from '../components/ui/Modal';

// 基地数据类型
interface Branch {
  id: string;
  code: string;
  name: string;
  location: string;
  area: number;
  manager: string;
  contact: string;
  status: 'active' | 'inactive';
  blockCount: number;
  description?: string;
}

// 模拟数据
const mockBranches: Branch[] = [
  { id: '1', code: 'BR001', name: '一号种植基地', location: '北京市通州区', area: 50000, manager: '张建国', contact: '13800138001', status: 'active', blockCount: 12, description: '主产区，种植番茄、黄瓜等' },
  { id: '2', code: 'BR002', name: '二号种植基地', location: '北京市顺义区', area: 35000, manager: '李明辉', contact: '13800138002', status: 'active', blockCount: 8, description: '叶菜类种植区' },
  { id: '3', code: 'BR003', name: '三号种植基地', location: '北京市大兴区', area: 28000, manager: '王建国', contact: '13800138003', status: 'active', blockCount: 6, description: '草莓种植专区' },
  { id: '4', code: 'BR004', name: '四号种植基地', location: '北京市昌平区', area: 42000, manager: '赵文静', contact: '13800138004', status: 'inactive', blockCount: 0, description: '备用基地' },
];

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
};

export default function BranchManagement() {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branches, setBranches] = useState<Branch[]>(mockBranches);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<Partial<Branch>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredBranches = branches.filter(branch => {
    const matchSearch = !searchText ||
      branch.name.toLowerCase().includes(searchText.toLowerCase()) ||
      branch.code.toLowerCase().includes(searchText.toLowerCase()) ||
      branch.location.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === 'all' || branch.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredBranches.length / pageSize);
  const paginatedBranches = filteredBranches.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData(branch);
    } else {
      setEditingBranch(null);
      setFormData({ status: 'active' });
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBranch(null);
    setFormData({});
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code?.trim()) newErrors.code = '请输入基地编码';
    if (!formData.name?.trim()) newErrors.name = '请输入基地名称';
    if (!formData.location?.trim()) newErrors.location = '请输入地理位置';
    if (!formData.area || formData.area <= 0) newErrors.area = '请输入有效面积';
    if (!formData.manager?.trim()) newErrors.manager = '请输入负责人';
    if (!formData.contact?.trim()) newErrors.contact = '请输入联系方式';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (editingBranch) {
      // 更新
      setBranches(branches.map(b =>
        b.id === editingBranch.id ? { ...b, ...formData } as Branch : b
      ));
    } else {
      // 新增
      const newBranch: Branch = {
        id: String(branches.length + 1),
        code: formData.code!,
        name: formData.name!,
        location: formData.location!,
        area: formData.area!,
        manager: formData.manager!,
        contact: formData.contact!,
        status: formData.status || 'active',
        blockCount: 0,
        description: formData.description,
      };
      setBranches([newBranch, ...branches]);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该基地吗？')) {
      setBranches(branches.filter(b => b.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">基地管理</h1>
            <p className="text-gray-500">管理种植基地信息</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '基地总数', value: branches.length, color: 'bg-blue-500' },
          { label: '在用基地', value: branches.filter(b => b.status === 'active').length, color: 'bg-emerald-500' },
          { label: '闲置基地', value: branches.filter(b => b.status === 'inactive').length, color: 'bg-amber-500' },
          { label: '总面积(亩)', value: branches.reduce((sum, b) => sum + b.area, 0), color: 'bg-purple-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 筛选和操作栏 */}
      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 items-center">
            {/* 搜索框 */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索基地名称、编码或位置..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 状态筛选 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部状态</option>
              <option value="active">在用</option>
              <option value="inactive">闲置</option>
            </select>
          </div>

          {/* 新增按钮 */}
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增基地
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">基地编码</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">基地名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">位置</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">面积(亩)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">负责人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">区块数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedBranches.map((branch) => (
                <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">{branch.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{branch.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {branch.location}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{branch.area.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{branch.manager}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{branch.blockCount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[branch.status]}`}>
                      {branch.status === 'active' ? '在用' : '闲置'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(branch)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(branch.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredBranches.length)} 条，共 {filteredBranches.length} 条
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingBranch ? '编辑基地' : '新增基地'}
          onConfirm={handleSubmit}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="基地编码" required error={errors.code}>
                <Input
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="如：BR001"
                />
              </FormField>
              <FormField label="基地名称" required error={errors.name}>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入基地名称"
                />
              </FormField>
            </div>

            <FormField label="地理位置" required error={errors.location}>
              <Input
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="请输入详细地址"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="面积(亩)" required error={errors.area}>
                <Input
                  type="number"
                  value={formData.area || ''}
                  onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })}
                  placeholder="请输入面积"
                />
              </FormField>
              <FormField label="负责人" required error={errors.manager}>
                <Input
                  value={formData.manager || ''}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  placeholder="请输入负责人姓名"
                />
              </FormField>
            </div>

            <FormField label="联系方式" required error={errors.contact}>
              <Input
                value={formData.contact || ''}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="请输入联系电话"
              />
            </FormField>

            <FormField label="状态">
              <select
                value={formData.status || 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">在用</option>
                <option value="inactive">闲置</option>
              </select>
            </FormField>

            <FormField label="备注说明">
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入备注说明（可选）"
                rows={3}
              />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  );
}
