import { Circle, PlayCircle, CheckCircle, XCircle } from 'lucide-react';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const statusConfig: Record<TaskStatus, { icon: typeof Circle; label: string; className: string }> = {
  pending: {
    icon: Circle,
    label: '待执行',
    className: 'bg-gray-100 text-gray-700',
  },
  in_progress: {
    icon: PlayCircle,
    label: '进行中',
    className: 'bg-blue-100 text-blue-700',
  },
  completed: {
    icon: CheckCircle,
    label: '已完成',
    className: 'bg-emerald-100 text-emerald-700',
  },
  cancelled: {
    icon: XCircle,
    label: '已取消',
    className: 'bg-red-100 text-red-700',
  },
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default TaskStatusBadge;
