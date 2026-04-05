type TaskMode = 'glass' | 'solar' | 'field';

interface TaskModeBadgeProps {
  mode: TaskMode;
}

const modeConfig: Record<TaskMode, { label: string; className: string }> = {
  glass: {
    label: '玻璃温室',
    className: 'bg-purple-100 text-purple-700',
  },
  solar: {
    label: '日光温室',
    className: 'bg-amber-100 text-amber-700',
  },
  field: {
    label: '大田',
    className: 'bg-emerald-100 text-emerald-700',
  },
};

export function TaskModeBadge({ mode }: TaskModeBadgeProps) {
  const config = modeConfig[mode] || modeConfig.field;

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}

export default TaskModeBadge;
