/**
 * 临时工入职 Zustand Store
 *
 * 架构：纯本地 mock 种子数据 + localStorage 持久化
 * 数据流：Store → Hook → 组件 (组件不直接读写 localStorage)
 *
 * 后端无独立 tempWorker API，使用 mock 种子数据
 */

import { create } from 'zustand';
// ========== 类型定义（与 tempWorker/types.ts 保持一致）==========

export type WorkerType = '正式工' | '临时工' | '季节工';
export type ContractType = '劳动合同' | '劳务合同' | '实习协议' | '无合同';
export type StaffStatus = '在职' | '离职' | '停薪留职' | '试用期';
export type SkillTag =
  | '微喷灌溉' | '滴灌操作' | '渗灌系统' | '基肥施用' | '追肥操作' | '水肥一体化'
  | '农药配制' | '喷雾操作' | '生物防治' | '果蔬采收' | '分级包装' | '冷链处理'
  | '拖拉机' | '旋耕机' | '收割机' | '灌溉设备' | '温室调控' | '加温系统'
  | '通风系统' | '病害识别' | '虫害识别' | '长势评估' | '播种' | '嫁接' | '炼苗';

export interface TempWorker {
  id: string;
  employeeCode: string;
  name: string;
  idCard: string;
  phone: string;
  workerType: WorkerType;
  contractType: ContractType;
  dailyWage?: number;
  hourlyWage?: number;
  skillTags: SkillTag[];
  workZones: string[];
  status: StaffStatus;
  joinDate: string;
  insuranceType?: string;
  source?: string;
  maxWorkDays?: number;
}

// ========== 种子数据 ==========

function generateSeedData(): TempWorker[] {
  return [
    {
      id: '1', employeeCode: 'YG-20260315-001', name: '萧峰', idCard: '320102199003121234',
      phone: '13812345601', workerType: '临时工', contractType: '劳务合同', dailyWage: 200,
      skillTags: ['微喷灌溉', '滴灌操作', '水肥一体化'], workZones: ['A区', 'B区'],
      status: '在职', joinDate: '2026-03-15', insuranceType: '工伤险', source: '个人零工', maxWorkDays: 30,
    },
    {
      id: '2', employeeCode: 'YG-20260316-001', name: '虚竹', idCard: '320102199105231234',
      phone: '13812345602', workerType: '季节工', contractType: '劳务合同', dailyWage: 180,
      skillTags: ['果蔬采收', '分级包装', '冷链处理'], workZones: ['C区', 'D区'],
      status: '在职', joinDate: '2026-03-16', insuranceType: '综合险', source: '劳务公司', maxWorkDays: 60,
    },
    {
      id: '3', employeeCode: 'YG-20260310-001', name: '狄云', idCard: '320102198805151234',
      phone: '13812345603', workerType: '正式工', contractType: '劳动合同', dailyWage: 220,
      skillTags: ['拖拉机', '旋耕机', '收割机', '灌溉设备'], workZones: ['A区', 'B区', 'C区'],
      status: '试用期', joinDate: '2026-03-10', insuranceType: '综合险', source: '个人零工',
    },
    {
      id: '4', employeeCode: 'YG-20260312-001', name: '石破天', idCard: '320102199208171234',
      phone: '13812345604', workerType: '临时工', contractType: '无合同', hourlyWage: 25,
      skillTags: ['农药配制', '喷雾操作', '生物防治'], workZones: ['B区'],
      status: '在职', joinDate: '2026-03-12', insuranceType: '无保险', source: '个人零工', maxWorkDays: 15,
    },
    {
      id: '5', employeeCode: 'YG-20260301-001', name: '胡斐', idCard: '320102199310201234',
      phone: '13812345605', workerType: '季节工', contractType: '实习协议', dailyWage: 150,
      skillTags: ['播种', '嫁接', '炼苗', '病害识别'], workZones: ['A区', 'D区'],
      status: '在职', joinDate: '2026-03-01', source: '学生实习', maxWorkDays: 90,
    },
    {
      id: '6', employeeCode: 'YG-20260220-001', name: '袁承志', idCard: '320102199505251234',
      phone: '13812345606', workerType: '正式工', contractType: '劳动合同', dailyWage: 230,
      skillTags: ['温室调控', '加温系统', '通风系统', '长势评估'], workZones: ['A区', 'B区'],
      status: '在职', joinDate: '2026-02-20', insuranceType: '综合险', source: '劳务公司',
    },
    {
      id: '7', employeeCode: 'YG-20260318-001', name: '文泰来', idCard: '320102199112051234',
      phone: '13812345607', workerType: '临时工', contractType: '劳务合同', dailyWage: 210,
      skillTags: ['基肥施用', '追肥操作', '水肥一体化', '虫害识别'], workZones: ['C区'],
      status: '离职', joinDate: '2026-03-08', insuranceType: '工伤险', source: '个人零工', maxWorkDays: 20,
    },
    {
      id: '8', employeeCode: 'YG-20260305-001', name: '程灵素', idCard: '320102199403101234',
      phone: '13812345608', workerType: '季节工', contractType: '劳务合同', dailyWage: 190,
      skillTags: ['果蔬采收', '分级包装', '冷链处理', '病害识别'], workZones: ['D区'],
      status: '停薪留职', joinDate: '2026-03-05', insuranceType: '综合险', source: '劳务公司', maxWorkDays: 45,
    },
  ];
}

// ========== Store 类型 ==========

interface TempWorkerState {
  workers: TempWorker[];
  isLoading: boolean;
  error: string | null;

  fetchWorkers: () => Promise<void>;
  addWorker: (data: Partial<TempWorker>) => void;
  updateWorker: (id: string, updates: Partial<TempWorker>) => void;
  deleteWorker: (id: string) => void;

  _initSeedData: () => void;
}

// ========== Store 实现 ==========

export const useTempWorkerStore = create<TempWorkerState>()(
  (set, get)=> ({
      workers: [],
      isLoading: false,
      error: null,

      fetchWorkers: async () => {
        set({ isLoading: true, error: null });
        try {
          const current = get().workers;
          if (current.length === 0) {
            get()._initSeedData();
          }
          set({ isLoading: false });
        } catch (error) {
          // logger.warn('[TempWorkerStore] 获取临时工数据失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addWorker: (data) => {
        const newId = String(Date.now());
        const newWorker: TempWorker = {
          ...data as TempWorker,
          id: newId,
          employeeCode: data.employeeCode || `YG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
          joinDate: new Date().toISOString().slice(0, 10),
        };
        set((state) => ({ workers: [newWorker, ...state.workers] }));
      },

      updateWorker: (id, updates) => {
        set((state) => ({
          workers: state.workers.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }));
      },

      deleteWorker: (id) => {
        set((state) => ({ workers: state.workers.filter((w) => w.id !== id) }));
      },

      _initSeedData: () => {
        const seed = generateSeedData();
        set({ workers: seed, isLoading: false });
        // 种子数据初始化完成
      },
    })
);
