/**
 * 共享下载工具（2026-07-10 P1-1）
 * 抽自 exporters/csv.ts / xlsx.ts / word.ts 共用的"浏览器下载"逻辑。
 */

export async function triggerDownloadLikeCsv(filename: string, blob: Blob): Promise<void> {
  const anyWin = window as unknown as { showSaveFilePicker?: (opts: any) => Promise<any> };
  if (anyWin.showSaveFilePicker) {
    try {
      const handle = await anyWin.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'File', accept: { [blob.type]: [filename.substring(filename.lastIndexOf('.'))] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch {
      // 用户取消 — 降级
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}