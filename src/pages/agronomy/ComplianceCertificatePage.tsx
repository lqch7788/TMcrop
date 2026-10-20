/**
 * 承诺达标合格证（P1-3）
 *
 * 依据：《农产品质量安全承诺达标合格证管理办法》（2026-02-01 施行）
 *   - 按生产批次开具
 *   - 二维码须显著标明「承诺达标合格证」字样
 *   - 开具记录留存 ≥6 个月（作废不物理删除）
 *
 * 路由：/agronomy/compliance-certificates
 */
import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Input, Label, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { enhancedApiClient } from '@/lib/apiClient';
import { todayLocal } from '@/lib/dateUtils';

interface CertItem {
  id?: string;
  itemName: string;
  quantity: number;
  unit: string;
  grade?: string;
}

interface Certificate {
  id: string;
  certificateNo: string;
  batchCode: string;
  productName: string;
  quantity: number;
  unit: string;
  origin: string;
  harvestDate: string;
  commitment: string;
  basis: string;
  issuerName: string;
  issuerContact: string;
  issuedAt: string;
  status: string;
  qrContent: string;
  items?: CertItem[];
}

const EMPTY_FORM = {
  batchCode: '',
  productName: '',
  quantity: '',
  unit: 'kg',
  origin: '',
  harvestDate: todayLocal(),
  issuerName: '',
  issuerContact: '',
  basis: '自检合格 / 生产记录完整',
  commitment: '本批次农产品符合农产品质量安全标准，愿承担相应法律责任。',
};

