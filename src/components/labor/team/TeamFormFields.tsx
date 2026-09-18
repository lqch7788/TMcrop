/**
 * 班组编辑表单字段（2026-09-18 抽自 TeamTable）
 *
 * 2026-09-18 修复 M-1：从 TeamTable 抽出新建/编辑表单的内层字段，
 *   TeamTable 主组件只剩"表单编排 + Modal 容器"。
 */
import { Label } from '@/components/ui';
import { Input } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { SkillTagEditor } from './SkillTagEditor';

export interface TeamFormData {
  name: string;
  leaderName: string;
  description: string;
  capabilityTags: string[];
  dailyCapacityHours: number;
}

export interface TeamFormFieldsProps {
  value: TeamFormData;
  onChange: (next: TeamFormData) => void;
}

export function TeamFormFields({ value, onChange }: TeamFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">班组名称</Label>
        <Input
          type="text"
          maxLength={100}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="请输入班组名称"
        />
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">负责人</Label>
        <Input
          type="text"
          maxLength={50}
          value={value.leaderName}
          onChange={(e) => onChange({ ...value, leaderName: e.target.value })}
          placeholder="请输入负责人姓名"
        />
      </div>
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">
          技能标签
          <span className="ml-2 text-xs text-gray-400">（点击 chip 选择，预设外可点「其他」输入自定义）</span>
        </Label>
        <SkillTagEditor
          value={value.capabilityTags}
          onChange={(next) => onChange({ ...value, capabilityTags: next })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">
            日产能上限 <span className="text-xs text-gray-400">（小时/天）</span>
          </Label>
          <Input
            type="number"
            min={1}
            max={24}
            value={value.dailyCapacityHours ?? 8}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onChange({
                ...value,
                dailyCapacityHours: Number.isFinite(v)
                  ? Math.max(1, Math.min(24, v))
                  : value.dailyCapacityHours,
              });
            }}
          />
        </div>
      </div>
      {/* 2026-09-17：移除「周产能上限」和「作业半径」（全项目无下游消费的死字段）；
          同时移除「作业区域」多选控件 —— 该功能经核实空转（唯一消费方未激活 +
          与任务空间维度断层），界面下线，数据保留在 team_zone_assignments 表 */}
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">描述</Label>
        <TextArea
          maxLength={500}
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          rows={3}
          placeholder="请输入描述"
        />
      </div>
    </div>
  );
}