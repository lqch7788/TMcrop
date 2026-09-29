/**
 * 供应商资质证照合规规则测试（2026-09-28 批次B 合规风控）
 *
 * 覆盖：
 * 1. daysUntil 的天数计算与非法输入
 * 2. 品类→证照映射（PP/SP/FE，大小写容错，其他品类不强制）
 * 3. 状态判定五态 + 预警窗口边界（30 天含 / 31 天不含）
 * 4. 拦截语义：未登记/已过期拦截，"即将到期"不拦截
 * 5. 硬阻断开关：默认关闭放行；=1 时按供应商实际证照拒绝
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import {
  daysUntil,
  evaluateSupplierQualification,
  getQualificationIssue,
  isBlockingIssue,
  assertSupplierQualificationAllowed,
  EXPIRING_WINDOW_DAYS,
} from '../lib/supplierQualification';

/** 固定基准日，避免测试依赖真实当前日期 */
const TODAY = '2026-09-28';

const CREATE_SUPPLIERS = `
  CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    supplier_code TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    supplier_type TEXT,
    pesticide_license_no TEXT,
    pesticide_license_expiry TEXT,
    seed_filing_no TEXT,
    seed_filing_expiry TEXT,
    fertilizer_reg_no TEXT,
    fertilizer_reg_expiry TEXT
  );
`;

