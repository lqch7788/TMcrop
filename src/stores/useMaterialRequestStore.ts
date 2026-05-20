/**
 * 物料申请状态 Store
 * V1.2 架构：Zustand Store + TanStack Query
 *
 * 用于审批联动等需要前端状态管理的场景
 * 数据获取统一通过 TanStack Query（见 useMaterialRequestQueries）
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MaterialRequestState {
  // 本地选中状态（用于审批联动等）
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  clearSelectedIds: () => void;

  // 本地展开状态
  expandedIds: string[];
  toggleExpanded: (id: string) => void;
  setExpandedIds: (ids: string[]) => void;

  // 筛选状态（用于本地快速过滤）
  filterKeyword: string;
  setFilterKeyword: (keyword: string) => void;

  // 分页状态（用于本地分页）
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;

  // 排序状态
  sortField: string;
  sortOrder: 'asc' | 'desc';
  setSort: (field: string, order: 'asc' | 'desc') => void;
}

export const useMaterialRequestStore = create<MaterialRequestState>()(
  persist(
    (set) => ({
      // 选中状态
      selectedIds: [],
      setSelectedIds: (ids) => set({ selectedIds: ids }),
      clearSelectedIds: () => set({ selectedIds: [] }),

      // 展开状态
      expandedIds: [],
      toggleExpanded: (id) =>
        set((state) => ({
          expandedIds: state.expandedIds.includes(id)
            ? state.expandedIds.filter((i) => i !== id)
            : [...state.expandedIds, id],
        })),
      setExpandedIds: (ids) => set({ expandedIds: ids }),

      // 筛选状态
      filterKeyword: '',
      setFilterKeyword: (keyword) => set({ filterKeyword: keyword, currentPage: 1 }),

      // 分页状态
      currentPage: 1,
      setCurrentPage: (page) => set({ currentPage: page }),
      pageSize: 50,
      setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),

      // 排序状态
      sortField: 'date',
      sortOrder: 'desc',
      setSort: (field, order) => set({ sortField: field, sortOrder: order }),
    }),
    {
      name: 'material-request-store',
      partialize: (state) => ({
        pageSize: state.pageSize,
        sortField: state.sortField,
        sortOrder: state.sortOrder,
      }),
    }
  )
);
