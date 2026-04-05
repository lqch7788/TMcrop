import { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { Team, UnassignedWorker } from './types';

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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">分配工人到 {team.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
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

        <div className="p-4 border-t flex justify-between items-center">
          <span className="text-sm text-gray-500">已选择 {selectedWorkers.length} 人</span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              取消
            </button>
            <button
              onClick={handleAssign}
              disabled={selectedWorkers.length === 0}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              确认分配
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