export default function ComplianceCertificatePage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [items, setItems] = useState<CertItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Certificate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await enhancedApiClient.get<Certificate[]>('/compliance-certificates');
      setCerts(Array.isArray(data) ? data : []);
    } catch (e) {
      await showAlert(`加载合格证失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleIssue = async () => {
    if (!form.batchCode.trim() || !form.productName.trim() || !form.issuerName.trim()) {
      await showAlert('批次号、品名、承诺主体为必填项');
      return;
    }
    setSaving(true);
    try {
      await enhancedApiClient.post('/compliance-certificates', {
        batchCode: form.batchCode.trim(),
        productName: form.productName.trim(),
        quantity: Number(form.quantity) || 0,
        unit: form.unit,
        origin: form.origin,
        harvestDate: form.harvestDate,
        issuerName: form.issuerName.trim(),
        issuerContact: form.issuerContact,
        basis: form.basis,
        commitment: form.commitment,
        items: items.filter((i) => i.itemName.trim()),
      });
      await showAlert('合格证已开具');
      setForm({ ...EMPTY_FORM });
      setItems([]);
      await load();
    } catch (e) {
      await showAlert(`开具失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleVoid = async (cert: Certificate) => {
    const reason = prompt('请输入作废原因（≥6 个字符）：');
    if (reason === null) return;
    if (reason.trim().length < 6) {
      await showAlert('作废原因至少 6 个字符');
      return;
    }
    try {
      await enhancedApiClient.post(`/compliance-certificates/${cert.id}/void`, { reason: reason.trim() });
      await showAlert('已作废（记录保留，不物理删除）');
      await load();
    } catch (e) {
      await showAlert(`作废失败：${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-900">承诺达标合格证</h2>
        <p className="text-xs text-gray-500 mt-1">
          按生产批次开具；二维码含「承诺达标合格证」字样；开具记录留存不少于 6 个月，作废不删除。
        </p>
      </div>

      {/* 开具表单 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">开具新证</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-gray-600">批次号 <span className="text-red-500">*</span></Label>
            <Input value={form.batchCode} onChange={(e) => setForm({ ...form, batchCode: e.target.value })} placeholder="种植批次号，如 ZZ20261016-001" className="h-9" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">品名 <span className="text-red-500">*</span></Label>
            <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="如 葡萄" className="h-9" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">数量 / 单位</Label>
            <div className="flex gap-2">
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="数量" className="h-9" />
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="单位" className="h-9 w-20" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-gray-600">产地</Label>
            <Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="如 宁波北仑基地" className="h-9" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">收获日期</Label>
            <Input type="date" value={form.harvestDate} onChange={(e) => setForm({ ...form, harvestDate: e.target.value })} className="h-9" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">承诺主体 <span className="text-red-500">*</span></Label>
            <Input value={form.issuerName} onChange={(e) => setForm({ ...form, issuerName: e.target.value })} placeholder="生产主体名称" className="h-9" />
          </div>
          <div>
            <Label className="text-xs text-gray-600">联系方式</Label>
            <Input value={form.issuerContact} onChange={(e) => setForm({ ...form, issuerContact: e.target.value })} placeholder="电话" className="h-9" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs text-gray-600">承诺依据</Label>
            <Input value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value })} className="h-9" />
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs text-gray-600">承诺事项</Label>
            <Input value={form.commitment} onChange={(e) => setForm({ ...form, commitment: e.target.value })} className="h-9" />
          </div>
        </div>

        {/* 明细 */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">分项明细（可选）</span>
            <Button size="sm" variant="secondary" onClick={() => setItems([...items, { itemName: '', quantity: 0, unit: 'kg' }])}>
              添加分项
            </Button>
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <Input value={it.itemName} onChange={(e) => { const n = [...items]; n[idx] = { ...it, itemName: e.target.value }; setItems(n); }} placeholder="品名" className="h-9" />
              <Input type="number" value={it.quantity} onChange={(e) => { const n = [...items]; n[idx] = { ...it, quantity: Number(e.target.value) || 0 }; setItems(n); }} placeholder="数量" className="h-9 w-24" />
              <Input value={it.unit} onChange={(e) => { const n = [...items]; n[idx] = { ...it, unit: e.target.value }; setItems(n); }} placeholder="单位" className="h-9 w-20" />
              <Input value={it.grade ?? ''} onChange={(e) => { const n = [...items]; n[idx] = { ...it, grade: e.target.value }; setItems(n); }} placeholder="等级" className="h-9 w-24" />
              <Button size="sm" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}>删除</Button>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Button onClick={handleIssue} disabled={saving}>{saving ? '开具中…' : '开具合格证'}</Button>
        </div>
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">已开具（{certs.length}）</h3>
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">加载中…</p>
        ) : certs.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">暂无合格证</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>合格证编号</TableHead>
                <TableHead>批次号</TableHead>
                <TableHead>品名</TableHead>
                <TableHead>数量</TableHead>
                <TableHead>承诺主体</TableHead>
                <TableHead>开具时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.certificateNo}</TableCell>
                  <TableCell className="font-mono text-xs">{c.batchCode}</TableCell>
                  <TableCell>{c.productName}</TableCell>
                  <TableCell>{c.quantity}{c.unit}</TableCell>
                  <TableCell>{c.issuerName}</TableCell>
                  <TableCell className="text-xs">{new Date(c.issuedAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={c.status === 'voided' ? 'text-red-600' : 'text-green-600'}>
                      {c.status === 'voided' ? '已作废' : '有效'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setPreview(c)}>查看</Button>
                    {c.status !== 'voided' && (
                      <Button size="sm" variant="ghost" onClick={() => handleVoid(c)}>作废</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 预览（含真实二维码） */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPreview(null)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-[520px]">
            <h3 className="text-lg font-bold text-center mb-1">承诺达标合格证</h3>
            <p className="text-center text-xs text-gray-500 mb-4">{preview.certificateNo}</p>
            <div className="flex gap-4">
              <div className="flex-1 text-sm space-y-1">
                <p><span className="text-gray-500">品名：</span>{preview.productName}</p>
                <p><span className="text-gray-500">批次：</span><span className="font-mono">{preview.batchCode}</span></p>
                <p><span className="text-gray-500">数量：</span>{preview.quantity}{preview.unit}</p>
                <p><span className="text-gray-500">产地：</span>{preview.origin || '-'}</p>
                <p><span className="text-gray-500">收获日期：</span>{preview.harvestDate || '-'}</p>
                <p><span className="text-gray-500">承诺主体：</span>{preview.issuerName}</p>
                <p><span className="text-gray-500">联系方式：</span>{preview.issuerContact || '-'}</p>
                <p><span className="text-gray-500">承诺依据：</span>{preview.basis}</p>
                <p className="text-xs text-gray-600 mt-2">{preview.commitment}</p>
              </div>
              <div className="flex flex-col items-center">
                <QRCodeSVG value={preview.qrContent} size={130} />
                <p className="text-[10px] text-gray-500 mt-1">扫码查看承诺达标合格证</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPreview(null)}>关闭</Button>
              <Button onClick={() => window.print()}>打印</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
