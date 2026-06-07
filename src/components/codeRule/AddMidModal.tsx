import { useState } from 'react';
import { UnifiedModal } from '@/components/ui';

interface AddMidModalProps {
  isOpen: boolean;
  onClose: () => void;
  bigCode: string;
  onAdd: (midCode: string, midName: string) => void;
}

export function AddMidModal({ isOpen, onClose, bigCode, onAdd }: AddMidModalProps) {
  const [midCode, setMidCode] = useState('');
  const [midName, setMidName] = useState('');

  const handleSubmit = () => {
    if (midCode.trim() && midName.trim()) {
      onAdd(midCode.trim(), midName.trim());
      setMidCode('');
      setMidName('');
    }
  };

  const handleClose = () => {
    setMidCode('');
    setMidName('');
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`添加中类 - ${bigCode}`}
      size="sm"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="添加"
      cancelText="取消"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">中类代码</label>
          <input
            id="midCode"
            type="text"
            value={midCode}
            onChange={(e) => setMidCode(e.target.value)}
            placeholder="两位数字，如：04"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">中类名称</label>
          <input
            id="midName"
            type="text"
            value={midName}
            onChange={(e) => setMidName(e.target.value)}
            placeholder="中类名称"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
      </div>
    </UnifiedModal>
  );
}

export default AddMidModal;
