import { User } from '../../../types';

interface TaskWorkerSelectProps {
  users: User[];
  selectedUserId: string;
  onChange: (userId: string) => void;
  error?: string;
}

export function TaskWorkerSelect({ users, selectedUserId, onChange, error }: TaskWorkerSelectProps) {
  const workerUsers = users.filter(u => u.role === 'technician' || u.role === 'worker');

  return (
    <div>
      <select
        value={selectedUserId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
      >
        <option value="">请选择执行人</option>
        {workerUsers.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} - {user.position}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default TaskWorkerSelect;
