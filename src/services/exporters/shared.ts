/**
 * 共享下载工具（2026-07-10 P1-1）
 * 抽自 exporters/csv.ts / xlsx.ts / word.ts 共用的"浏览器下载"逻辑。
 */

export async function triggerDownloadLikeCsv(filename: string, blob: Blob): Promise<void> {
  // 2026-07-20：去掉 showSaveFilePicker（弹保存对话框），统一用 a 标签直接下载到默认目录
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}