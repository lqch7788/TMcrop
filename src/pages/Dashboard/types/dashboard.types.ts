// Dashboard 页面类型定义

// 详情数据类型
export interface GreenhouseDetailData {
  no: string;
  crop: string;
  area: string;
  type: string;
  status: string;
  plantedDate: string;
  expectedHarvest: string;
  manager: string;
  variety?: string;
}

export interface FieldDetailData {
  no: string;
  crop: string;
  area: string;
  fieldType: string;
  status: string;
  plantedDate: string;
  expectedHarvest: string;
  manager: string;
}

export type SelectedDetailType =
  | { type: 'greenhouse'; data: GreenhouseDetailData }
  | { type: 'field'; data: FieldDetailData }
  | null;

// 温室环境数据结构
export interface GreenhouseEnvData {
  id: string;
  name: string;
  lastUpdate: string;
  airTemp: { value: number; unit: string; status: string } | null;
  airHumidity: { value: number; unit: string; status: string } | null;
  light: { value: number; unit: string; status: string } | null;
  co2: { value: number; unit: string; status: string } | null;
  soilTemp: { value: number; unit: string; status: string } | null;
  soilMoisture: { value: number; unit: string; status: string } | null;
  soilEc: { value: number; unit: string; status: string } | null;
  soilPh: { value: number; unit: string; status: string } | null;
}

// Dashboard 组件 Props
export interface DashboardProps {
  // 状态
  activeTab: 'overview' | 'tasks' | 'iot';
  greenhousePage: number;
  greenhousePageSize: number;
  selectedRegion: string;
  isDetailModalOpen: boolean;
  selectedGreenhouse: string | null;
  greenhouseTableExpanded: boolean;
  overviewExpanded: boolean;
  fieldTableExpanded: boolean;
  selectedDetail: SelectedDetailType;
  enlargedImageIndex: number | null;
  yieldRegion: string;
  yieldCrop: string;
  costPeriod: string;
  costCrop: string;
  costAreaType: string;

  // setter
  setActiveTab: (tab: 'overview' | 'tasks' | 'iot') => void;
  setGreenhousePage: (page: number) => void;
  setGreenhousePageSize: (size: number) => void;
  setSelectedRegion: (region: string) => void;
  setIsDetailModalOpen: (open: boolean) => void;
  setSelectedGreenhouse: (id: string | null) => void;
  setGreenhouseTableExpanded: (expanded: boolean) => void;
  setOverviewExpanded: (expanded: boolean) => void;
  setFieldTableExpanded: (expanded: boolean) => void;
  setSelectedDetail: (detail: SelectedDetailType) => void;
  setEnlargedImageIndex: (index: number | null) => void;
  setYieldRegion: (region: string) => void;
  setYieldCrop: (crop: string) => void;
  setCostPeriod: (period: string) => void;
  setCostCrop: (crop: string) => void;
  setCostAreaType: (areaType: string) => void;

  // 计算数据
  greenhouseEnvData: GreenhouseEnvData[];
  totalGreenhousePages: number;
  paginatedGreenhouseData: GreenhouseEnvData[];
  filteredYieldStats: any[];
  filteredCostAnalysis: any[];
  greenhouseList: { id: string; name: string }[];

  // 函数
  handleDetailClick: (greenhouseId: string) => void;
  getCropInfo: (greenhouseId: string) => any;
}
