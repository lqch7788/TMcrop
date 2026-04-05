type TaskType = 'irrigation' | 'fertilization' | 'pruning' | 'harvest' | 'scouting' | 'spraying' | 'weeding';

interface TaskTypeTagProps {
  type: TaskType;
  typeName: string;
}

export function TaskTypeTag({ type, typeName }: TaskTypeTagProps) {
  return (
    <span className="text-sm text-gray-700">
      {typeName}
    </span>
  );
}

export default TaskTypeTag;
