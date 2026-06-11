/**
 * 生产计划业务操作 Hook
 * C5 阶段 2 拆分：从 useProductionPage.ts 抽出
 *
 * 负责：保存草稿、提交审批、单条编辑/删除、批量删除确认、提交编辑审批、保存、作废
 */
import { useCallback } from 'react';
import { useApprovalStore } from '../../../stores';
import { useApproval } from '../../../hooks/useApproval';
import { USE_API } from '../../../services/apiClient';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { todayLocal } from '../../../lib/dateUtils';
import { logger } from '@/lib/logger';
import type { CropBatch } from '../../../types';
import type { EditedBatch, ProductionFormData } from './types';

interface UseProductionActionsParams {
  // 表单 + 状态
  formData: ProductionFormData;
  batches: CropBatch[];
  selectedRows: string[];
  selectedBatchCode: string;
  editedBatches: Record<string, EditedBatch>;
  editedBatchCodes: string[];
  greenhouses: { id: string; name: string }[];
  currentUserId: string;
  currentUsername: string;
  currentDepartment: string;

  // Store actions
  addPlan: (data: unknown) => Promise<unknown>;
  updatePlan: (id: string, data: unknown) => Promise<unknown>;
  deletePlan: (id: string) => Promise<unknown>;
  deletePlans: (ids: string[]) => Promise<unknown>;
  fetchPlans: () => Promise<unknown>;

  // 子 hook 工具
  validateForm: () => boolean;
  resetForm: () => void;

