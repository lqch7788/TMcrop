// 技能标签类型
export type SkillTag = '微喷灌溉' | '滴灌操作' | '渗灌系统' | '基肥施用' | '追肥操作' | '水肥一体化' | '农药配制' | '喷雾操作' | '生物防治' | '果蔬采收' | '分级包装' | '冷链处理' | '拖拉机' | '旋耕机' | '收割机' | '灌溉设备' | '温室调控' | '加温系统' | '通风系统' | '病害识别' | '虫害识别' | '长势评估' | '播种' | '嫁接' | '炼苗';

// 技能等级类型
export type SkillLevel = '初级' | '中级' | '高级' | '技师';

// 单个技能项
export interface SkillItem {
  tag: SkillTag;
  level: SkillLevel;
  certifiedDate?: string;
  expiryDate?: string;
}

// 员工技能档案
export interface StaffSkill {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  skills: SkillItem[];
  totalSkills: number;
  certificationCount: number;
  status: '正常' | '即将过期' | '已过期';
}

// 培训记录
export interface TrainingRecord {
  id: string;
  staffId: string;
  staffName: string;
  trainingType: string;
  trainingContent: string;
  trainingDate: string;
  trainer: string;
  result: '通过' | '未通过' | '待考核';
  certificate?: string;
}

// 技能档案表单数据
export interface SkillFormData {
  staffId: string;
  staffName: string;
  department: string;
  skills: SkillItem[];
}

// 培训记录表单数据
export interface TrainingFormData {
  staffId: string;
  staffName: string;
  trainingType: string;
  trainingContent: string;
  trainingDate: string;
  trainer: string;
  result: '通过' | '未通过' | '待考核';
  certificate?: string;
}

// 所有技能标签列表
export const SKILL_TAGS: SkillTag[] = [
  '微喷灌溉', '滴灌操作', '渗灌系统', '基肥施用', '追肥操作', '水肥一体化',
  '农药配制', '喷雾操作', '生物防治', '果蔬采收', '分级包装', '冷链处理',
  '拖拉机', '旋耕机', '收割机', '灌溉设备', '温室调控', '加温系统',
  '通风系统', '病害识别', '虫害识别', '长势评估', '播种', '嫁接', '炼苗'
];

// 技能等级选项
export const SKILL_LEVELS: SkillLevel[] = ['初级', '中级', '高级', '技师'];

// 部门选项
export const DEPARTMENTS = ['生产部', '技术部', '质检部', '仓储部', '设备部'];

// 培训类型选项
export const TRAINING_TYPES = ['内部培训', '外部培训', '技能考核', '安全培训', '新技术培训'];
