import { useState, useMemo, useEffect } from 'react';
import { StaffSkill, TrainingRecord, SkillFormData, TrainingFormData } from '../types';
import { useSkillStore } from '@/stores/useSkillStore';

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

/**
 * 技能档案数据管理Hook
 * 数据源：useSkillStore (Zustand store, mock种子数据 + localStorage持久化)
 * 管理两部分数据：员工技能档案 + 培训记录
 */
export function useSkill() {
  const {
    staffSkills: storeStaffSkills,
    trainingRecords: storeTrainingRecords,
    isLoading,
    fetchData,
    addStaffSkill: storeAddStaffSkill,
    updateStaffSkill: storeUpdateStaffSkill,
    deleteStaffSkill: storeDeleteStaffSkill,
    addTrainingRecord: storeAddTraining,
    updateTrainingRecord: storeUpdateTraining,
    deleteTrainingRecord: storeDeleteTraining,
  } = useSkillStore();

  // 员工技能档案状态
  const [staffSkills, setStaffSkills] = useState<StaffSkill[]>(storeStaffSkills);
  const [skillFilters, setSkillFilters] = useState<SkillFilters>({
    search: '',
    department: '',
    skillTag: '',
    status: '',
  });

  // 培训记录状态
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>(storeTrainingRecords);
  const [trainingFilters, setTrainingFilters] = useState<TrainingFilters>({
    search: '',
    staffId: '',
    trainingType: '',
    result: '',
  });

  // 初次加载时初始化种子数据
  useEffect(() => {
    if (storeStaffSkills.length === 0 && storeTrainingRecords.length === 0) {
      fetchData();
    }
  }, []);

  // 同步 Store 数据到本地
  useEffect(() => {
    setStaffSkills(storeStaffSkills);
  }, [storeStaffSkills]);

  useEffect(() => {
    setTrainingRecords(storeTrainingRecords);
  }, [storeTrainingRecords]);

  // 筛选后的员工技能档案
  const filteredStaffSkills = useMemo(() => {
    return staffSkills.filter((skill) => {
      if (skillFilters.search) {
        const searchLower = skillFilters.search.toLowerCase();
        const matchSearch =
          skill.staffName.toLowerCase().includes(searchLower) ||
          skill.staffId.toLowerCase().includes(searchLower);
        if (!matchSearch) return false;
      }
      if (skillFilters.department && skill.department !== skillFilters.department) return false;
      if (skillFilters.skillTag) {
        const hasTag = skill.skills.some((s) => s.tag === skillFilters.skillTag);
        if (!hasTag) return false;
      }
      if (skillFilters.status && skill.status !== skillFilters.status) return false;
      return true;
    });
  }, [staffSkills, skillFilters]);

  // 筛选后的培训记录
  const filteredTrainingRecords = useMemo(() => {
    return trainingRecords.filter((record) => {
      if (trainingFilters.search) {
        const searchLower = trainingFilters.search.toLowerCase();
        const matchSearch =
          record.staffName.toLowerCase().includes(searchLower) ||
          record.staffId.toLowerCase().includes(searchLower) ||
          record.trainingContent.toLowerCase().includes(searchLower);
        if (!matchSearch) return false;
      }
      if (trainingFilters.staffId && record.staffId !== trainingFilters.staffId) return false;
      if (trainingFilters.trainingType && record.trainingType !== trainingFilters.trainingType) return false;
      if (trainingFilters.result && record.result !== trainingFilters.result) return false;
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
    storeAddStaffSkill(data);
  };

  // 更新员工技能档案
  const updateStaffSkill = (id: string, data: SkillFormData) => {
    storeUpdateStaffSkill(id, data);
  };

  // 删除员工技能档案
  const deleteStaffSkill = (id: string) => {
    storeDeleteStaffSkill(id);
  };

  // 添加培训记录
  const addTrainingRecord = (data: TrainingFormData) => {
    storeAddTraining(data);
  };

  // 更新培训记录
  const updateTrainingRecord = (id: string, data: TrainingFormData) => {
    storeUpdateTraining(id, data);
  };

  // 删除培训记录
  const deleteTrainingRecord = (id: string) => {
    storeDeleteTraining(id);
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
    isLoading,

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
