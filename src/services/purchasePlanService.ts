/**
 * 采购计划数据类型定义
 * 供前端其他模块引用
 */

// 采购计划类型
export interface PurchasePlanItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  category: string;
  specification: string;
  unit: string;
  quantity: number;
  estimatedPrice: number;
  estimatedTotalPrice: number;
  supplier: string;
  location: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  purpose: string;
  remark: string;
  relatedBatchCode?: string;
}

export interface PurchasePlan {
  id: string;
  purchaseApplicationCode: string;
  relatedBatchCode: string;
  purchaseType: string;
  purchaseTypeName: string;
  applicant: string;
  applicantId: string;
  applicantDepartment: string;
  applyDate: string;
  requiredDate: string;
  priority: string;
  priorityText: string;
  status: string;
  statusText: string;
  itemCount: number;
  items: PurchasePlanItem[];
  remarks: string;
  approvalPerson: string;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
  planCode: string;
  planTitle: string;
  planType: string;
  departmentName: string;
  applicantName: string;
  applyDate2: string;
  expectedDate: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  attachments: string[];
}
