/**
 * 部门选项 Hook
 * 提供从 API 获取的部门列表，支持添加"全部"选项
 */

import { useMemo } from 'react';
import { useSettingsData } from '../components/common/settings';

/**
 * 部门选项配置
 */
export interface DepartmentOptionsConfig {
  /** 是否包含"全部"选项 */
  includeAll?: boolean;
  /** "全部"选项的文本，默认为"全部" */
  allText?: string;
  /** 是否仅返回部门名称（而非包含 oid 的对象） */
  namesOnly?: boolean;
}

/**
 * 部门选项 Hook
 * @param config 配置选项
 * @returns 部门选项列表
 */
export function useDepartmentOptions(config: DepartmentOptionsConfig = {}) {
  const { includeAll = false, allText = '全部', namesOnly = true } = config;
  const { departments, isLoading } = useSettingsData();

  const options = useMemo(() => {
    const result: string[] = [];

    // 添加"全部"选项
    if (includeAll) {
      result.push(allText);
    }

    // 添加部门列表
    if (namesOnly) {
      result.push(...departments.map(d => d.name));
    }

    return result;
  }, [departments, includeAll, allText, namesOnly]);

  return {
    options,
    isLoading,
    departmentNames: departments.map(d => d.name),
  };
}

/**
 * 带值的部门选项（用于需要 oid 的场景）
 */
export function useDepartmentOptionsWithValue() {
  const { departments, isLoading } = useDepartments();

  const options = useMemo(() => {
    return departments.map(d => ({
      value: d.oid,
      label: d.name,
    }));
  }, [departments]);

  return {
    options,
    isLoading,
  };
}

export default useDepartmentOptions;
