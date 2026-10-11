// 大田区域表格组件
// 2026-10-11：数据源改为 greenhouses 表真实记录（useDashboard 的 fieldRows），删除原 8 行硬编码 mock
import { Eye, Sprout } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { GreenhouseRow } from '../types/dashboard.types';

interface FieldTableProps {
  expanded: boolean;
  onToggle: () => void;
  onDetailClick: (data: { type: 'field'; data: GreenhouseRow }) => void;
  /** 真实大田行（greenhouses 表 active 露天记录） */
  rows: GreenhouseRow[];
}

export function FieldTable({ expanded, onToggle, onDetailClick, rows }: FieldTableProps) {
  return (
    <div className="card-field animate-card-in" style={{ animationDelay: '0.3s' }}>
      <div className="card-title">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-white/20 flex items-center justify-center">
            <Sprout className="w-3 h-3 text-white" />
          </div>
          <span>大田区域</span>
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
                <th className="px-3 py-2 text-left font-semibold">田地类型</th>
                <th className="px-3 py-2 text-left font-semibold">状态</th>
                <th className="px-3 py-2 text-left font-semibold">建档日期</th>
                <th className="px-3 py-2 text-center font-semibold">详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-gray-400">暂无大田数据</td>
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
                      onClick={() => onDetailClick({ type: 'field', data: item })}
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
