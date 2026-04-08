import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Search, Filter, Plus, Eye, Edit, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Thermometer, Droplets, Sun, Wind, MapPin, Calendar, User, Ruler, AlertTriangle, CheckCircle, Clock, X, ZoomIn, ZoomOut, Locate, Maximize2, Minimize2, Download, Trash2 } from 'lucide-react';

// 园区/地块数据 - 真实百度地图坐标
// 公司分组数据
const initialCompanyGroups = [
  {
    id: 1,
    name: '宁波帮帮忙公司',
    bases: [
      { id: 2, name: '上海松江基地', area: 300, unit: '亩', crop: '水稻', growthDay: 30, status: 'planting', statusText: '种植中', manager: '李明轩', phone: '13800138002', soilType: '沙壤土', ph: 6.8, coords: '121.2234,31.0342', city: '上海', province: '上海', lng: 121.2234, lat: 31.0342, intro: '总种植面积300亩，包含玻璃温室2个，连栋薄膜温室5个，日光拱棚10个，大田200亩。种植作物：水稻、蔬菜。', greenhouseCount: 17, fieldArea: 200 },
      { id: 3, name: '上海崇明基地', area: 800, unit: '亩', crop: '小麦', growthDay: 0, status: 'fallow', statusText: '休耕中', manager: '王建国', phone: '13800138003', soilType: '黏土', ph: 6.2, coords: '121.24416,31.73610', city: '上海', province: '上海', lng: 121.24416, lat: 31.73610, intro: '总种植面积800亩，包含玻璃温室3个，连栋薄膜温室8个，日光拱棚15个，大田650亩。种植作物：小麦、玉米。', greenhouseCount: 26, fieldArea: 650 },
      { id: 7, name: '上海嘉定基地', area: 350, unit: '亩', crop: '蔬菜', growthDay: 25, status: 'planting', statusText: '种植中', manager: '周志强', phone: '13800138007', soilType: '沙土', ph: 7.0, coords: '121.2654,31.3754', city: '上海', province: '上海', lng: 121.2654, lat: 31.3754, intro: '总种植面积350亩，包含玻璃温室4个，连栋薄膜温室6个，日光拱棚8个，大田200亩。种植作物：叶菜类、瓜果类。', greenhouseCount: 18, fieldArea: 200 },
      { id: 12, name: '上海奉贤基地', area: 550, unit: '亩', crop: '玉米', growthDay: 50, status: 'planting', statusText: '种植中', manager: '杨文博', phone: '13800138012', soilType: '黏土', ph: 6.8, coords: '121.4745,30.9123', city: '上海', province: '上海', lng: 121.4745, lat: 30.9123, intro: '总种植面积550亩，包含玻璃温室2个，连栋薄膜温室4个，日光拱棚12个，大田450亩。种植作物：玉米、大豆。', greenhouseCount: 18, fieldArea: 450 },
    ]
  },
  {
    id: 2,
    name: '成都帮帮您公司',
    bases: [
      { id: 1, name: '西安雁塔基地', area: 500, unit: '亩', crop: '番茄', growthDay: 45, status: 'planting', statusText: '种植中', manager: '张伟民', phone: '13800138001', soilType: '壤土', ph: 6.5, coords: '108.9470,34.2194', city: '西安', province: '陕西', lng: 108.9470, lat: 34.2194, intro: '总种植面积500亩，包含玻璃温室3个，连栋薄膜温室7个，日光拱棚12个，大田380亩。种植作物：番茄、黄瓜、草莓。', greenhouseCount: 22, fieldArea: 380 },
      { id: 6, name: '西安高新基地', area: 200, unit: '亩', crop: '草莓', growthDay: 55, status: 'planting', statusText: '种植中', manager: '孙晓峰', phone: '13800138006', soilType: '营养土', ph: 6.4, coords: '108.8789,34.2181', city: '西安', province: '陕西', lng: 108.8789, lat: 34.2181, intro: '总种植面积200亩，包含玻璃温室5个，连栋薄膜温室3个，日光拱棚5个，大田100亩。种植作物：草莓、番茄。', greenhouseCount: 13, fieldArea: 100 },
      { id: 4, name: '宁波北仑基地', area: 600, unit: '亩', crop: '茶叶', growthDay: 60, status: 'planting', statusText: '种植中', manager: '赵俊杰', phone: '13800138004', soilType: '壤土', ph: 6.6, coords: '121.9701,29.8947', city: '宁波', province: '浙江', lng: 121.9701, lat: 29.8947, intro: '总种植面积600亩，包含玻璃温室1个，连栋薄膜温室4个，日光拱棚8个，大田550亩。种植作物：茶叶、果树。', greenhouseCount: 13, fieldArea: 550 },
      { id: 8, name: '宁波镇海基地', area: 280, unit: '亩', crop: '水稻', growthDay: 40, status: 'planting', statusText: '种植中', manager: '吴海龙', phone: '13800138008', soilType: '壤土', ph: 6.7, coords: '121.7532,29.9543', city: '宁波', province: '浙江', lng: 121.7532, lat: 29.9543, intro: '总种植面积280亩，包含玻璃温室2个，连栋薄膜温室3个，日光拱棚6个，大田220亩。种植作物：水稻、蔬菜。', greenhouseCount: 11, fieldArea: 220 },
      { id: 10, name: '宁波慈溪基地', area: 420, unit: '亩', crop: '葡萄', growthDay: 75, status: 'planting', statusText: '种植中', manager: '陈思远', phone: '13800138010', soilType: '壤土', ph: 6.5, coords: '121.2678,30.1543', city: '宁波', province: '浙江', lng: 121.2678, lat: 30.1543, intro: '总种植面积420亩，包含玻璃温室3个，连栋薄膜温室5个，日光拱棚10个，大田320亩。种植作物：葡萄、柑橘。', greenhouseCount: 18, fieldArea: 320 },
    ]
  },
];

