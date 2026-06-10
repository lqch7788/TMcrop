/**
 * 质检记录弹窗
 */
import { useState } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';

interface QualityCheckModalProps {
  isOpen: boolean;
  deliveryRecordId: string;
  onClose: () => void;
  onSave: (data: { checkDate: string; checkResult: string; checkPerson: string; checkItems: Array<{ item: string; result: string }> }) => void;
}

export default function QualityCheckModal({ isOpen, deliveryRecordId, onClose, onSave }: QualityCheckModalProps) {
  const [checkDate, setCheckDate] = useState(todayLocal());
  const [checkResult, setCheckResult] = useState<'qualified' | 'unqualified' | 'pending'>('pending');
  const [checkPerson, setCheckPerson] = useState('');
  const [checkItems, setCheckItems] = useState([
    { item: '外观', result: '合格' },
    { item: '规格', result: '合格' },
    { item: '数量', result: '合格' },
  ]);

  const handleSave = () => {
    onSave({ checkDate, checkResult, checkPerson, checkItems });
  };

  const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

  const footer = (
    <div className="flex items-center justify-end gap-3">
      <Button size="sm" variant="secondary" onClick={onClose}><X className="w-4 h-4" /> 取消</Button>
      <Button size="sm" variant="default" onClick={handleSave}><Save className="w-4 h-4" /> 保存</Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="质检记录" size="lg" showFooter={true} footer={footer}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-700">质检日期</Label>
            <DatePicker
              selected={new Date(checkDate)}
              onChange={(date) => setCheckDate(todayLocal(date))}
              className={deepInputClass}
            />
          </div>
          <div>
            <Label className="text-gray-700">质检结果</Label>
            <Select value={checkResult} onValueChange={(v) => setCheckResult(v as typeof checkResult)}>
              <SelectTrigger className="border-gray-300"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="qualified">合格</SelectItem>
                <SelectItem value="unqualified">不合格</SelectItem>
                <SelectItem value="pending">待定</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-gray-700">质检人员</Label>
          <Input
            value={checkPerson}
            onChange={(e) => setCheckPerson(e.target.value)}
            className={deepInputClass}
          />
        </div>
        <div>
          <Label className="text-gray-700">质检项目</Label>
          <div className="space-y-2">
            {checkItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={item.item}
                  onChange={(e) => {
                    const newItems = [...checkItems];
                    newItems[index].item = e.target.value;
                    setCheckItems(newItems);
                  }}
                  className="w-24 border-gray-300"
                  placeholder="项目"
                />
                <Select
                  value={item.result}
                  onValueChange={(v) => {
                    const newItems = [...checkItems];
                    newItems[index].result = v;
                    setCheckItems(newItems);
                  }}
                >
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="合格">合格</SelectItem>
                    <SelectItem value="不合格">不合格</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCheckItems(checkItems.filter((_, i) => i !== index))}
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCheckItems([...checkItems, { item: '', result: '合格' }])}
            >
              <Plus className="w-4 h-4" />
              + 添加项目
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
