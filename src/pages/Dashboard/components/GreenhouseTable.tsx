// 温室区域表格组件
import { Eye, Sprout } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { GreenhouseDetailData } from '../types/dashboard.types';

interface GreenhouseTableProps {
  expanded: boolean;
  onToggle: () => void;
  onDetailClick: (data: { type: 'greenhouse'; data: GreenhouseDetailData }) => void;
}

// 温室数据
const greenhouseData = [
  { no: '1号棚', crop: '番茄', area: '6500', type: '薄膜温室', status: '生长中', plantedDate: '2024-01-15', expectedHarvest: '2024-04-20', manager: '张伟民' },
  { no: '2号棚', crop: '番茄', area: '6500', type: '薄膜温室', status: '生长中', plantedDate: '2024-01-15', expectedHarvest: '2024-04-20', manager: '张伟民' },
  { no: '3号棚', crop: '番茄', area: '6500', type: '薄膜温室', status: '生长中', plantedDate: '2024-01-15', expectedHarvest: '2024-04-20', manager: '张伟民' },
  { no: '4号棚', crop: '黄瓜', area: '7000', type: '玻璃温室', status: '生长中', plantedDate: '2024-02-01', expectedHarvest: '2024-05-15', manager: '李明轩' },
  { no: '5号棚', crop: '黄瓜', area: '7000', type: '玻璃温室', status: '育苗中', plantedDate: '2024-03-01', expectedHarvest: '2024-06-01', manager: '李明轩' },
  { no: '6号棚', crop: '草莓', area: '6000', type: '薄膜温室', status: '生长中', plantedDate: '2023-11-01', expectedHarvest: '2024-03-30', manager: '王建国' },
  { no: '7号棚', crop: '草莓', area: '6000', type: '薄膜温室', status: '生长中', plantedDate: '2023-11-01', expectedHarvest: '2024-03-30', manager: '王建国' },
  { no: '8号棚', crop: '辣椒', area: '5500', type: '玻璃温室', status: '生长中', plantedDate: '2024-02-15', expectedHarvest: '2024-06-30', manager: '赵俊杰' },
  { no: '9号棚', crop: '辣椒', area: '5500', type: '玻璃温室', status: '待种植', plantedDate: '-', expectedHarvest: '-', manager: '赵俊杰' },
  { no: '10号棚', crop: '生菜', area: '5000', type: '薄膜温室', status: '生长中', plantedDate: '2024-03-01', expectedHarvest: '2024-04-15', manager: '钱文涛' },
  { no: '11号棚', crop: '生菜', area: '5000', type: '薄膜温室', status: '生长中', plantedDate: '2024-03-01', expectedHarvest: '2024-04-15', manager: '钱文涛' },
  { no: '12号棚', crop: '西瓜', area: '7000', type: '玻璃温室', status: '采收中', plantedDate: '2024-01-20', expectedHarvest: '2024-03-18', manager: '孙晓峰' },
];

export function GreenhouseTable({ expanded, onToggle, onDetailClick }: GreenhouseTableProps) {
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
                <th className="px-3 py-2 text-left font-semibold">棚号</th>
                <th className="px-3 py-2 text-left font-semibold">作物</th>
                <th className="px-3 py-2 text-left font-semibold">面积(㎡)</th>
                <th className="px-3 py-2 text-left font-semibold">温室类型</th>
                <th className="px-3 py-2 text-left font-semibold">种植状态</th>
                <th className="px-3 py-2 text-left font-semibold">种植时间</th>
                <th className="px-3 py-2 text-center font-semibold">详情</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-green-200">
              {greenhouseData.map((item) => (
                <tr key={item.no}>
                  <td className="px-3 py-2 font-medium">{item.no}</td>
                  <td className="px-3 py-2">{item.crop}</td>
                  <td className="px-3 py-2">{item.area}</td>
                  <td className="px-3 py-2">{item.type}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-sm ${
                      item.status === '生长中' ? 'status-growing' :
                      item.status === '育苗中' ? 'status-seedling' :
                      item.status === '待种植' ? 'status-waiting' :
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
