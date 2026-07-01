/**
 * 月度规划报告组件
 * 展示月度任务规划、资源需求和成本预估
 */

import React, { useState, useMemo } from 'react';
import { Card, Statistic, Alert, Progress, Divider } from '@/components/ui';
import { Space } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import {
  Calendar,
  FileText,
  ShoppingCart,
  Users,
  DollarSign,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import type {
  MonthlyPlan,
  WeeklySummary,
  MaterialRequirement,
  WorkerRequirement,
  CostBreakdown,
} from '../../types/planning';


// ============================================
// 类型定义
// ============================================
interface MonthlyPlanReportProps {
  plan: MonthlyPlan;
  showActions?: boolean;
  onWeekClick?: (week: WeeklySummary) => void;
  onMaterialClick?: (material: MaterialRequirement) => void;
  onWorkerClick?: (worker: WorkerRequirement) => void;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取任务类型中文名
 */
function getTaskTypeName(type: string): string {
  const typeMap: Record<string, string> = {
    irrigation: '灌溉',
    fertilization: '施肥',
    plant_protection: '植保',
    pruning: '修剪',
    harvest: '采收',
    weeding: '除草',
  };
  return typeMap[type] || type;
}

/**
 * 获取进度条颜色
 */
function getProgressColor(index: number): string {
  const colors = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#13c2c2'];
  return colors[index % colors.length];
}

// ============================================
// 周汇总表格组件
// ============================================
interface WeeklySummaryTableProps {
  data: WeeklySummary[];
  onWeekClick?: (week: WeeklySummary) => void;
}

function WeeklySummaryTable({ data, onWeekClick }: WeeklySummaryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">周次</TableHead>
          <TableHead className="w-[120px]">开始日期</TableHead>
          <TableHead className="w-[120px]">结束日期</TableHead>
          <TableHead className="w-[80px]">任务数</TableHead>
          <TableHead className="w-[100px]">总工时</TableHead>
          <TableHead className="w-[100px]">所需人数</TableHead>
          <TableHead>重点作物</TableHead>
          <TableHead>重点任务</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.weekNumber}>
            <TableCell className="font-semibold">第 {item.weekNumber} 周</TableCell>
            <TableCell>{item.startDate}</TableCell>
            <TableCell>{item.endDate}</TableCell>
            <TableCell>
              <Badge
                variant="info"
                className={onWeekClick ? 'cursor-pointer hover:opacity-80' : ''}
                onClick={() => onWeekClick?.(item)}
              >
                {item.taskCount}
              </Badge>
            </TableCell>
            <TableCell>{item.totalHours}h</TableCell>
            <TableCell>{item.requiredWorkers} 人</TableCell>
            <TableCell>
              <Space wrap>
                {item.keyCrops.map(crop => (
                  <Badge key={crop} variant="success">{crop}</Badge>
                ))}
              </Space>
            </TableCell>
            <TableCell>
              <Space wrap>
                {item.keyTasks.map(task => (
                  <Badge key={task}>{task}</Badge>
                ))}
              </Space>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================
// 物资需求表格组件
// ============================================
interface MaterialRequirementTableProps {
  data: MaterialRequirement[];
  onMaterialClick?: (material: MaterialRequirement) => void;
}

function MaterialRequirementTable({ data, onMaterialClick }: MaterialRequirementTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage]);

  // 计算合计
  const totalPrice = useMemo(() => {
    return data.reduce((sum, m) => sum + m.estimatedTotalPrice, 0);
  }, [data]);

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">物资名称</TableHead>
            <TableHead className="w-[120px]">规格</TableHead>
            <TableHead className="w-[100px]">数量</TableHead>
            <TableHead className="w-[120px]">预估单价</TableHead>
            <TableHead className="w-[120px]">预估总价</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((item, index) => (
            <TableRow key={index}>
              <TableCell
                className={onMaterialClick ? 'cursor-pointer hover:text-emerald-600' : ''}
                onClick={() => onMaterialClick?.(item)}
              >
                {item.materialName}
              </TableCell>
              <TableCell>{item.specification}</TableCell>
              <TableCell className="font-semibold">{item.quantity} {item.unit}</TableCell>
              <TableCell>¥{item.estimatedUnitPrice.toFixed(2)}</TableCell>
              <TableCell className="font-semibold text-red-500">¥{item.estimatedTotalPrice.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/* 合计行 */}
      <div className="flex justify-between items-center p-3 bg-gray-50 border-t border-gray-100">
        <span className="font-semibold">合计</span>
        <span className="font-semibold text-red-500">¥{totalPrice.toFixed(2)}</span>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-end mt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// 人员需求表格组件
// ============================================
interface WorkerRequirementTableProps {
  data: WorkerRequirement[];
  onWorkerClick?: (worker: WorkerRequirement) => void;
}

function WorkerRequirementTable({ data, onWorkerClick }: WorkerRequirementTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage]);

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">角色</TableHead>
            <TableHead className="w-[120px]">技能要求</TableHead>
            <TableHead className="w-[100px]">需求人数</TableHead>
            <TableHead className="w-[100px]">预估工时</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((item, index) => (
            <TableRow key={index}>
              <TableCell
                className={onWorkerClick ? 'cursor-pointer hover:text-emerald-600' : ''}
                onClick={() => onWorkerClick?.(item)}
              >
                {item.role}
              </TableCell>
              <TableCell>{item.skill}</TableCell>
              <TableCell>
                <Badge variant="info">{item.requiredCount} 人</Badge>
              </TableCell>
              <TableCell>{item.estimatedHours}h</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex justify-end mt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// 主组件
// ============================================

export default function MonthlyPlanReportComponent({
  plan,
  showActions,
  onWeekClick,
  onMaterialClick,
  onWorkerClick,
}: MonthlyPlanReportProps) {
  // 任务类型分布
  const taskTypeSummary = Object.entries(plan.taskTypeBreakdown)
    .map(([taskType, count]) => ({
      taskType,
      taskTypeName: getTaskTypeName(taskType),
      count,
      percentage: plan.totalTasks > 0 ? Math.round((count / plan.totalTasks) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="monthly-plan-report">
      {/* 报告标题 */}
      <div style={{ marginBottom: 16 }}>
        <h4 className="text-lg font-semibold">
          <Calendar /> 月度任务规划报告 - {plan.month}
        </h4>
        <p className="text-gray-500">
          生成时间：{new Date(plan.generatedAt).toLocaleString()} | 生成方式：{plan.generatedBy}
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 16 }}>
        <Card size="small">
          <Statistic
            title="总任务数"
            value={plan.totalTasks}
            prefix={<FileText />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
        <Card size="small">
          <Statistic
            title="预估工时"
            value={plan.totalHours}
            suffix="h"
            prefix={<Zap />}
            valueStyle={{ color: '#722ed1' }}
          />
        </Card>
        <Card size="small">
          <Statistic
            title="所需人员"
            value={Math.round(plan.totalHours / 8)}
            suffix="人"
            prefix={<Users />}
            valueStyle={{ color: '#13c2c2' }}
          />
        </Card>
        <Card size="small">
          <Statistic
            title="预估成本"
            value={plan.totalCost}
            precision={0}
            prefix={<><span>¥</span><DollarSign /></>}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Card>
      </div>

      {/* 任务类型分布 */}
      <Card size="small" title="任务类型分布" style={{ marginBottom: 16 }}>
        <div className="grid grid-cols-4 gap-4">
          {taskTypeSummary.slice(0, 4).map((item, index) => (
            <div key={index}>
              <Statistic
                title={item.taskTypeName}
                value={item.count}
                suffix={`(${item.percentage}%)`}
              />
              <Progress
                percent={item.percentage}
                showInfo={false}
                strokeColor={getProgressColor(index)}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* 按周汇总 */}
      <Card
        size="small"
        title="按周汇总"
        style={{ marginBottom: 16 }}
        extra={
          showActions && (
            <span className="text-gray-500">共 {plan.weeklySummaries.length} 周</span>
          )
        }
      >
        <WeeklySummaryTable
          data={plan.weeklySummaries}
          onWeekClick={onWeekClick}
        />
      </Card>

      {/* 物资需求 */}
      <Card
        size="small"
        title="物资需求计划"
        style={{ marginBottom: 16 }}
        extra={
          showActions && (
            <span className="text-gray-500">
              共 {plan.materialRequirements.length} 项 | 预估 ¥{plan.materialRequirements.reduce((sum, m) => sum + m.estimatedTotalPrice, 0).toFixed(2)}
            </span>
          )
        }
      >
        <MaterialRequirementTable
          data={plan.materialRequirements}
          onMaterialClick={onMaterialClick}
        />
      </Card>

      {/* 人员需求 */}
      <Card
        size="small"
        title="人员需求计划"
        style={{ marginBottom: 16 }}
        extra={
          showActions && (
            <span className="text-gray-500">共 {plan.workerRequirements.length} 项</span>
          )
        }
      >
        <WorkerRequirementTable
          data={plan.workerRequirements}
          onWorkerClick={onWorkerClick}
        />
      </Card>

      {/* 成本预估 */}
      <Card size="small" title="成本预估">
        <div className="grid grid-cols-3 gap-4">
          <Card size="small" type="inner">
            <Statistic
              title="物资成本"
              value={plan.costBreakdown.materialCost}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
          <Card size="small" type="inner">
            <Statistic
              title="工具成本"
              value={plan.costBreakdown.toolCost}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
          <Card size="small" type="inner">
            <Statistic
              title="人工成本"
              value={plan.costBreakdown.laborCost}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </div>

        <Divider />

        <Card size="small" type="inner">
          <Statistic
            title="总成本"
            value={plan.costBreakdown.total}
            prefix="¥"
            precision={2}
            valueStyle={{ color: '#ff4d4f', fontSize: 28 }}
          />
        </Card>

        <Divider />

        <h5 className="text-sm font-semibold">成本构成</h5>
        <Progress
          percent={plan.costBreakdown.total > 0 ? Math.round((plan.costBreakdown.materialCost / plan.costBreakdown.total) * 100) : 0}
          strokeColor="#fa8c16"
          format={(percent) => `物资 ${percent}%`}
        />
        <Progress
          percent={plan.costBreakdown.total > 0 ? Math.round((plan.costBreakdown.toolCost / plan.costBreakdown.total) * 100) : 0}
          strokeColor="#722ed1"
          format={(percent) => `工具 ${percent}%`}
        />
        <Progress
          percent={plan.costBreakdown.total > 0 ? Math.round((plan.costBreakdown.laborCost / plan.costBreakdown.total) * 100) : 0}
          strokeColor="#13c2c2"
          format={(percent) => `人工 ${percent}%`}
        />
      </Card>
    </div>
  );
}
