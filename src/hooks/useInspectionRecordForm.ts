/**
 * 巡查记录提交表单（2026-10-21 P4）
 *
 * 【为什么抽 hook 而不是各页面各写一份】
 * 记录提交有两条入口，后端行为不同：
 *   · 首次提交 → POST /farm-tasks/:id/inspection-record（服务端自动接受 + 建问题 + 转待验收）
 *   · 驳回重提 → POST /farm-tasks/:id/inspection-record/resubmit（版本 +1 + 回待验收）
 * 「我的任务」和「巡查记录」两个页面都要用；表单字段、校验、payload 组装完全一致，
 * 各写一份必然漂移（上一轮 P1b 的 `issueCategories` 就是这样被漏掉的）。
 */
import { useCallback, useMemo, useState } from 'react';
import { enhancedApiClient } from '@/lib/apiClient';
import { ISSUE_CATEGORIES, ISSUE_PRESETS, type IssueCategory } from '@/types/farm/common';

export interface InspectionRecordFormState {
  /** 结果：normal=正常 / abnormal=异常 */
  result: 'normal' | 'abnormal';
  /** 检查项结果 [{key,status:'ok'|'issue'|'na',note}] */
  checklistResults: Array<{ key: string; status: 'ok' | 'issue' | 'na'; note?: string }>;
  issueCategories: string[];
  issuePresets: string[];
  issueText: string;
  issueSeverity: '轻微' | '中等' | '严重';
  /** 异常时是否同时生成待处理问题 */
  createProblem: boolean;
  weather: string;
  temperature: string;
  humidity: string;
  cropStatus: string;
  area: string;
  remarks: string;
  checkTime: string;
}

export function createEmptyRecordForm(task?: {
  planTime?: string | null;
  area?: string | null;
  inspectionType?: string | null;
} | null): InspectionRecordFormState {
  return {
    result: 'normal',
    checklistResults: [],
    issueCategories: [],
    issuePresets: [],
    issueText: '',
    issueSeverity: '中等',
    createProblem: true,
    weather: '晴',
    temperature: '',
    humidity: '',
    cropStatus: '良好',
    area: task?.area || '',
    remarks: '',
    checkTime: (task?.planTime || '09:00').slice(0, 5),
  };
}

/** 提交结果 */
export type SubmitOutcome =
  | { ok: true; mode: 'create' | 'resubmit'; recordId: string; recordCode: string; problemId?: string }
  | { ok: false; message: string; code?: string };

/**
 * 提交/重提巡查记录
 * @param taskId 任务 ID
 * @param form 表单内容
 * @param mode create=首次提交 / resubmit=驳回重提（按已有记录决定）
 * @param extras 任务侧上下文（巡查类型/对象/执行人）
 */
export async function submitInspectionRecord(
  taskId: string,
  form: InspectionRecordFormState,
  mode: 'create' | 'resubmit',
  extras: {
    inspectionType?: string;
    greenhouseName?: string;
    assigneeId?: string;
    assigneeName?: string;
    checkDate?: string;
    problemId?: string;
  } = {}
): Promise<SubmitOutcome> {
  // 异常但没填描述 → 不允许静默提交「异常且无描述」，会生成无法处理的记录
  if (form.result === 'abnormal' && !form.issueText.trim()) {
    return { ok: false, message: '巡查结果为异常时，请填写问题描述', code: 'ISSUE_TEXT_REQUIRED' };
  }

  if (mode === 'resubmit') {
    try {
      const res = await enhancedApiClient.post<any>(
        `/farm-tasks/${encodeURIComponent(taskId)}/inspection-record/resubmit`,
        {
          issueText: form.issueText,
          issueSeverity: form.issueSeverity,
          issueCategories: form.issueCategories,
          issuePresets: form.issuePresets,
          checklistResults: form.checklistResults,
          remarks: form.remarks,
          area: form.area,
          cropStatus: form.cropStatus,
          weather: form.weather,
          temperature: Number(form.temperature) || 0,
          humidity: Number(form.humidity) || 0,
          status: form.result === 'normal' ? 'normal' : 'critical',
          operatorId: extras.assigneeId,
          operatorName: extras.assigneeName,
        }
      );
      return {
        ok: true,
        mode,
        recordId: String(res?.recordId || ''),
        recordCode: String(res?.recordCode || ''),
      };
    } catch (error) {
      return { ok: false, message: (error as Error).message };
    }
  }

  try {
    const res = await enhancedApiClient.post<any>(
      `/farm-tasks/${encodeURIComponent(taskId)}/inspection-record`,
      {
        inspectionType: extras.inspectionType || 'farm',
        inspectorId: extras.assigneeId,
        inspectorName: extras.assigneeName,
        greenhouseName: extras.greenhouseName,
        checkDate: extras.checkDate,
        checkTime: form.checkTime,
        result: form.result,
        weather: form.weather,
        temperature: Number(form.temperature) || 0,
        humidity: Number(form.humidity) || 0,
        cropStatus: form.cropStatus,
        area: form.area,
        remarks: form.remarks,
        checklistResults: form.checklistResults,
        issueCategories: form.issueCategories,
        issuePresets: form.issuePresets,
        issueText: form.issueText,
        issueSeverity: form.issueSeverity,
        // 只有「异常 + 勾选生成问题 + 填了描述」才建问题，避免刷出一堆空问题
        ...(form.result === 'abnormal' && form.createProblem && form.issueText.trim()
          ? {
              problem: {
                issueText: form.issueText,
                issueSeverity: form.issueSeverity,
                issueCategories: form.issueCategories,
                images: [],
              },
            }
          : {}),
      }
    );
    return {
      ok: true,
      mode,
      recordId: String(res?.recordId || ''),
      recordCode: String(res?.recordCode || ''),
      problemId: res?.problemId ? String(res.problemId) : undefined,
    };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

/** 表单 Hook：状态 + 字段更新 + 校验 + 提交 */
export function useInspectionRecordForm(task?: {
  planTime?: string | null;
  area?: string | null;
  inspectionType?: string | null;
} | null) {
  const [form, setForm] = useState<InspectionRecordFormState>(() => createEmptyRecordForm(task));
  const [submitting, setSubmitting] = useState(false);

  const update = useCallback(<K extends keyof InspectionRecordFormState>(key: K, value: InspectionRecordFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setForm((prev) => {
      const has = prev.issueCategories.includes(cat);
      const issueCategories = has
        ? prev.issueCategories.filter((c) => c !== cat)
        : [...prev.issueCategories, cat];
      // 切换分类时清空预设：预设与分类强绑定（设备→遮阳网故障…），跨分类的预设是脏数据
      return { ...prev, issueCategories, issuePresets: [] };
    });
  }, []);

  /** 当前分类对应的快速预设 */
  const currentPresets = useMemo(() => {
    if (form.issueCategories.length !== 1) return [];
    return ISSUE_PRESETS[form.issueCategories[0] as IssueCategory] || [];
  }, [form.issueCategories]);

  const togglePreset = useCallback((preset: string) => {
    setForm((prev) => ({
      ...prev,
      issuePresets: prev.issuePresets.includes(preset)
        ? prev.issuePresets.filter((p) => p !== preset)
        : [...prev.issuePresets, preset],
    }));
  }, []);

  const reset = useCallback(() => {
    setForm(createEmptyRecordForm(task));
  }, [task]);

  return { form, setForm, update, toggleCategory, togglePreset, currentPresets, submitting, setSubmitting, reset };
}

export { ISSUE_CATEGORIES };