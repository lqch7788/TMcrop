import { useState, useMemo } from 'react';
import { StaffSkill, TrainingRecord, SkillFormData } from '../types';

// Mock员工技能档案数据
const mockStaffSkills: StaffSkill[] = [
  {
    id: '1',
    staffId: 'EMP001',
    staffName: '张伟',
    department: '生产部',
    skills: [
      { tag: '微喷灌溉', level: '高级', certifiedDate: '2023-03-15', expiryDate: '2025-03-15' },
      { tag: '滴灌操作', level: '技师', certifiedDate: '2022-06-20', expiryDate: '2025-06-20' },
      { tag: '水肥一体化', level: '高级', certifiedDate: '2023-01-10', expiryDate: '2025-01-10' },
    ],
    totalSkills: 3,
    certificationCount: 3,
    status: '正常',
  },
  {
    id: '2',
    staffId: 'EMP002',
    staffName: '李娜',
    department: '技术部',
    skills: [
      { tag: '温室调控', level: '技师', certifiedDate: '2022-08-15', expiryDate: '2024-08-15' },
      { tag: '加温系统', level: '高级', certifiedDate: '2023-02-20', expiryDate: '2025-02-20' },
      { tag: '通风系统', level: '高级', certifiedDate: '2023-04-10', expiryDate: '2025-04-10' },
    ],
    totalSkills: 3,
    certificationCount: 3,
    status: '即将过期',
  },
  {
    id: '3',
    staffId: 'EMP003',
    staffName: '王强',
    department: '生产部',
    skills: [
      { tag: '拖拉机', level: '高级', certifiedDate: '2021-05-10', expiryDate: '2023-05-10' },
      { tag: '旋耕机', level: '技师', certifiedDate: '2022-03-25', expiryDate: '2025-03-25' },
      { tag: '收割机', level: '中级', certifiedDate: '2023-07-15', expiryDate: '2025-07-15' },
    ],
    totalSkills: 3,
    certificationCount: 3,
    status: '已过期',
  },
  {
    id: '4',
    staffId: 'EMP004',
    staffName: '赵敏',
    department: '质检部',
    skills: [
      { tag: '病害识别', level: '技师', certifiedDate: '2023-01-20', expiryDate: '2026-01-20' },
      { tag: '虫害识别', level: '高级', certifiedDate: '2023-03-15', expiryDate: '2026-03-15' },
      { tag: '长势评估', level: '高级', certifiedDate: '2023-05-10', expiryDate: '2026-05-10' },
    ],
    totalSkills: 3,
    certificationCount: 3,
    status: '正常',
  },
  {
    id: '5',
    staffId: 'EMP005',
    staffName: '孙浩',
    department: '设备部',
    skills: [
      { tag: '灌溉设备', level: '技师', certifiedDate: '2022-11-10', expiryDate: '2025-11-10' },
      { tag: '温室调控', level: '中级', certifiedDate: '2023-06-20', expiryDate: '2025-06-20' },
      { tag: '加温系统', level: '中级', certifiedDate: '2023-08-15', expiryDate: '2025-08-15' },
    ],
    totalSkills: 3,
    certificationCount: 3,
    status: '正常',
  },
  {
    id: '6',
    staffId: 'EMP006',
    staffName: '周丽',
    department: '生产部',
    skills: [
      { tag: '农药配制', level: '高级', certifiedDate: '2023-02-28', expiryDate: '2026-02-28' },
      { tag: '喷雾操作', level: '技师', certifiedDate: '2022-09-15', expiryDate: '2025-09-15' },
      { tag: '生物防治', level: '高级', certifiedDate: '2023-04-20', expiryDate: '2026-04-20' },
    ],
    totalSkills: 3,
    certificationCount: 3,
    status: '正常',
  },
  {
    id: '7',
    staffId: 'EMP007',
    staffName: '吴涛',
    department: '技术部',
    skills: [
      { tag: '播种', level: '技师', certifiedDate: '2022-07-10', expiryDate: '2025-07-10' },
      { tag: '嫁接', level: '高级', certifiedDate: '2023-01-15', expiryDate: '2026-01-15' },
      { tag: '炼苗', level: '高级', certifiedDate: '2023-03-20', expiryDate: '2026-03-20' },
    ],
    totalSkills: 3,
    certificationCount: 3,
    status: '正常',
  },
  {
    id: '8',
    staffId: 'EMP008',
    staffName: '郑静',
    department: '仓储部',
    skills: [
      { tag: '果蔬采收', level: '中级', certifiedDate: '2023-05-25', expiryDate: '2025-05-25' },
      { tag: '分级包装', level: '高级', certifiedDate: '2022-12-10', expiryDate: '2025-12-10' },
      { tag: '冷链处理', level: '技师', certifiedDate: '2023-02-15', expiryDate: '2026-02-15' },
    ],
    totalSkills: 3,
    certificationCount: 3,
    status: '正常',
  },
];

