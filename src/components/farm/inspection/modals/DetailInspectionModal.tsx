import { Modal } from '../../../ui/Modal';

// 巡查记录类型
interface InspectionRecord {
  id: string;
  recordCode: string;
  inspectionType?: 'farm' | 'equipment' | 'infrastructure' | 'other';
  inspectorName: string;
  greenhouseName?: string;
  cropName?: string;
  equipmentName?: string;
  infrastructureName?: string;
  remarks?: string;
  checkDate: string;
  weather: string;
  temperature: number;
  humidity: number;
  issues: string[];
  images?: string[];
  status: string;
  issueStatus?: 'pending' | 'processing' | 'resolved';
  cropStatus?: string;
  plantHeight?: number;
  leafCount?: number;
  duration?: number;
  airTemperature?: number;
  airHumidity?: number;
  lightIntensity?: number;
  co2Concentration?: number;
  soilTemperature?: number;
  soilMoisture?: number;
  soilEc?: number;
  soilPh?: number;
}

interface DetailInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: InspectionRecord | null;
}

// 获取状态标签组件
function getStatusBadge(status: string) {
  switch (status) {
    case 'normal':
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">正常</span>;
    case 'warning':
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">注意</span>;
    case 'attention':
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">需关注</span>;
    case 'critical':
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">异常</span>;
    default:
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">未知</span>;
  }
}

/**
 * 巡查记录详情弹窗组件
 */
export function DetailInspectionModal({ isOpen, onClose, record }: DetailInspectionModalProps) {
  if (!record) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="记录详情" size="lg">
      <div className="space-y-6">
        {/* 巡查类型标签 */}
        <div className="flex items-center gap-2">
          {record.inspectionType === 'farm' && (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">种植区域巡查</span>
          )}
          {record.inspectionType === 'equipment' && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">设备保养巡查</span>
          )}
          {record.inspectionType === 'infrastructure' && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">基础设施巡检</span>
          )}
          {!record.inspectionType && (
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">传统巡查</span>
          )}
        </div>

        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">巡查人员</span>
            <span className="text-sm font-medium text-gray-900">{record.inspectorName}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">巡查区域</span>
            <span className="text-sm font-medium text-gray-900">{record.greenhouseName}</span>
          </div>

          {/* 种植区域特有 */}
          {record.inspectionType === 'farm' && (
            <>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">作物名称</span>
                <span className="text-sm font-medium text-gray-900">{record.cropName}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">作物状态</span>
                <span className="text-sm font-medium text-gray-900">{record.cropStatus}</span>
              </div>
              {record.plantHeight && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">株高</span>
                  <span className="text-sm font-medium text-gray-900">{record.plantHeight} cm</span>
                </div>
              )}
              {record.leafCount && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">叶片数</span>
                  <span className="text-sm font-medium text-gray-900">{record.leafCount} 片</span>
                </div>
              )}
            </>
          )}

          {/* 设备保养特有 */}
          {record.inspectionType === 'equipment' && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">设备名称</span>
              <span className="text-sm font-medium text-gray-900">{record.equipmentName}</span>
            </div>
          )}

          {/* 基础设施巡检特有 */}
          {record.inspectionType === 'infrastructure' && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">设施名称</span>
              <span className="text-sm font-medium text-gray-900">{record.infrastructureName}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">巡查日期</span>
            <span className="text-sm font-medium text-gray-900">{record.checkDate}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">天气</span>
            <span className="text-sm font-medium text-gray-900">{record.weather}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">温度</span>
            <span className="text-sm font-medium text-gray-900">{record.temperature}°C</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">湿度</span>
            <span className="text-sm font-medium text-gray-900">{record.humidity}%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">状态</span>
            {getStatusBadge(record.status)}
          </div>
          {record.issueStatus && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">问题处理</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                record.issueStatus === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                record.issueStatus === 'processing' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {record.issueStatus === 'resolved' ? '已解决' :
                 record.issueStatus === 'processing' ? '处理中' : '待处理'}
              </span>
            </div>
          )}
          {record.duration && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">巡检时长</span>
              <span className="text-sm font-medium text-gray-900">{record.duration} 分钟</span>
            </div>
          )}
        </div>

        {/* 生长环境参数 - 仅种植区域显示 */}
        {record.inspectionType === 'farm' && (record.airTemperature || record.soilTemperature) && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">生长环境参数</h4>
            <div className="grid grid-cols-2 gap-6">
              {/* 空气环境参数 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-300">空气环境参数</h5>
                <div className="space-y-3">
                  {record.airTemperature && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">空气温度</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.airTemperature}°C</span>
                    </div>
                  )}
                  {record.airHumidity && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">空气湿度</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.airHumidity}%</span>
                    </div>
                  )}
                  {record.lightIntensity && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">光照强度</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.lightIntensity} Lux</span>
                    </div>
                  )}
                  {record.co2Concentration && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">CO2浓度</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.co2Concentration} ppm</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 土壤环境参数 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-300">土壤环境参数</h5>
                <div className="space-y-3">
                  {record.soilTemperature && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">土壤温度</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.soilTemperature}°C</span>
                    </div>
                  )}
                  {record.soilMoisture && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">土壤湿度</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.soilMoisture}%</span>
                    </div>
                  )}
                  {record.soilEc && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">土壤EC值</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.soilEc} mS/cm</span>
                    </div>
                  )}
                  {record.soilPh && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">土壤PH值</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{record.soilPh}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 发现问题 */}
        {record.issues && record.issues.length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">发现问题</h4>
            <div className="flex gap-2 flex-wrap">
              {record.issues.map((issue: string, idx: number) => (
                <span key={idx} className="px-3 py-1.5 bg-red-50 text-red-700 text-sm rounded-full">{issue}</span>
              ))}
            </div>
          </div>
        )}

        {/* 问题照片 */}
        {record.images && record.images.length > 0 && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">问题照片 (最多6张)</h4>
            <div className="grid grid-cols-3 gap-3">
              {record.images.slice(0, 6).map((img: string, idx: number) => (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={img} alt={`问题照片${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 备注 */}
        {record.remarks && (
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-3">备注</h4>
            <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{record.remarks}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default DetailInspectionModal;
