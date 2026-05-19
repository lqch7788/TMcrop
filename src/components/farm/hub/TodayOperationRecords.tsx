/**
 * 今日操作记录组件
 * 展示最近的操作历史记录，支持快速查看全部记录
 */
import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 操作记录项类型
export interface OperationRecord {
  id: string;
  timestamp: Date;
  operatorType: string;
  operatorName: string;
  content: string;
}

interface TodayOperationRecordsProps {
  /** 操作记录列表 */
  records: OperationRecord[];
  /** 查看全部记录的回调 */
  onShowAll: () => void;
}

/**
 * 今日操作记录展示组件
 * 显示最近5条操作记录，提供查看全部的入口
 */
export function TodayOperationRecords({ records, onShowAll }: TodayOperationRecordsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-gray-400" />
          今日操作记录
        </h2>
        <Button
          variant="link"
          size="sm"
          onClick={onShowAll}
          className="text-emerald-600 hover:text-emerald-700"
        >
          查看全部
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
      <div className="p-4">
        {records.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无操作记录</p>
        ) : (
          <div className="space-y-3">
            {records.slice(0, 5).map((record) => (
              <div key={record.id} className="flex items-start gap-3 text-sm">
                <span className="text-gray-400 whitespace-nowrap">
                  {new Date(record.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  record.operatorType === 'system'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {record.operatorType === 'system' ? '系统' : record.operatorName}
                </span>
                <span className="text-gray-600 flex-1">{record.content}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
