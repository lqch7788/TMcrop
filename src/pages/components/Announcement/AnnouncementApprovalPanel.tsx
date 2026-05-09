/**
 * 审批流程面板组件
 * 显示审批流程配置和待审批公告
 */
import { Settings, Clock, CheckCircle, XCircle, ArrowRight, Plus } from 'lucide-react';
import type { ApprovalWorkflow, Notice } from '../../types/announcement.types';

interface ApprovalPanelProps {
  workflows: ApprovalWorkflow[];
  pendingNotices: Notice[];
}

export default function ApprovalPanel({ workflows, pendingNotices }: ApprovalPanelProps) {
  return (
    <div className="space-y-6">
      {/* 审批流程配置 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />审批流程配置
          </h3>
          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
            <Plus className="w-4 h-4" />新增流程
          </button>
        </div>
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{workflow.name}</h4>
                    <span className="text-xs text-gray-500">{workflow.code}</span>
                  </div>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{workflow.status}</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                {Array.from({ length: workflow.steps }).map((_, i) => (
                  <div key={i} className="flex items-center">
                    <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200">
                      {i === 0 ? '起草人' : i === workflow.steps - 1 ? '审批人' : '审核人'}
                    </div>
                    {i < workflow.steps - 1 && <ArrowRight className="w-4 h-4 text-gray-400 mx-1" />}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>审批步骤：{workflow.steps} 步</span>
                <div className="flex items-center gap-2">
                  <button className="text-blue-600 hover:underline">编辑</button>
                  <button className="text-red-600 hover:underline">删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 待审批公告 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600" />待审批公告
        </h3>
        <div className="space-y-3">
          {pendingNotices.map(notice => (
            <div key={notice.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{notice.title}</p>
                  <p className="text-xs text-gray-500">{notice.sender} · {notice.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />通过
                </button>
                <button className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1">
                  <XCircle className="w-3 h-3" />驳回
                </button>
              </div>
            </div>
          ))}
          {pendingNotices.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-gray-500">暂无待审批公告</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
