import { useState } from 'react';
import { WorkLog } from './types';
import { SearchableSelect } from '../../materialReturn/modals/SearchableSelect';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Label } from '@/components/ui';

interface WorkLogBatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  logs: WorkLog[];
  onClose: () => void;
  onConfirm: (editedLogs: Record<string, Partial<WorkLog>>) => void;
}

export function WorkLogBatchEditModal({
  isOpen,
  selectedRows,
  logs,
  onClose,
  onConfirm,
}: WorkLogBatchEditModalProps) {
  const [selectedLogCode, setSelectedLogCode] = useState<string>('');
  const [editedLogs, setEditedLogs] = useState<Record<string, Partial<WorkLog>>>({});

  if (!isOpen) return null;

  const selectedLogList = selectedRows.map(id => logs.find(log => log.id === id)).filter(Boolean) as WorkLog[];
  const currentLog = selectedLogCode ? logs.find(log => log.code === selectedLogCode) : null;
  const editedData = selectedLogCode ? editedLogs[selectedLogCode] || {} : {};

  const handleFieldChange = (field: keyof WorkLog, value: unknown) => {
    const updated = {
      ...editedLogs,
      [selectedLogCode]: { ...editedLogs[selectedLogCode], [field]: value },
    };
    setEditedLogs(updated);
  };

  // 确认（下一个）- 仅切换到下一个任务
  const handleConfirmNext = () => {
    const currentIndex = selectedLogList.findIndex(log => log.code === selectedLogCode);
    if (currentIndex < selectedLogList.length - 1) {
      setSelectedLogCode(selectedLogList[currentIndex + 1].code);
    } else {
      setSelectedLogCode(selectedLogList[0].code);
    }
  };

  // 发布 - 保存所有编辑并关闭
  const handlePublish = () => {
    onConfirm(editedLogs);
    setEditedLogs({});
    setSelectedLogCode('');
    onClose();
  };

  const handleClose = () => {
    setEditedLogs({});
    setSelectedLogCode('');
    onClose();
  };

  const content = (
    <div>
      <div className="bg-blue-50 rounded-lg p-3 mb-3">
        <p className="text-sm text-blue-800">
          已选择 <strong>{selectedRows.length}</strong> 个工作日志进行批量编辑，
          已编辑 <strong>{Object.keys(editedLogs).length}</strong> 个
        </p>
      </div>

      {/* Log Selector */}
      <div className="mb-3">
        <Label className="block text-xs font-medium text-gray-600 mb-1">选择日志编号</Label>
        <SearchableSelect
          value={selectedLogCode}
          options={selectedLogList.map(log => ({
            value: log.code,
            label: `${log.code} - ${log.worker}${editedLogs[log.code] ? ' ✅ 已编辑' : ''}`
          }))}
          onChange={setSelectedLogCode}
          placeholder="请选择日志编号"
          className="w-full"
        />
      </div>

      {/* Content */}
      {selectedLogCode && currentLog && (
        <div className="grid grid-cols-4 gap-3">
          {/* 日志编号 - 不可编辑 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">日志编号</div>
            <div className="text-sm font-medium text-gray-900">{currentLog.code}</div>
          </div>

          {/* 日期 - 不可编辑 */}
          <div className="bg-gray-100 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">日期</div>
            <div className="text-sm text-gray-700">{currentLog.date}</div>
          </div>

          {/* 工人姓名 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">工人姓名</div>
            <input
              type="text"
              value={editedData.worker ?? currentLog.worker}
              onChange={(e) => handleFieldChange('worker', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 天气 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">天气</div>
            <input
              type="text"
              value={editedData.weather ?? currentLog.weather}
              onChange={(e) => handleFieldChange('weather', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 温度 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">温度</div>
            <input
              type="text"
              value={editedData.temperature ?? currentLog.temperature}
              onChange={(e) => handleFieldChange('temperature', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 作物 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">作物</div>
            <input
              type="text"
              value={editedData.crop ?? currentLog.crop}
              onChange={(e) => handleFieldChange('crop', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 大棚 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">大棚</div>
            <input
              type="text"
              value={editedData.greenhouse ?? currentLog.greenhouse}
              onChange={(e) => handleFieldChange('greenhouse', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 生长状况 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-500 mb-1">生长状况</div>
            <select
              value={editedData.growthStatus ?? currentLog.growthStatus}
              onChange={(e) => handleFieldChange('growthStatus', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="良好">良好</option>
              <option value="一般">一般</option>
            </select>
          </div>

          {/* 工作内容 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2 col-span-2">
            <div className="text-xs text-gray-500 mb-1">工作内容</div>
            <input
              type="text"
              value={editedData.tasks ?? currentLog.tasks}
              onChange={(e) => handleFieldChange('tasks', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 问题描述 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2 col-span-2">
            <div className="text-xs text-gray-500 mb-1">问题描述</div>
            <input
              type="text"
              value={editedData.problems ?? currentLog.problems}
              onChange={(e) => handleFieldChange('problems', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 处理措施 - 可编辑 */}
          <div className="bg-gray-50 rounded-lg p-2 col-span-2">
            <div className="text-xs text-gray-500 mb-1">处理措施</div>
            <input
              type="text"
              value={editedData.solutions ?? currentLog.solutions}
              onChange={(e) => handleFieldChange('solutions', e.target.value)}
              className="w-full h-7 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );

  const footer = (
    <>
      <Button variant="blue" onClick={handleConfirmNext}>
        确认（下一个）
      </Button>
      <Button onClick={handlePublish}>
        发布
      </Button>
    </>
  );

  return (
    <UnifiedModal isOpen={isOpen} onClose={handleClose} title="批量编辑工作日志" size="xxl" showFooter={true} footer={footer} showMaximize={true}>
      {content}
    </UnifiedModal>
  );
}

export default WorkLogBatchEditModal;
