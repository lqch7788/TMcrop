/**
 * 承诺达标合格证 API（P1-3）
 *
 * 依据：《农产品质量安全承诺达标合格证管理办法》（2026-02-01 施行）
 *   - 第 8 条：按生产批次开具，并做好开具记录
 *   - 第 14 条：内容含承诺事项、承诺依据、品名、数量、产地、开具时间、承诺主体、联系方式
 *   - 二维码须显著标明「承诺达标合格证」字样，可与追溯标签整合
 *   - 开具记录留存 ≥ 6 个月
 *
 * 端点：
 *   GET    /api/compliance-certificates?batch_code=xxx&status=active
 *   GET    /api/compliance-certificates/:id
 *   POST   /api/compliance-certificates          开具
 *   POST   /api/compliance-certificates/:id/void 作废（不物理删除，留存）
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/index';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 合格证编号：HGB{YYYYMMDD}-{4 位当日序号}（禁止随机数，业务编码需可复现） */
function generateCertificateNo(db: any): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const prefix = `HGB${dateStr}-`;
  let seq = 1;
  try {
    const rows = db.exec(
      `SELECT certificate_no FROM compliance_certificates
       WHERE certificate_no LIKE ? ORDER BY certificate_no DESC LIMIT 1`,
      [`${prefix}%`]
    );
    const last = rows?.[0]?.values?.[0]?.[0];
    if (last) {
      const tail = Number(String(last).split('-').pop());
      if (Number.isFinite(tail)) seq = tail + 1;
    }
  } catch {
    // 表刚建时查询失败，从 1 开始
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/** 列表 */
router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDatabase();
    const { batch_code, status } = req.query as Record<string, string | undefined>;
    const wheres: string[] = [];
    const params: unknown[] = [];
    if (batch_code) { wheres.push('batch_code = ?'); params.push(batch_code); }
    if (status) { wheres.push('status = ?'); params.push(status); }
    const whereSql = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

    const certs = queryToObjects<Record<string, unknown>>(
      db,
      `SELECT * FROM compliance_certificates ${whereSql} ORDER BY issued_at DESC LIMIT 500`,
      params
    );

    // 附带明细
    if (certs.length > 0) {
      const ids = certs.map((c) => String(c.id));
      const items = queryToObjects<Record<string, unknown>>(
        db,
        `SELECT * FROM compliance_certificate_items WHERE certificate_id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      const byCert = new Map<string, Array<Record<string, unknown>>>();
      for (const it of items) {
        const key = String(it.certificateId ?? it.certificate_id ?? '');
        if (!byCert.has(key)) byCert.set(key, []);
        byCert.get(key)!.push(it);
      }
      for (const c of certs) c.items = byCert.get(String(c.id)) ?? [];
    }

    res.json({ success: true, data: certs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[compliance-certificate] 列表失败:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/** 详情 */
router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDatabase();
    const certs = queryToObjects<Record<string, unknown>>(
      db,
      'SELECT * FROM compliance_certificates WHERE id = ?',
      [req.params.id]
    );
    if (certs.length === 0) {
      res.status(404).json({ success: false, error: '合格证不存在' });
      return;
    }
    certs[0].items = queryToObjects<Record<string, unknown>>(
      db,
      'SELECT * FROM compliance_certificate_items WHERE certificate_id = ?',
      [req.params.id]
    );
    res.json({ success: true, data: certs[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[compliance-certificate] 详情失败:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * 开具合格证
 * body: { batchCode, productName, quantity, unit, origin, harvestDate,
 *         commitment?, basis?, issuerName, issuerContact,
 *         items?: [{ itemName, quantity, unit, grade }] }
 */
router.post('/', (req: Request, res: Response): void => {
  try {
    const b = req.body as Record<string, unknown>;
    const pick = (...keys: string[]): unknown => {
      for (const k of keys) {
        if (b[k] !== undefined && b[k] !== null) return b[k];
      }
      return undefined;
    };

    const batchCode = String(pick('batchCode', 'batch_code') ?? '').trim();
    const productName = String(pick('productName', 'product_name') ?? '').trim();
    const issuerName = String(pick('issuerName', 'issuer_name') ?? '').trim();
    if (!batchCode || !productName || !issuerName) {
      res.status(400).json({ success: false, error: '批次号、品名、承诺主体为必填项' });
      return;
    }

    const db = getDatabase();
    const id = `HGB_${Date.now()}`;
    const certificateNo = String(pick('certificateNo', 'certificate_no') ?? '') || generateCertificateNo(db);
    const now = new Date().toISOString();

    const qty = Number(pick('quantity') ?? 0) || 0;
    const unit = String(pick('unit') ?? '');
    const origin = String(pick('origin') ?? '');
    const harvestDate = String(pick('harvestDate', 'harvest_date') ?? '');
    const certType = String(pick('certType', 'cert_type') ?? 'commitment');
    const commitment = String(pick('commitment') ?? '本批次农产品符合农产品质量安全标准，愿承担相应法律责任。');
    const basis = String(pick('basis') ?? '自检合格 / 生产记录完整');
    const issuerContact = String(pick('issuerContact', 'issuer_contact') ?? '');

    // 二维码内容：法规要求显著标明「承诺达标合格证」字样
    const qrPayload = {
      title: '承诺达标合格证',
      certificateNo,
      batchCode,
      productName,
      quantity: qty,
      unit,
      origin,
      harvestDate,
      issuerName,
      issuerContact,
      issuedAt: now,
    };
    const qrContent = JSON.stringify(qrPayload);

    db.exec('BEGIN IMMEDIATE');
    try {
      db.run(
        `INSERT INTO compliance_certificates (
          id, certificate_no, batch_code, product_name, quantity, unit, origin, harvest_date,
          cert_type, commitment, basis, issuer_name, issuer_contact, issued_at, qr_content,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
          id, certificateNo, batchCode, productName, qty, unit, origin, harvestDate,
          certType, commitment, basis, issuerName, issuerContact, now, qrContent,
          now, now,
        ]
      );

      const items = Array.isArray(b.items) ? (b.items as Array<Record<string, unknown>>) : [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        db.run(
          `INSERT INTO compliance_certificate_items (id, certificate_id, item_name, quantity, unit, grade)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            `HGBI_${Date.now()}_${i}`,
            id,
            String(it.itemName ?? it.item_name ?? ''),
            Number(it.quantity ?? 0) || 0,
            String(it.unit ?? ''),
            String(it.grade ?? ''),
          ]
        );
      }
      db.exec('COMMIT');
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch { /* 不掩盖原异常 */ }
      throw e;
    }

    saveDatabase();
    res.status(201).json({
      success: true,
      data: { id, certificateNo, qrContent },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[compliance-certificate] 开具失败:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/** 作废（不物理删除，留存 ≥6 个月） */
router.post('/:id/void', (req: Request, res: Response): void => {
  try {
    const b = req.body as Record<string, unknown>;
    const reason = String(b.reason ?? '');
    const operator = String(b.operatorId ?? b.operator_id ?? '');
    if (!reason.trim()) {
      res.status(400).json({ success: false, error: '作废原因必填' });
      return;
    }

    const db = getDatabase();
    const exists = queryToObjects<Record<string, unknown>>(
      db,
      "SELECT id, status FROM compliance_certificates WHERE id = ?",
      [req.params.id]
    );
    if (exists.length === 0) {
      res.status(404).json({ success: false, error: '合格证不存在' });
      return;
    }
    if (exists[0].status === 'voided') {
      res.status(409).json({ success: false, error: '该合格证已作废' });
      return;
    }

    const now = new Date().toISOString();
    db.run(
      `UPDATE compliance_certificates
       SET status = 'voided', voided_at = ?, voided_by = ?, void_reason = ?, updated_at = ?
       WHERE id = ?`,
      [now, operator || null, reason, now, req.params.id]
    );
    saveDatabase();
    res.json({ success: true, data: { id: req.params.id, voidedAt: now } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[compliance-certificate] 作废失败:', message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
