/**
 * 生产计划选择逻辑 Hook
 * C5 阶段 2 拆分：从 useProductionPage.ts 抽出
 *
 * 负责：单行选择、全选、批量选择（编辑用）、批量选择（删除用）、下一行
 */
import { useCallback } from 'react';
import type { CropBatch } from '../../../types';

interface UseProductionSelectionParams {
  batches: CropBatch[];
  filteredBatches: CropBatch[];
  selectedRows: string[];
  selectedBatchCode: string;
  editedBatchCodes: string[];
  setSelectedRows: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedBatchCode: (v: string) => void;
  setEditedBatchCodes: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useProductionSelection({
  batches,
  filteredBatches,
  selectedRows,
  selectedBatchCode,
  editedBatchCodes,
  setSelectedRows,
  setSelectedBatchCode,
  setEditedBatchCodes,
}: UseProductionSelectionParams) {
  const handleSelectRow = useCallback(
    (id: string) => {
      if (selectedRows.includes(id)) {
        setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
      } else {
        setSelectedRows([...selectedRows, id]);
      }
    },
    [selectedRows, setSelectedRows]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedRows.length === filteredBatches.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredBatches.map((b) => b.id));
    }
  }, [selectedRows.length, filteredBatches, setSelectedRows]);

  const handleBatchSelectAll = useCallback(() => {
    const selectable = filteredBatches.filter(
      (b) => b.batchStatus !== 'completed' && b.batchStatus !== 'cancelled'
    );
    if (selectedRows.length === selectable.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(selectable.map((b) => b.id));
    }
  }, [selectedRows.length, filteredBatches, setSelectedRows]);

  const handleBatchDeleteSelectAll = useCallback(() => {
    // 所有状态的生产计划都可以删除
    const deletableBatches = filteredBatches;
    if (selectedRows.length === deletableBatches.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(deletableBatches.map((b) => b.id));
    }
  }, [selectedRows.length, filteredBatches, setSelectedRows]);

  const handleConfirmNext = useCallback(() => {
    if (selectedBatchCode && !editedBatchCodes.includes(selectedBatchCode)) {
      setEditedBatchCodes([...editedBatchCodes, selectedBatchCode]);
    }
    const currentIndex = selectedRows.findIndex((id) => {
      const batch = batches.find((b) => b.id === id);
      return batch?.batchCode === selectedBatchCode;
    });
    if (currentIndex < selectedRows.length - 1) {
      const nextBatch = batches.find((b) => b.id === selectedRows[currentIndex + 1]);
      if (nextBatch) {
        setSelectedBatchCode(nextBatch.batchCode);
      }
    }
  }, [selectedBatchCode, editedBatchCodes, selectedRows, batches, setEditedBatchCodes, setSelectedBatchCode]);

  return {
    handleSelectRow,
    handleSelectAll,
    handleBatchSelectAll,
    handleBatchDeleteSelectAll,
    handleConfirmNext,
  };
}
