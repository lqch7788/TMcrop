/**
 * 选择执行人弹窗组件
 * 功能：为待派工任务人工选择执行人
 *
 * 2026-10-20：移除 AI 智能推荐模式，只保留人工选择。
 *   原因：实测点开 AI 推荐会让页面卡死 30 秒以上（AI 派工链的重渲染风暴），
 *   且智能任务中心尚未完全实现。农事管理的数据一律走「人工新建 → 人工派发 → 人工执行」。
 */

import { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui';
import { Button, Label } from '@/components/ui';
import { AlertCircle, Clock, UserPlus, Users, X } from 'lucide-react';
import { Task } from '../../../../hooks/useTasks';
import { useWorkerStore } from '../../../../stores';
// ★ 排班联动：派发后同步 schedule.dispatched_task_ids
import { useDispatchScheduleBridge } from '../../../../hooks/useDispatchScheduleBridge';
// 2026-10-20：AI 派工链（AIRecommendationPanel / useComprehensiveDispatch /
//   DEFAULT_AI_RECOMMEND_CONFIG）已从本弹窗移除 —— 实测点开 AI 推荐会让页面卡死
//   30 秒以上（useComprehensiveDispatch 会拉起 useEnvironmentData 的 30 秒传感器
//   定时器形成重渲染风暴，memory: farm-hub-freeze-ai-chain）。
//   农事管理的数据一律走「人工新建 → 人工派发 → 人工执行」。
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface SelectExecutorModalProps {
  isOpen: boolean;
  task: Task | null;
  onConfirm: (assigneeId: string, assigneeName: string) => void;
  onClose: () => void;
}

export function SelectExecutorModal({
  isOpen,
  task,
  onConfirm,
  onClose,
}: SelectExecutorModalProps) {
  // 2026-10-10 修复（AI 推荐减少调用频率 + 农事任务中心卡死根因）：
  // 原实现关闭状态下也初始化整条 AI 派工链（useComprehensiveDispatch →
  // useEnvironmentData 30 秒传感器定时器 → 连锁重渲染风暴，30~60 秒卡死）。
  // 改为两层组件：外层无 hook，关闭时直接返回 null；内层（Content）持有全部 hook，
  // 只在弹窗真正打开时才挂载运行 —— 满足 hooks 顺序规则且重型链不再随页面常驻。
  if (!isOpen || !task) return null;
  return (
    <SelectExecutorModalContent
      task={task}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}

/** 弹窗内容（仅在打开时挂载——重型 AI 派工链 hooks 全部在此运行） */
function SelectExecutorModalContent({
  task,
  onConfirm,
  onClose,
}: {
  task: Task;
  onConfirm: (assigneeId: string, assigneeName: string) => void;
  onClose: () => void;
}) {
  // 从Store获取员工列表（替换原 taskDispatchStaff mock数据）
  const workers = useWorkerStore((s) => s.workers);
  const loadWorkers = useWorkerStore((s) => s.loadWorkers);
  const taskDispatchStaff = useMemo(() => (Array.isArray(workers) ? workers : []).map(w => ({
    id: w.id,
    name: w.name,
    status: w.status,
    role: w.position || 'worker',
    skills: w.skillTags || [],
    workZone: w.department || '',
    workLoad: 0,
  })), [workers]);

  // 加载员工数据
  useEffect(() => {
    if (!Array.isArray(workers) || workers.length === 0) {
      loadWorkers();
    }
  }, [workers, loadWorkers]);

  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  // ★ 排班联动 hook：派发成功后 fire-and-forget 同步占用
  const { syncAfterDispatch } = useDispatchScheduleBridge();

  // ★ 2026-10-20：AI 派工链（useComprehensiveDispatch）已从本弹窗完全移除。
  //   原因：实测点开 AI 推荐会让页面卡死 30 秒以上 —— useComprehensiveDispatch 会
  //   拉起 useEnvironmentData 的 30 秒传感器定时器等重型链，形成重渲染风暴
  //   （memory: farm-hub-freeze-ai-chain）。智能任务中心尚未完全实现，
  //   农事管理的数据一律走「人工新建 → 人工派发 → 人工执行」，不设自动智能处理。

  // 执行人状态映射
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      available: '空闲',
      busy: '工作中',
      off: '休息中',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      available: 'text-green-600 bg-green-50',
      busy: 'text-orange-600 bg-orange-50',
      off: 'text-gray-600 bg-gray-50',
    };
    return colorMap[status] || 'text-gray-600 bg-gray-50';
  };

  const handleSubmit = () => {
    if (selectedAssignee && task) {
      const staff = taskDispatchStaff.find(s => s.id === selectedAssignee);
      if (staff) {
        onConfirm(selectedAssignee, staff.name);
        // ★ 排班联动：派发成功后副作用，同步 schedule 行 + 自动补一条农事任务排班
        //   workerName 一并传下去：服务端要把执行人归一化到 employees.id（排班表外键要求），
        //   只凭 assigneeId 在历史多套 ID 体系下未必能命中。
        void syncAfterDispatch(
          { source: 'farm', sourceId: task.id },
          selectedAssignee,
          { taskPlanDate: task.planStart || task.dueDate, workerName: staff.name }
        );
        setSelectedAssignee('');
      }
    }
  };

  const handleClose = () => {
    setSelectedAssignee('');
    onClose();
  };

  // Content 仅在弹窗打开时挂载（外层已保证 task 非空），isOpen 恒为 true
  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title="选择执行人"
      size="xl"
      showFooter={false}
    >
      <div className="space-y-5">
        {/* 提示信息 */}
        <div className="flex items-start gap-3 p-4 rounded-lg border border-blue-100 bg-blue-50">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-900">
              为任务 "{task.title || task.id}" 选择执行人
            </p>
            <p className="text-sm text-blue-700 mt-1">
              确认后任务将直接派发（待接受），可在任务列表中随时撤回
            </p>
          </div>
        </div>

        {/* 任务信息 */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
            <p>任务编号：{task.taskCode || task.id}</p>
            <p>任务类型：{task.typeName || task.type}</p>
            <p>任务区域：{task.greenhouseName || task.field || '-'}</p>
            <p>批次：{task.batchCode || '-'}</p>
            <p className="col-span-2">
              计划时间：{task.planStart || '-'} 至 {task.planEnd || '-'}
            </p>
          </div>
        </div>

        {/* 执行人选择（2026-10-20：移除 AI/手动 模式切换，只保留人工选择） */}
        <div>
            <Label className="text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              选择执行人
            </Label>
            <Select
              value={selectedAssignee || ''}
              onValueChange={(value) => setSelectedAssignee(value)}
            >
              <SelectTrigger className={deepInputClass}>
                <SelectValue placeholder="请选择执行人..." />
              </SelectTrigger>
              <SelectContent>
                {taskDispatchStaff.map(staff => (
                  <SelectItem key={staff.id} value={staff.id} className="text-base py-3">
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{staff.name}</div>
                        <div className="text-sm text-gray-500">{staff.role || '执行人员工'}</div>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(staff.status || 'available')}`}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {getStatusLabel(staff.status || 'available')}
                        </span>
                        {staff.skills?.slice(0, 2).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>

        {/* 确认提示 */}
        {selectedAssignee && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-sm text-emerald-800">
              确认将任务派发给：
              <span className="font-medium">
                {taskDispatchStaff.find(s => s.id === selectedAssignee)?.name}
              </span>
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              执行人将收到任务通知，任务状态将变为"已接受"
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClose}
          >
            <X className="w-4 h-4" /> 取消
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={!selectedAssignee}
          >
            <UserPlus className="w-4 h-4" />
            确认派发
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default SelectExecutorModal;
