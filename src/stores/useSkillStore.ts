/**
 * 技能档案 Zustand Store
 *
 * 架构：纯本地 mock 种子数据 + localStorage 持久化
 * 数据流：Store → Hook → 组件 (组件不直接读写 localStorage)
 *
 * 后端无独立 skill API，使用 mock 种子数据
 * 管理两部分数据：员工技能档案 + 培训记录
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ========== 类型定义（与 skill/types.ts 保持一致）==========

export type SkillTag =
  | '微喷灌溉' | '滴灌操作' | '渗灌系统' | '基肥施用' | '追肥操作' | '水肥一体化'
  | '农药配制' | '喷雾操作' | '生物防治' | '果蔬采收' | '分级包装' | '冷链处理'
  | '拖拉机' | '旋耕机' | '收割机' | '灌溉设备' | '温室调控' | '加温系统'
  | '通风系统' | '病害识别' | '虫害识别' | '长势评估' | '播种' | '嫁接' | '炼苗';

export type SkillLevel = '初级' | '中级' | '高级' | '技师';

export interface SkillItem {
  tag: SkillTag;
  level: SkillLevel;
  certifiedDate?: string;
  expiryDate?: string;
}

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

// ========== 种子数据 ==========

function generateStaffSkills(): StaffSkill[] {
  return [
    {
      id: '1', staffId: 'EMP001', staffName: '张伟', department: '生产部',
      skills: [
        { tag: '微喷灌溉', level: '高级', certifiedDate: '2023-03-15', expiryDate: '2025-03-15' },
        { tag: '滴灌操作', level: '技师', certifiedDate: '2022-06-20', expiryDate: '2025-06-20' },
        { tag: '水肥一体化', level: '高级', certifiedDate: '2023-01-10', expiryDate: '2025-01-10' },
      ],
      totalSkills: 3, certificationCount: 3, status: '正常',
    },
    {
      id: '2', staffId: 'EMP002', staffName: '李娜', department: '技术部',
      skills: [
        { tag: '温室调控', level: '技师', certifiedDate: '2022-08-15', expiryDate: '2024-08-15' },
        { tag: '加温系统', level: '高级', certifiedDate: '2023-02-20', expiryDate: '2025-02-20' },
        { tag: '通风系统', level: '高级', certifiedDate: '2023-04-10', expiryDate: '2025-04-10' },
      ],
      totalSkills: 3, certificationCount: 3, status: '即将过期',
    },
    {
      id: '3', staffId: 'EMP003', staffName: '王强', department: '生产部',
      skills: [
        { tag: '拖拉机', level: '高级', certifiedDate: '2021-05-10', expiryDate: '2023-05-10' },
        { tag: '旋耕机', level: '技师', certifiedDate: '2022-03-25', expiryDate: '2025-03-25' },
        { tag: '收割机', level: '中级', certifiedDate: '2023-07-15', expiryDate: '2025-07-15' },
      ],
      totalSkills: 3, certificationCount: 3, status: '已过期',
    },
    {
      id: '4', staffId: 'EMP004', staffName: '赵敏', department: '质检部',
      skills: [
        { tag: '病害识别', level: '技师', certifiedDate: '2023-01-20', expiryDate: '2026-01-20' },
        { tag: '虫害识别', level: '高级', certifiedDate: '2023-03-15', expiryDate: '2026-03-15' },
        { tag: '长势评估', level: '高级', certifiedDate: '2023-05-10', expiryDate: '2026-05-10' },
      ],
      totalSkills: 3, certificationCount: 3, status: '正常',
    },
    {
      id: '5', staffId: 'EMP005', staffName: '孙浩', department: '设备部',
      skills: [
        { tag: '灌溉设备', level: '技师', certifiedDate: '2022-11-10', expiryDate: '2025-11-10' },
        { tag: '温室调控', level: '中级', certifiedDate: '2023-06-20', expiryDate: '2025-06-20' },
        { tag: '加温系统', level: '中级', certifiedDate: '2023-08-15', expiryDate: '2025-08-15' },
      ],
      totalSkills: 3, certificationCount: 3, status: '正常',
    },
    {
      id: '6', staffId: 'EMP006', staffName: '周丽', department: '生产部',
      skills: [
        { tag: '农药配制', level: '高级', certifiedDate: '2023-02-28', expiryDate: '2026-02-28' },
        { tag: '喷雾操作', level: '技师', certifiedDate: '2022-09-15', expiryDate: '2025-09-15' },
        { tag: '生物防治', level: '高级', certifiedDate: '2023-04-20', expiryDate: '2026-04-20' },
      ],
      totalSkills: 3, certificationCount: 3, status: '正常',
    },
    {
      id: '7', staffId: 'EMP007', staffName: '吴涛', department: '技术部',
      skills: [
        { tag: '播种', level: '技师', certifiedDate: '2022-07-10', expiryDate: '2025-07-10' },
        { tag: '嫁接', level: '高级', certifiedDate: '2023-01-15', expiryDate: '2026-01-15' },
        { tag: '炼苗', level: '高级', certifiedDate: '2023-03-20', expiryDate: '2026-03-20' },
      ],
      totalSkills: 3, certificationCount: 3, status: '正常',
    },
    {
      id: '8', staffId: 'EMP008', staffName: '郑静', department: '仓储部',
      skills: [
        { tag: '果蔬采收', level: '中级', certifiedDate: '2023-05-25', expiryDate: '2025-05-25' },
        { tag: '分级包装', level: '高级', certifiedDate: '2022-12-10', expiryDate: '2025-12-10' },
        { tag: '冷链处理', level: '技师', certifiedDate: '2023-02-15', expiryDate: '2026-02-15' },
      ],
      totalSkills: 3, certificationCount: 3, status: '正常',
    },
  ];
}

function generateTrainingRecords(): TrainingRecord[] {
  return [
    {
      id: '1', staffId: 'EMP001', staffName: '张伟', trainingType: '技能考核',
      trainingContent: '微喷灌溉系统操作考核', trainingDate: '2024-12-15',
      trainer: '陈专家', result: '通过', certificate: '微喷灌溉高级技能证书',
    },
    {
      id: '2', staffId: 'EMP002', staffName: '李娜', trainingType: '新技术培训',
      trainingContent: '智能温室调控系统培训', trainingDate: '2024-11-20',
      trainer: '刘教授', result: '通过', certificate: '温室调控技师证书',
    },
    {
      id: '3', staffId: 'EMP003', staffName: '王强', trainingType: '安全培训',
      trainingContent: '农业机械安全操作培训', trainingDate: '2024-10-25',
      trainer: '马工程师', result: '通过', certificate: '农业机械操作安全证书',
    },
    {
      id: '4', staffId: 'EMP004', staffName: '赵敏', trainingType: '技能考核',
      trainingContent: '病虫害识别能力考核', trainingDate: '2024-12-10',
      trainer: '陈专家', result: '通过', certificate: '病害识别技师证书',
    },
    {
      id: '5', staffId: 'EMP005', staffName: '孙浩', trainingType: '内部培训',
      trainingContent: '灌溉设备维护保养培训', trainingDate: '2024-11-15',
      trainer: '王技师', result: '通过', certificate: '灌溉设备维护证书',
    },
    {
      id: '6', staffId: 'EMP006', staffName: '周丽', trainingType: '外部培训',
      trainingContent: '生物防治技术进阶培训', trainingDate: '2024-12-05',
      trainer: '李博士', result: '通过', certificate: '生物防治技术培训证书',
    },
    {
      id: '7', staffId: 'EMP007', staffName: '吴涛', trainingType: '技能考核',
      trainingContent: '嫁接技术实操考核', trainingDate: '2024-11-28',
      trainer: '张高级技师', result: '通过', certificate: '嫁接技师证书',
    },
    {
      id: '8', staffId: 'EMP008', staffName: '郑静', trainingType: '内部培训',
      trainingContent: '冷链物流管理培训', trainingDate: '2024-12-01',
      trainer: '赵经理', result: '待考核', certificate: '',
    },
  ];
}

// ========== Store 类型 ==========

interface SkillState {
  staffSkills: StaffSkill[];
  trainingRecords: TrainingRecord[];
  isLoading: boolean;
  error: string | null;

  fetchData: () => Promise<void>;

  // 技能档案 CRUD
  addStaffSkill: (data: Omit<StaffSkill, 'id' | 'totalSkills' | 'certificationCount' | 'status'>) => void;
  updateStaffSkill: (id: string, data: Omit<StaffSkill, 'id' | 'totalSkills' | 'certificationCount' | 'status'>) => void;
  deleteStaffSkill: (id: string) => void;

  // 培训记录 CRUD
  addTrainingRecord: (data: Omit<TrainingRecord, 'id'>) => void;
  updateTrainingRecord: (id: string, data: Partial<TrainingRecord>) => void;
  deleteTrainingRecord: (id: string) => void;

  _initSeedData: () => void;
}

// ========== Store 实现 ==========

export const useSkillStore = create<SkillState>()(
  persist(
    (set, get) => ({
      staffSkills: [],
      trainingRecords: [],
      isLoading: false,
      error: null,

      fetchData: async () => {
        set({ isLoading: true, error: null });
        try {
          const current = get().staffSkills;
          if (current.length === 0) {
            get()._initSeedData();
          }
          set({ isLoading: false });
        } catch (error) {
          console.warn('[SkillStore] 获取技能数据失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addStaffSkill: (data) => {
        const newSkill: StaffSkill = {
          ...data,
          id: String(Date.now()),
          totalSkills: data.skills.length,
          certificationCount: data.skills.filter((s) => s.certifiedDate).length,
          status: '正常',
        };
        set((state) => ({ staffSkills: [...state.staffSkills, newSkill] }));
      },

      updateStaffSkill: (id, data) => {
        set((state) => ({
          staffSkills: state.staffSkills.map((skill) =>
            skill.id === id
              ? {
                  ...skill,
                  ...data,
                  totalSkills: data.skills.length,
                  certificationCount: data.skills.filter((s) => s.certifiedDate).length,
                }
              : skill
          ),
        }));
      },

      deleteStaffSkill: (id) => {
        set((state) => ({
          staffSkills: state.staffSkills.filter((skill) => skill.id !== id),
        }));
      },

      addTrainingRecord: (data) => {
        const newRecord: TrainingRecord = {
          ...data,
          id: String(Date.now()),
        };
        set((state) => ({ trainingRecords: [...state.trainingRecords, newRecord] }));
      },

      updateTrainingRecord: (id, data) => {
        set((state) => ({
          trainingRecords: state.trainingRecords.map((record) =>
            record.id === id ? { ...record, ...data } : record
          ),
        }));
      },

      deleteTrainingRecord: (id) => {
        set((state) => ({
          trainingRecords: state.trainingRecords.filter((record) => record.id !== id),
        }));
      },

      _initSeedData: () => {
        const skills = generateStaffSkills();
        const trainings = generateTrainingRecords();
        set({ staffSkills: skills, trainingRecords: trainings, isLoading: false });
        console.log('[SkillStore] 已初始化种子数据:', skills.length, '条技能档案,', trainings.length, '条培训记录');
      },
    }),
    {
      name: 'skill-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        staffSkills: state.staffSkills,
        trainingRecords: state.trainingRecords,
      }),
    }
  )
);
