import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, MapPin, AlertTriangle, X, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

// localStorage key - 与 BaseSettings 保持一致
const COMPANY_GROUPS_KEY = 'yuanxingtu_company_groups';

// 园区/地块数据 - 真实百度地图坐标
const initialCompanyGroups = [
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

export interface BaseData {
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
}

export interface CompanyGroup {
  id: number;
  name: string;
  bases: BaseData[];
}

declare global {
  interface Window {
    L: any;
    map: any;
  }
}

// 从 localStorage 读取数据（与 BaseSettings 同步）
const loadCompanyGroupsFromStorage = () => {
  try {
    const stored = localStorage.getItem(COMPANY_GROUPS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('读取基地数据失败:', e);
  }
  return initialCompanyGroups;
};

export function ParkArchivePage() {
  const [companyGroups, setCompanyGroups] = useState(loadCompanyGroupsFromStorage);
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const [selectedBase, setSelectedBase] = useState<BaseData | null>(null);
  const [searchName, setSearchName] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [cropFilter, setCropFilter] = useState('all');
  const [selectedField, setSelectedField] = useState<BaseData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [pendingDetailBase, setPendingDetailBase] = useState<BaseData | null>(null);

  const parkData = useMemo(() => companyGroups.flatMap(group => group.bases.map(base => ({ ...base, company: group.name, companyId: group.id }))), [companyGroups]);

  // 监听基地设置更新事件
  useEffect(() => {
    const handleUpdate = () => {
      setCompanyGroups(loadCompanyGroupsFromStorage());
    };
    window.addEventListener('companyGroupsUpdated', handleUpdate);
    return () => window.removeEventListener('companyGroupsUpdated', handleUpdate);
  }, []);

  // 处理详情弹窗显示
  useEffect(() => {
    if (pendingDetailBase) {
      if (isFullscreen) {
        setIsFullscreen(false);
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

  const [expandedCompanies, setExpandedCompanies] = useState<number[]>(companyGroups.map(g => g.id));

  const toggleCompany = (companyId: number) => {
    if (expandedCompanies.includes(companyId)) {
      setExpandedCompanies(expandedCompanies.filter(id => id !== companyId));
    } else {
      setExpandedCompanies([...expandedCompanies, companyId]);
    }
  };

  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

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

  const crops = [...new Set(parkData.map(p => p.crop))];

  // 初始化 Leaflet 地图
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        const map = window.L.map(mapRef.current, {
          center: [30.5, 113.5],
          zoom: 5,
          zoomControl: false,
          crs: window.L.CRS.EPSG3857
        });

        const mapLayers = [
          { url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', subdomains: '1234', name: '高德地图' },
          { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', subdomains: '', name: 'Esri卫星' },
          { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', subdomains: 'abc', name: 'OSM' }
        ];

        let tileLayer = null;
        for (const layer of mapLayers) {
          try {
            tileLayer = window.L.tileLayer(layer.url, {
              subdomains: layer.subdomains,
              attribution: layer.name,
              maxZoom: 18,
              errorTileUrl: ''
            });
            tileLayer.addTo(map);
            break;
          } catch (e) {
            console.warn(`加载 ${layer.name} 失败，尝试下一个...`);
          }
        }

        window.L.control.zoom({ position: 'bottomright' }).addTo(map);

        const getIconColor = (status: string) => {
          switch (status) {
            case 'planting': return '#22c55e';
            case 'warning': return '#ef4444';
            case 'fallow': return '#eab308';
            default: return '#6b7280';
          }
        };

        parkData.forEach((base) => {
          const color = getIconColor(base.status);
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

          const popupContent = '<div style="min-width: 200px; padding: 5px;">' +
            '<h4 style="margin: 0 0 10px; font-size: 16px; color: #2e7d32; font-weight: bold;">' + base.name + '</h4>' +
            '<p style="margin: 5px 0; font-size: 13px;"><strong>面积：</strong>' + base.area + base.unit + '</p>' +
            '<p style="margin: 5px 0; font-size: 13px;"><strong>当前作物：</strong>' + base.crop + '</p>' +
            '<p style="margin: 5px 0; font-size: 13px;"><strong>状态：</strong><span style="color: ' + color + '; font-weight: bold;">' + base.statusText + '</span></p>' +
            '<p style="margin: 5px 0; font-size: 13px;"><strong>负责人：</strong>' + base.manager + '</p>' +
            '<button onclick="window.dispatchEvent(new CustomEvent(\'showBaseDetail\', {detail: ' + base.id + '}))" style="' +
              'margin-top: 10px;' +
              'padding: 8px 16px;' +
              'background: #059669;' +
              'color: white;' +
              'border: none;' +
              'border-radius: 8px;' +
              'cursor: pointer;' +
              'width: 100%;' +
              'font-size: 14px;' +
              'font-weight: 500;' +
            '">查看详情</' + 'button>' +
          '</' + 'div>';

          marker.bindPopup(popupContent, { maxWidth: 280, className: 'custom-popup' });
          marker.on('click', () => setSelectedBase(base));
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);
      } catch (error) {
        console.error('地图初始化失败:', error);
      }
    };

    const timer = setTimeout(() => {
      if (window.L) {
        initMap();
      } else {
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

  useEffect(() => {
    const handleShowBaseDetail = (e: CustomEvent) => {
      const base = parkData.find(b => b.id === e.detail);
      if (base) {
        setSelectedBase(base);
        setSelectedField(base);
        setShowDetailModal(true);
      }
    };

    window.addEventListener('showBaseDetail', handleShowBaseDetail as EventListener);
    return () => {
      window.removeEventListener('showBaseDetail', handleShowBaseDetail as EventListener);
    };
  }, []);

  const flyToBase = (base: BaseData) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([base.lat, base.lng], 10, { duration: 1.5 });
      setSelectedBase(base);
    }
  };

  const handleViewDetail = (field: BaseData) => {
    setPendingDetailBase(field);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      <div className="relative z-10 p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/40">
              <Map className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">园区导览</h1>
              <p className="text-sm text-gray-600">地块与园区全景档案管理</p>
            </div>
          </div>
        </div>
      </div>

      {isFullscreen && (
        <Button variant="secondary" size="sm" className="fixed top-4 left-4 z-[1001]" onClick={() => setIsFullscreen(false)}>
          <ChevronLeft className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">返回</span>
        </Button>
      )}

      <div className="flex gap-4 mb-6 px-6">
        {/* GIS地图可视化区域 */}
        <div className={`flex-1 bg-white/90 backdrop-blur-sm border border-blue-200/60 rounded-xl shadow-lg shadow-blue-200/30 p-4 ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">GIS地图总览</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-green-500"></span>种植中</span>
                <span className="flex items-center gap-1 text-xs"><span className="w-3 h-3 rounded bg-yellow-500"></span>休耕</span>
              </div>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                disabled={showDetailModal}
                title={showDetailModal ? "请先关闭详情弹窗" : (isFullscreen ? "退出全屏" : "全屏查看")}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5 text-gray-600" /> : <Maximize2 className="w-5 h-5 text-gray-600" />}
              </Button>
            </div>
          </div>

          <div className={`relative rounded-lg overflow-hidden border border-gray-200 ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[40rem]'}`}>
            <div ref={mapRef} className="w-full h-full" id="baiduMap"></div>

            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Map className="w-12 h-12 mx-auto mb-2 text-emerald-500 animate-pulse" />
                  <p className="text-sm text-gray-600">正在加载地图...</p>
                  <p className="text-xs text-gray-400 mt-1">Leaflet + OpenStreetMap</p>
                </div>
              </div>
            )}

            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">📍 点击标记查看详情</p>
              <p className="text-xs text-gray-400">🖱️ 滚轮缩放 · 拖拽移动</p>
            </div>

            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm max-h-80 overflow-y-auto w-48">
              <div className="p-2">
                <p className="text-sm font-semibold text-gray-700 mb-2 px-1">基地列表</p>
                {parkData.map(base => (
                  <Button
                    key={base.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => flyToBase(base)}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${base.status === 'planting' ? 'bg-green-500' : base.status === 'warning' ? 'bg-red-500' : base.status === 'fallow' ? 'bg-yellow-500' : 'bg-gray-400'}`}></span>
                    <span className="truncate">{base.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 园区基地总览表 */}
        <div className="w-1/3 flex flex-col bg-white/90 backdrop-blur-sm border border-blue-200/60 rounded-xl overflow-hidden shadow-lg shadow-blue-200/20">
          <div className="px-4 py-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">园区基地总览表</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50" />
                    <Input
                      placeholder="搜索基地..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="pl-9 py-1.5 bg-gray-50 border-gray-200 text-gray-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <thead className="bg-blue-50/80">
                <tr>
                  {exportMode && (
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-12">
                      <input type="checkbox" checked={selectedRows.length === filteredData.length && filteredData.length > 0} onChange={handleSelectAll} className="w-4 h-4 rounded border-blue-300 text-blue-600" />
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companyGroups.map((company) => (
                  <React.Fragment key={company.id}>
                    <tr className="bg-blue-50/50">
                      {exportMode && (
                        <td className="px-4 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={company.bases.every(b => selectedRows.includes(b.id))}
                            onChange={(e) => {
                              e.stopPropagation();
                              company.bases.forEach(b => {
                                if (e.target.checked && !selectedRows.includes(b.id)) handleSelectRow(b.id);
                                else if (!e.target.checked && selectedRows.includes(b.id)) handleSelectRow(b.id);
                              });
                            }}
                            className="w-4 h-4 rounded border-blue-300 text-blue-600"
                          />
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Button variant="ghost" size="icon" onClick={() => toggleCompany(company.id)}>
                            {expandedCompanies.includes(company.id) ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                          </Button>
                          <span className="font-bold text-sm text-gray-900">{company.name}</span>
                          <span className="text-xs text-gray-500">({company.bases.length}个基地)</span>
                        </div>
                        {expandedCompanies.includes(company.id) && company.bases
                          .filter(item => {
                            if (searchName && !item.name.toLowerCase().includes(searchName.toLowerCase())) return false;
                            if (statusFilter !== 'all' && item.status !== statusFilter) return false;
                            if (cropFilter !== 'all' && item.crop !== cropFilter) return false;
                            return true;
                          })
                          .map((item) => (
                            <div key={item.id} className="flex flex-nowrap items-center gap-1 py-1.5 pl-8 pr-2 bg-blue-50/60 hover:bg-blue-100/80 rounded-lg mb-1 overflow-hidden">
                              <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={(e) => { e.stopPropagation(); flyToBase(item); }} title="定位到地图">
                                <MapPin className="w-3.5 h-3.5 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/dashboard', { state: { baseId: item.id, baseName: item.name } }); }} className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate max-w-[120px]">
                                {item.name}
                              </Button>
                              <span className="text-xs text-gray-500 whitespace-nowrap">{item.area}{item.unit}</span>
                              <span className={`text-xs px-1 py-0.5 rounded-full whitespace-nowrap ${
                                item.status === 'planting' ? 'bg-green-100 text-green-700' :
                                item.status === 'fallow' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>{item.statusText}</span>
                              <span className="text-xs text-gray-500 whitespace-nowrap truncate max-w-[60px]" title={item.manager}>{item.manager}</span>
                              <Button variant="ghost" size="sm" className="flex-shrink-0 text-xs whitespace-nowrap ml-auto" onClick={(e) => { e.stopPropagation(); handleViewDetail(item); }}>
                                详情&gt;&gt;
                              </Button>
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

          {exportMode && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-blue-100 bg-blue-50/50">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedRows.length === filteredData.length ? '全不选' : '全选'}
                </Button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setExportMode(false)}>取消</Button>
                <Button variant="blue" size="sm" onClick={() => alert('导出功能') && setExportMode(false)}>确认导出</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 地块详情弹窗 */}
      {showDetailModal && selectedField && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{selectedField.name} - 地块档案</h3>
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard', { state: { baseId: selectedField.id, baseName: selectedField.name } })}>进入{'>>>'}</Button>
                <Button variant="ghost" size="icon" onClick={() => setShowDetailModal(false)}><X className="w-5 h-5 text-white" /></Button>
              </div>
            </div>
            <div className="p-6 bg-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">基地/区域名称</Label>
                  <p className="font-semibold text-gray-900">{selectedField.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">面积</Label>
                  <p className="font-semibold text-gray-900">{selectedField.area} {selectedField.unit}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">温室大棚数量</Label>
                  <p className="font-semibold text-gray-900">{selectedField.greenhouseCount || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">大田面积</Label>
                  <p className="font-semibold text-gray-900">{selectedField.fieldArea ? `${selectedField.fieldArea}亩` : '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">地理坐标</Label>
                  <p className="font-semibold text-gray-900 text-sm">{selectedField.coords}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">负责人</Label>
                  <p className="font-semibold text-gray-900">{selectedField.manager}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">联系电话</Label>
                  <p className="font-semibold text-gray-900">{selectedField.phone}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">当前状态</Label>
                  <p className="font-semibold">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      selectedField.status === 'planting' ? 'bg-green-100 text-green-700 border border-green-200' :
                      selectedField.status === 'fallow' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                      'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>{selectedField.statusText}</span>
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200 mt-4">
                <p className="text-sm text-gray-600">{selectedField.intro || '-'}</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowDetailModal(false)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
