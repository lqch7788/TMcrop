/**
 * 前端一键导出 LocalStorage 为 JSON（用于数据迁移）
 */

export function exportLocalStorage(): string {
  const keys = [
    'crop_seed_sources',
    'crop_seedlings',
    'crop_plantings',
    'harvest_records',
    'crop_instances',
    'crop_orders',
    'crop_varieties',
  ];
  const data: Record<string, unknown> = {};
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
  }
  // 统一转换为迁移脚本期望的格式
  const exportData = {
    seedSources: data['crop_seed_sources'] || [],
    seedlings: data['crop_seedlings'] || [],
    plantings: data['crop_plantings'] || [],
    harvests: data['harvest_records'] || [],
    cropInstances: data['crop_instances'] || [],
    cropOrders: data['crop_orders'] || [],
    cropVarieties: data['crop_varieties'] || [],
  };
  return JSON.stringify(exportData, null, 2);
}

export function downloadExport() {
  const json = exportLocalStorage();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tm-crop-localstorage-export-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}
