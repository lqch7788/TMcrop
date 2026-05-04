import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Search, Filter, Plus, Eye, Edit, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, CheckCircle, Clock, X, Trash2, Building2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useGreenhouses, useWarehouses, useSettingsData } from '../components/common/settings/SettingsDataProvider';

type BaseData = {
  id: number;
  name: string;
  area: number;
  unit: string;
  crop: string;
  growthDay: number;
  status: string;
  statusText: string;
  manager: string;
  phone: string;
  soilType: string;
  ph: number;
  coords: string;
  city: string;
  province: string;
  lng: number;
  lat: number;
  intro: string;
  greenhouseCount?: number;
  fieldArea?: number;
};

type CompanyGroup = {
  id: number;
  name: string;
  bases: BaseData[];
};

export default function BaseSettings() {
  const { toast } = useToast();
  // 从 SettingsDataProvider 获取数据
  const { greenhouses, warehouses, refreshGreenhouses, refreshWarehouses } = useSettingsData();
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const navigate = useNavigate();

  // 当 greenhouses 数据加载后，构建 companyGroups 结构
  useEffect(() => {
    if (greenhouses && greenhouses.length > 0) {
      // 按公司/区域分组 greenhouses 数据
      const grouped = greenhouses.reduce((acc, greenhouse) => {
        // 使用 company_name 字段，如果没有则用 location
        const companyName = greenhouse.companyName || greenhouse.company_name || greenhouse.location || '默认公司';
        if (!acc[companyName]) {
          acc[companyName] = {
            id: companyName.charCodeAt(0),
            name: companyName,
            bases: []
          };
        }
        // 将 greenhouse 转换为 base 格式，使用 API 返回的完整字段
        const base: BaseData = {
          id: parseInt(greenhouse.id) || 0,
          name: greenhouse.name,
          area: greenhouse.area || 0,
          unit: '亩',
          crop: greenhouse.crop || '',
          growthDay: greenhouse.growthDay || greenhouse.growth_day || 0,
          status: greenhouse.status === 'using' ? 'planting' : greenhouse.status,
          statusText: greenhouse.status === 'using' ? '使用中' : (greenhouse.status === 'active' ? '种植中' : greenhouse.status || '种植中'),
          manager: greenhouse.manager || '',
          phone: greenhouse.phone || '',
          soilType: greenhouse.soilType || greenhouse.soil_type || '',
          ph: greenhouse.ph || 0,
          coords: greenhouse.lng && greenhouse.lat ? `${greenhouse.lng},${greenhouse.lat}` : '',
          city: greenhouse.location || '',
          province: '',
          lng: greenhouse.lng || 0,
          lat: greenhouse.lat || 0,
          intro: greenhouse.intro || `${greenhouse.name}，类型：${greenhouse.greenhouseType || '温室'}，面积：${greenhouse.area || 0}亩`,
          greenhouseCount: greenhouse.greenhouseCount || greenhouse.greenhouse_count || 0,
          fieldArea: greenhouse.fieldArea || greenhouse.field_area || 0
        };
        acc[companyName].bases.push(base);
        return acc;
      }, {} as Record<string, CompanyGroup>);

      setCompanyGroups(Object.values(grouped));
    }
  }, [greenhouses]);

  // 当 companyGroups 更新时，同步更新 expandedCompanies
  useEffect(() => {
    if (companyGroups.length > 0) {
      setExpandedCompanies(companyGroups.map(g => g.id));
    }
  }, [companyGroups]);

  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cropFilter, setCropFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [addType, setAddType] = useState<'company' | 'base'>('base');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{type: 'company' | 'base', data: BaseData | CompanyGroup, companyId?: number} | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<number[]>([]);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  const parkData = useMemo(() => companyGroups.flatMap(group => group.bases.map(base => ({ ...base, company: group.name, companyId: group.id }))), [companyGroups]);

  const toggleCompany = (companyId: number) => {
    if (expandedCompanies.includes(companyId)) {
      setExpandedCompanies(expandedCompanies.filter(id => id !== companyId));
    } else {
      setExpandedCompanies([...expandedCompanies, companyId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => item.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const filteredData = parkData.filter(item => {
    if (searchName && !item.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (cropFilter !== 'all' && item.crop !== cropFilter) return false;
    return true;
  });

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const stats = {
    total: parkData.length,
    planting: parkData.filter(p => p.status === 'planting').length,
    fallow: parkData.filter(p => p.status === 'fallow').length,
  };

  const crops = [...new Set(parkData.map(p => p.crop))];

  return (
    <div className="space-y-6">
      {/* 基地设置头部卡片 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">基地设置</h1>
            <p className="text-gray-500">管理基地信息配置</p>
          </div>
        </div>
      </div>

      {/* 搜索筛选区域 */}
      <div className="bg-white/90 backdrop-blur-sm border border-blue-200/60 rounded-xl shadow-lg shadow-blue-200/20 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">基地/区域名称</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
              <input
                type="text"
                placeholder="搜索基地/区域名称..."
                value={searchName}
                onChange={(e) => {
                  setSearchName(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="planting">种植中</option>
              <option value="fallow">休耕中</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">作物类型</label>
            <select
              value={cropFilter}
              onChange={(e) => {
                setCropFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
            >
              <option value="all">全部作物</option>
              {crops.map(crop => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white/90 backdrop-blur-sm border border-blue-200/60 rounded-xl overflow-hidden shadow-lg shadow-blue-200/20">
        {/* 表头 */}
        <div className="px-4 py-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">基地列表</h3>
            <div className="flex items-center gap-4">
              {/* 统计卡片 */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100/50 rounded-lg">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">地块总数</span>
                  <span className="text-lg font-bold text-gray-800">{stats.total}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100/50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">种植中</span>
                  <span className="text-lg font-bold text-green-600">{stats.planting}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100/50 rounded-lg">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-gray-600">休耕中</span>
                  <span className="text-lg font-bold text-yellow-600">{stats.fallow}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3 py-1.5 text-white rounded-lg text-sm font-medium flex items-center gap-1 ${isEditing ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-600 hover:bg-blue-500'}`}
                >
                  <Edit className="w-4 h-4" />
                  {isEditing ? '完成' : '编辑'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">所属公司</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">基地/区域名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">面积</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">当前作物</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">生长天数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">负责人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companyGroups.map((company) => (
                <React.Fragment key={company.id}>
                  {/* 公司行 */}
                  <tr
                    className={`bg-blue-50/50 ${!isEditing ? 'hover:bg-blue-100/60 cursor-pointer' : ''}`}
                    onClick={() => !isEditing && toggleCompany(company.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!isEditing && (
                          expandedCompanies.includes(company.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          )
                        )}
                        <span className="font-medium text-gray-900">{company.name}</span>
                        <span className="text-xs text-gray-500">({company.bases.length}个基地)</span>
                      </div>
                    </td>
                    <td colSpan={6} className="px-4 py-3">
                      {isEditing && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingItem({ type: 'company', data: company }); }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="编辑公司"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmModalConfig({
                                title: '删除公司警告',
                                message: '删除公司会导致所有相关数据无法读取和使用！请提前备份数据，否则后果自负！',
                                type: 'danger',
                                onConfirm: () => {
                                  setConfirmModalConfig({
                                    title: '确认删除',
                                    message: '确定要删除公司 ' + company.name + ' 吗？此操作不可恢复！',
                                    type: 'danger',
                                    onConfirm: () => {
                                      setCompanyGroups(companyGroups.filter(c => c.id !== company.id));
                                    }
                                  });
                                  setShowConfirmModal(true);
                                }
                              });
                              setShowConfirmModal(true);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="删除公司"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {/* 基地行 */}
                  {expandedCompanies.includes(company.id) && company.bases
                    .filter(item => {
                      if (searchName && !item.name.toLowerCase().includes(searchName.toLowerCase())) return false;
                      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
                      if (cropFilter !== 'all' && item.crop !== cropFilter) return false;
                      return true;
                    })
                    .map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/40">
                      <td className="px-4 py-3 text-sm text-gray-500"></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate('/', { state: { baseId: item.id, baseName: item.name } })}
                          className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {item.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.area} {item.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.crop}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.growthDay > 0 ? `第${item.growthDay}天` : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'planting' ? 'bg-green-100 text-green-700 border border-green-200' :
                          item.status === 'fallow' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                          'bg-gray-100 text-gray-600 border border-gray-200'
                        }`}>
                          {item.statusText}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.manager}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isEditing && (
                            <>
                              <button
                                onClick={() => setEditingItem({ type: 'base', data: item, companyId: company.id })}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                                title="编辑基地"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmModalConfig({
                                    title: '删除基地警告',
                                    message: '删除基地会导致所有相关数据无法读取和使用！请提前备份数据，否则后果自负！',
                                    type: 'danger',
                                    onConfirm: () => {
                                      setConfirmModalConfig({
                                        title: '确认删除',
                                        message: '确定要删除基地 ' + item.name + ' 吗？此操作不可恢复！',
                                        type: 'danger',
                                        onConfirm: () => {
                                          setCompanyGroups(companyGroups.map(c => {
                                            if (c.id === company.id) {
                                              return { ...c, bases: c.bases.filter(b => b.id !== item.id) };
                                            }
                                            return c;
                                          }));
                                        }
                                      });
                                      setShowConfirmModal(true);
                                    }
                                  });
                                  setShowConfirmModal(true);
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                                title="删除基地"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setEditingItem({ type: 'base', data: item, companyId: company.id })}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="px-4 py-3 border-t border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              第 {currentPage} / {totalPages} 页，共 {totalItems} 条
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 text-gray-500 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="首页"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 text-gray-500 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="上一页"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 text-gray-500 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="下一页"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 text-gray-500 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="末页"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 确认弹窗 */}
      {showConfirmModal && confirmModalConfig && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className={`text-lg font-semibold ${confirmModalConfig.type === 'danger' ? 'text-red-600' : confirmModalConfig.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'}`}>
                {confirmModalConfig.title}
              </h2>
            </div>
            <div className="p-6">
              <p className="text-gray-700">{confirmModalConfig.message}</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  confirmModalConfig.onConfirm();
                  setShowConfirmModal(false);
                }}
                className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${
                  confirmModalConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {(isAddingNew || editingItem) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-blue-200">
            <div className="px-6 py-4 border-b border-blue-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {editingItem ? (editingItem.type === 'company' ? '编辑公司' : '编辑基地') : (addType === 'company' ? '新增公司' : '新增基地')}
              </h2>
              <button onClick={() => { setIsAddingNew(false); setEditingItem(null); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!editingItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">新增类型</label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value as 'company' | 'base')}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700"
                  >
                    <option value="company">新增公司</option>
                    <option value="base">新增基地</option>
                  </select>
                </div>
              )}

              {(!editingItem && addType === 'base') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">所属公司</label>
                  <select
                    value={selectedCompanyId || ''}
                    onChange={(e) => setSelectedCompanyId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700"
                  >
                    <option value="">请选择公司</option>
                    {companyGroups.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {editingItem?.type === 'company' || addType === 'company' ? '公司名称' : '基地名称'}
                </label>
                <input
                  type="text"
                  id="editName"
                  defaultValue={editingItem?.data?.name || ''}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400"
                  placeholder={editingItem?.type === 'company' || addType === 'company' ? '请输入公司名称' : '请输入基地名称'}
                />
              </div>

              {(!editingItem || editingItem.type === 'base') && addType === 'base' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">面积</label>
                      <input type="number" id="editArea" defaultValue={editingItem?.data?.area || ''} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400" placeholder="如：300" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">单位</label>
                      <select id="editUnit" defaultValue={editingItem?.data?.unit || '亩'} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                        <option value="亩">亩</option>
                        <option value="平方米">平方米</option>
                        <option value="公顷">公顷</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">作物</label>
                      <input type="text" id="editCrop" defaultValue={editingItem?.data?.crop || ''} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400" placeholder="如：水稻" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">负责人</label>
                      <input type="text" id="editManager" defaultValue={editingItem?.data?.manager || ''} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400" placeholder="请输入负责人" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">联系电话</label>
                    <input type="text" id="editPhone" defaultValue={editingItem?.data?.phone || ''} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400" placeholder="请输入联系电话" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">基地简介</label>
                    <textarea id="editIntro" rows={3} defaultValue={editingItem?.data?.intro || ''} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400" placeholder="请输入基地简介"></textarea>
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-blue-100 flex justify-end gap-2">
              <button
                onClick={() => { setIsAddingNew(false); setEditingItem(null); }}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const nameInput = document.getElementById('editName') as HTMLInputElement;
                  const name = nameInput?.value;
                  if (!name) { toast.error('请输入名称'); return; }

                  if (editingItem) {
                    // 编辑模式
                    setConfirmModalConfig({
                      title: '修改确认',
                      message: '修改公司或基地信息可能会影响相关数据的关联！请确认是否继续？',
                      type: 'warning',
                      onConfirm: () => {
                        if (editingItem.type === 'company') {
                          setCompanyGroups(companyGroups.map(c =>
                            c.id === editingItem.data.id ? { ...c, name } : c
                          ));
                        } else {
                          const areaInput = document.getElementById('editArea') as HTMLInputElement;
                          const cropInput = document.getElementById('editCrop') as HTMLInputElement;
                          const managerInput = document.getElementById('editManager') as HTMLInputElement;
                          const phoneInput = document.getElementById('editPhone') as HTMLInputElement;
                          const introInput = document.getElementById('editIntro') as HTMLTextAreaElement;
                          setCompanyGroups(companyGroups.map(c => {
                            if (c.id === editingItem.companyId) {
                              return {
                                ...c,
                                bases: c.bases.map(b =>
                                  b.id === editingItem.data.id ? {
                                    ...b,
                                    name,
                                    area: Number(areaInput?.value) || b.area,
                                    crop: cropInput?.value || b.crop,
                                    manager: managerInput?.value || b.manager,
                                    phone: phoneInput?.value || b.phone,
                                    intro: introInput?.value || b.intro
                                  } : b
                                )
                              };
                            }
                            return c;
                          }));
                        }
                        setEditingItem(null);
                      }
                    });
                    setShowConfirmModal(true);
                  } else {
                    // 新增模式
                    if (addType === 'company') {
                      setCompanyGroups([...companyGroups, {
                        id: Date.now(),
                        name,
                        bases: []
                      }]);
                    } else {
                      if (!selectedCompanyId) { toast.error('请选择公司'); return; }
                      setCompanyGroups(companyGroups.map(c => {
                        if (c.id === selectedCompanyId) {
                          return {
                            ...c,
                            bases: [...c.bases, {
                              id: Date.now(),
                              name,
                              area: Number((document.getElementById('editArea') as HTMLInputElement)?.value) || 0,
                              unit: (document.getElementById('editUnit') as HTMLSelectElement)?.value || '亩',
                              crop: (document.getElementById('editCrop') as HTMLInputElement)?.value || '',
                              growthDay: 0,
                              status: 'planting',
                              statusText: '种植中',
                              manager: (document.getElementById('editManager') as HTMLInputElement)?.value || '',
                              phone: (document.getElementById('editPhone') as HTMLInputElement)?.value || '',
                              soilType: '',
                              ph: 0,
                              coords: '',
                              city: '',
                              province: '',
                              lng: 0,
                              lat: 0,
                              intro: (document.getElementById('editIntro') as HTMLTextAreaElement)?.value || ''
                            }]
                          };
                        }
                        return c;
                      }));
                    }
                    setIsAddingNew(false);
                    setSelectedCompanyId(null);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