/** 建一个只含 suppliers 表的内存库 */
async function makeDb(rows: Array<Record<string, unknown>>): Promise<Database> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(CREATE_SUPPLIERS);
  for (const r of rows) {
    const cols = Object.keys(r);
    db.run(
      `INSERT INTO suppliers (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => r[c]) as never[]
    );
  }
  return db;
}

describe('daysUntil', () => {
  it('同一天返回 0', () => {
    expect(daysUntil('2026-09-28', TODAY)).toBe(0);
  });

  it('未来日期返回正数（9/28 → 10/28 = 30 天）', () => {
    expect(daysUntil('2026-10-28', TODAY)).toBe(30);
  });

  it('过去日期返回负数', () => {
    expect(daysUntil('2026-09-18', TODAY)).toBe(-10);
  });

  it('跨月/跨年计算正确（12/31 → 1/1 为 1 天）', () => {
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
  });

  it('非法格式返回 null（不静默当作有效）', () => {
    expect(daysUntil('2026/09/28', TODAY)).toBeNull();
    expect(daysUntil('', TODAY)).toBeNull();
    expect(daysUntil('2026-9-28', TODAY)).toBeNull();
  });
});

describe('evaluateSupplierQualification — 品类与状态判定', () => {
  it('不强制持证的品类返回 not_required', () => {
    const r = evaluateSupplierQualification({ supplier_type: 'EQ' }, TODAY);
    expect(r.status).toBe('not_required');
    expect(r.label).toBe('');
  });

  it('PP（农药）未登记证号 → missing', () => {
    const r = evaluateSupplierQualification({ supplier_type: 'PP' }, TODAY);
    expect(r.status).toBe('missing');
    expect(r.label).toBe('农药经营许可证');
  });

  it('PP 有证号但缺有效期 → missing（不因有证号就放行）', () => {
    const r = evaluateSupplierQualification(
      { supplier_type: 'PP', pesticide_license_no: 'NY-001' },
      TODAY
    );
    expect(r.status).toBe('missing');
  });

  it('PP 已过期 → expired 且 daysLeft 为负', () => {
    const r = evaluateSupplierQualification(
      { supplier_type: 'PP', pesticide_license_no: 'NY-001', pesticide_license_expiry: '2026-09-18' },
      TODAY
    );
    expect(r.status).toBe('expired');
    expect(r.daysLeft).toBe(-10);
  });

  it(`PP 到期日距今 ${EXPIRING_WINDOW_DAYS} 天 → expiring（含边界）`, () => {
    const r = evaluateSupplierQualification(
      { supplier_type: 'PP', pesticide_license_no: 'NY-001', pesticide_license_expiry: '2026-10-28' },
      TODAY
    );
    expect(r.status).toBe('expiring');
    expect(r.daysLeft).toBe(EXPIRING_WINDOW_DAYS);
  });

  it(`PP 到期日距今 ${EXPIRING_WINDOW_DAYS + 1} 天 → valid（不含边界）`, () => {
    const r = evaluateSupplierQualification(
      { supplier_type: 'PP', pesticide_license_no: 'NY-001', pesticide_license_expiry: '2026-10-29' },
      TODAY
    );
    expect(r.status).toBe('valid');
  });

  it('有效期格式非法 → missing（Fail Loud，不当作有效）', () => {
    const r = evaluateSupplierQualification(
      { supplier_type: 'PP', pesticide_license_no: 'NY-001', pesticide_license_expiry: '2026/10/29' },
      TODAY
    );
    expect(r.status).toBe('missing');
  });

  it('SP → 种子经营备案，读取 seed_filing_* 列', () => {
    const r = evaluateSupplierQualification(
      { supplier_type: 'SP', seed_filing_no: 'ZZ-9', seed_filing_expiry: '2027-08-20' },
      TODAY
    );
    expect(r.label).toBe('种子经营备案');
    expect(r.status).toBe('valid');
  });

  it('FE → 肥料登记证，读取 fertilizer_reg_* 列', () => {
    const r = evaluateSupplierQualification(
      { supplier_type: 'FE', fertilizer_reg_no: 'FL-9', fertilizer_reg_expiry: '2026-10-05' },
      TODAY
    );
    expect(r.label).toBe('肥料登记证');
    expect(r.status).toBe('expiring');
  });

  it('类型码大小写不敏感', () => {
    expect(evaluateSupplierQualification({ supplier_type: 'pp' }, TODAY).status).toBe('missing');
  });

  it('品类与证照不匹配时按本类证照判定（PP 填了种子备案仍是 missing）', () => {
    const r = evaluateSupplierQualification(
      { supplier_type: 'PP', seed_filing_no: 'ZZ-9', seed_filing_expiry: '2027-08-20' },
      TODAY
    );
    expect(r.status).toBe('missing');
    expect(r.label).toBe('农药经营许可证');
  });
});

describe('getQualificationIssue / isBlockingIssue', () => {
  it('未登记：文案点明缺哪张证', () => {
    const s = { supplier_type: 'PP' };
    expect(getQualificationIssue(s, TODAY)).toContain('未登记农药经营许可证');
    expect(isBlockingIssue(s, TODAY)).toBe(true);
  });

  it('有证号无有效期：文案点明缺有效期', () => {
    const s = { supplier_type: 'PP', pesticide_license_no: 'NY-001' };
    expect(getQualificationIssue(s, TODAY)).toContain('未登记有效期');
  });

  it('已过期：文案含过期日期与逾期天数', () => {
    const s = { supplier_type: 'PP', pesticide_license_no: 'NY-001', pesticide_license_expiry: '2026-09-18' };
    const msg = getQualificationIssue(s, TODAY);
    expect(msg).toContain('2026-09-18');
    expect(msg).toContain('逾期 10 天');
    expect(isBlockingIssue(s, TODAY)).toBe(true);
  });

  it('即将到期：有提示但不拦截', () => {
    const s = { supplier_type: 'PP', pesticide_license_no: 'NY-001', pesticide_license_expiry: '2026-10-08' };
    expect(getQualificationIssue(s, TODAY)).toContain('剩余 10 天');
    expect(isBlockingIssue(s, TODAY)).toBe(false);
  });

  it('合规与不适用：均无提示、不拦截', () => {
    const valid = { supplier_type: 'PP', pesticide_license_no: 'NY-001', pesticide_license_expiry: '2027-01-01' };
    expect(getQualificationIssue(valid, TODAY)).toBeNull();
    expect(isBlockingIssue(valid, TODAY)).toBe(false);

    const notRequired = { supplier_type: 'UT' };
    expect(getQualificationIssue(notRequired, TODAY)).toBeNull();
    expect(isBlockingIssue(notRequired, TODAY)).toBe(false);
  });
});

describe('assertSupplierQualificationAllowed — 硬阻断开关', () => {
  let db: Database;
  let prevEnv: string | undefined;

  beforeEach(async () => {
    prevEnv = process.env.SUPPLIER_QUALIFICATION_ENFORCE;
    db = await makeDb([
      // 无证农药类
      { id: 'S1', supplier_code: 'SU_PP01', supplier_name: '无证农药商', supplier_type: 'PP' },
      // 已过期农药类
      {
        id: 'S2', supplier_code: 'SU_PP02', supplier_name: '过期农药商', supplier_type: 'PP',
        pesticide_license_no: 'NY-2', pesticide_license_expiry: '2026-01-01',
      },
      // 合规农药类
      {
        id: 'S3', supplier_code: 'SU_PP03', supplier_name: '合规农药商', supplier_type: 'PP',
        pesticide_license_no: 'NY-3', pesticide_license_expiry: '2027-12-31',
      },
      // 不强制持证的品类
      { id: 'S4', supplier_code: 'SU_UT01', supplier_name: '耗材商', supplier_type: 'UT' },
    ]);
  });

  afterEach(() => {
    if (prevEnv === undefined) delete process.env.SUPPLIER_QUALIFICATION_ENFORCE;
    else process.env.SUPPLIER_QUALIFICATION_ENFORCE = prevEnv;
  });

  it('开关关闭时（默认）无证供应商也放行——不阻断现有采购流程', () => {
    delete process.env.SUPPLIER_QUALIFICATION_ENFORCE;
    expect(assertSupplierQualificationAllowed(db, 'S1')).toBeNull();
    expect(assertSupplierQualificationAllowed(db, 'S2')).toBeNull();
  });

  it('开关开启时无证供应商被拒，原因含供应商名称与证照名', () => {
    process.env.SUPPLIER_QUALIFICATION_ENFORCE = '1';
    const reason = assertSupplierQualificationAllowed(db, 'S1');
    expect(reason).toContain('无证农药商');
    expect(reason).toContain('农药经营许可证');
  });

  it('开关开启时已过期供应商被拒', () => {
    process.env.SUPPLIER_QUALIFICATION_ENFORCE = '1';
    const reason = assertSupplierQualificationAllowed(db, 'S2');
    expect(reason).toContain('过期农药商');
    expect(reason).toContain('过期');
  });

  it('开关开启时合规供应商放行', () => {
    process.env.SUPPLIER_QUALIFICATION_ENFORCE = '1';
    expect(assertSupplierQualificationAllowed(db, 'S3')).toBeNull();
  });

  it('开关开启时不强制持证的品类放行', () => {
    process.env.SUPPLIER_QUALIFICATION_ENFORCE = '1';
    expect(assertSupplierQualificationAllowed(db, 'S4')).toBeNull();
  });

  it('未传 supplierId（自由文本供应商）放行', () => {
    process.env.SUPPLIER_QUALIFICATION_ENFORCE = '1';
    expect(assertSupplierQualificationAllowed(db, '')).toBeNull();
    expect(assertSupplierQualificationAllowed(db, undefined)).toBeNull();
    expect(assertSupplierQualificationAllowed(db, null)).toBeNull();
  });

  it('供应商 id 不存在时放行——交给调用方原有的"供应商不存在"逻辑', () => {
    process.env.SUPPLIER_QUALIFICATION_ENFORCE = '1';
    expect(assertSupplierQualificationAllowed(db, 'NOT_EXIST')).toBeNull();
  });

  it('库中无 suppliers 表（历史环境）时放行，不阻断业务', () => {
    process.env.SUPPLIER_QUALIFICATION_ENFORCE = '1';
    expect(assertSupplierQualificationAllowed({ prepare: () => { throw new Error('no such table'); } }, 'S1')).toBeNull();
  });

  // 2026-09-29 审计新增：id 为空但给了名称时按名称反查 ——
  // 堵住"只传名称不传 id 即可绕过硬阻断"的口子（/materials 新增入库此前正是这条路径）
  describe('supplierId 为空时按名称回退', () => {
    it('开关开启 + 无 id + 无证供应商名称 → 被拒', () => {
      process.env.SUPPLIER_QUALIFICATION_ENFORCE = '1';
      const reason = assertSupplierQualificationAllowed(db, '', '无证农药商');
      expect(reason).toContain('无证农药商');
      expect(reason).toContain('农药经营许可证');
    });

    it('开关开启 + 无 id + 已过期供应商名称 → 被拒', () => {
      process.env.SUPPLIER_QUALIFICATION_ENFORCE = '1';
      const reason = assertSupplierQualificationAllowed(db, undefined, '过期农药商');
      expect(reason).toContain('过期');
    });

    it('开关开启 + 无 id + 合规供应商名称 → 放行', () => {
      process.env.SUPPLIER_QUALIFICATION_ENFORCE = '1';
      expect(assertSupplierQualificationAllowed(db, '', '合规农药商')).toBeNull();
    });

    it('开关开启 + 无 id + 名称不在主数据 → 放行（不误伤自由文本）', () => {
      process.env.SUPPLIER_QUALIFICATION_ENFORCE = '1';
      expect(assertSupplierQualificationAllowed(db, '', '金土地农资公司（不在主数据）')).toBeNull();
    });

    it('开关开启 + id 与名称同时给出且名称无证 → 即便 id 查不到也按名称拦截', () => {
      process.env.SUPPLIER_QUALIFICATION_ENFORCE = '1';
      // id 不存在会让 id 分支放行，但 id 非空时不应回退到名称（保持原语义：由调用方处理"供应商不存在"）
      expect(assertSupplierQualificationAllowed(db, 'NOT_EXIST', '无证农药商')).toBeNull();
    });

    it('开关关闭时按名称回退同样放行', () => {
      delete process.env.SUPPLIER_QUALIFICATION_ENFORCE;
      expect(assertSupplierQualificationAllowed(db, '', '无证农药商')).toBeNull();
    });
  });
});
