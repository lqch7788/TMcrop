import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Search, Filter, Plus, Eye, Edit, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, CheckCircle, Clock, X, Trash2, Building2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { TextArea } from '../components/ui/TextArea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

// localStorage key
const COMPANY_GROUPS_KEY = 'yuanxingtu_company_groups';

// 初始数据 - 与园区基地总览表一致
const defaultCompanyGroups = [
  {
    id: 1,
    name: '宁波帮帮忙公司',
    bases: [
      { id: 2, name: '上海松江基地', area: 300, unit: '亩', crop: '水稻', growthDay: 30, status: 'planting', statusText: '种植中', manager: '郭靖', phone: '13800138002', soilType: '沙壤土', ph: 6.8, coords: '121.2234,31.0342', city: '上海', province: '上海', lng: 121.2234, lat: 31.0342, intro: '总种植面积300亩，包含玻璃温室2个，连栋薄膜温室5个，日光拱棚10个，大田200亩。', greenhouseCount: 17, fieldArea: 200 },
      { id: 3, name: '上海崇明基地', area: 800, unit: '亩', crop: '小麦', growthDay: 0, status: 'fallow', statusText: '休耕中', manager: '萧峰', phone: '13800138003', soilType: '黏土', ph: 6.2, coords: '121.24416,31.73610', city: '上海', province: '上海', lng: 121.24416, lat: 31.73610, intro: '总种植面积800亩，包含玻璃温室3个，连栋薄膜温室8个，日光拱棚15个，大田650亩。', greenhouseCount: 26, fieldArea: 650 },
      { id: 7, name: '上海嘉定基地', area: 350, unit: '亩', crop: '蔬菜', growthDay: 25, status: 'planting', statusText: '种植中', manager: '杨过', phone: '13800138007', soilType: '沙土', ph: 7.0, coords: '121.2654,31.3754', city: '上海', province: '上海', lng: 121.2654, lat: 31.3754, intro: '总种植面积350亩，包含玻璃温室4个，连栋薄膜温室6个，日光拱棚8个，大田200亩。', greenhouseCount: 18, fieldArea: 200 },
      { id: 12, name: '上海奉贤基地', area: 550, unit: '亩', crop: '玉米', growthDay: 50, status: 'planting', statusText: '种植中', manager: '张无忌', phone: '13800138012', soilType: '黏土', ph: 6.8, coords: '121.4745,30.9123', city: '上海', province: '上海', lng: 121.4745, lat: 30.9123, intro: '总种植面积550亩，包含玻璃温室2个，连栋薄膜温室4个，日光拱棚12个，大田450亩。', greenhouseCount: 18, fieldArea: 450 },
    ]
  },
  {
    id: 2,
    name: '成都帮帮您公司',
    bases: [
      { id: 1, name: '西安雁塔基地', area: 500, unit: '亩', crop: '番茄', growthDay: 45, status: 'planting', statusText: '种植中', manager: '令狐冲', phone: '13800138001', soilType: '壤土', ph: 6.5, coords: '108.9470,34.2194', city: '西安', province: '陕西', lng: 108.9470, lat: 34.2194, intro: '总种植面积500亩，包含玻璃温室3个，连栋薄膜温室7个，日光拱棚12个，大田380亩。', greenhouseCount: 22, fieldArea: 380 },
      { id: 6, name: '西安高新基地', area: 200, unit: '亩', crop: '草莓', growthDay: 55, status: 'planting', statusText: '种植中', manager: '狄云', phone: '13800138006', soilType: '营养土', ph: 6.4, coords: '108.8789,34.2181', city: '西安', province: '陕西', lng: 108.8789, lat: 34.2181, intro: '总种植面积200亩，包含玻璃温室5个，连栋薄膜温室3个，日光拱棚5个，大田100亩。', greenhouseCount: 13, fieldArea: 100 },
      { id: 4, name: '宁波北仑基地', area: 600, unit: '亩', crop: '茶叶', growthDay: 60, status: 'planting', statusText: '种植中', manager: '石破天', phone: '13800138004', soilType: '壤土', ph: 6.6, coords: '121.9701,29.8947', city: '宁波', province: '浙江', lng: 121.9701, lat: 29.8947, intro: '总种植面积600亩，包含玻璃温室1个，连栋薄膜温室4个，日光拱棚8个，大田550亩。', greenhouseCount: 13, fieldArea: 550 },
      { id: 8, name: '宁波镇海基地', area: 280, unit: '亩', crop: '水稻', growthDay: 40, status: 'planting', statusText: '种植中', manager: '陈家洛', phone: '13800138008', soilType: '壤土', ph: 6.7, coords: '121.7532,29.9543', city: '宁波', province: '浙江', lng: 121.7532, lat: 29.9543, intro: '总种植面积280亩，包含玻璃温室2个，连栋薄膜温室3个，日光拱棚6个，大田220亩。', greenhouseCount: 11, fieldArea: 220 },
      { id: 10, name: '宁波慈溪基地', area: 420, unit: '亩', crop: '葡萄', growthDay: 75, status: 'planting', statusText: '种植中', manager: '袁承志', phone: '13800138010', soilType: '壤土', ph: 6.5, coords: '121.2678,30.1543', city: '宁波', province: '浙江', lng: 121.2678, lat: 30.1543, intro: '总种植面积420亩，包含玻璃温室3个，连栋薄膜温室5个，日光拱棚10个，大田320亩。', greenhouseCount: 18, fieldArea: 320 },
    ]
  },
];

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

