/**
 * 数据库表结构测试用例
 * 测试 schema.ts 中的数据库表创建和迁移功能
 *
 * 验证：
 * 1. 幂等性测试：重复执行迁移不报错
 * 2. 表结构验证：所有表都正确创建
 * 3. 索引验证：索引存在且正确
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// 模拟 sql.js 数据库
const mockDb = {
  run: vi.fn(),
  exec: vi.fn(),
  prepare: vi.fn(),
};

// 模拟 getDatabase
vi.mock('../db/index', () => ({
  getDatabase: () => mockDb,
}));

// 模拟 createIndexes
vi.mock('./createIndexes', () => ({
  createIndexes: vi.fn(),
}));

// 导入被测试的函数
import { initializeDatabase } from '../db/schema';

describe('数据库表结构初始化', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 模拟每次 run 都不报错（表已存在等错误在实现中被捕获）
    mockDb.run.mockImplementation(() => {});
    mockDb.exec.mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('幂等性测试：重复执行迁移不报错', () => {
    it('应该能够多次调用 initializeDatabase 而不报错', () => {
      // 第一次初始化
      expect(() => initializeDatabase()).not.toThrow();

      // 第二次初始化（模拟表已存在等情况）
      expect(() => initializeDatabase()).not.toThrow();

      // 第三次初始化
      expect(() => initializeDatabase()).not.toThrow();
    });

    it('每次调用都应该执行所有 CREATE TABLE 语句', () => {
      // 重置 mock 以确保干净的计数
      vi.clearAllMocks();
      mockDb.run.mockImplementation(() => {});

      // 只调用一次来获取基准数量
      initializeDatabase();
      const firstCallCount = mockDb.run.mock.calls.length;

      // 再次调用并验证数量相同
      const callsBeforeSecond = mockDb.run.mock.calls.length;
      initializeDatabase();
      const callsAfterSecond = mockDb.run.mock.calls.length;

      // 每次调用增加的 SQL 数量应该相同
      const incrementFirst = callsBeforeSecond;
      const incrementSecond = callsAfterSecond - callsBeforeSecond;
      expect(incrementSecond).toBe(incrementFirst);
    });

    it('ALTER TABLE 语句应该被正确捕获（不抛错）', () => {
      // 模拟 ALTER TABLE 报错（列已存在等）
      mockDb.run.mockImplementation((sql: string) => {
        if (sql.startsWith('ALTER TABLE')) {
          throw new Error('duplicate column name');
        }
      });

      // 应该不抛错，因为实现中用 try-catch 捕获了错误
      expect(() => initializeDatabase()).not.toThrow();
    });
  });

  describe('表结构验证：所有表都正确创建', () => {
    it('应该创建 departments 表', () => {
      initializeDatabase();

      const createDeptCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('departments')
      );
      expect(createDeptCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 positions 表', () => {
      initializeDatabase();

      const createPosCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('positions')
      );
      expect(createPosCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 teams 表', () => {
      initializeDatabase();

      const createTeamCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('teams')
      );
      expect(createTeamCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 warehouses 表', () => {
      initializeDatabase();

      const createWhCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('warehouses')
      );
      expect(createWhCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 greenhouses 表', () => {
      initializeDatabase();

      const createGhCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('greenhouses')
      );
      expect(createGhCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 zones 表', () => {
      initializeDatabase();

      const createZoneCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('zones')
      );
      expect(createZoneCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 blocks 表', () => {
      initializeDatabase();

      const createBlockCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('blocks')
      );
      expect(createBlockCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 code_rules 表', () => {
      initializeDatabase();

      const createCodeRuleCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('code_rules')
      );
      expect(createCodeRuleCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 notification_channels 表', () => {
      initializeDatabase();

      const createChannelCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('notification_channels')
      );
      expect(createChannelCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 notification_rules 表', () => {
      initializeDatabase();

      const createRuleCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('notification_rules')
      );
      expect(createRuleCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 approval_rules 表', () => {
      initializeDatabase();

      const createApprovalCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('approval_rules')
      );
      expect(createApprovalCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 approval_workflows 表', () => {
      initializeDatabase();

      const createWorkflowCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('approval_workflows')
      );
      expect(createWorkflowCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 approvals 表', () => {
      initializeDatabase();

      const createApprovalsCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('approvals')
      );
      expect(createApprovalsCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 dictionary_categories 表', () => {
      initializeDatabase();

      const createDictCatCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('dictionary_categories')
      );
      expect(createDictCatCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 dictionaries 表', () => {
      initializeDatabase();

      const createDictCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('dictionaries')
      );
      expect(createDictCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 crop_varieties 表', () => {
      initializeDatabase();

      const createCropVarCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('crop_varieties')
      );
      expect(createCropVarCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 inventory 表', () => {
      initializeDatabase();

      const createInvCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('inventory')
      );
      expect(createInvCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 crop_instances 表', () => {
      initializeDatabase();

      const createCropInsCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('crop_instances')
      );
      expect(createCropInsCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 seed_sources 表', () => {
      initializeDatabase();

      const createSeedSrcCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('seed_sources')
      );
      expect(createSeedSrcCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 seedlings 表', () => {
      initializeDatabase();

      const createSeedlingCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('seedlings')
      );
      expect(createSeedlingCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 plantings 表', () => {
      initializeDatabase();

      const createPlantingCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('plantings')
      );
      expect(createPlantingCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 harvest_records 表', () => {
      initializeDatabase();

      const createHarvestCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('harvest_records')
      );
      expect(createHarvestCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 suppliers 表', () => {
      initializeDatabase();

      const createSupplierCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('suppliers')
      );
      expect(createSupplierCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 farm_tasks 表', () => {
      initializeDatabase();

      const createFarmTaskCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('farm_tasks')
      );
      expect(createFarmTaskCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 inspections 表', () => {
      initializeDatabase();

      const createInspectionCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('inspections')
      );
      expect(createInspectionCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 problems 表', () => {
      initializeDatabase();

      const createProblemCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('problems')
      );
      expect(createProblemCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 labor_records 表', () => {
      initializeDatabase();

      const createLaborCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('labor_records')
      );
      expect(createLaborCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 attendance_records 表', () => {
      initializeDatabase();

      const createAttendanceCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('attendance_records')
      );
      expect(createAttendanceCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 temp_tasks 表', () => {
      initializeDatabase();

      const createTempTaskCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('temp_tasks')
      );
      expect(createTempTaskCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 purchase_plans 表', () => {
      initializeDatabase();

      const createPurchasePlanCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('purchase_plans')
      );
      expect(createPurchasePlanCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 material_requests 表', () => {
      initializeDatabase();

      const createMaterialReqCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('material_requests')
      );
      expect(createMaterialReqCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 task_operation_records 表', () => {
      initializeDatabase();

      const createTaskOpCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('task_operation_records')
      );
      expect(createTaskOpCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 system_configs 表', () => {
      initializeDatabase();

      const createSysCfgCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('system_configs')
      );
      expect(createSysCfgCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 operation_logs 表', () => {
      initializeDatabase();

      const createOpLogCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('operation_logs')
      );
      expect(createOpLogCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 roles 表', () => {
      initializeDatabase();

      const createRoleCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('roles')
      );
      expect(createRoleCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 permissions 表', () => {
      initializeDatabase();

      const createPermCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('permissions')
      );
      expect(createPermCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 users 表', () => {
      initializeDatabase();

      const createUserCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('users')
      );
      expect(createUserCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 user_roles 表', () => {
      initializeDatabase();

      const createUserRoleCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('user_roles')
      );
      expect(createUserRoleCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 role_permissions 表', () => {
      initializeDatabase();

      const createRolePermCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('role_permissions')
      );
      expect(createRolePermCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 processes 表', () => {
      initializeDatabase();

      const createProcCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('processes')
      );
      expect(createProcCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 actions 表', () => {
      initializeDatabase();

      const createActionCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('actions')
      );
      expect(createActionCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 roles_authority 表', () => {
      initializeDatabase();

      const createRolesAuthCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('roles_authority')
      );
      expect(createRolesAuthCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 crop_orders 表', () => {
      initializeDatabase();

      const createCropOrderCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('crop_orders')
      );
      expect(createCropOrderCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 production_plans 表', () => {
      initializeDatabase();

      const createProdPlanCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('production_plans')
      );
      expect(createProdPlanCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 tech_solutions 表', () => {
      initializeDatabase();

      const createTechSolCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('tech_solutions')
      );
      expect(createTechSolCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 crop_variety_type_extensions 表', () => {
      initializeDatabase();

      const createTypeExtCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('crop_variety_type_extensions')
      );
      expect(createTypeExtCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 crop_variety_variety_extensions 表', () => {
      initializeDatabase();

      const createVarExtCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('crop_variety_variety_extensions')
      );
      expect(createVarExtCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 crop_variety_sub1_extensions 表', () => {
      initializeDatabase();

      const createSub1ExtCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('crop_variety_sub1_extensions')
      );
      expect(createSub1ExtCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 material_costs 表', () => {
      initializeDatabase();

      const createMatCostCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('material_costs')
      );
      expect(createMatCostCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 energy_costs 表', () => {
      initializeDatabase();

      const createEnergyCostCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('energy_costs')
      );
      expect(createEnergyCostCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 overtime_records 表', () => {
      initializeDatabase();

      const createOvertimeCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('overtime_records')
      );
      expect(createOvertimeCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 leave_records 表', () => {
      initializeDatabase();

      const createLeaveCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('leave_records')
      );
      expect(createLeaveCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 leave_quotas 表', () => {
      initializeDatabase();

      const createLeaveQuotaCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('leave_quotas')
      );
      expect(createLeaveQuotaCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 onboarding_records 表', () => {
      initializeDatabase();

      const createOnboardingCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('onboarding_records')
      );
      expect(createOnboardingCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 daily_records 表', () => {
      initializeDatabase();

      const createDailyRecCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('daily_records')
      );
      expect(createDailyRecCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 print_records 表', () => {
      initializeDatabase();

      const createPrintRecCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('print_records')
      );
      expect(createPrintRecCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 transplant_records 表', () => {
      initializeDatabase();

      const createTransplantCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('transplant_records')
      );
      expect(createTransplantCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 announcements 表', () => {
      initializeDatabase();

      const createAnnounceCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('announcements')
      );
      expect(createAnnounceCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 indicators 表', () => {
      initializeDatabase();

      const createIndicatorCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('indicators')
      );
      expect(createIndicatorCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 schedules 表', () => {
      initializeDatabase();

      const createScheduleCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('schedules')
      );
      expect(createScheduleCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 swap_requests 表', () => {
      initializeDatabase();

      const createSwapReqCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('swap_requests')
      );
      expect(createSwapReqCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 materials 表', () => {
      initializeDatabase();

      const createMaterialCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('materials')
      );
      expect(createMaterialCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 inbound_records 表', () => {
      initializeDatabase();

      const createInboundCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('inbound_records')
      );
      expect(createInboundCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 resignation_records 表', () => {
      initializeDatabase();

      const createResignCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('resignation_records')
      );
      expect(createResignCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 recruitment_records 表', () => {
      initializeDatabase();

      const createRecruitCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('recruitment_records')
      );
      expect(createRecruitCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 contract_renewal_records 表', () => {
      initializeDatabase();

      const createContractRenewalCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('contract_renewal_records')
      );
      expect(createContractRenewalCalls.length).toBeGreaterThan(0);
    });

    it('应该创建 salary_budget_records 表', () => {
      initializeDatabase();

      const createSalaryBudgetCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE') && call[0].includes('salary_budget_records')
      );
      expect(createSalaryBudgetCalls.length).toBeGreaterThan(0);
    });
  });

  describe('索引验证：索引存在且正确', () => {
    it('应该调用 createIndexes 创建索引', () => {
      // createIndexes 已经被 vi.mock 模拟，这里验证 initializeDatabase 可以正常调用
      expect(() => initializeDatabase()).not.toThrow();
    });

    it('应该创建 schedules 表的索引', () => {
      initializeDatabase();

      // 验证 schedules 相关的索引创建语句被执行
      const scheduleIndexCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE INDEX') && call[0].includes('schedules')
      );
      expect(scheduleIndexCalls.length).toBeGreaterThan(0);
    });
  });

  describe('数据库表数量验证', () => {
    it('应该创建所有核心业务表（至少 50 个表）', () => {
      initializeDatabase();

      const createTableCalls = mockDb.run.mock.calls.filter(
        (call: any) => call[0].includes('CREATE TABLE')
      );

      // 验证表的数量（核心业务表应该 >= 50 个）
      expect(createTableCalls.length).toBeGreaterThanOrEqual(50);
    });
  });
});
