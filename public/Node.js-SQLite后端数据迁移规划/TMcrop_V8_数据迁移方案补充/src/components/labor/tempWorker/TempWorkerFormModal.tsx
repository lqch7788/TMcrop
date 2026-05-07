import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { UnifiedModal } from '../../ui/UnifiedModal';
import {
  TempWorkerFormModalProps,
  TempWorker,
  WorkerType,
  ContractType,
  SkillTag,
} from './types';

/**
 * 技能标签分组
 */
const SKILL_TAG_GROUPS = {
  '灌溉技能': ['微喷灌溉', '滴灌操作', '渗灌系统', '灌溉设备'] as SkillTag[],
  '施肥技能': ['基肥施用', '追肥操作', '水肥一体化'] as SkillTag[],
  '植保技能': ['农药配制', '喷雾操作', '生物防治', '病害识别', '虫害识别'] as SkillTag[],
  '采收技能': ['果蔬采收', '分级包装', '冷链处理'] as SkillTag[],
  '农机技能': ['拖拉机', '旋耕机', '收割机'] as SkillTag[],
  '温室技能': ['温室调控', '加温系统', '通风系统'] as SkillTag[],
  '农事技能': ['长势评估', '播种', '嫁接', '炼苗'] as SkillTag[],
};

/**
 * 临时工表单弹窗组件（新建/编辑）
 */
export function TempWorkerFormModal({
  record,
  open,
  onClose,
  onSave,
}: TempWorkerFormModalProps) {
  const [formData, setFormData] = useState<Partial<TempWorker>>({
    name: '',
    idCard: '',
    phone: '',
    workerType: '临时工',
    contractType: '劳务合同',
    dailyWage: undefined,
    hourlyWage: undefined,
    skillTags: [],
    workZones: [],
    status: '在职',
    insuranceType: '',
    source: '',
    maxWorkDays: undefined,
  });

  // 当弹窗打开或 record 变化时，初始化表单数据
  useEffect(() => {
    if (open) {
      if (record) {
        setFormData(record);
      } else {
        // 新建时设置默认值
        setFormData({
          name: '',
          idCard: '',
          phone: '',
          workerType: '临时工',
          contractType: '劳务合同',
          dailyWage: undefined,
          hourlyWage: undefined,
          skillTags: [],
          workZones: [],
          status: '在职',
          insuranceType: '',
          source: '',
          maxWorkDays: undefined,
        });
      }
    }
  }, [open, record]);

  if (!open) return null;

  const workerTypes: WorkerType[] = ['正式工', '临时工', '季节工'];
  const contractTypes: ContractType[] = ['劳动合同', '劳务合同', '实习协议', '无合同'];
  const insuranceOptions = ['工伤险', '综合险', '无保险'];
  const sourceOptions = ['劳务公司', '个人零工', '学生实习'];
  const workZoneOptions = ['A区', 'B区', 'C区', 'D区'];

  const handleChange = (field: keyof TempWorker, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 切换技能标签
  const toggleSkillTag = (tag: SkillTag) => {
    setFormData((prev) => {
      const current = prev.skillTags || [];
      if (current.includes(tag)) {
        return { ...prev, skillTags: current.filter((t) => t !== tag) };
      } else {
        return { ...prev, skillTags: [...current, tag] };
      }
    });
  };

  // 切换作业区域
  const toggleWorkZone = (zone: string) => {
    setFormData((prev) => {
      const current = prev.workZones || [];
      if (current.includes(zone)) {
        return { ...prev, workZones: current.filter((z) => z !== zone) };
      } else {
        return { ...prev, workZones: [...current, zone] };
      }
    });
  };

  const handleSubmit = () => {
    // 验证必填项
    if (!formData.name?.trim()) {
      alert('请输入员工姓名');
      return;
    }
    if (!formData.idCard?.trim()) {
      alert('请输入身份证号');
      return;
    }
    if (!formData.phone?.trim()) {
      alert('请输入联系电话');
      return;
    }
    if ((formData.skillTags || []).length === 0) {
      alert('请选择至少一项技能标签');
      return;
    }
    if ((formData.workZones || []).length === 0) {
      alert('请选择至少一个作业区域');
      return;
    }
    onSave(formData);
  };

  const content = (
    <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
      <div className="grid grid-cols-2 gap-4">
        {/* 姓名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入员工姓名"
          />
        </div>

        {/* 联系电话 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            联系电话 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入手机号"
          />
        </div>

        {/* 身份证号 */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            身份证号 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.idCard || ''}
            onChange={(e) => handleChange('idCard', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入18位身份证号"
            maxLength={18}
          />
        </div>

        {/* 工人类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            工人类型 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.workerType || ''}
            onChange={(e) => handleChange('workerType', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {workerTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* 合同类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            合同类型 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.contractType || ''}
            onChange={(e) => handleChange('contractType', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            {contractTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* 日工资 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            日工资 (元/天)
          </label>
          <input
            type="number"
            value={formData.dailyWage || ''}
            onChange={(e) =>
              handleChange('dailyWage', e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入日工资"
          />
        </div>

        {/* 时工资 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            时工资 (元/时)
          </label>
          <input
            type="number"
            value={formData.hourlyWage || ''}
            onChange={(e) =>
              handleChange('hourlyWage', e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入时工资"
          />
        </div>

        {/* 保险类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            保险类型
          </label>
          <select
            value={formData.insuranceType || ''}
            onChange={(e) => handleChange('insuranceType', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择</option>
            {insuranceOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* 来源 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            来源
          </label>
          <select
            value={formData.source || ''}
            onChange={(e) => handleChange('source', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择</option>
            {sourceOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* 最大用工天数 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            本批次最大用工天数
          </label>
          <input
            type="number"
            value={formData.maxWorkDays || ''}
            onChange={(e) =>
              handleChange('maxWorkDays', e.target.value ? Number(e.target.value) : undefined)
            }
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            placeholder="请输入天数"
          />
        </div>

        {/* 状态（编辑时显示） */}
        {record && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              状态
            </label>
            <select
              value={formData.status || ''}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="在职">在职</option>
              <option value="离职">离职</option>
              <option value="停薪留职">停薪留职</option>
              <option value="试用期">试用期</option>
            </select>
          </div>
        )}
      </div>

      {/* 作业区域 */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          作业区域 <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {workZoneOptions.map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => toggleWorkZone(zone)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                (formData.workZones || []).includes(zone)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      {/* 技能标签 */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          技能标签 <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3">
          {Object.entries(SKILL_TAG_GROUPS).map(([groupName, tags]) => (
            <div key={groupName}>
              <span className="text-xs text-gray-500 mb-1 block">{groupName}</span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleSkillTag(tag)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      (formData.skillTags || []).includes(tag)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const footer = (
    <div className="flex justify-end gap-2">
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
      >
        取消
      </button>
      <button
        onClick={handleSubmit}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
      >
        保存
      </button>
    </div>
  );

  return (
    <UnifiedModal
      isOpen={open}
      onClose={onClose}
      title={record ? '编辑员工' : '快速入职'}
      size="lg"
      showFooter={true}
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}
