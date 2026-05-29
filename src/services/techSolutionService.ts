/**
 * 技术方案数据类型定义
 * 供前端其他模块引用
 */

// 技术方案类型
export interface TechSolution {
  id: string;
  code: string;
  title: string;
  crop: string;
  cropCode: string;
  plantingMode: string;
  stage: string;
  version: string;
  content: string;
  author: string;
  authorId: string;
  createDate: string;
  updateTime: string;
  status: string;
  batchStatus: string;
  statusClass: string;
  approveStatus: string;
  approvalCode: string;
  approvalDate: string;
  approver: string;
  relatedBatchCode: string;
  planDetailFileName: string;
  priority: string;
  remarks: string;
  lastSubmitTime: string;
  isValid: string;
}