// Mock培训记录数据
const mockTrainingRecords: TrainingRecord[] = [
  {
    id: '1',
    staffId: 'EMP001',
    staffName: '张伟',
    trainingType: '技能考核',
    trainingContent: '微喷灌溉系统操作考核',
    trainingDate: '2024-12-15',
    trainer: '陈专家',
    result: '通过',
    certificate: '微喷灌溉高级技能证书',
  },
  {
    id: '2',
    staffId: 'EMP002',
    staffName: '李娜',
    trainingType: '新技术培训',
    trainingContent: '智能温室调控系统培训',
    trainingDate: '2024-11-20',
    trainer: '刘教授',
    result: '通过',
    certificate: '温室调控技师证书',
  },
  {
    id: '3',
    staffId: 'EMP003',
    staffName: '王强',
    trainingType: '安全培训',
    trainingContent: '农业机械安全操作培训',
    trainingDate: '2024-10-25',
    trainer: '马工程师',
    result: '通过',
    certificate: '农业机械操作安全证书',
  },
  {
    id: '4',
    staffId: 'EMP004',
    staffName: '赵敏',
    trainingType: '技能考核',
    trainingContent: '病虫害识别能力考核',
    trainingDate: '2024-12-10',
    trainer: '陈专家',
    result: '通过',
    certificate: '病害识别技师证书',
  },
  {
    id: '5',
    staffId: 'EMP005',
    staffName: '孙浩',
    trainingType: '内部培训',
    trainingContent: '灌溉设备维护保养培训',
    trainingDate: '2024-11-15',
    trainer: '王技师',
    result: '通过',
    certificate: '灌溉设备维护证书',
  },
  {
    id: '6',
    staffId: 'EMP006',
    staffName: '周丽',
    trainingType: '外部培训',
    trainingContent: '生物防治技术进阶培训',
    trainingDate: '2024-12-05',
    trainer: '李博士',
    result: '通过',
    certificate: '生物防治技术培训证书',
  },
  {
    id: '7',
    staffId: 'EMP007',
    staffName: '吴涛',
    trainingType: '技能考核',
    trainingContent: '嫁接技术实操考核',
    trainingDate: '2024-11-28',
    trainer: '张高级技师',
    result: '通过',
    certificate: '嫁接技师证书',
  },
  {
    id: '8',
    staffId: 'EMP008',
    staffName: '郑静',
    trainingType: '内部培训',
    trainingContent: '冷链物流管理培训',
    trainingDate: '2024-12-01',
    trainer: '赵经理',
    result: '待考核',
    certificate: '',
  },
];

// 筛选条件
export interface SkillFilters {
  search: string;
  department: string;
  skillTag: string;
  status: string;
}

export interface TrainingFilters {
  search: string;
  staffId: string;
  trainingType: string;
  result: string;
}

