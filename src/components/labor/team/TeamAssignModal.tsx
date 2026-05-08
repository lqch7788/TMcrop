import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import type { Team, UnassignedWorker } from './types';
import { Button } from '../../../components/ui/button';

interface TeamAssignModalProps {
  team: Team | null;
  unassignedWorkers: UnassignedWorker[];
  open: boolean;
  onClose: () => void;
  onAssign: (teamId: string, workerIds: string[]) => void;
}

export function TeamAssignModal({ team, unassignedWorkers, open, onClose, onAssign }: TeamAssignModalProps) {
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);

  if (!open || !team) return null;

  const toggleWorker = (workerId: string) => {
    setSelectedWorkers((prev) =>
      prev.includes(workerId) ? prev.filter((id) => id !== workerId) : [...prev, workerId]
    );
  };

  const handleAssign = () => {
    if (selectedWorkers.length > 0) {
      onAssign(team.id, selectedWorkers);
      setSelectedWorkers([]);
      onClose();
    }
  };

  const content = (
    <div className="overflow-y-auto max-h-[60vh]">
      {unassignedWorkers.length === 0 ? (
        <p className="text-center text-gray-500 py-8">暂无可分配的工人</p>
      ) : (
        <div className="space-y-2">
          {unassignedWorkers.map((worker) => (
            <div
              key={worker.id}
              onClick={() => toggleWorker(worker.id)}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedWorkers.includes(worker.id)
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{worker.name}</p>
                  <p className="text-sm text-gray-500">{worker.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{worker.workerType}</span>
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
          ))}
        </div>
      )}
    </div>
  );

  const footer = (
    <>
      <span className="text-sm text-gray-500">已选择 {selectedWorkers.length} 人</span>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button
          onClick={handleAssign}
          disabled={selectedWorkers.length === 0}
        >
          确认分配
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
      headerAction={
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
