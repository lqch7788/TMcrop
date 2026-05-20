import { Eye, Edit, Trash2 } from 'lucide-react';
import { Worker, WORKER_STATUS_CONFIG, SKILL_LEVEL_CONFIG } from '../../../types';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

interface PersonnelTableProps {
  workers: Worker[];
  onViewWorker: (worker: Worker) => void;
  onEditWorker: (worker: Worker) => void;
  onDeleteWorker: (worker: Worker) => void;
  // Batch selection props
  showBatchSelect?: boolean;
  selectedRows?: number[];
  onSelectAll?: () => void;
  onSelectRow?: (index: number) => void;
  // 权限控制props
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
}

export function PersonnelTable({
  workers,
  onViewWorker,
  onEditWorker,
  onDeleteWorker,
  showBatchSelect = false,
  selectedRows = [],
  onSelectAll,
  onSelectRow,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExport = true,
}: PersonnelTableProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">员工信息</h3>
        {showBatchSelect && (
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
            >
              {selectedRows.length === workers.length ? '全不选' : '全选'}
            </Button>
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table className="w-full min-w-[1600px]">
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow>
              {showBatchSelect && (
                <TableHead className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={selectedRows.length === workers.length && workers.length > 0}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工号</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">姓名</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">部门</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">班组</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">岗位</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">技能等级</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">联系方式</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">合同状态</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入职日期</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</TableHead>
              <TableHead className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-white divide-y divide-gray-300">
            {workers.map((worker, index) => (
              <TableRow key={worker.id} className="hover:bg-blue-100 transition-colors">
                {showBatchSelect && (
                  <TableCell className="px-4 py-3 text-center">
                    <Checkbox
                      checked={selectedRows.includes(index)}
                      onCheckedChange={() => onSelectRow?.(index)}
                    />
                  </TableCell>
                )}
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{worker.workerId}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-medium">
                      {worker.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{worker.name}</p>
                      <p className="text-xs text-gray-500">{worker.gender} {worker.age}岁</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{worker.department}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{worker.team}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{worker.position}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${SKILL_LEVEL_CONFIG[worker.skillLevel].badge}`}>
                    {SKILL_LEVEL_CONFIG[worker.skillLevel].label}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{worker.phone}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    worker.contractStatus === '新签' ? 'bg-blue-100 text-blue-700' :
                    worker.contractStatus === '续签' ? 'bg-green-100 text-green-700' :
                    worker.contractStatus === '到期' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {worker.contractStatus}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{worker.hireDate}</TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${WORKER_STATUS_CONFIG[worker.status].badge}`}>
                    {WORKER_STATUS_CONFIG[worker.status].label}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewWorker(worker)}
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditWorker(worker)}
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteWorker(worker)}
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {workers.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            没有找到符合条件的员工信息
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between mt-4 px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>每页</span>
            <select
              value={10}
              onChange={(e) => {}}
              className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共 {workers.length} 条</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {}}
              disabled={true}
            >
              &lt;
            </Button>
            <span className="text-sm font-medium text-emerald-600">1/1</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {}}
              disabled={true}
            >
              &gt;
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonnelTable;
