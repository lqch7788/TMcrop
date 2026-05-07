/**
 * 区块管理页面
 * 功能：区块信息的新增、编辑、删除、查询
 * 使用 API 替代硬编码数据
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Grid3X3, Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, MapPin, Layers, Loader2, AlertTriangle } from 'lucide-react';
import { Modal, FormField, Input, Select, Textarea } from '../components/ui/Modal';

// 区块数据类型
interface Block {
  id: string;
  oid: string;
  blockCode: string;
  blockName: string;
  zoneOid: string;
  zoneName: string;
  zoneCode: string;
  blockType: string;
  area: number;
  sortOrder: number;
  status: string;
  description: string;
  createdAt: string;
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

const API_BASE = '/api/basic-data/blocks';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
};

export default function BlockManagement() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [searchText, setSearchText] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [formData, setFormData] = useState<Partial<Block>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载区块数据
  const loadBlocks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_BASE);
      const result = await response.json();
      if (result.success) {
        setBlocks(result.data || []);
      } else {
        setError('获取区块数据失败');
      }
    } catch (err) {
      console.error('加载区块数据失败:', err);
      setError('加载区块数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const filteredBlocks = blocks.filter(block => {
    const matchSearch = !searchText ||
      block.blockName?.toLowerCase().includes(searchText.toLowerCase()) ||
      block.blockCode?.toLowerCase().includes(searchText.toLowerCase());
    const matchStatus = statusFilter === 'all' || block.status === statusFilter;
    return matchSearch && matchStatus;
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
      setFormData({ status: 'active' });
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
    if (!formData.blockCode?.trim()) newErrors.blockCode = '请输入区块编码';
    if (!formData.blockName?.trim()) newErrors.blockName = '请输入区块名称';
    if (!formData.area || formData.area <= 0) newErrors.area = '请输入有效面积';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (editingBlock) {
        const response = await fetch(`${API_BASE}/${editingBlock.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockName: formData.blockName,
            blockCode: formData.blockCode,
            zoneOid: formData.zoneOid,
            blockType: formData.blockType,
            area: formData.area,
            sortOrder: formData.sortOrder,
            status: formData.status,
            description: formData.description,
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadBlocks();
          handleCloseModal();
        } else {
          alert(result.error || '更新失败');
        }
      } else {
        const response = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockName: formData.blockName,
            blockCode: formData.blockCode,
            zoneOid: formData.zoneOid,
            blockType: formData.blockType,
            area: formData.area,
            sortOrder: formData.sortOrder,
            description: formData.description,
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadBlocks();
          handleCloseModal();
        } else {
          alert(result.error || '创建失败');
        }
      }
    } catch (err) {
      console.error('保存区块失败:', err);
      alert('保存区块失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该区块吗？')) return;
    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        await loadBlocks();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (err) {
      console.error('删除区块失败:', err);
      alert('删除区块失败');
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
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
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
          { label: '总面积(亩)', value: blocks.reduce((sum, b) => sum + (b.area || 0), 0).toLocaleString(), color: 'bg-purple-500' },
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所属区域</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">面积(亩)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">区块类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedBlocks.map((block) => (
                <tr key={block.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-amber-600">{block.blockCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{block.blockName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {block.zoneName || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{(block.area || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {block.blockType || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[block.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-600'}`}>
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
                        <Edit2 className="w-4 h-4" />
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
              <FormField label="区块编码" required error={errors.blockCode}>
                <Input
                  value={formData.blockCode || ''}
                  onChange={(e) => setFormData({ ...formData, blockCode: e.target.value })}
                  placeholder="如：BK001"
                />
              </FormField>
              <FormField label="区块名称" required error={errors.blockName}>
                <Input
                  value={formData.blockName || ''}
                  onChange={(e) => setFormData({ ...formData, blockName: e.target.value })}
                  placeholder="请输入区块名称"
                />
              </FormField>
            </div>

            <FormField label="所属区域">
              <Input
                value={formData.zoneOid || ''}
                onChange={(e) => setFormData({ ...formData, zoneOid: e.target.value })}
                placeholder="请输入所属区域"
              />
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
              <FormField label="区块类型">
                <Input
                  value={formData.blockType || ''}
                  onChange={(e) => setFormData({ ...formData, blockType: e.target.value })}
                  placeholder="如：种植区"
                />
              </FormField>
              <FormField label="排序">
                <Input
                  type="number"
                  value={formData.sortOrder || 0}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                  placeholder="排序序号"
                />
              </FormField>
            </div>

            <FormField label="状态">
              <select
                value={formData.status || 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
