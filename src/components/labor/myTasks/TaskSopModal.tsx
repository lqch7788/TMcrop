/**
 * SOP文件查看弹窗组件
 */

import { Modal, Button } from '@/components/ui';
import { getTypeColor, getTypeLabel } from './constants';

interface TaskSopModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskDispatchTask | Task | null;
}

/**
 * SOP文件查看弹窗组件
 */
export function TaskSopModal({
  isOpen,
  onClose,
  task,
}: TaskSopModalProps) {
  if (!task) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`作业标准文件 - ${task.id || ''}`}
      size="lg"
      showFooter={false}
      bottomContent={
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onClose}
          >
            关闭
          </Button>
        </div>
      }
    >
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="mb-3">
          <span className="text-sm font-medium text-gray-700">任务类型：</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {(task.types || []).map((t: string) => (
              <span
                key={t}
                className={`px-2 py-1 rounded text-xs text-white ${getTypeColor(t)}`}
              >
                {getTypeLabel(t)}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{task.sopContent || '暂无SOP内容'}</pre>
        </div>
      </div>
    </Modal>
  );
}

export default TaskSopModal;
