import { useEffect, useMemo } from 'react';
import { ClipboardList, Sprout, Activity, Calendar, CheckSquare } from 'lucide-react';
import { useFarmTaskStore } from '../../../stores/farmTaskStore';

export function TodayTasksCard() {
  const tasks = useFarmTaskStore((s) => s.tasks);
  const fetchTasks = useFarmTaskStore((s) => s.fetchTasks);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 根据任务 type/typeName 计算今日待办分类统计
  const todayTasksBreakdown = useMemo(() => {
    // 筛选未完成的任务（今日待办）
    const pendingTasks = tasks.filter((t) =>
      t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'abandoned'
    );

    const equipment = pendingTasks.filter((t) =>
      t.typeName?.includes('设备') || t.type?.includes('equipment') || t.typeName?.includes('维护')
    ).length;

    const harvest = pendingTasks.filter((t) =>
      t.typeName?.includes('采收') || t.type?.includes('harvest')
    ).length;

    const approval = pendingTasks.filter((t) =>
      t.typeName?.includes('审批') || t.type?.includes('approval')
    ).length;

    // 剩余任务归入农事任务
    const farming = pendingTasks.length - equipment - harvest - approval;

    return {
      total: pendingTasks.length,
      farming,
      harvest,
      equipment,
      approval,
    };
  }, [tasks]);

  return (
    <div className="bg-white rounded-xl shadow-none border border-gray-100 hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2 bg-gradient-to-br from-blue-500 to-indigo-600">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">今日待办</span>
        </div>
        <span className="text-2xl font-bold text-blue-600">{todayTasksBreakdown.total}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Sprout className="w-3 h-3 text-emerald-500" />
            农事任务
          </span>
          <span className="font-medium">{todayTasksBreakdown.farming}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-500" />
            设备维护
          </span>
          <span className="font-medium">{todayTasksBreakdown.equipment}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-amber-500" />
            采收处理
          </span>
          <span className="font-medium">{todayTasksBreakdown.harvest}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 flex items-center gap-1">
            <CheckSquare className="w-3 h-3 text-orange-500" />
            待办审批
          </span>
          <span className="font-medium">{todayTasksBreakdown.approval}</span>
        </div>
      </div>
    </div>
  );
}
