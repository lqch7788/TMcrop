/**
 * 区块管理页面
 * 功能：管理基地下的区域（如温室大棚、露天种植区等）
 * 区域类型：温室大棚、塑料大棚、玻璃温室、日光温室、露天种植区、其他
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Grid3X3, Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, MapPin, Layers, Loader2, AlertTriangle, Home } from 'lucide-react';
import { Modal, FormField, Input, Textarea } from '../components/ui/Modal';
import { useSettingsData } from '../components/common/settings/SettingsDataProvider';

// 区域类型选项
const ZONE_TYPES = [
  { value: 'greenhouse', label: '温室大棚' },
  { value: 'plastic_house', label: '塑料大棚' },
  { value: 'glass_house', label: '玻璃温室' },
  { value: 'solar_greenhouse', label: '日光温室' },
  { value: 'open_field', label: '露天种植区' },
  { value: 'other', label: '其他' },
];

// 获取区域类型显示名称
const getZoneTypeName = (type: string) => {
  const found = ZONE_TYPES.find(z => z.value === type);
  return found ? found.label : type || '-';
};

// 区域数据类型
interface Zone {
  id: string;
  zoneCode: string;
  zoneName: string;
  baseOid: string;       // 所属基地
  baseName?: string;      // 基地名称（用于显示）
  zoneType: string;       // 区域类型
  area: number;           // 面积
  sortOrder: number;
  status: string;
  description: string;
  createdAt: string;
}

const API_BASE = '/api/basic-data/zones';

// 获取认证头
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
};

export default function BlockManagement() {
  // 从全局设置获取基地列表
  const { greenhouses, dictionaries } = useSettingsData();
  const [zones, setZones] = useState<Zone[]>([]);
  const [searchText, setSearchText] = useState('');
  const [baseFilter, setBaseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [formData, setFormData] = useState<Partial<Zone>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 将 greenhouses 转换为基地选项
  const baseOptions = useMemo(() => {
    return greenhouses.map(gh => ({
      value: gh.oid || gh.id,
      label: gh.name || gh.greenhouseName || '未命名基地'
    }));
  }, [greenhouses]);

  // 加载区域数据
  const loadZones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_BASE, { headers: getAuthHeaders() });
      const result = await response.json();
      if (result.success) {
        // 合并基地名称
        const zonesWithBaseName = (result.data || []).map((zone: Zone) => {
          const base = greenhouses.find(gh => gh.oid === zone.baseOid || gh.id === zone.baseOid);
          return {
            ...zone,
            baseName: base?.name || base?.greenhouseName || zone.baseOid || '-'
          };
        });
        setZones(zonesWithBaseName);
      } else {
        setError('获取区域数据失败');
      }
    } catch (err) {
      console.error('加载区域数据失败:', err);
      setError('加载区域数据失败');
    } finally {
      setLoading(false);
    }
  }, [greenhouses]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  // 过滤区域
  const filteredZones = zones.filter(zone => {
    const matchSearch = !searchText ||
      zone.zoneName?.toLowerCase().includes(searchText.toLowerCase()) ||
      zone.zoneCode?.toLowerCase().includes(searchText.toLowerCase()) ||
      getZoneTypeName(zone.zoneType).toLowerCase().includes(searchText.toLowerCase());
    const matchBase = baseFilter === 'all' || zone.baseOid === baseFilter;
    const matchStatus = statusFilter === 'all' || zone.status === statusFilter;
    return matchSearch && matchBase && matchStatus;
  });

  const totalPages = Math.ceil(filteredZones.length / pageSize);
  const paginatedZones = filteredZones.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleOpenModal = (zone?: Zone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData(zone);
    } else {
      setEditingZone(null);
      setFormData({ status: 'active', zoneType: 'greenhouse' });
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingZone(null);
    setFormData({});
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.zoneCode?.trim()) newErrors.zoneCode = '请输入区域编码';
    if (!formData.zoneName?.trim()) newErrors.zoneName = '请输入区域名称';
    if (!formData.baseOid?.trim()) newErrors.baseOid = '请选择所属基地';
    if (!formData.zoneType?.trim()) newErrors.zoneType = '请选择区域类型';
    if (!formData.area || formData.area <= 0) newErrors.area = '请输入有效面积';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (editingZone) {
        const response = await fetch(`${API_BASE}/${editingZone.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            zoneName: formData.zoneName,
            zoneCode: formData.zoneCode,
            baseOid: formData.baseOid,
            zoneType: formData.zoneType,
            area: formData.area,
            sortOrder: formData.sortOrder,
            status: formData.status,
            description: formData.description,
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadZones();
          handleCloseModal();
        } else {
          alert(result.error || '更新失败');
        }
      } else {
        const response = await fetch(API_BASE, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            zoneName: formData.zoneName,
            zoneCode: formData.zoneCode,
            baseOid: formData.baseOid,
            zoneType: formData.zoneType,
            area: formData.area,
            sortOrder: formData.sortOrder,
            description: formData.description,
          }),
        });
        const result = await response.json();
        if (result.success) {
          await loadZones();
          handleCloseModal();
        } else {
          alert(result.error || '创建失败');
        }
      }
    } catch (err) {
      console.error('保存区域失败:', err);
      alert('保存区域失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该区域吗？')) return;
    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const result = await response.json();
      if (result.success) {
        await loadZones();
      } else {
        alert(result.error || '删除失败');
      }
    } catch (err) {
      console.error('删除区域失败:', err);
      alert('删除区域失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
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
            <p className="text-gray-500">管理基地下的区域信息</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '区域总数', value: zones.length, color: 'bg-amber-500' },
          { label: '在用区域', value: zones.filter(z => z.status === 'active').length, color: 'bg-emerald-500' },
          { label: '闲置区域', value: zones.filter(z => z.status === 'inactive').length, color: 'bg-gray-500' },
          { label: '总面积(亩)', value: zones.reduce((sum, z) => sum + (z.area || 0), 0).toLocaleString(), color: 'bg-purple-500' },
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
                  placeholder="搜索区域名称或编码..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* 基地筛选 */}
            <select
              value={baseFilter}
              onChange={(e) => setBaseFilter(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">全部基地</option>
              {baseOptions.map(opt => (
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
            新增区域
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">区域编码</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">区域名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">所属基地</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">区域类型</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">面积(亩)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedZones.map((zone) => (
                <tr key={zone.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-amber-600">{zone.zoneCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">{zone.zoneName}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Home className="w-3 h-3" />
                      {zone.baseName || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {getZoneTypeName(zone.zoneType)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{(zone.area || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[zone.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-600'}`}>
                      {zone.status === 'active' ? '在用' : '闲置'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(zone)}
                        className="p-1 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(zone.id)}
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
            显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredZones.length)} 条，共 {filteredZones.length} 条
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
          title={editingZone ? '编辑区域' : '新增区域'}
          onConfirm={handleSubmit}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="区域编码" required error={errors.zoneCode}>
                <Input
                  value={formData.zoneCode || ''}
                  onChange={(e) => setFormData({ ...formData, zoneCode: e.target.value })}
                  placeholder="如：ZONE001"
                />
              </FormField>
              <FormField label="区域名称" required error={errors.zoneName}>
                <Input
                  value={formData.zoneName || ''}
                  onChange={(e) => setFormData({ ...formData, zoneName: e.target.value })}
                  placeholder="请输入区域名称"
                />
              </FormField>
            </div>

            <FormField label="所属基地" required error={errors.baseOid}>
              <select
                value={formData.baseOid || ''}
                onChange={(e) => setFormData({ ...formData, baseOid: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">请选择所属基地</option>
                {baseOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="区域类型" required error={errors.zoneType}>
              <select
                value={formData.zoneType || ''}
                onChange={(e) => setFormData({ ...formData, zoneType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">请选择区域类型</option>
                {ZONE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
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
              <FormField label="排序">
                <Input
                  type="number"
                  value={formData.sortOrder || 0}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                  placeholder="排序序号"
                />
              </FormField>
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
            </div>

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