// 从 localStorage 读取数据
const loadCompanyGroups = (): CompanyGroup[] => {
  try {
    const stored = localStorage.getItem(COMPANY_GROUPS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('读取基地数据失败:', e);
  }
  return defaultCompanyGroups;
};

// 保存数据到 localStorage 并通知园区总览更新
const saveCompanyGroups = (data: CompanyGroup[]) => {
  localStorage.setItem(COMPANY_GROUPS_KEY, JSON.stringify(data));
  // 触发园区总览页面刷新
  window.dispatchEvent(new CustomEvent('companyGroupsUpdated'));
};

// 获取共享数据（供园区总览使用）
export const getCompanyGroups = (): CompanyGroup[] => {
  return loadCompanyGroups();
};

export default function BaseSettings() {
  const { toast } = useToast();
  const [companyGroups, setCompanyGroupsState] = useState<CompanyGroup[]>(loadCompanyGroups);
  const navigate = useNavigate();

  // editingItem 必须在使用它的 useEffect 之前声明
  const [editingItem, setEditingItem] = useState<{type: 'company' | 'base', data: BaseData | CompanyGroup, companyId?: number} | null>(null);
  const [editUnit, setEditUnit] = useState('亩'); // 编辑弹窗中单位字段的受控状态

  // 编辑弹窗打开/关闭时，同步单位字段状态
  useEffect(() => {
    if (editingItem?.type === 'base') {
      setEditUnit((editingItem.data as BaseData).unit || '亩');
    } else {
      setEditUnit('亩');
    }
  }, [editingItem]);

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

  // 更新状态并保存到 localStorage
  const setCompanyGroups = (newData: CompanyGroup[]) => {
    setCompanyGroupsState(newData);
    saveCompanyGroups(newData);
  };

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
            <Label className="text-gray-700">基地/区域名称</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
              <Input
                type="text"
                placeholder="搜索基地/区域名称..."
                value={searchName}
                onChange={(e) => {
                  setSearchName(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-gray-700">状态</Label>
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="planting">种植中</SelectItem>
                <SelectItem value="fallow">休耕中</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-gray-700">作物类型</Label>
            <Select
              value={cropFilter}
              onValueChange={(val) => {
                setCropFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="全部作物" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部作物</SelectItem>
                {crops.map(crop => (
                  <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <Button size="sm" onClick={() => setIsAddingNew(true)}>
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
                <Button size="sm" onClick={() => setIsEditing(!isEditing)}>
                  <Edit className="w-4 h-4" />
                  {isEditing ? '完成' : '编辑'}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">所属公司</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">基地/区域名称</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">面积</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">当前作物</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">生长天数</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">负责人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 bg-white">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); setEditingItem({ type: 'company', data: company }); }}
                            title="编辑公司"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
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
                            title="删除公司"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/', { state: { baseId: item.id, baseName: item.name } })}
                          className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {item.name}
                        </Button>
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingItem({ type: 'base', data: item, companyId: company.id })}
                                title="编辑基地"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
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
                                title="删除基地"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingItem({ type: 'base', data: item, companyId: company.id })}
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
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
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              第 {currentPage} / {totalPages} 页，共 {totalItems} 条
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="首页"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                title="上一页"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                title="下一页"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                title="末页"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
              >
                取消
              </Button>
              <Button
                variant={confirmModalConfig.type === 'danger' ? 'destructive' : 'default'}
                size="sm"
                onClick={() => {
                  confirmModalConfig.onConfirm();
                  setShowConfirmModal(false);
                }}
              >
                确认
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {(isAddingNew || editingItem) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-blue-200">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-green-500 to-emerald-600">
              <h2 className="text-lg font-semibold text-white">
                {editingItem ? (editingItem.type === 'company' ? '编辑公司' : '编辑基地') : (addType === 'company' ? '新增公司' : '新增基地')}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => { setIsAddingNew(false); setEditingItem(null); }}>
                <X className="w-5 h-5 text-white" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {!editingItem && (
                <div>
                  <Label className="text-gray-700 mb-2">新增类型</Label>
                  <Select
                    value={addType}
                    onValueChange={(val) => setAddType(val as 'company' | 'base')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">新增公司</SelectItem>
                      <SelectItem value="base">新增基地</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(!editingItem && addType === 'base') && (
                <div>
                  <Label className="text-gray-700 mb-2">所属公司</Label>
                  <Select
                    value={selectedCompanyId ? String(selectedCompanyId) : ''}
                    onValueChange={(val) => setSelectedCompanyId(val ? Number(val) : 0)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择公司" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyGroups.map(company => (
                        <SelectItem key={company.id} value={String(company.id)}>{company.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-gray-700 mb-2">
                  {editingItem?.type === 'company' || addType === 'company' ? '公司名称' : '基地名称'}
                </Label>
                <Input
                  type="text"
                  id="editName"
                  defaultValue={editingItem?.data?.name || ''}
                  placeholder={editingItem?.type === 'company' || addType === 'company' ? '请输入公司名称' : '请输入基地名称'}
                />
              </div>

              {(!editingItem || editingItem.type === 'base') && addType === 'base' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 mb-2">面积</Label>
                      <Input type="number" id="editArea" defaultValue={editingItem?.data?.area || ''} placeholder="如：300" />
                    </div>
                    <div>
                      <Label className="text-gray-700 mb-2">单位</Label>
                      <Select value={editUnit} onValueChange={setEditUnit}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="亩">亩</SelectItem>
                          <SelectItem value="平方米">平方米</SelectItem>
                          <SelectItem value="公顷">公顷</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 mb-2">作物</Label>
                      <Input type="text" id="editCrop" defaultValue={editingItem?.data?.crop || ''} placeholder="如：水稻" />
                    </div>
                    <div>
                      <Label className="text-gray-700 mb-2">负责人</Label>
                      <Input type="text" id="editManager" defaultValue={editingItem?.data?.manager || ''} placeholder="请输入负责人" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-700 mb-2">联系电话</Label>
                    <Input type="text" id="editPhone" defaultValue={editingItem?.data?.phone || ''} placeholder="请输入联系电话" />
                  </div>
                  <div>
                    <Label className="text-gray-700 mb-2">基地简介</Label>
                    <TextArea id="editIntro" minRows={3} defaultValue={editingItem?.data?.intro || ''} placeholder="请输入基地简介" />
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-blue-100 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setIsAddingNew(false); setEditingItem(null); }}
              >
                取消
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const nameInput = document.getElementById('editName') as HTMLInputElement;
                  const name = nameInput?.value;
                  if (!name) { toast.error('请输入名称'); return; }

                  if (editingItem) {
                    // 编辑模式 - 直接更新，不弹确认框
                    if (editingItem.type === 'company') {
                      const targetId = (editingItem.data as CompanyGroup).id;
                      const newData = companyGroups.map(c =>
                        c.id === targetId ? { ...c, name } : c
                      );
                      setCompanyGroups(newData);
                      toast.success('公司名称已更新');
                    } else {
                      const areaInput = document.getElementById('editArea') as HTMLInputElement;
                      const cropInput = document.getElementById('editCrop') as HTMLInputElement;
                      const managerInput = document.getElementById('editManager') as HTMLInputElement;
                      const phoneInput = document.getElementById('editPhone') as HTMLInputElement;
                      const introInput = document.getElementById('editIntro') as HTMLTextAreaElement;
                      const targetId = (editingItem.data as BaseData).id;
                      const newData = companyGroups.map(c => {
                        if (c.id === editingItem.companyId) {
                          return {
                            ...c,
                            bases: c.bases.map(b =>
                              b.id === targetId ? {
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
                      });
                      setCompanyGroups(newData);
                      toast.success('基地信息已更新');
                    }
                    setEditingItem(null);
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
                              unit: editUnit,
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
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