// 类型定义
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
  company?: string;
  companyId?: number;
  greenhouseCount?: number;
  fieldArea?: number;
};

type CompanyGroup = {
  id: number;
  name: string;
  bases: BaseData[];
};

// 初始扁平化的地块数据
const initialParkData = initialCompanyGroups.flatMap(group => group.bases.map(base => ({ ...base, company: group.name, companyId: group.id })));

// 种植历史记录
const plantingHistory = [
  { id: 1, fieldId: 1, year: '2024春', crop: '番茄', yield: 5000, unit: 'kg', revenue: 30000, cost: 15000 },
  { id: 2, fieldId: 1, year: '2023秋', crop: '黄瓜', yield: 4500, unit: 'kg', revenue: 27000, cost: 12000 },
  { id: 3, fieldId: 1, year: '2023春', crop: '番茄', yield: 4800, unit: 'kg', revenue: 28800, cost: 14000 },
  { id: 4, fieldId: 3, year: '2024春', crop: '休耕', yield: 0, unit: 'kg', revenue: 0, cost: 2000 },
  { id: 5, fieldId: 3, year: '2023秋', crop: '小麦', yield: 24000, unit: 'kg', revenue: 48000, cost: 25000 },
];

const statusColors: Record<string, string> = {
  planting: 'bg-green-500',
  fallow: 'bg-yellow-500',
  warning: 'bg-red-500',
  idle: 'bg-gray-400',
};

declare global {
  interface Window {
    L: any;
    map: any;
  }
}

