/**
 * 任务执行卡片组件
 * 功能：执行人提交任务进度、反馈的卡片组件
 */

import { useState } from 'react';
import { Play, Pause, CheckCircle, Clock, MapPin, Camera, Mic, FileText, Package } from 'lucide-react';
import { Task, TASK_STATUS_CONFIG } from '../../../../types/task';
import { Modal } from '../../../ui/Modal';
import FeedbackInput from '../../../common/FeedbackInput';
import { Button } from '@/components/ui/button';

interface TaskExecuteCardProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSubmitProgress: (progress: number, feedback: TaskFeedback) => void;
}

export interface TaskFeedback {
  text?: string;
  images?: string[];
  voiceNote?: string;
  gpsLocation?: { lat: number; lng: number };
  materials?: { name: string; qty: number; unit: string }[];
}

export function TaskExecuteCard({ task, isOpen, onClose, onSubmitProgress }: TaskExecuteCardProps) {
  const [progress, setProgress] = useState(task.progress || 0);
  const [feedback, setFeedback] = useState<TaskFeedback>({});
  const [submitText, setSubmitText] = useState('');
  const [materialCode, setMaterialCode] = useState('');

  if (!task) return null;

  const statusConfig = TASK_STATUS_CONFIG[task.status];
  const isCompleted = task.status === 'completed' || task.status === 'waiting_acceptance';
  const canSubmit = task.status === 'accepted' || task.status === 'in_progress';

  const handleSubmit = () => {
    // 如果有扫码的物资编码，添加到 materials 中
    const materialsWithCode = materialCode
      ? [{ name: materialCode, qty: 1, unit: '个' }]
      : feedback.materials;

    onSubmitProgress(progress, {
      ...feedback,
      materials: materialsWithCode,
      text: submitText || undefined,
    });
    onClose();
  };

  const getStatusLabel = () => {
    if (isCompleted) return statusConfig.label;
    if (progress === 100) return '可提交验收';
    if (progress > 0) return '进行中';
    return '未开始';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`执行任务 - ${task.taskCode}`}
      size="lg"
      showFooter={false}
    >
      <div className="space-y-6">
        {/* 任务基本信息 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">{task.title}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <label className="text-gray-500">执行人</label>
              <p className="font-medium">{task.assigneeName}</p>
            </div>
            <div>
              <label className="text-gray-500">任务类型</label>
              <p className="font-medium">{task.typeName}</p>
            </div>
            <div>
              <label className="text-gray-500">当前状态</label>
              <p className="font-medium">
                <span className={`px-2 py-0.5 rounded text-xs ${statusConfig.bg} ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </p>
            </div>
            <div>
              <label className="text-gray-500">截止日期</label>
              <p className="font-medium">{task.dueDate || '未设置'}</p>
            </div>
          </div>
        </div>

        {/* 执行进度 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              执行进度
            </label>
            <span className="text-sm font-medium text-gray-700">{progress}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={progress}
            onChange={(e) => setProgress(parseInt(e.target.value))}
            disabled={!canSubmit}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 ${
              !canSubmit ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">{getStatusLabel()}</p>
        </div>

        {/* 必填反馈项 */}
        {task.feedbackRequirements && task.feedbackRequirements.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">必填反馈项</label>
            <div className="grid grid-cols-2 gap-3">
              {task.feedbackRequirements.map((req, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    {req.type === 'gps' && <MapPin className="w-4 h-4 text-blue-500" />}
                    {req.type === 'image_before' && <Camera className="w-4 h-4 text-purple-500" />}
                    {req.type === 'image_after' && <Camera className="w-4 h-4 text-green-500" />}
                    {req.type === 'voice' && <Mic className="w-4 h-4 text-red-500" />}
                    {req.type === 'text' && <FileText className="w-4 h-4 text-gray-500" />}
                    {req.type === 'materials' && <Package className="w-4 h-4 text-orange-500" />}
                    {req.label}
                    {req.required && <span className="text-red-500">*</span>}
                  </div>
                  {req.type === 'gps' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="点击获取GPS"
                        className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                        onFocus={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition((pos) => {
                              setFeedback(prev => ({
                                ...prev,
                                gpsLocation: {
                                  lat: pos.coords.latitude,
                                  lng: pos.coords.longitude,
                                },
                              }));
                            });
                          }
                        }}
                      />
                      {feedback.gpsLocation && (
                        <span className="text-xs text-green-600">
                          {feedback.gpsLocation.lat.toFixed(4)}, {feedback.gpsLocation.lng.toFixed(4)}
                        </span>
                      )}
                    </div>
                  )}
                  {req.type === 'image_before' && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => {}}>拍照</Button>
                      {feedback.images && feedback.images.length > 0 && (
                        <span className="text-xs text-gray-500">{feedback.images.length}张</span>
                      )}
                    </div>
                  )}
                  {req.type === 'image_after' && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => {}}>拍照</Button>
                    </div>
                  )}
                  {req.type === 'voice' && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => {}}><Mic className="w-3 h-3" />录音</Button>
                    </div>
                  )}
                  {req.type === 'text' && (
                    <textarea
                      placeholder={`请输入${req.label}...`}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm resize-none"
                      rows={2}
                    />
                  )}
                  {req.type === 'materials' && (
                    <FeedbackInput
                      type="material"
                      value={materialCode}
                      onChange={(v) => setMaterialCode(v)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 进度反馈文本 */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            进度说明 {progress < 100 && '(选填)'}
          </label>
          <textarea
            value={submitText}
            onChange={(e) => setSubmitText(e.target.value)}
            placeholder={
              progress === 100
                ? '请描述完成情况，准备提交验收...'
                : '请描述当前进度和下一步计划...'
            }
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={3}
          />
        </div>

        {/* 提示信息 */}
        <div className={`rounded-lg p-3 ${progress === 100 ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
          <p className={`text-sm ${progress === 100 ? 'text-amber-800' : 'text-blue-800'}`}>
            {progress === 100
              ? '提交反馈后，任务将进入"待验收"状态，等待管理者确认完成。'
              : '提交进度反馈后，任务将继续进行，可再次提交直到100%。'}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button
            variant={progress === 100 ? 'default' : 'blue'}
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2"
          >
            {progress === 100 ? (
              <>
                <CheckCircle className="w-4 h-4" />
                提交验收
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                提交进度
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default TaskExecuteCard;
