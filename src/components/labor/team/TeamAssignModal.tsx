import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { UnifiedModal, Button, Label } from '@/components/ui';
import type { Team, UnassignedWorker } from './types';

interface TeamAssignModalProps {
  team: Team | null;
  unassignedWorkers: UnassignedWorker[];
  open: boolean;
  onClose: () => void;
  // 2026-09-18 修复 C-9：传 per-worker 角色映射（替代单一 role）
  onAssign: (teamId: string, workerIds: string[], workerRoles: Record<string, string>) => void;
}

// 2026-09-15：扩展角色枚举（leader/deputy/safety/quality/member）
const ROLE_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'leader', label: '班长', description: '负责班组全面管理' },
  { value: 'deputy', label: '副班长', description: '协助班长管理' },
  { value: 'safety', label: '安全员', description: '负责现场安全监督' },
  { value: 'quality', label: '质检员', description: '负责质量检查' },
  { value: 'member', label: '普通组员', description: '基础作业人员' },
];

export function TeamAssignModal({ team, unassignedWorkers, open, onClose, onAssign }: TeamAssignModalProps) {
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  // 2026-09-15：每个工人单独选角色（默认 member）
  const [workerRoles, setWorkerRoles] = useState<Record<string, string>>({});

  // 弹窗关闭时重置选择状态
  useEffect(() => {
    if (!open) {
      setSelectedWorkers([]);
      setWorkerRoles({});
    }
  }, [open]);

  if (!open || !team) return null;

  const toggleWorker = (workerId: string) => {
    setSelectedWorkers((prev) => {
      const next = prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId];
      return next;
    });
  };

  const handleAssign = () => {
    if (selectedWorkers.length === 0) return;
    // 2026-09-18 修复 C-9：完整传 workerRoles（每个工人独立角色），
    // 之前只取第一个工人的角色，其余被静默丢弃
    const finalRoles: Record<string, string> = {};
    for (const wid of selectedWorkers) {
      finalRoles[wid] = workerRoles[wid] || 'member';
    }
    onAssign(team.id, selectedWorkers, finalRoles);
    setSelectedWorkers([]);
    setWorkerRoles({});
    onClose();
  };

  const content = (
    <div className="overflow-y-auto max-h-[60vh] space-y-3">
      {/* 2026-09-15：批量选择角色（简化模式，所有人选同一角色） */}
      {selectedWorkers.length > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <Label className="text-xs text-blue-800 mb-2 block">
            已选 {selectedWorkers.length} 人，批量指定角色：
          </Label>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  const updated: Record<string, string> = {};
                  selectedWorkers.forEach((wid) => { updated[wid] = r.value; });
                  setWorkerRoles(updated);
                }}
                className="px-3 py-1 text-xs bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-100"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {unassignedWorkers.length === 0 ? (
        <p className="text-center text-gray-500 py-8">暂无可分配的工人</p>
      ) : (
        <div className="space-y-2">
          {unassignedWorkers.map((worker) => {
            const role = workerRoles[worker.id] || 'member';
            const roleLabel = ROLE_OPTIONS.find((r) => r.value === role)?.label || role;
            return (
              // 2026-09-18 修复 M-8：改为 label + 隐藏 checkbox（键盘可达 + screen reader 友好），
              // 替代之前的 div onClick（不可通过 Tab 聚焦、无 a11y 角色）
              <label
                key={worker.id}
                className={`block p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedWorkers.includes(worker.id)
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-emerald-600"
                    checked={selectedWorkers.includes(worker.id)}
                    onChange={() => toggleWorker(worker.id)}
                    aria-label={`选择工人 ${worker.name}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{worker.name}</p>
                        <p className="text-sm text-gray-500">{worker.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{worker.workerType}</span>
                        {selectedWorkers.includes(worker.id) && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {roleLabel}
                          </span>
                        )}
                        {selectedWorkers.includes(worker.id) && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                    {worker.skillTags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {worker.skillTags.map((tag) => (
                          <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );

  const footer = (
    <>
      <span className="text-sm text-gray-500">已选择 {selectedWorkers.length} 人</span>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose}>
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button
          onClick={handleAssign}
          disabled={selectedWorkers.length === 0}
        >
          <Check className="w-4 h-4" /> 确认分配
        </Button>
      </div>
    </>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={`分配工人到 ${team.name}`}
      size="md"
      showFooter={true}
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
