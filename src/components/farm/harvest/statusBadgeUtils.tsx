/**
 * 采收状态徽章工具函数
 * 提供状态和等级的徽章渲染逻辑
 */

import { Tag } from 'antd';

// 等级颜色映射
const gradeColors: Record<string, string> = {
  'A': '#52C41A', // 绿色
  'B': '#FAAD14', // 黄色
  'C': '#FF4D4F', // 红色
};

// 状态颜色映射
const statusColors: Record<string, string> = {
  'pending': '#FAAD14',       // 待采收 - 黄色
  'harvesting': '#1677FF',   // 采收中 - 蓝色
  'harvested': '#52C41A',    // 已采收 - 绿色
  'completed': '#52C41A',    // 已完成 - 绿色
  'graded': '#722ED1',       // 已分级 - 紫色
  'stored': '#13C2C2',      // 已入库 - 青色
};

// 状态中文名称映射
const statusNames: Record<string, string> = {
  'pending': '待采收',
  'harvesting': '采收中',
  'harvested': '已采收',
  'completed': '已完成',
  'graded': '已分级',
  'stored': '已入库',
};

/**
 * 获取等级徽章
 */
export function getGradeBadge(grade: string) {
  const color = gradeColors[grade] || '#D9D9D9';
  return (
    <Tag
      color={color}
      style={{
        fontWeight: 500,
        borderRadius: '4px',
      }}
    >
      {grade}级
    </Tag>
  );
}

/**
 * 获取状态徽章
 */
export function getStatusBadge(status: string) {
  const color = statusColors[status] || '#D9D9D9';
  const text = statusNames[status] || status;

  return (
    <Tag
      color={color}
      style={{
        fontWeight: 500,
        borderRadius: '4px',
      }}
    >
      {text}
    </Tag>
  );
}

export default { getGradeBadge, getStatusBadge };
