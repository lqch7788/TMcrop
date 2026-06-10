import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { SkillTag, SkillLevel, SKILL_TAGS, SKILL_LEVELS, SkillItem } from './types';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';

interface SkillTagSelectorProps {
  selectedSkills: SkillItem[];
  onChange: (skills: SkillItem[]) => void;
  maxSkills?: number;
}

export function SkillTagSelector({ selectedSkills, onChange, maxSkills = 10 }: SkillTagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredTag, setHoveredTag] = useState<SkillTag | null>(null);

  // 按类别分组技能标签
  const skillCategories = {
    '灌溉类': ['微喷灌溉', '滴灌操作', '渗灌系统', '灌溉设备'] as SkillTag[],
    '施肥类': ['基肥施用', '追肥操作', '水肥一体化'] as SkillTag[],
    '植保类': ['农药配制', '喷雾操作', '生物防治'] as SkillTag[],
    '采加类': ['果蔬采收', '分级包装', '冷链处理'] as SkillTag[],
    '农机类': ['拖拉机', '旋耕机', '收割机'] as SkillTag[],
    '环境控制类': ['温室调控', '加温系统', '通风系统'] as SkillTag[],
    '农艺类': ['病害识别', '虫害识别', '长势评估', '播种', '嫁接', '炼苗'] as SkillTag[],
  };

  // 检查标签是否已选中
  const isTagSelected = (tag: SkillTag) => {
    return selectedSkills.some((s) => s.tag === tag);
  };

  // 获取选中标签的等级
  const getSkillLevel = (tag: SkillTag): SkillLevel | undefined => {
    const skill = selectedSkills.find((s) => s.tag === tag);
    return skill?.level;
  };

  // 添加或更新技能
  const handleTagClick = (tag: SkillTag) => {
    if (isTagSelected(tag)) {
      // 移除技能
      onChange(selectedSkills.filter((s) => s.tag !== tag));
    } else {
      // 添加技能（默认初级）
      if (selectedSkills.length < maxSkills) {
        onChange([...selectedSkills, { tag, level: '初级' }]);
      }
    }
  };

  // 更新技能等级
  const handleLevelChange = (tag: SkillTag, level: SkillLevel) => {
    onChange(
      selectedSkills.map((s) => (s.tag === tag ? { ...s, level } : s))
    );
  };

  // 更新证书日期
  const handleDateChange = (tag: SkillTag, field: 'certifiedDate' | 'expiryDate', value: string) => {
    onChange(
      selectedSkills.map((s) => (s.tag === tag ? { ...s, [field]: value } : s))
    );
  };

  // 移除技能
  const handleRemoveSkill = (tag: SkillTag) => {
    onChange(selectedSkills.filter((s) => s.tag !== tag));
  };

  return (
    <div className="space-y-3">
      {/* 已选技能标签 */}
      {selectedSkills.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">已选技能 ({selectedSkills.length}/{maxSkills})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skill) => (
              <div
                key={skill.tag}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-200 rounded-full"
              >
                <span className="text-sm font-medium text-emerald-700">{skill.tag}</span>
                <select
                  value={skill.level}
                  onChange={(e) => handleLevelChange(skill.tag, e.target.value as SkillLevel)}
                  className="text-xs border-none bg-transparent text-gray-600 focus:outline-none cursor-pointer"
                >
                  {SKILL_LEVELS.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                <DatePicker
                  selected={skill.certifiedDate ? new Date(skill.certifiedDate) : undefined}
                  onChange={(date) => handleDateChange(skill.tag, 'certifiedDate', todayLocal(date))}
                  placeholder="颁证日期"
                  className="w-28 text-xs"
                />
                <Button
                  variant="ghost"
                  onClick={() => handleRemoveSkill(skill.tag)}
                  className="p-0.5 h-auto"
                >
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 选择器按钮 */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full justify-center',
          selectedSkills.length >= maxSkills
            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        )}
        disabled={selectedSkills.length >= maxSkills}
      >
        {isOpen ? '收起技能选择' : selectedSkills.length >= maxSkills ? '已达到最大数量' : '+ 选择技能标签'}
      </Button>

      {/* 技能选择弹窗 */}
      {isOpen && (
        <div className="border border-gray-200 rounded-lg bg-white shadow-lg max-h-80 overflow-y-auto">
          {/* 分类展示 */}
          <div className="p-3 space-y-4">
            {Object.entries(skillCategories).map(([category, tags]) => (
              <div key={category}>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {category}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const isSelected = isTagSelected(tag);
                    const level = getSkillLevel(tag);
                    return (
                      <Button
                        key={tag}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => handleTagClick(tag)}
                        onMouseEnter={() => setHoveredTag(tag)}
                        onMouseLeave={() => setHoveredTag(null)}
                        className={cn(
                          'relative px-3 py-1.5 text-sm h-auto',
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-700'
                        )}
                      >
                        <span className="relative z-10">{tag}</span>
                        {isSelected && level && (
                          <span className="ml-1 text-xs opacity-80">({level})</span>
                        )}
                        {isSelected && (
                          <Check className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white text-emerald-600 rounded-full" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 底部提示 */}
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
            <p className="text-xs text-gray-500">
              点击标签选择/取消，已选技能可在上方设置等级和证书日期
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SkillTagSelector;
