/**
 * @deprecated 死代码 hook（C7 标注）—— 2026-06-10 Grep 验证 0 引用方
 * 引用方：none（Grep 验证时间：2026-06-10）
 * 等待用户授权后删除
 *
 * 技术方案页面 state 抽取（H-1 最小拆分）
 * 2026-06-06：仅抽取 6 个核心 state + 5 个核心 handler，Page 主体不动
 *
 * 抽取范围：
 * - 6 个 filter state: code / cropFilter / author / status / startDate / endDate
 * - 分页: currentPage / pageSize
 * - 5 个核心 handler: handleSearch / handleReset / handleSelectAll / handleSelectRow / handleOpenCreateModal
 *
 * 剩余 state/handler 拆分留待后续 H-1 续接（modal/form/export/batch edit 等）
 */
import { useState } from 'react';
import type { TechSolution } from '../../types/techSolution';

export interface UseTechSolutionPageStateReturn {
  // 过滤条件
  code: string;
  cropFilter: string;
  author: string;
  status: string;
  startDate: string;
  endDate: string;
  // 分页
  currentPage: number;
  pageSize: number;
  // 选中行
  selectedRows: (string | number)[];
  // setters
  setCode: (v: string) => void;
  setCropFilter: (v: string) => void;
  setAuthor: (v: string) => void;
  setStatus: (v: string) => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  setCurrentPage: (v: number) => void;
  setPageSize: (v: number) => void;
  setSelectedRows: (v: (string | number)[]) => void;
  // handlers
  handleSearch: () => void;
  handleReset: () => void;
  handleSelectAll: (all: TechSolution[]) => void;
  handleSelectRow: (id: string | number) => void;
  handleOpenCreateModalPlaceholder: () => void; // 占位（Page 实际还要 setNewPlanForm，这里不抽）
}

export function useTechSolutionPageState(): UseTechSolutionPageStateReturn {
  const [code, setCode] = useState('');
  const [cropFilter, setCropFilter] = useState('全部');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState('全部');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<(string | number)[]>([]);

  const handleSearch = () => setCurrentPage(1);
  const handleReset = () => {
    setCode(''); setCropFilter('全部'); setAuthor(''); setStatus('全部');
    setStartDate(''); setEndDate(''); setCurrentPage(1);
  };
  const handleSelectAll = (all: TechSolution[]) => {
    if (selectedRows.length === all.length) setSelectedRows([]);
    else setSelectedRows(all.map(t => t.id));
  };
  const handleSelectRow = (id: string | number) => {
    if (selectedRows.includes(id)) setSelectedRows(selectedRows.filter(r => r !== id));
    else setSelectedRows([...selectedRows, id]);
  };

  return {
    code, cropFilter, author, status, startDate, endDate,
    currentPage, pageSize, selectedRows,
    setCode, setCropFilter, setAuthor, setStatus, setStartDate, setEndDate,
    setCurrentPage, setPageSize, setSelectedRows,
    handleSearch, handleReset, handleSelectAll, handleSelectRow,
    handleOpenCreateModalPlaceholder: () => {},
  };
}