export default function ParkArchive() {
  const [companyGroups, setCompanyGroups] = useState(initialCompanyGroups);
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const parkData = useMemo(() => companyGroups.flatMap(group => group.bases.map(base => ({ ...base, company: group.name, companyId: group.id }))), [companyGroups]);
  const [selectedBase, setSelectedBase] = useState<BaseData | null>(null);
  const [searchName, setSearchName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cropFilter, setCropFilter] = useState('all');
  const [selectedField, setSelectedField] = useState<BaseData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pendingDetailBase, setPendingDetailBase] = useState<BaseData | null>(null);

  // 处理详情弹窗显示 - 确保先退出全屏再显示弹窗
  useEffect(() => {
    if (pendingDetailBase) {
      if (isFullscreen) {
        setIsFullscreen(false);
        // 延迟显示弹窗，确保全屏状态已退出
        const timer = setTimeout(() => {
          setSelectedField(pendingDetailBase);
          setShowDetailModal(true);
          setPendingDetailBase(null);
        }, 100);
        return () => clearTimeout(timer);
      } else {
        setSelectedField(pendingDetailBase);
        setShowDetailModal(true);
        setPendingDetailBase(null);
      }
    }
  }, [pendingDetailBase, isFullscreen]);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 新增/编辑状态
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<{type: 'company' | 'base', data: any, companyId?: number} | null>(null);
  const [addType, setAddType] = useState<'company' | 'base'>('base');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  // 确认弹窗状态
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  // 公司展开状态
  const [expandedCompanies, setExpandedCompanies] = useState<number[]>(companyGroups.map(g => g.id));

  // 切换公司展开/收起
  const toggleCompany = (companyId: number) => {
    if (expandedCompanies.includes(companyId)) {
      setExpandedCompanies(expandedCompanies.filter(id => id !== companyId));
    } else {
      setExpandedCompanies([...expandedCompanies, companyId]);
    }
  };

  // 导出状态
  const [exportFormat, setExportFormat] = useState('excel');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => item.id));
    }
  };

  // 选择单行
  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 导出数据处理
  const handleDoExport = () => {
    const headers = ['基地/区域名称', '面积', '当前作物', '生长天数', '状态', '基地简介', '负责人', '联系电话', '土壤类型', 'pH值', '省份', '城市'];
    const dataToExport = exportMode ? filteredData.filter(item => selectedRows.includes(item.id)) : filteredData;
    const exportData = dataToExport.map(row => ({
      '基地/区域名称': row.name,
      '面积': `${row.area}${row.unit}`,
      '当前作物': row.crop,
      '生长天数': row.growthDay > 0 ? `第${row.growthDay}天` : '-',
      '状态': row.statusText,
      '基地简介': row.intro || '-',
      '负责人': row.manager,
      '联系电话': row.phone,
      '土壤类型': row.soilType,
      'pH值': row.ph,
      '省份': row.province,
      '城市': row.city
    }));

    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFormat === 'csv') {
      content = headers.join(',') + '\n' + exportData.map(row =>
        headers.map(h => `"${row[h] || ''}"`).join(',')
      ).join('\n');
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFormat === 'excel') {
      const tableRows = exportData.map(row =>
        '<tr>' + headers.map(h => '<td>' + (row[h] || '') + '</td>').join('') + '</tr>'
      ).join('');
      content = '<html><head><meta charset="utf-8"></head><body><table border="1"><tr>' +
        headers.map(h => '<th>' + h + '</th>').join('') +
        '</tr>' + tableRows + '</table></body></html>';
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFormat === 'word') {
      const tableRows = exportData.map(row =>
        '<tr>' + headers.map(h => '<td>' + (row[h] || '') + '</td>').join('') + '</tr>'
      ).join('');
      content = '<html><head><meta charset="utf-8"></head><body><table border="1"><tr>' +
        headers.map(h => '<th>' + h + '</th>').join('') +
        '</tr>' + tableRows + '</table></body></html>';
      mimeType = 'application/msword;charset=utf-8';
      extension = 'doc';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `园区基地档案_${new Date().toISOString().slice(0, 10)}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleExportClick = () => {
    if (filteredData.length === 0) {
      alert('没有可导出的数据');
      return;
    }
    setExportMode(true);
    setSelectedRows(filteredData.map(item => item.id));
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要导出的数据');
      return;
    }
    setShowExportModal(true);
  };

  // 过滤数据
  const filteredData = parkData.filter(item => {
    if (searchName && !item.name.toLowerCase().includes(searchName.toLowerCase())) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (cropFilter !== 'all' && item.crop !== cropFilter) return false;
    return true;
  });

  // 分页计算
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // 统计
  const stats = {
    total: parkData.length,
    planting: parkData.filter(p => p.status === 'planting').length,
    fallow: parkData.filter(p => p.status === 'fallow').length,
    warning: parkData.filter(p => p.status === 'warning').length,
    idle: parkData.filter(p => p.status === 'idle').length,
  };

  // 获取作物列表
  const crops = [...new Set(parkData.map(p => p.crop))];

  // 初始化 Leaflet 地图
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        // 创建地图实例 - 以中国为中心
        const map = window.L.map(mapRef.current, {
          center: [30.5, 113.5], // 中国中心
          zoom: 5,
          zoomControl: false,
          crs: window.L.CRS.EPSG3857
        });

        // 添加多种地图图层作为备选
        const mapLayers = [
          // 高德地图
          {
            url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
            subdomains: '1234',
            name: '高德地图'
          },
          // Esri 卫星图
          {
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            subdomains: '',
            name: 'Esri卫星'
          },
          // OpenStreetMap
          {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            subdomains: 'abc',
            name: 'OSM'
          }
        ];

        // 尝试加载第一个图层
        let tileLayer = null;
        for (const layer of mapLayers) {
          try {
            tileLayer = window.L.tileLayer(layer.url, {
              subdomains: layer.subdomains,
              attribution: layer.name,
              maxZoom: 18,
              errorTileUrl: '' // 失败时不显示图片
            });
            tileLayer.addTo(map);
            break;
          } catch (e) {
            console.warn(`加载 ${layer.name} 失败，尝试下一个...`);
          }
        }

        // 添加缩放控件
        window.L.control.zoom({ position: 'bottomright' }).addTo(map);

        // 定义不同状态的图标颜色
        const getIconColor = (status: string) => {
          switch (status) {
            case 'planting': return '#22c55e'; // 绿色
            case 'warning': return '#ef4444'; // 红色
            case 'fallow': return '#eab308'; // 黄色
            default: return '#6b7280'; // 灰色
          }
        };

        // 添加基地标记
        parkData.forEach((base) => {
          const color = getIconColor(base.status);

          // 创建自定义图标
          const icon = window.L.divIcon({
            className: 'custom-marker',
            html: '<div style="' +
              'background-color: ' + color + ';' +
              'width: 24px;' +
              'height: 24px;' +
              'border-radius: 50%;' +
              'border: 3px solid white;' +
              'box-shadow: 0 2px 6px rgba(0,0,0,0.3);' +
              'display: flex;' +
              'align-items: center;' +
              'justify-content: center;' +
              'color: white;' +
              'font-size: 10px;' +
              'font-weight: bold;' +
            '">📍</' + 'div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const marker = window.L.marker([base.lat, base.lng], { icon }).addTo(map);

          // 创建弹出窗口内容
          const popupContent = '<div style="min-width: 200px; padding: 5px;">' +
            '<h4 style="margin: 0 0 10px; font-size: 16px; color: #2e7d32; font-weight: bold;">' + base.name + '</h4>' +
            '<p style="margin: 5px 0; font-size: 13px;"><strong>面积：</strong>' + base.area + base.unit + '</p>' +
            '<p style="margin: 5px 0; font-size: 13px;"><strong>当前作物：</strong>' + base.crop + '</p>' +
            '<p style="margin: 5px 0; font-size: 13px;"><strong>生长天数：</strong>' + (base.growthDay > 0 ? '第' + base.growthDay + '天' : '-') + '</p>' +
            '<p style="margin: 5px 0; font-size: 13px;"><strong>状态：</strong><span style="color: ' + color + '; font-weight: bold;">' + base.statusText + '</span></p>' +
            '<p style="margin: 5px 0; font-size: 13px;"><strong>负责人：</strong>' + base.manager + '</p>' +
            '<p style="margin: 5px 0; font-size: 13px;"><strong>联系电话：</strong>' + base.phone + '</p>' +
            '<button onclick="window.dispatchEvent(new CustomEvent(\'showBaseDetail\', {detail: ' + base.id + '}))" style="' +
              'margin-top: 10px;' +
              'padding: 6px 16px;' +
              'background: #22c55e;' +
              'color: white;' +
              'border: none;' +
              'border-radius: 4px;' +
              'cursor: pointer;' +
              'width: 100%;' +
              'font-size: 13px;' +
            '">查看详情</' + 'button>' +
          '</' + 'div>';

          marker.bindPopup(popupContent, {
            maxWidth: 280,
            className: 'custom-popup'
          });

          // 点击标记时设置选中基地
          marker.on('click', () => {
            setSelectedBase(base);
          });
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);
      } catch (error) {
        console.error('地图初始化失败:', error);
      }
    };

    // 等待 Leaflet 库加载
    const timer = setTimeout(() => {
      if (window.L) {
        initMap();
      } else {
        // 如果还没加载完成，延迟重试
        setTimeout(initMap, 500);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 监听自定义事件
  useEffect(() => {
    const handleShowBaseDetail = (e: CustomEvent) => {
      const base = parkData.find(b => b.id === e.detail);
      if (base) {
        setSelectedBase(base);
        setSelectedField(base);  // 同时设置selectedField用于详情弹窗显示
        setShowDetailModal(true);
      }
    };

    window.addEventListener('showBaseDetail', handleShowBaseDetail as EventListener);
    return () => {
      window.removeEventListener('showBaseDetail', handleShowBaseDetail as EventListener);
    };
  }, []);

  // 跳转到指定基地
  const flyToBase = (base: BaseData) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([base.lat, base.lng], 10, {
        duration: 1.5
      });
      setSelectedBase(base);
    }
  };

  // 查看详情
  const handleViewDetail = (field: BaseData) => {
    // 使用pendingDetailBase触发useEffect来确保全屏状态先退出
    setPendingDetailBase(field);
    setActiveTab('basic');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 relative">
      {/* 几何网格背景 - 淡蓝色 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      <div className="relative z-10 p-6">
        {/* 页面头部 */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
              <Map className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">园区导览</h1>
              <p className="text-sm text-blue-600/80">地块与园区全景档案管理</p>
            </div>
          </div>
        </div>
      </div>

      {/* 全屏返回按钮 - 放在地图外部，确保始终显示 */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="fixed top-4 left-4 z-[1001] bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 hover:bg-gray-50"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">返回</span>
        </button>
      )}

      {/* 地图和表格并排布局 */}
      <div className="flex gap-4 mb-6">
        {/* GIS地图可视化区域 */}
        <div className={`flex-1 bg-white/90 backdrop-blur-sm border border-blue-200/60 rounded-xl shadow-lg shadow-blue-200/30 p-4 ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">GIS地图总览</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-green-500"></span>种植中</span>
                <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-yellow-500"></span>休耕</span>
              </div>
              {/* 快速跳转按钮 */}
              <select
                onChange={(e) => {
                  const base = parkData.find(b => b.id === Number(e.target.value));
                  if (base && mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([base.lat, base.lng], 10);
                  }
                  e.target.value = '';
                }}
                className="px-2 py-1 text-sm border border-gray-200 rounded"
              >
                <option value="">跳转到基地...</option>
                {parkData.map(base => (
                  <option key={base.id} value={base.id}>{base.name}</option>
                ))}
              </select>
              {/* 全屏按钮 */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`p-1.5 rounded-lg ${showDetailModal ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                disabled={showDetailModal}
                title={showDetailModal ? "请先关闭详情弹窗" : (isFullscreen ? "退出全屏" : "全屏查看")}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5 text-gray-600" /> : <Maximize2 className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </div>

          {/* 百度地图容器 */}
          <div className={`relative rounded-lg overflow-hidden border border-gray-200 ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[40rem]'}`}>
            {/* 百度地图DOM */}
            <div ref={mapRef} className="w-full h-full" id="baiduMap"></div>

            {/* 加载提示 */}
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Map className="w-12 h-12 mx-auto mb-2 text-emerald-500 animate-pulse" />
                  <p className="text-sm text-gray-600">正在加载地图...</p>
                  <p className="text-xs text-gray-400 mt-1">Leaflet + OpenStreetMap</p>
                </div>
              </div>
            )}

            {/* 地图底部图例 */}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">📍 点击标记查看详情</p>
              <p className="text-xs text-gray-400">🖱️ 滚轮缩放 · 拖拽移动</p>
            </div>

            {/* 基地列表快速预览 */}
            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm max-h-80 overflow-y-auto w-48">
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-700 mb-2 px-1">基地列表</p>
                {parkData.map(base => (
                  <button
                    key={base.id}
                    onClick={() => flyToBase(base)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs mb-1 hover:bg-gray-100 flex items-center gap-1`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${base.status === 'planting' ? 'bg-green-500' : base.status === 'warning' ? 'bg-red-500' : base.status === 'fallow' ? 'bg-yellow-500' : 'bg-gray-400'}`}></span>
                    <span className="truncate">{base.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 园区基地总览表 */}
        <div className="w-1/8 flex flex-col bg-white/90 backdrop-blur-sm border border-blue-200/60 rounded-xl overflow-hidden shadow-lg shadow-blue-200/20">
          {/* 表头 - 包含标题和统计卡片 */}
          <div className="px-4 py-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">园区基地总览表</h3>
              <div className="flex items-center gap-4">
                              </div>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
          <table className="w-full">
            <thead className="bg-blue-50/80">
              <tr>
                {exportMode && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companyGroups.map((company) => (
                <React.Fragment key={company.id}>
                  {/* 公司行 - 可展开/收起，显示基地信息 */}
                  <tr
                    className="bg-blue-50/50"
                  >
                    {exportMode && <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={company.bases.every(b => selectedRows.includes(b.id))}
                        onChange={(e) => {
                          e.stopPropagation();
                          company.bases.forEach(b => {
                            if (e.target.checked && !selectedRows.includes(b.id)) {
                              handleSelectRow(b.id);
                            } else if (!e.target.checked && selectedRows.includes(b.id)) {
                              handleSelectRow(b.id);
                            }
                          });
                        }}
                        className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3 mb-3">
                        {!isEditing && (
                          <button
                            onClick={() => toggleCompany(company.id)}
                            className="p-1 hover:bg-blue-100 rounded cursor-pointer"
                          >
                            {expandedCompanies.includes(company.id) ? (
                              <ChevronDown className="w-5 h-5 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-600" />
                            )}
                          </button>
                        )}
                        <span className="font-bold text-lg text-gray-900">{company.name}</span>
                        <span className="text-sm text-gray-500">({company.bases.length}个基地)</span>
                      </div>
                      {expandedCompanies.includes(company.id) && company.bases
                        .filter(item => {
                          if (searchName && !item.name.toLowerCase().includes(searchName.toLowerCase())) return false;
                          if (statusFilter !== 'all' && item.status !== statusFilter) return false;
                          if (cropFilter !== 'all' && item.crop !== cropFilter) return false;
                          return true;
                        })
                        .map((item) => (
                        <div key={item.id} className="flex items-center gap-3 py-3 pl-8 bg-blue-50/60 hover:bg-blue-100/80 rounded-lg mb-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); flyToBase(item); }}
                            className="p-1 hover:bg-blue-200/50 rounded cursor-pointer"
                            title="定位到地图"
                          >
                            <MapPin className="w-5 h-5 text-green-600" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate('/', { state: { baseId: item.id, baseName: item.name } }); }}
                            className="text-base font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer min-w-[140px]"
                          >
                            {item.name}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewDetail(item); }}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded cursor-pointer"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <span className="text-base font-medium text-gray-700 min-w-[100px]">{item.area} {item.unit}</span>
                          <span className="text-base font-medium text-gray-700">{item.manager}</span>
                        </div>
                      ))}
                    </td>
                    <td colSpan={exportMode ? 3 : 3} className="px-4 py-3"></td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* 导出模式选择栏 */}
        {exportMode && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-blue-100 bg-blue-50/50">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedRows.length === filteredData.length ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelExport}
                className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirmExport}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500"
              >
                确认导出
              </button>
            </div>
          </div>
        )}

      </div>

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
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400"
                  placeholder={editingItem?.type === 'company' || addType === 'company' ? '请输入公司名称' : '请输入基地名称'}
                />
              </div>

              {(!editingItem || editingItem.type === 'base') && addType === 'base' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">面积</label>
                      <input type="number" id="editArea" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400" placeholder="如：300" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">单位</label>
                      <select id="editUnit" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                        <option value="亩">亩</option>
                        <option value="平方米">平方米</option>
                        <option value="公顷">公顷</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">作物</label>
                      <input type="text" id="editCrop" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400" placeholder="如：水稻" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">负责人</label>
                      <input type="text" id="editManager" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400" placeholder="请输入负责人" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">联系电话</label>
                    <input type="text" id="editPhone" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400" placeholder="请输入联系电话" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">基地简介</label>
                    <textarea id="editIntro" rows={3} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400" placeholder="请输入基地简介"></textarea>
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
                  if (!name) { alert('请输入名称'); return; }

                  if (editingItem) {
                    // 编辑模式 - 使用自定义确认弹窗
                    setConfirmModalConfig({
                      title: '修改确认',
                      message: '修改公司或基地信息可能会影响相关数据的关联！请确认是否继续？',
                      type: 'warning',
                      onConfirm: () => {
                        // 执行编辑保存
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
                        alert('保存成功');
                        setIsEditing(false);
                        setEditingItem(null);
                      }
                    });
                    setShowConfirmModal(true);
                    return;
                  } else {
                    // 新增模式 - 使用自定义确认弹窗
                    setConfirmModalConfig({
                      title: '新增确认',
                      message: '新增公司或基地后，请确保及时维护相关信息！请确认是否继续？',
                      type: 'info',
                      onConfirm: () => {
                        if (addType === 'company') {
                          setCompanyGroups([...companyGroups, {
                            id: Date.now(),
                            name,
                            bases: []
                          }]);
                        } else {
                          if (!selectedCompanyId) { alert('请选择所属公司'); return; }
                          const areaInput = document.getElementById('editArea') as HTMLInputElement;
                          const cropInput = document.getElementById('editCrop') as HTMLInputElement;
                          const managerInput = document.getElementById('editManager') as HTMLInputElement;
                          const phoneInput = document.getElementById('editPhone') as HTMLInputElement;
                          const introInput = document.getElementById('editIntro') as HTMLTextAreaElement;
                          const newBase = {
                            id: Date.now(),
                            name,
                            area: Number(areaInput?.value) || 0,
                            unit: '亩',
                            crop: cropInput?.value || '',
                            growthDay: 0,
                            status: 'idle',
                            statusText: '闲置',
                            manager: managerInput?.value || '',
                            phone: phoneInput?.value || '',
                            soilType: '',
                            ph: 0,
                            coords: '',
                            city: '',
                            province: '',
                            lng: 0,
                            lat: 0,
                            intro: introInput?.value || ''
                          };
                          setCompanyGroups(companyGroups.map(c => {
                            if (c.id === selectedCompanyId) {
                              return { ...c, bases: [...c.bases, newBase] };
                            }
                            return c;
                          }));
                        }
                        alert('新增成功');
                        setIsAddingNew(false);
                      }
                    });
                    setShowConfirmModal(true);
                    return;
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

      {/* 自定义确认弹窗 */}
      {showConfirmModal && confirmModalConfig && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[10000]">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-cyan-500/30">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  confirmModalConfig.type === 'danger' ? 'bg-red-500/20' :
                  confirmModalConfig.type === 'warning' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                }`}>
                  <AlertTriangle className={`w-6 h-6 ${
                    confirmModalConfig.type === 'danger' ? 'text-red-400' :
                    confirmModalConfig.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{confirmModalConfig.title}</h3>
                  <p className="mt-2 text-sm text-gray-300">{confirmModalConfig.message}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { setShowConfirmModal(false); setConfirmModalConfig(null); }}
                  className="px-4 py-2 border border-cyan-500/30 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/10"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    confirmModalConfig.onConfirm();
                    setShowConfirmModal(false);
                    setConfirmModalConfig(null);
                  }}
                  className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${
                    confirmModalConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-500' :
                    confirmModalConfig.type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 导出弹窗 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-cyan-500/30">
            <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">选择导出格式</h2>
              <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { value: 'excel', label: 'Excel (.xls)', desc: '适合在Excel中编辑' },
                { value: 'csv', label: 'CSV (.csv)', desc: '通用格式，适合数据处理' },
                { value: 'word', label: 'Word (.doc)', desc: '适合打印和文档使用' }
              ].map(format => (
                <label
                  key={format.value}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    exportFormat === format.value
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-cyan-500/20 hover:border-cyan-500/40 bg-white/5'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={format.value}
                    checked={exportFormat === format.value}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 bg-white/10"
                  />
                  <div className="ml-3">
                    <p className="font-medium text-white">{format.label}</p>
                    <p className="text-sm text-gray-400">{format.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-cyan-500/20 flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-cyan-500/30 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/10"
              >
                取消
              </button>
              <button
                onClick={handleDoExport}
                className="h-10 px-6 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-500"
              >
                导出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 地块详情弹窗 */}
      {showDetailModal && selectedField && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto border border-cyan-500/30">
            <div className="px-6 py-4 border-b border-cyan-500/20 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{selectedField.name} - 地块档案</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/')}
                  className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-500"
                >
                  进入{'>>>'}
                </button>
                <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-white/10 rounded">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* 基地基本信息 */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-cyan-400/70">基地/区域名称</label>
                    <p className="font-semibold text-white">{selectedField.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-cyan-400/70">面积</label>
                    <p className="font-semibold text-white">{selectedField.area} {selectedField.unit}</p>
                  </div>
                  <div>
                    <label className="text-xs text-cyan-400/70">温室大棚数量</label>
                    <p className="font-semibold text-white">{selectedField.greenhouseCount || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-cyan-400/70">大田面积</label>
                    <p className="font-semibold text-white">{selectedField.fieldArea ? `${selectedField.fieldArea}亩` : '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-cyan-400/70">地理坐标</label>
                    <p className="font-semibold text-white text-sm">{selectedField.coords}</p>
                  </div>
                  <div>
                    <label className="text-xs text-cyan-400/70">负责人</label>
                    <p className="font-semibold text-white">{selectedField.manager}</p>
                  </div>
                  <div>
                    <label className="text-xs text-cyan-400/70">联系电话</label>
                    <p className="font-semibold text-white">{selectedField.phone}</p>
                  </div>
                  <div>
                    <label className="text-xs text-cyan-400/70">当前状态</label>
                    <p className="font-semibold">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        selectedField.status === 'planting' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        selectedField.status === 'fallow' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        selectedField.status === 'warning' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {selectedField.statusText}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 基地简介 */}
              <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-400">基地简介</span>
                </div>
                <p className="text-sm text-gray-300">{selectedField.intro || '-'}</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-cyan-500/20 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-white/10 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/20"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
