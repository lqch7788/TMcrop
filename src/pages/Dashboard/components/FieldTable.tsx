// 大田区域表格组件
import { Sprout } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { FieldDetailData } from '../types/dashboard.types';

interface FieldTableProps {
  expanded: boolean;
  onToggle: () => void;
  onDetailClick: (data: { type: 'field'; data: FieldDetailData }) => void;
}

// 大田数据
const fieldData = [
  { no: 'A1地块', crop: '水稻', area: '100', fieldType: '水田', status: '生长中', plantedDate: '2024-03-05', expectedHarvest: '2024-09-15', manager: '周志强' },
  { no: 'A2地块', crop: '水稻', area: '100', fieldType: '水田', status: '生长中', plantedDate: '2024-03-05', expectedHarvest: '2024-09-15', manager: '周志强' },
  { no: 'A3地块', crop: '水稻', area: '100', fieldType: '水田', status: '生长中', plantedDate: '2024-03-05', expectedHarvest: '2024-09-15', manager: '周志强' },
  { no: 'B1地块', crop: '小麦', area: '100', fieldType: '旱田', status: '生长中', plantedDate: '2023-11-20', expectedHarvest: '2024-05-30', manager: '郑十' },
  { no: 'B2地块', crop: '小麦', area: '100', fieldType: '旱田', status: '返青期', plantedDate: '2023-11-20', expectedHarvest: '2024-05-30', manager: '郑十' },
  { no: 'C1地块', crop: '油菜', area: '80', fieldType: '旱田', status: '生长中', plantedDate: '2023-10-15', expectedHarvest: '2024-04-20', manager: '吴十一' },
  { no: 'C2地块', crop: '油菜', area: '70', fieldType: '旱田', status: '生长中', plantedDate: '2023-10-15', expectedHarvest: '2024-04-20', manager: '吴十一' },
  { no: 'D1地块', crop: '蔬菜', area: '50', fieldType: '旱田', status: '采收中', plantedDate: '2024-02-01', expectedHarvest: '2024-03-18', manager: '郑十' },
];

export function FieldTable({ expanded, onToggle, onDetailClick }: FieldTableProps) {
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
                <th className="px-3 py-2 text-left font-semibold">地块号</th>
                <th className="px-3 py-2 text-left font-semibold">作物</th>
                <th className="px-3 py-2 text-left font-semibold">面积(亩)</th>
                <th className="px-3 py-2 text-left font-semibold">田地类型</th>
                <th className="px-3 py-2 text-left font-semibold">种植状态</th>
                <th className="px-3 py-2 text-left font-semibold">种植时间</th>
                <th className="px-3 py-2 text-center font-semibold">详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-200">
              {fieldData.map((item) => (
                <tr key={item.no}>
                  <td className="px-3 py-2 font-medium">{item.no}</td>
                  <td className="px-3 py-2">{item.crop}</td>
                  <td className="px-3 py-2">{item.area}</td>
                  <td className="px-3 py-2">{item.fieldType}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-sm ${
                      item.status === '生长中' ? 'status-growing' :
                      item.status === '返青期' ? 'status-seedling' :
                      item.status === '采收中' ? 'status-harvest' : ''
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
                      详情&gt;
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
