// 今日任务表格组件
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  greenhouseName: string;
  priority: string;
  status: string;
  assigneeName: string;
  workDuration: number;
  dueDate: string;
}

interface TodayTasksTableProps {
  tasks: Task[];
}

// 优先级颜色
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'low': return 'text-gray-600 bg-gray-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

// 状态颜色
function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'text-gray-600 bg-gray-100';
    case 'in_progress': return 'text-blue-600 bg-blue-100';
    case 'completed': return 'text-emerald-600 bg-emerald-100';
    default: return 'text-gray-600 bg-gray-100';
  }
}

// 状态文本
function getStatusText(status: string): string {
  switch (status) {
    case 'pending': return '待执行';
    case 'in_progress': return '进行中';
    case 'completed': return '已完成';
    default: return status;
  }
}

// 优先级文本
function getPriorityText(priority: string): string {
  switch (priority) {
    case 'high': return '紧急';
    case 'medium': return '重要';
    case 'low': return '一般';
    default: return priority;
  }
}

export function TodayTasksTable({ tasks }: TodayTasksTableProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-none border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">今日任务</h3>
        <Link to="/tasks" className="text-sm text-emerald-600 hover:text-emerald-700">
          查看全部
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr className="border-b border-blue-600">
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">任务名称</th>
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">区域</th>
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">优先级</th>
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">负责人</th>
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">计划时长</th>
              <th className="text-left py-3 px-4 text-sm font-semibold whitespace-nowrap">截止日期</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {tasks.slice(0, 4).map((task) => (
              <tr key={task.id} className="border-b border-gray-100 hover:bg-blue-100 transition-colors">
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">{task.title}</span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{task.greenhouseName}</td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                    {getPriorityText(task.priority)}
                  </span>
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{task.assigneeName}</td>
                <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{task.workDuration}小时</td>
                <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{task.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
