/**
 * 客户档案类型定义
 */
export interface Customer {
  id: string;
  customerCode: string;
  customerName: string;
  contactPerson?: string;
  contactPhone?: string;
  deliveryAddress?: string;
  remarks?: string;
  createBy?: string;
  createTime: string;
  updateTime?: string;
}

export interface CustomerFilters {
  search?: string;
}
