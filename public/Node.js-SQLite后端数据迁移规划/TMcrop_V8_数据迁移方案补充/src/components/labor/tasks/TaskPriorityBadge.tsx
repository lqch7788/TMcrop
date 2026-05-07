type TaskPriority = 'high' | 'medium' | 'low';

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
}

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  high: {
    label: '紧急',
    className: 'bg-red-100 text-red-700',
  },
  medium: {
    label: '重要',
    className: 'bg-yellow-100 text-yellow-700',
  },
  low: {
    label: '一般',
    className: 'bg-gray-100 text-gray-700',
  },
};

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.low;

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export default TaskPriorityBadge;
