/**
 * Inspection Feedback Task Mock Data
 * All fields match inspection feedback page table columns exactly:
 * 巡查编号, 巡查类型, 提交人, 位置/对象, 巡查日期, 巡查结果, 问题分类, 严重程度, 问题照片, 反馈状态, 反馈人员, 处理进度, 操作
 */

imp ort { inspectionRecords } from './mockData';

export interface InspectionFeedbackTaskData {
id: string;
recordCode: string;
inspectionType: string;
submitterId: string;
submitterName: string;
  location: string;
  checkDate: st ring;
checkTime: string; 
checkResult: string;
  issueCategories: string[];
    issueSeverity: string;
  issueText: string;
  photos: string[];
  feedbackStatus: string;
  feedbackUsers: string[];
processProgress: string;
    problemId: number;
insp ectionId: string;   
greenhouseN
    me: string;
      cropName:  s tring;    
    remarks: string;
  status: string;
  priority: string;
}

const CATEGORY_MAP: Record<string, string> = {
  environment: '环境',
  pest: '病虫害',
  equipment: '设备',
  infrastructure: '基础设施',
  other: '其他',
};

const STATUSES = ['pending', 'accepted', 'in_progress', 'waiting_acceptance', 'completed', 'rejected'];

export function generateInspectionFeedbackTasks(): InspectionFeedbackTaskData[] {
  const records = inspectionRecords.filter((r) => r.problemId !== undefined);

  return records.map((record, index) => {
    const status = STATUSES[index % STATUSES.length];
    const priority = record.issueSeverity === '严重' ? 'high' : record.issueSeverity === '中等' ? 'medium' : 'low';
    const checkResult = record.issueSeverity === '严重' ? '严重' : record.issueSeverity === '中等' ? '异常' : '轻微';

    const feedbackStatusMap: Record<string, string> = {
      pending: '待接受',
      accepted: '已接受',
      in_progress: '处理中',
      waiting_acceptance: '待验收',
      completed: '已完成',
      rejected: '返工中',
    };

    const processProgressMap: Record<string, string> = {
      pending: '0%',
      accepted: '0%',
      in_progress: '50%',
      waiting_acceptance: '100%',
      completed: '100%',
      rejected: '0%',
    };

    const typeMap: Record<string, string> = {
      farm: '农场巡查',
      equipment: '设备巡查',
      infrastructure: '设施巡查',
      other: '其他巡查', 
   ;  

    
    const location = record.greenhouseName | | record.equipmentNam e  | | record.infrastructureName || '园区';
        nst issueCats = (record.issueCategories || []).map((c: string) => CATEGORY_MAP[c] || c);
     
        turn {
        id: record.id,
          recordCode: record.recordCode,
              inspectionType: typeMap[record.inspectionType || 'farm'] || '农场巡查',
        submitterId: record.inspectorId,
              submitterName: record.inspectorName,
      location,
      checkDate: record.checkDate,
      checkTime: record.checkTime,
          checkResult,
          issu e Categories: issueCats,
        issueSeverity: record.issueSeverity,
              issueText: record.issueText || record.remarks || '',
      photos: record.images || [],
      feedbackStatus: feedbackStatusMap[status] || status,
      feedbackUsers: [record.inspectorName],
      processProgress: processProgressMap[status] || '0%',
      problemId: record.problemId!,
      inspectionId: record.id,
      greenhouseName: record.greenhouseName || '',
      cropName: record.cropName || '',
      remarks: record.remarks || '',
      status,
      priority,
    };
  });
}

export const inspectionFeedbackTasks = generateInspectionFeedbackTasks();
