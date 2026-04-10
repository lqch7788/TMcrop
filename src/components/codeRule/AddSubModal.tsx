import { UnifiedModal } from '../ui/UnifiedModal';

interface AddSubModalProps {
  isOpen: boolean;
  onClose: () => void;
  bigCode: string;
  midCode: string;
  onAdd: (subCode: string, subName: string) => void;
}

export function AddSubModal({ isOpen, onClose, bigCode, midCode, onAdd }: AddSubModalProps) {
  const handleSubmit = () => {
    const codeInput = document.getElementById('subCode') as HTMLInputElement;
    const nameInput = document.getElementById('subName') as HTMLInputElement;
    if (codeInput?.value && nameInput?.value) {
      onAdd(codeInput.value, nameInput.value);
      codeInput.value = '';
      nameInput.value = '';
    }
  };

  const handleClose = () => {
    const codeInput = document.getElementById('subCode') as HTMLInputElement;
    const nameInput = document.getElementById('subName') as HTMLInputElement;
    if (codeInput) codeInput.value = '';
    if (nameInput) nameInput.value = '';
    onClose();
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`添加小类 - ${bigCode}${midCode}`}
      size="sm"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="添加"
      cancelText="取消"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">小类代码</label>
          <input
            id="subCode"
            type="text"
            placeholder="两位数字，如：10"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">小类名称</label>
          <input
            id="subName"
            type="text"
            placeholder="小类名称"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
      </div>
    </UnifiedModal>
  );
}

export default AddSubModal;
