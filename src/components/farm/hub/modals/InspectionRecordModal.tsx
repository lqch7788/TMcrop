/**
 * 巡查记录提交弹窗（2026-10-21 P4）
 *
 * 入口：
 *   · 「我的任务」里点「填写巡查记录」/「修改记录并重提」
 *   · 「巡查记录」tab 的计划实例表点「填写记录」
 *
 * 表单状态与提交逻辑全部走 useInspectionRecordForm（与两处入口共用一份）。
 */
import React, { useEffect, useState } from 'react';
import { Button, Input, Label, Modal, TextArea } from '@/components/ui';
import {
  useInspectionRecordForm,
  submitInspectionRecord,
  ISSUE_CATEGORIES,
} from '@/hooks/useInspectionRecordForm';
import { showAlert } from '@/lib/dialogService';
import { enhancedApiClient } from '@/lib/apiClient';

export interface InspectionRecordModalProps {
  isOpen: boolean;
  /** 目标任务 */
  task: {
    id: string;
    taskCode?: string;
    planCode?: string;
    inspectionType?: string | null;
    greenhouseName?: string | null;
    assigneeId?: string | null;
    assigneeName?: string | null;
    planTime?: string | null;
    planOccurrenceDate?: string | null;
    area?: string | null;
  } | null;
  /** 已有记录 → 回填并走重提；无记录 → 走首次提交 */
  existingRecord?: { id: string; recordCode: string } | null;
  /**
   * 只读查看（2026-10-22 审核 P1-6）：
   *   任务已有记录但不在「返工中」时，resubmit 必然 409「仅驳回态允许」。
   *   这类场景应当只读展示原记录，而不是给一个必然失败的空白表单。
   */
  readOnly?: boolean;
  checklist?: Array<{ key: string; label: string; required?: boolean }>;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function InspectionRecordModal({
  isOpen, task, existingRecord, readOnly = false, checklist = [], onClose, onSubmitted,
}: InspectionRecordModalProps) {
  const isResubmit = !!existingRecord && !readOnly;
  const { form, setForm, update, toggleCategory, togglePreset, currentPresets, submitting, setSubmitting, reset } =
    useInspectionRecordForm(task);
  const [loadingRecord, setLoadingRecord] = useState(false);

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, task?.id]);

  // 2026-10-22（审核 P1-6）：有记录时把原记录回填进表单
  //   （查看时直接读到内容；重提时基于原值修改，而不是从空白开始）
  useEffect(() => {
    if (!isOpen || !existingRecord?.id) return;
    let cancelled = false;
    setLoadingRecord(true);
    enhancedApiClient
      .get<any>(`/inspections/${encodeURIComponent(existingRecord.id)}`)
      .then((raw) => {
        if (cancelled || !raw) return;
        const rec = (raw as any).data ?? raw;
        const parseArr = (v: unknown): any[] => {
          if (Array.isArray(v)) return v;
          if (typeof v === 'string' && v) { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
          return [];
        };
        setForm({
          result: String(rec.status || '') === 'normal' ? 'normal' : 'abnormal',
          checklistResults: parseArr(rec.checklistResults),
          issueCategories: parseArr(rec.issueCategories),
          issuePresets: parseArr(rec.issuePresets),
          issueText: String(rec.issueText || ''),
          issueSeverity: (rec.issueSeverity || '中等') as '轻微' | '中等' | '严重',
          createProblem: false,
          weather: String(rec.weather || '晴'),
          temperature: rec.temperature ? String(rec.temperature) : '',
          humidity: rec.humidity ? String(rec.humidity) : '',
          cropStatus: String(rec.cropStatus || '良好'),
          area: String(rec.area || ''),
          remarks: String(rec.remarks || ''),
          checkTime: String(rec.checkTime || ''),
        });
      })
      .catch(() => { /* 读取失败保持空表单，用户仍可编辑 */ })
      .finally(() => { if (!cancelled) setLoadingRecord(false); });
    return () => { cancelled = true; };
  }, [isOpen, existingRecord?.id]);

  if (!isOpen || !task) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const outcome = await submitInspectionRecord(
        task.id,
        form,
        isResubmit ? 'resubmit' : 'create',
        {
          inspectionType: task.inspectionType || 'farm',
          greenhouseName: task.greenhouseName || '',
          assigneeId: task.assigneeId || '',
          assigneeName: task.assigneeName || '',
          checkDate: task.planOccurrenceDate || '',
        }
      );
      if (!outcome.ok) {
        showAlert(outcome.message);
        return;
      }
      showAlert(
        isResubmit
          ? `巡查记录 ${outcome.recordCode} 已重新提交，等待验收`
          : `巡查记录 ${outcome.recordCode} 已提交` +
            (outcome.problemId ? '，并已生成待处理问题' : '')
      );
      onSubmitted?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${readOnly ? '查看' : isResubmit ? '修改并重提' : '填写'}巡查记录 - ${task.taskCode || ''}`}
      size="lg"
      showFooter={false}
    >
      <div className="space-y-4 max-h-[65vh] overflow-y-auto px-1">
        {task.planCode && (
          <p className="text-xs text-slate-500">来源巡查计划：{task.planCode}</p>
        )}

        {/* 巡查结果 */}
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">巡查结果 *</Label>
          <div className="flex gap-2">
            {(['normal', 'abnormal'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => update('result', r)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  form.result === r
                    ? r === 'normal'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white text-slate-600 hover:border-gray-300'
                }`}
              >
                {r === 'normal' ? '正常' : '异常'}
              </button>
            ))}
          </div>
        </div>

        {/* 检查项模板 */}
        {checklist.length > 0 && (
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">检查项</Label>
            <div className="space-y-2">
              {checklist.map((item, idx) => {
                const current = form.checklistResults.find((r) => r.key === item.key);
                const status = current?.status || 'ok';
                return (
                  <div key={item.key} className="flex items-center gap-2">
                    <span className="text-sm text-slate-700 flex-1">
                      {item.label}
                      {item.required && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                    {(['ok', 'issue', 'na'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          const next = form.checklistResults.filter((r) => r.key !== item.key);
                          next.push({ key: item.key, status: s });
                          update('checklistResults', next);
                        }}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${
                          status === s
                            ? s === 'ok' ? 'border-green-500 bg-green-50 text-green-700'
                              : s === 'issue' ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 bg-gray-50 text-gray-600'
                            : 'border-gray-200 bg-white text-slate-500'
                        }`}
                      >
                        {s === 'ok' ? '正常' : s === 'issue' ? '异常' : '不适用'}
                      </button>
                    ))}
                    {idx >= 0 && null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 环境信息 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">巡查时间</Label>
            <Input type="time" value={form.checkTime} onChange={(e) => update('checkTime', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">天气</Label>
            <Input value={form.weather} onChange={(e) => update('weather', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">温度 ℃</Label>
            <Input value={form.temperature} onChange={(e) => update('temperature', e.target.value)} placeholder="选填" />
          </div>
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">湿度 %</Label>
            <Input value={form.humidity} onChange={(e) => update('humidity', e.target.value)} placeholder="选填" />
          </div>
        </div>

        {/* 异常信息 */}
        {form.result === 'abnormal' && (
          <div className="space-y-3 border-t border-gray-100 pt-3">
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">问题分类</Label>
              <div className="flex flex-wrap gap-2">
                {ISSUE_CATEGORIES.map((c) => {
                  const active = form.issueCategories.includes(c.value as string);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => toggleCategory(c.value as string)}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-slate-600'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {currentPresets.length > 0 && (
              <div>
                <Label className="text-xs text-slate-600 mb-1 block">常用问题</Label>
                <div className="flex flex-wrap gap-2">
                  {currentPresets.map((p) => {
                    const active = form.issuePresets.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePreset(p)}
                        className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                          active ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-slate-600'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs text-slate-600 mb-1 block">问题描述 *</Label>
              <TextArea
                rows={3}
                value={form.issueText}
                onChange={(e) => update('issueText', e.target.value)}
                placeholder="描述发现的问题现象"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-600 mb-1 block">严重程度</Label>
                {(['轻微', '中等', '严重'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update('issueSeverity', s)}
                    className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                      form.issueSeverity === s
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.createProblem}
                  onChange={(e) => update('createProblem', e.target.checked)}
                />
                同时生成待处理问题
              </label>
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs text-slate-600 mb-1 block">备注</Label>
          <TextArea rows={2} value={form.remarks} onChange={(e) => update('remarks', e.target.value)} />
        </div>
      </div>

      {/* 2026-10-22：footer 对齐系统（size=sm / 取消=secondary）；
          只读模式只保留「关闭」，不提供必然失败的提交按钮 */}
      <div className="flex items-center justify-end gap-3 mt-5 pt-3 border-t border-gray-200">
        {readOnly ? (
          <Button size="sm" variant="secondary" onClick={onClose}>关闭</Button>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={onClose}>取消</Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting || loadingRecord}>
              {submitting ? '提交中…' : isResubmit ? '重新提交' : '提交记录'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}