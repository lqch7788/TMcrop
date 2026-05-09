// 活跃种植批次表格组件
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface CropBatch {
  id: string;
  batchCode: string;
  cropName: string;
  greenhouseName: string;
  stage: string;
  stageName: string;
}

interface ActiveBatchesTableProps {
  batches: CropBatch[];
}

// 生长阶段进度映射
const stageProgress: Record<string, number> = {
  seedling: 15,
  vegetative: 40,
  flowering: 65,
  fruiting: 85,
  harvest: 100
};

export function ActiveBatchesTable({ batches }: ActiveBatchesTableProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-none border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">活跃种植批次</h3>
        <Link to="/production" className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
          查看全部 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr className="border-b border-blue-600">
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">批次号</th>
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">作物</th>
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">区域</th>
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">生长阶段</th>
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">进度</th>
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {batches.slice(0, 5).map((batch) => {
              const progress = stageProgress[batch.stage] || 0;
              return (
                <tr key={batch.id} className="hover:bg-blue-100 transition-colors">
                  <td className="py-3 font-medium text-gray-900 whitespace-nowrap">{batch.batchCode}</td>
                  <td className="py-3 text-gray-600 whitespace-nowrap">{batch.cropName}</td>
                  <td className="py-3 text-gray-600 whitespace-nowrap">{batch.greenhouseName}</td>
                  <td className="py-3 text-gray-600 whitespace-nowrap">{batch.stageName}</td>
                  <td className="py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-gray-500">{progress}%</span>
                    </div>
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                      进行中
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
