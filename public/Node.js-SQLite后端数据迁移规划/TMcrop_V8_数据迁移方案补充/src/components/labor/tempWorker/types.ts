/**
 * 临时工快速入职相关类型定义
 */

// 工人类型
export type WorkerType = '正式工' | '临时工' | '季节工';

// 合同类型
export type ContractType = '劳动合同' | '劳务合同' | '实习协议' | '无合同';

// 员工状态
export type StaffStatus = '在职' | '离职' | '停薪留职' | '试用期';

// 技能标签
export type SkillTag =
  | '微喷灌溉' | '滴灌操作' | '渗灌系统' | '基肥施用' | '追肥操作' | '水肥一体化'
  | '农药配制' | '喷雾操作' | '生物防治' | '果蔬采收' | '分级包装' | '冷链处理'
  | '拖拉机' | '旋耕机' | '收割机' | '灌溉设备' | '温室调控' | '加温系统'
  | '通风系统' | '病害识别' | '虫害识别' | '长势评估' | '播种' | '嫁接' | '炼苗';

// 临时工记录
export interface TempWorker {
  id: string;
  employeeCode: string;      // 工号格式: YG-YYYYMMDD-XXX
  name: string;              // 姓名
  idCard: string;            // 身份证号
  phone: string;             // 联系电话
  workerType: WorkerType;    // 工人类型
  contractType: ContractType; // 合同类型
  dailyWage?: number;        // 临时工日工资
  hourlyWage?: number;       // 临时工时工资
  skillTags: SkillTag[];     // 技能标签（多选）
  workZones: string[];       // 作业区域
  status: StaffStatus;       // 员工状态
  joinDate: string;          // 入职日期
  insuranceType?: string;    // 工伤险/综合险/无保险
  source?: string;           // 劳务公司/个人零工/学生实习
  maxWorkDays?: number;      // 本批次最大用工天数
}

// 筛选条件
export interface TempWorkerFilters {
  workerType: WorkerType | '';
  status: StaffStatus | '';
  keyword: string;
}

// 分页信息
export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  total: number;
}

// 组件 Props
export interface TempWorkerFiltersProps {
  filters: TempWorkerFilters;
  onFiltersChange: (filters: TempWorkerFilters) => void;
  onSearch: () => void;
  onAdd: () => void;
}

export interface TempWorkerTableProps {
  data: TempWorker[];
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetail: (record: TempWorker) => void;
  onEdit: (record: TempWorker) => void;
  onDelete: (record: TempWorker) => void;
}

export interface TempWorkerDetailModalProps {
  record: TempWorker | null;
  open: boolean;
  onClose: () => void;
}

export interface TempWorkerFormModalProps {
  record?: TempWorker | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<TempWorker>) => void;
}

export interface UseTempWorkerReturn {
  data: TempWorker[];
  filters: TempWorkerFilters;
  pagination: PaginationInfo;
  setFilters: (filters: TempWorkerFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  selectedRecord: TempWorker | null;
  setSelectedRecord: (record: TempWorker | null) => void;
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
  handleSave: (data: Partial<TempWorker>) => void;
  handleDelete: (record: TempWorker) => void;
}
