// 种植区环境参数表组件
import { Eye, MapPin } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { GreenhouseEnvData } from '../types/dashboard.types';

interface EnvironmentTableProps {
  selectedRegion: string;
  greenhouseList: { id: string; name: string }[];
  paginatedGreenhouseData: GreenhouseEnvData[];
  greenhouseEnvData: GreenhouseEnvData[];
  greenhousePage: number;
  greenhousePageSize: number;
  totalGreenhousePages: number;
  onRegionChange: (region: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onDetailClick: (greenhouseId: string) => void;
}

// 状态颜色样式
function getStatusColor(status: string | undefined): string {
  if (status === 'normal') return 'text-gray-900';
  if (status === 'warning') return 'text-yellow-600';
  if (status === 'critical') return 'text-red-600';
  return 'text-gray-900';
}

export function EnvironmentTable({
  selectedRegion,
  greenhouseList,
  paginatedGreenhouseData,
  greenhouseEnvData,
  greenhousePage,
  greenhousePageSize,
  totalGreenhousePages,
  onRegionChange,
  onPageChange,
  onPageSizeChange,
  onDetailClick,
}: EnvironmentTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-none overflow-hidden border border-gray-100">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">种植区环境参数表</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              <th className="px-2 py-2 text-center text-sm font-semibold whitespace-nowrap">区域选择</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap" colSpan={4}>空气环境参数</th>
              <th className="px-1 py-3"></th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap" colSpan={4}>土壤环境参数</th>
              <th className="px-4 py-3"></th>
            </tr>
            <tr className="bg-gray-50">
              <th className="px-2 py-2">
                <select
                  value={selectedRegion}
                  onChange={(e) => { onRegionChange(e.target.value); onPageChange(1); }}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-black bg-white"
                >
                  <option value="">全部区域</option>
                  {greenhouseList.map(gh => (
                    <option key={gh.id} value={gh.id}>{gh.name}</option>
                  ))}
                </select>
              </th>
              <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">温度(°C)</th>
              <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">湿度(%)</th>
              <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">光照度(Lux)</th>
              <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">CO2(ppm)</th>
              <th className="px-1 py-2"></th>
              <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">温度(°C)</th>
              <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">湿度(%)</th>
              <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">EC值</th>
              <th className="px-4 py-2 text-center text-sm font-semibold whitespace-nowrap text-gray-700">PH值</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedGreenhouseData.map((gh) => (
              <tr key={gh.id} className="hover:bg-blue-100 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-gray-900">{gh.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={`text-sm font-medium ${getStatusColor(gh.airTemp?.status)}`}>
                    {gh.airTemp?.value ?? '-'}{gh.airTemp?.unit ? ` ${gh.airTemp.unit}` : ''}
                  </span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={`text-sm font-medium ${getStatusColor(gh.airHumidity?.status)}`}>
                    {gh.airHumidity?.value ?? '-'}{gh.airHumidity?.unit ? ` ${gh.airHumidity.unit}` : ''}
                  </span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={`text-sm font-medium ${getStatusColor(gh.light?.status)}`}>
                    {gh.light?.value ?? '-'}{gh.light?.unit ? ` ${gh.light.unit}` : ''}
                  </span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={`text-sm font-medium ${getStatusColor(gh.co2?.status)}`}>
                    {gh.co2?.value ?? '-'}{gh.co2?.unit ? ` ${gh.co2.unit}` : ''}
                  </span>
                </td>
                <td className="px-1 py-3"></td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={`text-sm font-medium ${getStatusColor(gh.soilTemp?.status)}`}>
                    {gh.soilTemp?.value ?? '-'}{gh.soilTemp?.unit ? ` ${gh.soilTemp.unit}` : ''}
                  </span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={`text-sm font-medium ${getStatusColor(gh.soilMoisture?.status)}`}>
                    {gh.soilMoisture?.value ?? '-'}{gh.soilMoisture?.unit ? ` ${gh.soilMoisture.unit}` : ''}
                  </span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={`text-sm font-medium ${getStatusColor(gh.soilEc?.status)}`}>
                    {gh.soilEc?.value ?? '-'}{gh.soilEc?.unit ? ` ${gh.soilEc.unit}` : ''}
                  </span>
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={`text-sm font-medium ${getStatusColor(gh.soilPh?.status)}`}>
                    {gh.soilPh?.value ?? '-'}{gh.soilPh?.unit ? ` ${gh.soilPh.unit}` : ''}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDetailClick(gh.id)}
                    className="text-emerald-600 hover:text-emerald-700 font-medium text-sm"
                  >
                    <Eye className="w-4 h-4" /> 详情&gt;&gt;
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={greenhousePageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {greenhouseEnvData.length} 条</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.max(1, greenhousePage - 1))}
            disabled={greenhousePage === 1}
            className="disabled:opacity-50"
          >
            <svg className="w-4 h-4 rotate-180" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
          <span className="text-sm">{greenhousePage} / {totalGreenhousePages || 1}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.min(totalGreenhousePages, greenhousePage + 1))}
            disabled={greenhousePage >= totalGreenhousePages}
            className="disabled:opacity-50"
          >
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
