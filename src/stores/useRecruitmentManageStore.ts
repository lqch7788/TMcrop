/**
 * 招聘管理(管理端) Zustand Store
 *
 * 注意：这是components版招聘管理(管理端)，与招聘申请(申请端，已有/api/recruitment API)不同
 * 数据源：mock种子数据（无后端API依赖）
 * 持久化：localStorage (recruitment-manage-storage)
 * 数据流：Store → Hook → 组件（组件不直接读写localStorage）
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ========== 类型定义 ==========

export type RecruitmentStatus = '待审批' | '招聘中' | '已完成' | '已取消';
export type RecruitmentSource = '劳务公司' | '个人零工' | '学生实习' | '内部推荐';

export interface ApprovalHistoryItem {
  step: number;
  action: 'submit' | 'approve' | 'reject' | 'cancel';
  actionName: string;
  operatorId: string;
  operatorName: string;
  operateDate: string;
  comment?: string;
}

export interface RecruitmentRequest {
  id: string;
  requestCode: string;
  position: string;
  department: string;
  quantity: number;
  reason: string;
  requirements: string;
  source: RecruitmentSource;
  expectedDate: string;
  status: RecruitmentStatus;
  applicantId: string;
  applicantName: string;
  applyDate: string;
  approverId?: string;
  approverName?: string;
  approveDate?: string;
  remarks?: string;
  approvalHistory?: ApprovalHistoryItem[];
}

// ========== 种子数据（从原useRecruitment.ts提取）==========

function generateRequestCode(): string {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ZP-${dateStr}-${random}`;
}

export { generateRequestCode };

const SEED_DATA: RecruitmentRequest[] = [
  {
    id: '1',
    requestCode: 'ZP-20260401-001',
    position: '温室技术员',
    department: '生产部',
    quantity: 2,
    reason: '新温室投入使用，需要增加技术人员',
    requirements: '有温室种植经验，熟悉番茄、黄瓜种植技术',
    source: '劳务公司',
    expectedDate: '2026-04-15',
    status: '待审批',
    applicantId: 'u001',
    applicantName: '张明',
    applyDate: '2026-04-01',
  },
  {
    id: '2',
    requestCode: 'ZP-20260328-001',
    position: '采收工人',
    department: '采收部',
    quantity: 5,
    reason: '采收旺季，人手不足',
    requirements: '身体健康，能吃苦耐劳，有采收经验优先',
    source: '个人零工',
    expectedDate: '2026-04-05',
    status: '招聘中',
    applicantId: 'u002',
    applicantName: '李华',
    applyDate: '2026-03-28',
    approverId: 'u005',
    approverName: '王经理',
    approveDate: '2026-03-29',
    approvalHistory: [
      { step: 1, action: 'submit', actionName: '提交申请', operatorId: 'u002', operatorName: '李华', operateDate: '2026-03-28' },
      { step: 2, action: 'approve', actionName: '审批通过', operatorId: 'u005', operatorName: '王经理', operateDate: '2026-03-29', comment: '同意招聘' },
    ],
  },
  {
    id: '3',
    requestCode: 'ZP-20260325-001',
    position: '农技实习生',
    department: '技术部',
    quantity: 3,
    reason: '与农业院校合作，提供实习岗位',
    requirements: '农业相关专业在校学生，吃苦耐劳',
    source: '学生实习',
    expectedDate: '2026-05-01',
    status: '已完成',
    applicantId: 'u003',
    applicantName: '陈静',
    applyDate: '2026-03-25',
    approverId: 'u005',
    approverName: '王经理',
    approveDate: '2026-03-26',
    approvalHistory: [
      { step: 1, action: 'submit', actionName: '提交申请', operatorId: 'u003', operatorName: '陈静', operateDate: '2026-03-25' },
      { step: 2, action: 'approve', actionName: '审批通过', operatorId: 'u005', operatorName: '王经理', operateDate: '2026-03-26' },
    ],
  },
  {
    id: '4',
    requestCode: 'ZP-20260320-001',
    position: '设备维护工程师',
    department: '设备部',
    quantity: 1,
    reason: '现有工程师离职，需补充',
    requirements: '有农机设备维修经验，持电工证优先',
    source: '内部推荐',
    expectedDate: '2026-04-10',
    status: '已完成',
    applicantId: 'u004',
    applicantName: '赵强',
    applyDate: '2026-03-20',
    approverId: 'u005',
    approverName: '王经理',
    approveDate: '2026-03-21',
    approvalHistory: [
      { step: 1, action: 'submit', actionName: '提交申请', operatorId: 'u004', operatorName: '赵强', operateDate: '2026-03-20' },
      { step: 2, action: 'approve', actionName: '审批通过', operatorId: 'u005', operatorName: '王经理', operateDate: '2026-03-21' },
    ],
  },
  {
    id: '5',
    requestCode: 'ZP-20260402-001',
    position: '仓库管理员',
    department: '仓储部',
    quantity: 1,
    reason: '仓库业务扩张，需要专人管理',
    requirements: '有仓库管理经验，熟悉ERP系统',
    source: '劳务公司',
    expectedDate: '2026-04-20',
    status: '待审批',
    applicantId: 'u006',
    applicantName: '钱伟',
    applyDate: '2026-04-02',
  },
  {
    id: '6',
    requestCode: 'ZP-20260315-001',
    position: '包装工人',
    department: '包装部',
    quantity: 4,
    reason: '出口订单增加，需要增加包装人员',
    requirements: '有食品包装经验优先',
    source: '个人零工',
    expectedDate: '2026-03-25',
    status: '已取消',
    applicantId: 'u007',
    applicantName: '孙丽',
    applyDate: '2026-03-15',
    approverId: 'u005',
    approverName: '王经理',
    approveDate: '2026-03-16',
    remarks: '因订单取消，暂停招聘',
    approvalHistory: [
      { step: 1, action: 'submit', actionName: '提交申请', operatorId: 'u007', operatorName: '孙丽', operateDate: '2026-03-15' },
      { step: 2, action: 'approve', actionName: '审批通过', operatorId: 'u005', operatorName: '王经理', operateDate: '2026-03-16' },
      { step: 3, action: 'cancel', actionName: '取消招聘', operatorId: 'u007', operatorName: '孙丽', operateDate: '2026-03-18', comment: '订单取消' },
    ],
  },
  {
    id: '7',
    requestCode: 'ZP-20260310-001',
    position: '质检员',
    department: '质量部',
    quantity: 2,
    reason: '新增质检岗位',
    requirements: '有农产品质检经验，了解GMP规范',
    source: '劳务公司',
    expectedDate: '2026-03-30',
    status: '招聘中',
    applicantId: 'u008',
    applicantName: '周杰',
    applyDate: '2026-03-10',
    approverId: 'u005',
    approverName: '王经理',
    approveDate: '2026-03-11',
    approvalHistory: [
      { step: 1, action: 'submit', actionName: '提交申请', operatorId: 'u008', operatorName: '周杰', operateDate: '2026-03-10' },
      { step: 2, action: 'approve', actionName: '审批通过', operatorId: 'u005', operatorName: '王经理', operateDate: '2026-03-11' },
    ],
  },
  {
    id: '8',
    requestCode: 'ZP-20260403-001',
    position: '安全员',
    department: '安全部',
    quantity: 1,
    reason: '安全制度要求，需配备专职安全员',
    requirements: '有安全管理经验，持安全员证书',
    source: '内部推荐',
    expectedDate: '2026-04-25',
    status: '待审批',
    applicantId: 'u009',
    applicantName: '吴涛',
    applyDate: '2026-04-03',
  },
];

// ========== Store ==========

interface RecruitmentState {
  recruitments: RecruitmentRequest[];
  isLoading: boolean;
  error: string | null;

  /** 初始化种子数据（如果存储为空） */
  initSeedData: () => void;

  /** CRUD操作 */
  addRecruitment: (rec: RecruitmentRequest) => void;
  updateRecruitment: (id: string, updates: Partial<RecruitmentRequest>) => void;
  deleteRecruitment: (id: string) => void;
}

export const useRecruitmentManageStore = create<RecruitmentState>()(
  persist(
    (set, get) => ({
      recruitments: [],
      isLoading: false,
      error: null,

      initSeedData: () => {
        const current = get().recruitments;
        if (current.length === 0) {
          set({ recruitments: SEED_DATA });
        }
      },

      addRecruitment: (rec) => {
        set((state) => ({ recruitments: [rec, ...state.recruitments] }));
      },

      updateRecruitment: (id, updates) => {
        set((state) => ({
          recruitments: state.recruitments.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      deleteRecruitment: (id) => {
        set((state) => ({
          recruitments: state.recruitments.filter((r) => r.id !== id),
        }));
      },
    }),
    {
      name: 'recruitment-manage-storage',
      partialize: (state) => ({ recruitments: state.recruitments }),
    }
  )
);
