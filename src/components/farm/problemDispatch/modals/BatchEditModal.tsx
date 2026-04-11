import { Modal, FormField, Input, Select } from '../../../ui/Modal';
import type { ProblemEntry } from '../../../../hooks/usePersistentProblems';
import { greenhouses, cropTypes } from '../../../../data/mockData';

interface BatchEditModalProps {
  isOpen: boolean;
  selectedRows: number[];
  problems: ProblemEntry[];
  editedProblemCodes: number[];
  editedProblems: Record<number, Partial<ProblemEntry>>;
  selectedProblemId: number | null;
  onSelectedProblemIdChange: (id: number) => void;
  onEditedProblemsChange: (problems: Record<number, Partial<ProblemEntry>>) => void;
  onEditedProblemCodesChange: (codes: number[]) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function BatchEditModal({
  isOpen,
  selectedRows,
  problems,
  editedProblemCodes,
  editedProblems,
  selectedProblemId,
  onSelectedProblemIdChange,
  onEditedProblemsChange,
  onEditedProblemCodesChange,
  onClose,
  onConfirm,
}: BatchEditModalProps) {
  const selectedProblems = selectedRows.map(id => problems.find(p => p.id === id)).filter(Boolean) as ProblemEntry[];
  const currentProblem = selectedProblemId ? problems.find(p => p.id === selectedProblemId) : null;
  const editedData = selectedProblemId ? editedProblems[selectedProblemId] || {} : {};

  const handleFieldChange = (field: keyof ProblemEntry, value: unknown) => {
    if (!selectedProblemId) return;
    const updated = {
      ...editedProblems,
      [selectedProblemId]: { ...editedProblems[selectedProblemId], [field]: value },
    };
    onEditedProblemsChange(updated);
    if (!editedProblemCodes.includes(selectedProblemId)) {
      onEditedProblemCodesChange([...editedProblemCodes, selectedProblemId]);
    }
  };

  const handleGreenhouseChange = (greenhouseId: string) => {
    const greenhouse = greenhouses.find(g => g.id === greenhouseId);
    handleFieldChange('greenhouseId', greenhouseId);
    if (greenhouse) {
      handleFieldChange('greenhouseName', greenhouse.name);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="批量编辑问题记录"
      size="xxl"
      onSubmit={onConfirm}
      submitText="保存修改"
      cancelText="取消"
    >
      <div className="space-y-4">
        {/* 信息提示 */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            已选择 <strong>{selectedRows.length}</strong> 个问题进行批量编辑，
            已编辑 <strong>{editedProblemCodes.length}</strong> 个
          </p>
        </div>

        {/* 问题选择器 */}
        <FormField label="选择问题编号">
          <Select
            value={selectedProblemId?.toString() || ''}
            onChange={(e) => onSelectedProblemIdChange(Number(e.target.value) || null)}
            options={[
              { value: '', label: '请选择问题编号' },
              ...selectedProblems.map(p => ({
                value: p.id.toString(),
                label: `${p.id} - ${p.greenhouseName} - ${p.issueText.slice(0, 20)}... ${
                  editedProblemCodes.includes(p.id) ? '✅ 已编辑' : ''
                }`,
              })),
            ]}
          />
        </FormField>

        {/* 编辑区域 */}
        {selectedProblemId && currentProblem && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 问题ID - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">问题编号</div>
              <div className="text-sm font-medium text-gray-900">{currentProblem.id}</div>
            </div>

            {/* 温室区域 - 可编辑 */}
            <FormField label="温室区域">
              <Select
                value={editedData.greenhouseId ?? currentProblem.greenhouseId}
                onChange={(e) => handleGreenhouseChange(e.target.value)}
                options={greenhouses.filter(g => g.status === 'active').map(g => ({ value: g.id, label: g.name }))}
              />
            </FormField>

            {/* 作物名称 - 可编辑 */}
            <FormField label="作物名称">
              <Select
                value={editedData.cropName ?? currentProblem.cropName}
                onChange={(e) => handleFieldChange('cropName', e.target.value)}
                options={cropTypes.map(c => ({ value: c.name, label: c.name }))}
              />
            </FormField>

            {/* 巡检日期 - 可编辑 */}
            <FormField label="巡检日期">
              <Input
                type="date"
                value={editedData.checkDate ?? currentProblem.checkDate}
                onChange={(e) => handleFieldChange('checkDate', e.target.value)}
              />
            </FormField>

            {/* 问题描述 - 可编辑 */}
            <div className="md:col-span-2">
              <FormField label="问题描述">
                <textarea
                  value={editedData.issueText ?? currentProblem.issueText}
                  onChange={(e) => handleFieldChange('issueText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={2}
                />
              </FormField>
            </div>

            {/* 严重程度 - 可编辑 */}
            <FormField label="严重程度">
              <Select
                value={editedData.issueSeverity ?? currentProblem.issueSeverity}
                onChange={(e) => handleFieldChange('issueSeverity', e.target.value as '轻微' | '中等' | '严重')}
                options={[
                  { value: '轻微', label: '轻微' },
                  { value: '中等', label: '中等' },
                  { value: '严重', label: '严重' },
                ]}
              />
            </FormField>

            {/* 当前状态 - 不可编辑 */}
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">当前状态</div>
              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                currentProblem.status === '已处理' ? 'bg-green-100 text-green-700' :
                currentProblem.status === '处理中' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {currentProblem.status}
              </span>
            </div>

            {/* 处理人 - 可编辑 */}
            <FormField label="处理人">
              <Input
                value={editedData.handler ?? currentProblem.handler ?? ''}
                onChange={(e) => handleFieldChange('handler', e.target.value)}
                placeholder="输入处理人姓名"
              />
            </FormField>
          </div>
        )}
      </div>
    </Modal>
  );
}
