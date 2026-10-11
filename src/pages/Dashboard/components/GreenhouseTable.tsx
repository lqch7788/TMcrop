// 温室区域表格组件
// 2026-10-11：数据源改为 greenhouses 表真实记录（useDashboard 的 greenhouseRows），删除原 12 行硬编码 mock
import { Eye, Sprout } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { GreenhouseRow } from '../types/dashboard.types';

interface GreenhouseTableProps {
  expanded: boolean;
  onToggle: () => void;
  onDetailClick: (data: { type: 'greenhouse'; data: GreenhouseRow }) => void;
  /** 真实温室行（greenhouses 表 active 非露天记录） */
  rows: GreenhouseRow[];
}

export function GreenhouseTable({ expanded, onToggle, onDetailClick, rows }: GreenhouseTableProps) {
  return (
    <div className="card-greenhouse animate-card-in" style={{ animationDelay: '0.2s' }}>
      <div className="card-title">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
            <Sprout className="w-3 h-3 text-white" />
          </div>
          <span>温室区域</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="btn-expand"
        >
          <svg
            className={`w-4 h-4 text-white transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Button>
      </div>
      {expanded && (
        <div className="max-h-60 overflow-y-auto scrollbar-natural">
          <table className="w-full text-sm">
            <thead className="table-header text-white sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">区域</th>
                <th className="px-3 py-2 text-left font-semibold">作物</th>
                <th className="px-3 py-2 text-left font-semibold">面积</th>
                <th className="px-3 py-2 text-left font-semibold">温室类型</th>
                <th className="px-3 py-2 text-left font-semibold">状态</th>
                <th className="px-3 py-2 text-left font-semibold">建档日期</th>
                <th className="px-3 py-2 text-center font-semibold">详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-green-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-gray-400">暂无温室数据</td>
                </tr>
              ) : rows.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 font-medium">{item.no}</td>
                  <td className="px-3 py-2">{item.crop}</td>
                  <td className="px-3 py-2">{item.area}{item.unit}</td>
                  <td className="px-3 py-2">{item.type}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-sm ${
                      item.status === '启用中' ? 'status-growing' : ''
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{item.plantedDate}</td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDetailClick({ type: 'greenhouse', data: item })}
                      className="btn-detail"
                    >
                      <Eye className="w-4 h-4" /> 详情&gt;
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
