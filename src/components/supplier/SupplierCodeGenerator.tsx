// 供应商编码生成器 —— 内联在「新增供应商」弹窗的供应商编号字段旁
//
// 2026-09-28：从供应商管理页面移入新增弹窗。此前流程是"页面上选大类/中类 → 生成 → 复制 →
// 打开新增弹窗粘贴"，多一步复制粘贴；现在生成后由 onGenerated 直接回填编号字段。
//
// 大类不再单独选择：弹窗里的「供应类型」就是大类（同为 material_code_categories 的
// rule_type='supplier' 大类码），重复选一遍既冗余又可能选出与供应类型不一致的组合。
import { useEffect, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { useSupplierCodeRuleStore } from '@/stores';
import { enhancedApiClient } from '@/lib/apiClient';

interface SupplierCodeGeneratorProps {
  /** 供应类型（大类码，如 SP/FE/PP）；为空时不可生成 */
  bigCategory: string;
  /** 生成成功回调：把编码直接回填到「供应商编号」字段 */
  onGenerated: (code: string) => void;
}

export default function SupplierCodeGenerator({ bigCategory, onGenerated }: SupplierCodeGeneratorProps) {
  // 分类数据与编码规则页同源（规则页改动即时生效）
  const categories = useSupplierCodeRuleStore((s) => s.categories);

  const [midCategory, setMidCategory] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // 切换供应类型时清空中类，避免残留上一个大类下的中类码（会生成错位编码）
  useEffect(() => {
    setMidCategory('');
    setError('');
  }, [bigCategory]);

  const midCategories = bigCategory
    ? categories.find((c) => c.code === bigCategory)?.midCategories || []
    : [];

  /** 调后端生成编码（按前缀 max+1，禁随机；见路由 /suppliers/generate-code） */
  const handleGenerate = async () => {
    setError('');
    if (!bigCategory || !midCategory) {
      setError('请先选择供应类型与中类');
      return;
    }
    setGenerating(true);
    try {
      const res = await enhancedApiClient.get<{ code?: string } | { data?: { code?: string } }>(
        `/suppliers/generate-code?big=${encodeURIComponent(bigCategory)}&mid=${encodeURIComponent(midCategory)}`
      );
      const code = (res as { code?: string })?.code || (res as { data?: { code?: string } })?.data?.code || '';
      if (!code) {
        setError('编码生成失败：后端未返回编码');
        return;
      }
      onGenerated(code);
    } catch (e) {
      setError(`编码生成失败：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full">
      {/* 中类下拉自适应所在网格列宽的剩余空间，生成按钮保持自然宽度 */}
      <div className="flex items-center gap-2">
        <Select
          value={midCategory}
          onValueChange={(val) => { setMidCategory(val); setError(''); }}
          disabled={!bigCategory}
        >
          <SelectTrigger className="flex-1 min-w-0 px-3 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 shadow-inner disabled:bg-gray-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* 空 value 项不可省：ui/Select 把 '' 映射为 sentinel '__all__'（非空），
                Radix 据此认为已选中 → 没有空项时触发器是空白框，placeholder 也不会显示。
                因此未选值时的提示文案写在这个空项上，而不是 SelectValue 的 placeholder。 */}
            <SelectItem value="">{bigCategory ? '请选择中类' : '请先选供应类型'}</SelectItem>
            {midCategories.map((mid) => (
              <SelectItem key={mid.code} value={mid.code}>
                {mid.code}-{mid.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          size="sm"
          className="shrink-0"
          onClick={handleGenerate}
          disabled={!bigCategory || !midCategory || generating}
        >
          <Wand2 className="w-4 h-4" /> {generating ? '生成中…' : '生成编码'}
        </Button>
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
