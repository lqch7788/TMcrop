/**
 * 种源二维码卡片（v5）— 通过 EntityDetailModal 的 topRight slot 显示
 * 2026-10-18：从 DetailModal.tsx 拆出（纯移动，无逻辑变更）
 * 顶部对齐 Modal 内容区顶部（= 标题栏底部），固定高度覆盖 Tab行+来源行+基本信息标题行
 * 二维码 128×128 + 标题 + 复制按钮垂直排列
 */
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui';

export function SeedSourceQrCodeCard({ seedCode }: { seedCode: string }) {
  // 2026-10-16 修复：路由为 /crop/seed-source（单数，见 App.tsx:513），原 /crop/seed-sources（复数）
  //   不匹配任何路由 → 扫码命中 "No routes matched" 空白页
  const url = `${window.location.origin}/crop/seed-source?seedCode=${encodeURIComponent(seedCode)}`;
  return (
    <div className="flex flex-col items-center gap-1.5 px-2 py-2 bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-200 rounded-lg shadow-sm">
      <div className="bg-white p-1 rounded">
        <QRCodeSVG value={url} size={128} level="M" includeMargin={false} />
      </div>
      <span className="text-xs font-medium text-emerald-800 whitespace-nowrap">扫码查看详情</span>
      <Button
        variant="outline"
        size="sm"
        className="h-6 px-2.5 text-xs"
        onClick={() => {
          navigator.clipboard.writeText(url).then(
            () => alert('链接已复制'),
            () => alert('复制失败，请手动复制')
          );
        }}
      >
        复制链接
      </Button>
    </div>
  );
}