export function useSkill() {
  // 员工技能档案状态
  const [staffSkills, setStaffSkills] = useState<StaffSkill[]>(mockStaffSkills);
  const [skillFilters, setSkillFilters] = useState<SkillFilters>({
    search: '',
    department: '',
    skillTag: '',
    status: '',
  });

  // 培训记录状态
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>(mockTrainingRecords);
  const [trainingFilters, setTrainingFilters] = useState<TrainingFilters>({
    search: '',
    staffId: '',
    trainingType: '',
    result: '',
  });

  // 筛选后的员工技能档案
  const filteredStaffSkills = useMemo(() => {
    return staffSkills.filter((skill) => {
      // 搜索筛选
      if (skillFilters.search) {
        const searchLower = skillFilters.search.toLowerCase();
        const matchSearch =
          skill.staffName.toLowerCase().includes(searchLower) ||
          skill.staffId.toLowerCase().includes(searchLower);
        if (!matchSearch) return false;
      }
      // 部门筛选
      if (skillFilters.department && skill.department !== skillFilters.department) {
        return false;
      }
      // 技能标签筛选
      if (skillFilters.skillTag) {
        const hasTag = skill.skills.some((s) => s.tag === skillFilters.skillTag);
        if (!hasTag) return false;
      }
      // 状态筛选
      if (skillFilters.status && skill.status !== skillFilters.status) {
        return false;
      }
      return true;
    });
  }, [staffSkills, skillFilters]);

  // 筛选后的培训记录
  const filteredTrainingRecords = useMemo(() => {
    return trainingRecords.filter((record) => {
      // 搜索筛选
      if (trainingFilters.search) {
        const searchLower = trainingFilters.search.toLowerCase();
        const matchSearch =
          record.staffName.toLowerCase().includes(searchLower) ||
          record.staffId.toLowerCase().includes(searchLower) ||
          record.trainingContent.toLowerCase().includes(searchLower);
        if (!matchSearch) return false;
      }
      // 员工ID筛选
      if (trainingFilters.staffId && record.staffId !== trainingFilters.staffId) {
        return false;
      }
      // 培训类型筛选
      if (trainingFilters.trainingType && record.trainingType !== trainingFilters.trainingType) {
        return false;
      }
      // 结果筛选
      if (trainingFilters.result && record.result !== trainingFilters.result) {
        return false;
      }
      return true;
    });
  }, [trainingRecords, trainingFilters]);

  // 获取所有技能标签（用于筛选）
  const allSkillTags = useMemo(() => {
    const tags = new Set<string>();
    staffSkills.forEach((skill) => {
      skill.skills.forEach((s) => tags.add(s.tag));
    });
    return Array.from(tags);
  }, [staffSkills]);

  // 添加员工技能档案
  const addStaffSkill = (data: SkillFormData) => {
    const newSkill: StaffSkill = {
      id: String(Date.now()),
      staffId: data.staffId,
      staffName: data.staffName,
      department: data.department,
      skills: data.skills,
      totalSkills: data.skills.length,
      certificationCount: data.skills.filter((s) => s.certifiedDate).length,
      status: '正常',
    };
    setStaffSkills([...staffSkills, newSkill]);
  };

  // 更新员工技能档案
  const updateStaffSkill = (id: string, data: SkillFormData) => {
    setStaffSkills(
      staffSkills.map((skill) =>
        skill.id === id
          ? {
              ...skill,
              staffId: data.staffId,
              staffName: data.staffName,
              department: data.department,
              skills: data.skills,
              totalSkills: data.skills.length,
              certificationCount: data.skills.filter((s) => s.certifiedDate).length,
            }
          : skill
      )
    );
  };

  // 删除员工技能档案
  const deleteStaffSkill = (id: string) => {
    setStaffSkills(staffSkills.filter((skill) => skill.id !== id));
  };

  // 添加培训记录
  const addTrainingRecord = (data: TrainingFormData) => {
    const newRecord: TrainingRecord = {
      id: String(Date.now()),
      ...data,
    };
    setTrainingRecords([...trainingRecords, newRecord]);
  };

  // 更新培训记录
  const updateTrainingRecord = (id: string, data: TrainingFormData) => {
    setTrainingRecords(
      trainingRecords.map((record) => (record.id === id ? { ...record, ...data } : record))
    );
  };

  // 删除培训记录
  const deleteTrainingRecord = (id: string) => {
    setTrainingRecords(trainingRecords.filter((record) => record.id !== id));
  };

  // 获取员工的培训记录
  const getTrainingRecordsByStaffId = (staffId: string) => {
    return trainingRecords.filter((record) => record.staffId === staffId);
  };

  // 重置技能档案筛选
  const resetSkillFilters = () => {
    setSkillFilters({
      search: '',
      department: '',
      skillTag: '',
      status: '',
    });
  };

  // 重置培训记录筛选
  const resetTrainingFilters = () => {
    setTrainingFilters({
      search: '',
      staffId: '',
      trainingType: '',
      result: '',
    });
  };

  return {
    // 员工技能档案
    staffSkills: filteredStaffSkills,
    allStaffSkills: staffSkills,
    skillFilters,
    setSkillFilters,
    resetSkillFilters,
    addStaffSkill,
    updateStaffSkill,
    deleteStaffSkill,
    allSkillTags,

    // 培训记录
    trainingRecords: filteredTrainingRecords,
    allTrainingRecords: trainingRecords,
    trainingFilters,
    setTrainingFilters,
    resetTrainingFilters,
    addTrainingRecord,
    updateTrainingRecord,
    deleteTrainingRecord,
    getTrainingRecordsByStaffId,
  };
}
