/**
 * 区块管理页面
 * 功能：区块信息的新增、编辑、删除、查询
 * 作为系统设置的子页面
 */

import { useState } from 'react';
import { Grid3X3, Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight, MapPin, Layers } from 'lucide-react';
import { Modal, FormField, Input, Select, Textarea } from '../components/ui/Modal';

// 区块数据类型
interface Block {
  id: string;
  code: string;
  name: string;
  branchId: string;
  branchName: string;
  area: number;
  soilType: string;
  irrigationMethod: string;
  status: 'active' | 'inactive';
  cropName?: string;
  growthStage?: string;
  description?: string;
}

// 土壤类型选项
const soilTypes = [
  { value: 'clay', label: '粘土' },
  { value: 'sandy', label: '沙土' },
  { value: 'loam', label: '壤土' },
  { value: 'silt', label: '粉砂土' },
  { value: 'peat', label: '泥炭土' },
];

// 灌溉方式选项
const irrigationMethods = [
  { value: 'drip', label: '滴灌' },
  { value: 'sprinkler', label: '喷灌' },
  { value: 'flood', label: '漫灌' },
  { value: 'furrow', label: '沟灌' },
  { value: 'center_pivot', label: '中心支轴式灌溉' },
  { value: 'manual', label: '人工灌溉' },
];

// 模拟数据
const mockBlocks: Block[] = [
  { id: '1', code: 'BK001', name: 'A区-1号区块', branchId: '1', branchName: '一号种植基地', area: 5000, soilType: 'loam', irrigationMethod: 'drip', status: 'active', cropName: '番茄', growthStage: '结果期' },
  { id: '2', code: 'BK002', name: 'A区-2号区块', branchId: '1', branchName: '一号种植基地', area: 4500, soilType: 'loam', irrigationMethod: 'drip', status: 'active', cropName: '黄瓜', growthStage: '生长期' },
  { id: '3', code: 'BK003', name: 'B区-1号区块', branchId: '2', branchName: '二号种植基地', area: 6000, soilType: 'clay', irrigationMethod: 'sprinkler', status: 'active', cropName: '生菜', growthStage: '采收期' },
  { id: '4', code: 'BK004', name: 'B区-2号区块', branchId: '2', branchName: '二号种植基地', area: 5500, soilType: 'sandy', irrigationMethod: 'flood', status: 'inactive' },
  { id: '5', code: 'BK005', name: 'C区-1号区块', branchId: '3', branchName: '三号种植基地', area: 4000, soilType: 'peat', irrigationMethod: 'drip', status: 'active', cropName: '草莓', growthStage: '开花期' },
];

// 基地选项
const branchOptions = [
  { value: '1', label: '一号种植基地' },
  { value: '2', label: '二号种植基地' },
  { value: '3', label: '三号种植基地' },
];

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
};

export default function BlockManagement() {
  const [searchText, setSearchText] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [blocks, setBlocks] = useState<Block[]>(mockBlocks);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [formData, setFormData] = useState<Partial<Block>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredBlocks = blocks.filter(block => {
    const matchSearch = !searchText ||
      block.name.toLowerCase().includes(searchText.toLowerCase()) ||
      block.code.toLowerCase().includes(searchText.toLowerCase());
    const matchBranch = branchFilter === 'all' || block.branchId === branchFilter;
    const matchStatus = statusFilter === 'all' || block.status === statusFilter;
    return matchSearch && matchBranch && matchStatus;
  });

  const totalPages = Math.ceil(filteredBlocks.length / pageSize);
  const paginatedBlocks = filteredBlocks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenModal = (block?: Block) => {
    if (block) {
      setEditingBlock(block);
      setFormData(block);
    } else {
      setEditingBlock(null);
      setFormData({ status: 'active', irrigationMethod: 'drip' });
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBlock(null);
    setFormData({});
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code?.trim()) newErrors.code = '请输入区块编码';
    if (!formData.name?.trim()) newErrors.name = '请输入区块名称';
    if (!formData.branchId?.trim()) newErrors.branchId = '请选择所属基地';
    if (!formData.area || formData.area <= 0) newErrors.area = '请输入有效面积';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const branch = branchOptions.find(b => b.value === formData.branchId);

    if (editingBlock) {
      setBlocks(blocks.map(b =>
        b.id === editingBlock.id ? { ...b, ...formData, branchName: branch?.label || b.branchName } as Block : b
      ));
    } else {
      const newBlock: Block = {
        id: String(blocks.length + 1),
        code: formData.code!,
        name: formData.name!,
        branchId: formData.branchId!,
        branchName: branch?.label || '',
        area: formData.area!,
        soilType: formData.soilType || 'loam',
        irrigationMethod: formData.irrigationMethod || 'drip',
        status: formData.status as 'active' || 'active',
        description: formData.description,
      };
      setBlocks([newBlock, ...blocks]);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该区块吗？')) {
      setBlocks(blocks.filter(b => b.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">区块管理</h1>
            <p className="text-gray-500">管理基地下的区块信息</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '区块总数', value: blocks.length, color: 'bg-amber-500' },
          { label: '在用区块', value: blocks.filter(b => b.status === 'active').length, color: 'bg-emerald-500' },
          { label: '闲置区块', value: blocks.filter(b => b.status === 'inactive').length, color: 'bg-gray-500' },
          { label: '总面积(亩)', value: blocks.reduce((sum, b) => sum + b.area, 0).toLocaleString(), color: 'bg-purple-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <Grid3X3 className="w-5 h-5 text-white" />
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
                  placeholder="搜索区块名称或编码..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* 基地筛选 */}
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">全部基地</option>
              {branchOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {/* 状态筛选 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">全部状态</option>
              <option value="active">在用</option>
              <option value="inactive">闲置</option>
            </select>
          </div>

          {/* 新增按钮 */}
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增区块
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">区块编码</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">区块名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所属基地</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">面积(亩)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">土壤类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">灌溉方式</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">当前作物</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedBlocks.map((block) => (
                <tr key={block.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-amber-600">{block.code}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{block.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {block.branchName}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{block.area.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {soilTypes.find(s => s.value === block.soilType)?.label || block.soilType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {irrigationMethods.find(i => i.value === block.irrigationMethod)?.label || block.irrigationMethod}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {block.cropName ? (
                      <span className="text-emerald-600">{block.cropName}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[block.status]}`}>
                      {block.status === 'active' ? '在用' : '闲置'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(block)}
                        className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(block.id)}
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
            显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredBlocks.length)} 条，共 {filteredBlocks.length} 条
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm font-medium">{currentPage} / {totalPages || 1}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
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
          title={editingBlock ? '编辑区块' : '新增区块'}
          onConfirm={handleSubmit}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="区块编码" required error={errors.code}>
                <Input
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="如：BK001"
                />
              </FormField>
              <FormField label="区块名称" required error={errors.name}>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入区块名称"
                />
              </FormField>
            </div>

            <FormField label="所属基地" required error={errors.branchId}>
              <select
                value={formData.branchId || ''}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">请选择所属基地</option>
                {branchOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="面积(亩)" required error={errors.area}>
              <Input
                type="number"
                value={formData.area || ''}
                onChange={(e) => setFormData({ ...formData, area: Number(e.target.value) })}
                placeholder="请输入面积"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="土壤类型">
                <select
                  value={formData.soilType || 'loam'}
                  onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {soilTypes.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="灌溉方式">
                <select
                  value={formData.irrigationMethod || 'drip'}
                  onChange={(e) => setFormData({ ...formData, irrigationMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {irrigationMethods.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="状态">
              <select
                value={formData.status || 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