  // setters
  setShowCreateModal: (v: boolean) => void;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSelectedBatchCode: (v: string) => void;
  setSelectedRows: React.Dispatch<React.SetStateAction<string[]>>;
  setShowBatchEditModal: (v: boolean) => void;
  setShowDeleteWarning: (v: boolean) => void;
  setBatchDeleteMode: (v: boolean) => void;
  setEditedBatches: React.Dispatch<React.SetStateAction<Record<string, EditedBatch>>>;
  setEditedBatchCodes: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useProductionActions({
  formData,
  batches,
  selectedRows,
  selectedBatchCode,
  editedBatches,
  editedBatchCodes,
  greenhouses,
  currentUserId,
  currentUsername,
  currentDepartment,
  addPlan,
  updatePlan,
  deletePlan,
  deletePlans,
  fetchPlans,
  validateForm,
  resetForm,
  setShowCreateModal,
  setErrors,
  setSelectedBatchCode,
  setSelectedRows,
  setShowBatchEditModal,
  setShowDeleteWarning,
  setBatchDeleteMode,
  setEditedBatches,
  setEditedBatchCodes,
}: UseProductionActionsParams) {
  // 修复 unused-var 警告
  void editedBatchCodes;

  const { refreshApprovals } = useApproval();

  // ==================== 保存草稿 ====================
  const handleSaveDraft = useCallback(async () => {
    if (!validateForm()) return;

    const greenhouseIds = formData.greenhouseId.join(',');
    const greenhouseNames =
      greenhouses
        .filter((g) => formData.greenhouseId.includes(g.id))
        .map((g) => g.name)
        .join(',') || greenhouseIds;
    const plantingModes = formData.plantingMode.join(',');

    const apiData = {
      id: `PP${Date.now()}`,
      batchCode: formData.batchCode,
      batchName: formData.batchCode,
      planType: formData.planType,
      cropName: formData.cropName,
      cropCode: formData.cropCode, // 2026-06-05: 写入 cropCode
      variety: formData.variety,
      greenhouseId: greenhouseIds,
      greenhouseName: greenhouseNames,
      areaName: greenhouseNames,
      areaId: '',
      targetQuantity: parseInt(formData.targetYield) || 0,
      targetYield: parseInt(formData.targetYield) || 0,
      actualYield: 0,
      startDate: formData.startDate,
      expectedHarvestDate: formData.expectedHarvestDate,
      actualHarvestDate: '',
      // P0-04: 统一只用 batch_status 列；status 列由后端默认 'planning'，前端不再写入
      stage: 'seedling',
      stageName: '苗期',
      priority: 'normal',
      remarks: formData.description || '',
      publisher: formData.publisher || currentUsername,
      createBy: formData.publisher || currentUsername,
      responsiblePerson: formData.responsiblePerson,
      unit: formData.unit || 'kg',
      publishDate: '',
      batchStatus: 'draft',
      planDetail: formData.planDetail || '',
      planDetailFileName: '',
      plantingArea: parseFloat(formData.plantingArea) || 0,
      plantingAreaUnit: formData.plantingAreaUnit || 'm²',
      plantingMode: plantingModes,
      supplierName: '',
      seedlingSiteName: '',
      seedQuantity: 0,
      targetSeedlingCount: 0,
      // 关联订单
      orderId: formData.orderId.join(',') || undefined,
      orderCode: formData.orderCode.join(',') || undefined,
    };

    try {
      if (USE_API) {
        await addPlan(apiData as any);
      }
      setShowCreateModal(false);
      resetForm();
      setErrors({});
    } catch (error) {
      logger.error('[ProductionPlan] 保存草稿失败', error);
      await showAlert('保存草稿失败，请重试');
    }
  }, [formData, greenhouses, validateForm, addPlan, resetForm, setShowCreateModal, setErrors, currentUsername]);

  // ==================== 提交审批 ====================
  const handleSubmitForApproval = useCallback(async () => {
    if (!validateForm()) return;

    const today = todayLocal();
    const greenhouseIds = formData.greenhouseId.join(',');
    const greenhouseNames =
      greenhouses
        .filter((g) => formData.greenhouseId.includes(g.id))
        .map((g) => g.name)
        .join(',') || greenhouseIds;
    const plantingModes = formData.plantingMode.join(',');

    const apiData = {
      id: `PP${Date.now()}`,
      batchCode: formData.batchCode,
      batchName: formData.batchCode,
      planType: formData.planType,
      cropName: formData.cropName,
      cropCode: formData.cropCode, // 2026-06-05: 写入 cropCode
      variety: formData.variety,
      greenhouseName: greenhouseNames,
      areaName: greenhouseNames,
      targetQuantity: parseInt(formData.targetYield) || 0,
      startDate: formData.startDate,
      expectedHarvestDate: formData.expectedHarvestDate,
      // P0-04: 统一只用 batch_status 列；status 列由后端默认 'planning'，前端不再写入
      priority: 'normal',
      remarks: formData.description || '',
      publisher: formData.publisher || currentUsername,
      createBy: formData.publisher || currentUsername,
      responsiblePerson: formData.responsiblePerson,
      unit: formData.unit || 'kg',
      publishDate: today,
      batchStatus: 'published',
      planDetail: formData.planDetail || '',
      planDetailFileName: '',
      plantingArea: parseFloat(formData.plantingArea) || 0,
      plantingAreaUnit: formData.plantingAreaUnit || 'm²',
      plantingMode: plantingModes,
      supplierName: '',
      seedlingSiteName: '',
      seedQuantity: 0,
      targetSeedlingCount: 0,
      orderId: formData.orderId.join(',') || '',
      orderCode: formData.orderCode.join(',') || '',
    };

    try {
      if (USE_API) {
        const addResult = await addPlan(apiData as any);
        await fetchPlans(); // 刷新生产计划列表

        const approvalData = {
          id: `AP${Date.now()}`,
          type: 'production_plan',
          typeName: '生产计划',
          title: `生产计划审批：${formData.batchCode}`,
          description: `作物：${formData.cropName} ${formData.variety}\n种植区域：${greenhouseNames || greenhouseIds}\n目标产量：${formData.targetYield}kg`,
          applicantId: currentUserId,
          applicantName: formData.publisher || currentUsername,
          applicantDepartment: currentDepartment,
          applyDate: today,
          status: 'pending',
          priority: 'normal',
          businessLink: {
            type: 'production',
            requestId: apiData.id,
            requestCode: apiData.batchCode,
            cropName: formData.cropName,
            variety: formData.variety,
            greenhouseName: greenhouseNames || greenhouseIds,
            startDate: formData.startDate,
            expectedHarvestDate: formData.expectedHarvestDate,
            responsiblePerson: formData.responsiblePerson,
            targetYield: parseInt(formData.targetYield) || 0,
            plantingArea: parseFloat(formData.plantingArea) || 0,
            plantingMode: formData.plantingMode.join(','),
          },
        };
        // C5 修复：审批单走 useApprovalStore.addApproval（已包含 POST + 乐观更新 + 错误处理）
        await useApprovalStore.getState().addApproval(approvalData);
        await refreshApprovals();
      }

      setShowCreateModal(false);
      resetForm();
      setErrors({});
    } catch (error) {
      await showAlert('提交审批失败，请重试');
    }
  }, [formData, greenhouses, validateForm, addPlan, resetForm, refreshApprovals, fetchPlans, setShowCreateModal, setErrors, currentUserId, currentUsername, currentDepartment]);

  // ==================== 单条编辑 ====================
  const handleSingleEdit = useCallback((batch: CropBatch) => {
    if (batch.batchStatus === 'completed' || batch.batchStatus === 'cancelled') {
      showAlert('该生产计划已归档，无法编辑');
      return;
    }
    setSelectedBatchCode(batch.batchCode);
    setSelectedRows([batch.id]);
    setShowBatchEditModal(true);
  }, [setSelectedBatchCode, setSelectedRows, setShowBatchEditModal]);

  // ==================== 单条删除 ====================
  const handleSingleDelete = useCallback(async (batch: CropBatch) => {
    try {
      if (USE_API) {
        await deletePlan(batch.id);
      }
      await showAlert('删除成功');
    } catch (error) {
      logger.error('[ProductionPlan] 删除生产计划失败', error);
      await showAlert('删除失败，请重试');
    }
  }, [deletePlan]);

  // ==================== 批量删除确认 ====================
  // M-04: 成功后才清 batchDeleteMode（之前先关弹窗再 await，成功后未再次清理导致 UI 残留）
  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteWarning(false);
    const toDelete = selectedRows;

    if (toDelete.length === 0) {
      setSelectedRows([]);
      setBatchDeleteMode(false);
      return;
    }

    try {
      if (USE_API) {
        await deletePlans(toDelete);
      }
      setSelectedRows([]);
      setBatchDeleteMode(false); // M-04: 成功后才关闭批量删除模式
      await showAlert('删除成功');
    } catch (error) {
      logger.error('[ProductionPlan] 删除生产计划失败', error);
      await showAlert('删除失败，请重试');
      setBatchDeleteMode(false);
      setSelectedRows([]);
    }
  }, [selectedRows, deletePlans, setShowDeleteWarning, setSelectedRows, setBatchDeleteMode]);

  // ==================== 提交编辑审批 ====================
  const handlePublish = useCallback(async () => {
    const hasCompleteRequest = Object.values(editedBatches).some(
      (edited) => edited.isCompleted === true
    );

    if (hasCompleteRequest) {
      const confirmed = await showConfirm(
        '⚠️ 重要提示：\n\n' +
        '您选择将计划标记为完成状态。\n\n' +
        '完成后将进行归档：\n' +
        '• 无法进行任何编辑操作\n' +
        '• 无法删除计划\n\n' +
        '此操作不可逆，请确认！'
      );
      if (!confirmed) {
        return;
      }
    }

    if (Object.keys(editedBatches).length > 0) {
      const submittedBatchIds: string[] = [];
      const failedBatchCodes: string[] = [];

      try {
        // P0-03: 串行 for+await 改为 Promise.allSettled 并行提交
        const submitTasks = batches
          .map((batch) => {
            const edited = editedBatches[batch.batchCode];
            if (!edited) return null;
            return { batch, edited };
          })
          .filter((t): t is { batch: CropBatch; edited: EditedBatch } => t !== null);

        const today = todayLocal();

        // 并行执行所有提交任务；任一失败不影响其他
        const results = await Promise.allSettled(
          submitTasks.map(async ({ batch, edited }) => {
            if (USE_API) {
              const apiData: Record<string, unknown> = {};
              if (edited.targetQuantity !== undefined) apiData.targetQuantity = edited.targetQuantity;
              if (edited.targetYield !== undefined) apiData.targetYield = edited.targetYield;
              if (edited.cropName !== undefined) apiData.cropName = edited.cropName;
              if (edited.cropCode !== undefined) apiData.cropCode = edited.cropCode; // 2026-06-05
              if (edited.variety !== undefined) apiData.variety = edited.variety;
              if (edited.greenhouseName !== undefined) apiData.greenhouseName = edited.greenhouseName;
              if (edited.greenhouseId !== undefined) apiData.greenhouseId = edited.greenhouseId;
              if (edited.plantingArea !== undefined) apiData.plantingArea = edited.plantingArea;
              if (edited.plantingMode !== undefined) apiData.plantingMode = edited.plantingMode;
              if (edited.startDate !== undefined) apiData.startDate = edited.startDate;
              if (edited.expectedHarvestDate !== undefined) apiData.expectedHarvestDate = edited.expectedHarvestDate;
              if (edited.responsiblePerson !== undefined) apiData.responsiblePerson = edited.responsiblePerson;
              if (edited.remarks !== undefined) apiData.remarks = edited.remarks;
              if (edited.planDetail !== undefined) apiData.planDetail = edited.planDetail;
              if (edited.planDetailFileName !== undefined) apiData.planDetailFileName = edited.planDetailFileName;
              if (edited.executionStatus !== undefined) apiData.executionStatus = edited.executionStatus;

              apiData.batchStatus = edited.isCompleted === true ? 'pending_complete' : 'pending';

              await updatePlan(batch.id, apiData as any);
            }

            const changeId = `BC${Date.now()}_${batch.id}`;
            const changeCode = `BG${today.replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

            const changes: string[] = [];
            if (edited.cropName) changes.push(`作物名称: ${batch.cropName} → ${edited.cropName}`);
            if (edited.variety) changes.push(`品种: ${batch.variety} → ${edited.variety}`);
            if (edited.plantingArea) changes.push(`种植面积: ${batch.plantingArea} → ${edited.plantingArea}`);
            if (edited.startDate) changes.push(`开始时间: ${batch.startDate} → ${edited.startDate}`);
            if (edited.expectedHarvestDate) changes.push(`预计结束: ${batch.expectedHarvestDate} → ${edited.expectedHarvestDate}`);
            if (edited.responsiblePerson) changes.push(`负责人: ${batch.responsiblePerson} → ${edited.responsiblePerson}`);
            if (edited.targetYield) changes.push(`目标产量: ${batch.targetYield} → ${edited.targetYield}`);
            if (edited.isCompleted === true) changes.push(`计划完成: 标记为已完成（归档）`);

            const approvalData = {
              id: changeId,
              type: 'production_plan',
              typeName: '生产计划',
              title: edited.isCompleted === true
                ? `生产计划完成归档审批：${batch.batchCode}`
                : `生产计划编辑审批：${batch.batchCode}`,
              description: changes.join('\n'),
              applicantId: currentUserId,
              applicantName: currentUsername,
              applicantDepartment: currentDepartment,
              applyDate: today,
              status: 'pending',
              priority: 'normal',
              businessLink: {
                type: 'production',
                approvalAction: edited.isCompleted === true ? 'complete' : 'edit',
                requestId: batch.id,
                requestCode: batch.batchCode,
                cropName: edited.cropName || batch.cropName,
                variety: edited.variety || batch.variety,
                greenhouseName: edited.greenhouseName || batch.greenhouseName,
                startDate: edited.startDate || batch.startDate,
                expectedHarvestDate: edited.expectedHarvestDate || batch.expectedHarvestDate,
                responsiblePerson: edited.responsiblePerson || batch.responsiblePerson,
                targetYield: edited.targetYield || batch.targetYield,
                plantingArea: edited.plantingArea || batch.plantingArea,
                plantingMode: edited.plantingMode || batch.plantingMode,
              },
            };

            if (USE_API) {
              // C5 修复：审批单走 useApprovalStore.addApproval
              await useApprovalStore.getState().addApproval(approvalData);
            }

            return batch.id;
          })
        );

        // 收集成功 / 失败
        const failedReasons: string[] = [];
        results.forEach((r, idx) => {
          if (r.status === 'fulfilled') {
            submittedBatchIds.push(r.value);
          } else {
            const task = submitTasks[idx];
            const reason = r.reason;
            const reasonMsg =
              reason instanceof Error
                ? reason.message
                : typeof reason === 'string'
                ? reason
                : (() => {
                    try {
                      return JSON.stringify(reason);
                    } catch {
                      return String(reason);
                    }
                  })();
            logger.error(`[handlePublish] 批次 ${task.batch.batchCode} 提交失败`, reason);
            failedBatchCodes.push(task.batch.batchCode);
            failedReasons.push(reasonMsg);
          }
        });

        await refreshApprovals();
      } catch (error) {
        logger.error('[ProductionPlan] 提交审批失败', error);
        await showAlert('提交审批失败，请重试');
        return;
      }

      await fetchPlans();

      const remainingSelectedRows = selectedRows.filter((id) => !submittedBatchIds.includes(id));
      setSelectedRows(remainingSelectedRows);

      const remainingEditedBatches: Record<string, EditedBatch> = {};
      const remainingEditedBatchCodes: string[] = [];
      batches.forEach((batch) => {
        if (submittedBatchIds.includes(batch.id)) {
          // 已提交
        } else if (editedBatches[batch.batchCode]) {
          remainingEditedBatches[batch.batchCode] = editedBatches[batch.batchCode];
          remainingEditedBatchCodes.push(batch.batchCode);
        }
      });
      setEditedBatches(remainingEditedBatches);
      setEditedBatchCodes(remainingEditedBatchCodes);

      // P0-03: 最终 toast 显示成功 / 失败数
      const successCount = submittedBatchIds.length;
      const failedCount = failedBatchCodes.length;
      if (failedCount > 0) {
        const detailLines = failedBatchCodes
          .map((code, i) => {
            const msg = failedReasons[i] || '未知错误';
            const short = msg.length > 120 ? msg.slice(0, 120) + '…' : msg;
            return `• ${code}: ${short}`;
          })
          .join('\n');
        await showAlert(
          `提交完成：成功 ${successCount} 项，失败 ${failedCount} 项（${failedBatchCodes.slice(0, 3).join('、')}${failedCount > 3 ? ' 等' : ''}）\n\n失败详情：\n${detailLines}`
        );
      }

      if (successCount === selectedRows.length && failedCount === 0) {
        setShowBatchEditModal(false);
        setEditedBatches({});
        setEditedBatchCodes([]);
        setSelectedRows([]);
      } else if (successCount > 0) {
        // 部分成功：保留剩余未提交项，弹窗不关
      } else {
        // 全部失败：保留弹窗让用户重试
      }
    } else {
      await showAlert('请先编辑至少一个生产计划');
    }
  }, [editedBatches, batches, selectedRows, updatePlan, refreshApprovals, fetchPlans, currentUserId, currentUsername, currentDepartment, setEditedBatches, setEditedBatchCodes, setSelectedRows, setShowBatchEditModal]);

  // ==================== 已发布状态直接保存（不提交审批）====================
  const handleSave = useCallback(async () => {
    if (Object.keys(editedBatches).length === 0) {
      await showAlert('请先编辑至少一个生产计划');
      return;
    }

    const savedBatchCodes: string[] = [];

    try {
      for (const batch of batches) {
        const edited = editedBatches[batch.batchCode];
        if (edited) {
          if (USE_API) {
            const apiData: Record<string, unknown> = {};
            if (edited.targetQuantity !== undefined) apiData.targetQuantity = edited.targetQuantity;
            if (edited.targetYield !== undefined) apiData.targetYield = edited.targetYield;
            if (edited.cropName !== undefined) apiData.cropName = edited.cropName;
            if (edited.cropCode !== undefined) apiData.cropCode = edited.cropCode; // 2026-06-05
            if (edited.variety !== undefined) apiData.variety = edited.variety;
            if (edited.greenhouseName !== undefined) apiData.greenhouseName = edited.greenhouseName;
            if (edited.greenhouseId !== undefined) apiData.greenhouseId = edited.greenhouseId;
            if (edited.plantingArea !== undefined) apiData.plantingArea = edited.plantingArea;
            if (edited.plantingMode !== undefined) apiData.plantingMode = edited.plantingMode;
            if (edited.startDate !== undefined) apiData.startDate = edited.startDate;
            if (edited.expectedHarvestDate !== undefined) apiData.expectedHarvestDate = edited.expectedHarvestDate;
            if (edited.responsiblePerson !== undefined) apiData.responsiblePerson = edited.responsiblePerson;
            if (edited.remarks !== undefined) apiData.remarks = edited.remarks;
            if (edited.planDetail !== undefined) apiData.planDetail = edited.planDetail;
            if (edited.planDetailFileName !== undefined) apiData.planDetailFileName = edited.planDetailFileName;
            if (edited.executionStatus !== undefined) apiData.executionStatus = edited.executionStatus;

            // 不改变 batchStatus，只保存编辑内容
            await updatePlan(batch.id, apiData as any);
          }
          savedBatchCodes.push(batch.batchCode);
        }
      }

      await showAlert('保存成功！');
    } catch (error) {
      await showAlert('保存失败，请重试');
      return;
    }

    await fetchPlans();

    const remainingSelectedRows = selectedRows.filter((id) => !savedBatchCodes.includes(id));
    setSelectedRows(remainingSelectedRows);

    const remainingEditedBatches: Record<string, EditedBatch> = {};
    const remainingEditedBatchCodes: string[] = [];
    batches.forEach((batch) => {
      if (savedBatchCodes.includes(batch.id)) {
        // 已保存
      } else if (editedBatches[batch.batchCode]) {
        remainingEditedBatches[batch.batchCode] = editedBatches[batch.batchCode];
        remainingEditedBatchCodes.push(batch.batchCode);
      }
    });
    setEditedBatches(remainingEditedBatches);
    setEditedBatchCodes(remainingEditedBatchCodes);

    if (savedBatchCodes.length === selectedRows.length) {
      setShowBatchEditModal(false);
      setEditedBatches({});
      setEditedBatchCodes([]);
      setSelectedRows([]);
    } else {
      await showAlert(`已保存 ${savedBatchCodes.length} 项`);
    }
  }, [editedBatches, batches, selectedRows, fetchPlans, updatePlan, setEditedBatches, setEditedBatchCodes, setSelectedRows, setShowBatchEditModal]);

  // ==================== 申请作废 ====================
  const handleVoidConfirm = useCallback(async () => {
    const today = todayLocal();

    const currentBatch = batches.find((b) => b.batchCode === selectedBatchCode);
    if (!currentBatch) {
      await showAlert('请先选择一个生产计划');
      return;
    }

    // P0-05: 先确认（避免误点）+ 不再先 updatePlan('pending') 写脏数据
    const confirmed = await showConfirm(
      `确认作废生产计划：${currentBatch.batchCode}？\n\n` +
        `作物：${currentBatch.cropName} ${currentBatch.variety}\n` +
        `区域：${currentBatch.greenhouseName}\n\n` +
        `此操作不可逆，请确认！`
    );
    if (!confirmed) {
      return;
    }

    const voidedBatchIds: string[] = [];

    try {
      const voidId = `BV${Date.now()}_${currentBatch.id}`;
      const voidCode = `BV${today.replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      const approvalData = {
        id: voidId,
        type: 'production_plan',
        typeName: '生产计划',
        title: `生产计划作废审批：${currentBatch.batchCode}`,
        description: `申请作废生产计划：${currentBatch.batchCode}\n作物：${currentBatch.cropName} ${currentBatch.variety}\n区域：${currentBatch.greenhouseName}`,
        applicantId: currentUserId,
        applicantName: currentUsername,
        applicantDepartment: currentDepartment,
        applyDate: today,
        status: 'pending',
        priority: 'normal',
        businessLink: {
          type: 'production',
          approvalAction: 'void',
          requestId: currentBatch.id,
          requestCode: currentBatch.batchCode,
          cropName: currentBatch.cropName,
          variety: currentBatch.variety,
          greenhouseName: currentBatch.greenhouseName,
          startDate: currentBatch.startDate,
          expectedHarvestDate: currentBatch.expectedHarvestDate,
          responsiblePerson: currentBatch.responsiblePerson,
        },
      };

      void voidCode; // 业务编码保留

      if (USE_API) {
        // P0-05: 移除 updatePlan('pending') 步骤，直接提交审批单
        try {
          // C5 修复：审批单走 useApprovalStore.addApproval
          await useApprovalStore.getState().addApproval(approvalData);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          logger.error('[作废] /approvals POST 失败', e);
          await showAlert(`作废失败[提交审批单]：${msg}`);
          return;
        }
      }

      voidedBatchIds.push(currentBatch.id);
      await refreshApprovals();

      // M-03: 用 prev 闭包避免多次连续 setState 互相覆盖
      setSelectedRows((prev) => prev.filter((id) => !voidedBatchIds.includes(id)));

      setEditedBatches((prev) => {
        const next = { ...prev };
        delete next[currentBatch.batchCode];
        return next;
      });

      await showAlert(`已提交作废申请：${currentBatch.batchCode}`);

      setShowBatchEditModal(false);
    } catch (error) {
      logger.error('[作废] 整体失败', error);
      await showAlert(`提交作废申请失败：${(error as Error)?.message || String(error)}`);
    }

    // 修复 unused-var 警告
    void editedBatches;
  }, [batches, selectedBatchCode, refreshApprovals, editedBatches, setSelectedRows, setEditedBatches, setShowBatchEditModal, currentUserId, currentUsername, currentDepartment]);

  return {
    handleSaveDraft,
    handleSubmitForApproval,
    handleSingleEdit,
    handleSingleDelete,
    handleDeleteConfirm,
    handlePublish,
    handleSave,
    handleVoidConfirm,
  };
}
