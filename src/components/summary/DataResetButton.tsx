/**
 * 数据重置按钮组件
 * 用于演示后恢复初始数据
 */

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { clearAllPersistedData } from '../../hooks/useLocalStorage';
import { usePersistentWorkLogs } from '../../hooks/usePersistentWorkLogs';
import { usePersistentAttendance } from '../../hooks/usePersistentAttendance';

interface DataResetButtonProps {
  className?: string;
}

export function DataResetButton({ className = '' }: DataResetButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { resetWorkLogs } = usePersistentWorkLogs();
  const { resetAttendance } = usePersistentAttendance();

  const handleReset = () => {
    clearAllPersistedData();
    resetWorkLogs();
    resetAttendance();
    setShowConfirm(false);
    // 刷新页面以应用更改
    window.location.reload();
  };

  if (showConfirm) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-600">确定要重置所有数据吗？</span>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
        >
          确认重置
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors ${className}`}
      title="重置演示数据"
    >
      <RotateCcw className="w-4 h-4" />
      <span>重置数据</span>
    </button>
  );
}
