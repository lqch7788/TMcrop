/**
 * 区块管理页面
 * 功能：管理基地下的区域（如温室大棚、露天种植区等）
 * 架构：组件 → useZoneStore / useGreenhouseStore (Zustand) → API
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Grid3X3, Plus, Edit2, Trash2, Search, ArrowLeft, ChevronRight, MapPin, Layers, Loader2, AlertTriangle, Home } from 'lucide-react';
import { Modal, FormField, Input, Textarea } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/Pagination';
import { useGreenhouseStore, useZoneStore } from '../stores';
import type { Zone } from '../services/apiBasicDataService';
import { showAlert, showConfirm } from '@/lib/dialogService';

const ZONE_TYPES = [
  { value: 'greenhouse', label: '温室大棚' },
  { value: 'plastic_house', label: '塑料大棚' },
  { value: 'glass_house', label: '玻璃温室' },
  { value: 'solar_greenhouse', label: '日光温室' },
  { value: 'open_field', label: '露天种植区' },
  { value: 'other', label: '其他' },
];

const getZoneTypeName = (type: string) => {
  const found = ZONE_TYPES.find(z => z.value === type);
  return found ? found.label : type || '-';
};

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
};

export default function BlockManagement() {
  const greenhouses = useGreenhouseStore((s) => s.greenhouses);
  const loadGreenhouses = useGreenhouseStore((s) => s.loadGreenhouses);
  const { zones, loading, error, loadZones, addZone, editZone, removeZone } = useZoneStore();
  const [searchText, setSearchText] = useState('');
  const [baseFilter, setBaseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [formData, setFormData] = useState<Partial<Zone>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const baseOptions = useMemo(() => {
    return greenhouses.map(gh => ({
      value: gh.oid || gh.id,
      label: gh.name || gh.greenhouseName || '未命名基地'
    }));
  }, [greenhouses]);

  useEffect(() => {
    loadGreenhouses();
    loadZones();
  }, [loadGreenhouses, loadZones]);

  // 合并基地名称到区域数据
  const zonesWithBaseName = useMemo(() => {
    return zones.map(zone => {
      const base = greenhouses.find(gh => gh.oid === zone.baseOid || gh.id === zone.baseOid);
      return {
        ...zone,
        baseName: base?.name || base?.greenhouseName || zone.baseOid || '-'
      };
    });
  }, [zones, greenhouses]);

  const filteredZones = zonesWithBaseName.filter(zone => {
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
        await editZone(editingZone.id, {
          zoneName: formData.zoneName,
          zoneCode: formData.zoneCode,
          baseOid: formData.baseOid,
          zoneType: formData.zoneType,
          area: formData.area,
          sortOrder: formData.sortOrder,
          status: formData.status,
          description: formData.description,
        });
      } else {
        await addZone({
          zoneName: formData.zoneName,
          zoneCode: formData.zoneCode,
          baseOid: formData.baseOid,
          zoneType: formData.zoneType,
          area: formData.area,
          sortOrder: formData.sortOrder,
          description: formData.description,
        });
      }
      handleCloseModal();
    } catch (err) {
      console.error('保存区域失败:', err);
      await showAlert('保存区域失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!await showConfirm('确定要删除该区域吗？')) return;
    try {
      await removeZone(id);
    } catch (err) {
      console.error('删除区域失败:', err);
      await showAlert('删除区域失败');
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
      <div className="bg-white rounded-xl p-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/settings"
              className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:from-gray-200 hover:to-gray-300 transition-colors"
              title="返回系统设置"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </a>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">区块管理</h1>
              <p className="text-gray-500">管理基地下的区域信息</p>
            </div>
          </div>
        </div>
      </div>

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

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 items-center">
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
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增区域
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">区域编码</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">区域名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">所属基地</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">区域类型</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">面积(亩)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {paginatedZones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                paginatedZones.map((zone) => (
                  <tr key={zone.id} className="hover:bg-emerald-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-amber-600">{zone.zoneCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{zone.zoneName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Home className="w-3 h-3" />
                        {zone.baseName || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {getZoneTypeName(zone.zoneType)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {(zone.area || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[zone.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-600'}`}>
                        {zone.status === 'active' ? '在用' : '闲置'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenModal(zone)}
                          className="text-amber-600 hover:bg-amber-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(zone.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页器 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages || 1}
            onPageChange={(page) => setCurrentPage(page)}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 20, 50, 100]}
            showPageSize
          />
        </div>
      </div>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingZone ? '编辑区域' : '新增区域'}
          onSubmit={handleSubmit}
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
