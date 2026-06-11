/**
 * 生产计划筛选 + 搜索 Hook
 * C5 阶段 2 拆分：从 useProductionPage.ts 抽出
 *
 * 负责：5 个搜索字段 + 2 个筛选字段 + 300ms debounce + filteredBatches 计算
 */
import { useState, useEffect, useMemo } from 'react';
import type { CropBatch } from '../../../types';

interface UseProductionFiltersParams {
  batches: CropBatch[];
  statusFilter: string;
  planTypeFilter: string;
  batchCodeSearch: string;
  plantingModeSearch: string;
  cropNameSearch: string;
  varietySearch: string;
  greenhouseSearch: string;
  setBatchCodeSearch: (v: string) => void;
  setPlantingModeSearch: (v: string) => void;
  setCropNameSearch: (v: string) => void;
  setVarietySearch: (v: string) => void;
  setGreenhouseSearch: (v: string) => void;
  setStatusFilter: (v: string) => void;
  setPlanTypeFilter: (v: string) => void;
}

export function useProductionFilters({
  batches,
  statusFilter,
  planTypeFilter,
  batchCodeSearch,
  plantingModeSearch,
  cropNameSearch,
  varietySearch,
  greenhouseSearch,
  setBatchCodeSearch,
  setPlantingModeSearch,
  setCropNameSearch,
  setVarietySearch,
  setGreenhouseSearch,
  setStatusFilter,
  setPlanTypeFilter,
}: UseProductionFiltersParams) {
  // H-04: 300ms debounce 全表 filter，避免每次按键都重算（百行 + 搜索输入场景卡顿）
  const [debouncedBatchCodeSearch, setDebouncedBatchCodeSearch] = useState(batchCodeSearch);
  const [debouncedPlantingModeSearch, setDebouncedPlantingModeSearch] = useState(plantingModeSearch);
  const [debouncedCropNameSearch, setDebouncedCropNameSearch] = useState(cropNameSearch);
  const [debouncedVarietySearch, setDebouncedVarietySearch] = useState(varietySearch);
  const [debouncedGreenhouseSearch, setDebouncedGreenhouseSearch] = useState(greenhouseSearch);

  useEffect(() => {
    const t1 = setTimeout(() => setDebouncedBatchCodeSearch(batchCodeSearch), 300);
    const t2 = setTimeout(() => setDebouncedPlantingModeSearch(plantingModeSearch), 300);
    const t3 = setTimeout(() => setDebouncedCropNameSearch(cropNameSearch), 300);
    const t4 = setTimeout(() => setDebouncedVarietySearch(varietySearch), 300);
    const t5 = setTimeout(() => setDebouncedGreenhouseSearch(greenhouseSearch), 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [batchCodeSearch, plantingModeSearch, cropNameSearch, varietySearch, greenhouseSearch]);

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchBatchCode =
        !debouncedBatchCodeSearch ||
        batch.batchCode.toLowerCase().includes(debouncedBatchCodeSearch.toLowerCase());
      const matchPlantingMode =
        !debouncedPlantingModeSearch ||
        batch.plantingMode.toLowerCase().includes(debouncedPlantingModeSearch.toLowerCase());
      const matchCropName =
        !debouncedCropNameSearch ||
        batch.cropName.toLowerCase().includes(debouncedCropNameSearch.toLowerCase());
      const matchVariety =
        !debouncedVarietySearch ||
        batch.variety.toLowerCase().includes(debouncedVarietySearch.toLowerCase());
      const matchGreenhouse =
        !debouncedGreenhouseSearch ||
        batch.greenhouseName.toLowerCase().includes(debouncedGreenhouseSearch.toLowerCase());
      const matchStatus = statusFilter === 'all' || batch.batchStatus === statusFilter;
      const matchPlanType = planTypeFilter === 'all' || batch.planType === planTypeFilter;
      return (
        matchBatchCode &&
        matchPlantingMode &&
        matchCropName &&
        matchVariety &&
        matchGreenhouse &&
        matchStatus &&
        matchPlanType
      );
    });
  }, [
    batches,
    debouncedBatchCodeSearch,
    debouncedPlantingModeSearch,
    debouncedCropNameSearch,
    debouncedVarietySearch,
    debouncedGreenhouseSearch,
    statusFilter,
    planTypeFilter,
  ]);

  const resetFilters = () => {
    setBatchCodeSearch('');
    setPlantingModeSearch('');
    setCropNameSearch('');
    setVarietySearch('');
    setGreenhouseSearch('');
    setStatusFilter('all');
    setPlanTypeFilter('all');
  };

  return {
    filteredBatches,
    resetFilters,
  };
}
