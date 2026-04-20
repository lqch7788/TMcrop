/**
 * 物料入库页面
 * 从 WarehouseMaterialsPage 拆分出来，专注物料入库操作
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Pencil, Trash2 } from 'lucide-react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { InboundRecord, InboundMaterial } from '../../components/warehouse/MaterialInboundTab';
import { InboundDetailModal, InboundEditModal, InboundAddModal, InboundDeleteConfirmModal, InboundBatchEditModal, InboundExportModal } from '../../components/warehouse/InboundModals';
import PageHeader from '../../components/warehouse/PageHeader';

const categoryConfig: Record<string, { name: string; categories: Record<string, { name: string; subCategories: Record<string, { name: string; prefix: string }> }> }> = {
  'SP': { name: '生产投入类', categories: {
    '01': { name: '种质资源', subCategories: {
      '01': { name: '粮食作物种子', prefix: 'SP0101' },
      '02': { name: '经济作物种子', prefix: 'SP0102' },
      '03': { name: '蔬菜种子', prefix: 'SP0103' },
      '04': { name: '蔬菜种苗', prefix: 'SP0104' },
      '05': { name: '水果苗木种苗', prefix: 'SP0105' },
      '06': { name: '水果苗木种子', prefix: 'SP0106' },
      '07': { name: '花卉与观赏植物', prefix: 'SP0107' },
      '08': { name: '食用菌菌种', prefix: 'SP0108' },
      '99': { name: '其他种质资源', prefix: 'SP0199' },
    }},
    '02': { name: '肥料与土壤改良剂', subCategories: {
      '01': { name: '有机肥', prefix: 'SP0201' },
      '02': { name: '化学肥料', prefix: 'SP0202' },
      '03': { name: '水溶肥', prefix: 'SP0203' },
      '04': { name: '叶面肥', prefix: 'SP0204' },
      '05': { name: '微生物菌剂', prefix: 'SP0205' },
      '06': { name: '土壤调理剂', prefix: 'SP0206' },
      '07': { name: '育苗基质', prefix: 'SP0207' },
      '99': { name: '其他类型', prefix: 'SP0299' },
    }},
    '03': { name: '农药与植保产品', subCategories: {
      '01': { name: '杀虫剂', prefix: 'SP0301' },
      '02': { name: '杀菌剂', prefix: 'SP0302' },
      '03': { name: '杀螨剂', prefix: 'SP0303' },
      '04': { name: '除草剂', prefix: 'SP0304' },
      '05': { name: '植物生长调节剂', prefix: 'SP0305' },
      '06': { name: '物理防控用品', prefix: 'SP0306' },
      '07': { name: '生物农药', prefix: 'SP0307' },
      '99': { name: '其他类型', prefix: 'SP0399' },
    }},
  }},
  'EQ': { name: '设施与装备类', categories: {
    '01': { name: '农业机械', subCategories: {
      '01': { name: '耕作机械', prefix: 'EQ0101' },
      '02': { name: '播种/移栽设备', prefix: 'EQ0102' },
      '03': { name: '植保机械', prefix: 'EQ0103' },
      '04': { name: '收获机械', prefix: 'EQ0104' },
      '05': { name: '初加工设备', prefix: 'EQ0105' },
      '99': { name: '其他相关机械', prefix: 'EQ0199' },
    }},
    '02': { name: '设施农业系统', subCategories: {
      '01': { name: '骨架结构材料', prefix: 'EQ0201' },
      '02': { name: '覆盖材料', prefix: 'EQ0202' },
      '03': { name: '通风降温设备', prefix: 'EQ0203' },
      '04': { name: '加温设备', prefix: 'EQ0204' },
      '05': { name: '补光系统', prefix: 'EQ0205' },
      '06': { name: '自动化控制设备', prefix: 'EQ0206' },
      '99': { name: '其他相关设施设备', prefix: 'EQ0299' },
    }},
    '03': { name: '灌溉与水肥系统', subCategories: {
      '01': { name: '水源与泵站', prefix: 'EQ0301' },
      '02': { name: '水肥一体机', prefix: 'EQ0302' },
      '03': { name: '输水管网', prefix: 'EQ0303' },
      '04': { name: '过滤系统', prefix: 'EQ0304' },
      '05': { name: '施肥装置', prefix: 'EQ0305' },
      '06': { name: '灌溉终端', prefix: 'EQ0306' },
      '99': { name: '其他相关灌溉系统设备', prefix: 'EQ0399' },
    }},
  }},
  'OP': { name: '作业支持类', categories: {
    '01': { name: '劳保与防护用品', subCategories: {
      '01': { name: '手部防护', prefix: 'OP0101' },
      '02': { name: '足部防护', prefix: 'OP0102' },
      '03': { name: '身体防护', prefix: 'OP0103' },
      '04': { name: '呼吸/眼部防护', prefix: 'OP0104' },
      '05': { name: '防晒防暑用品', prefix: 'OP0105' },
      '99': { name: '其他劳保防护类', prefix: 'OP0199' },
    }},
    '02': { name: '日常劳动工具', subCategories: {
      '01': { name: '手动农具', prefix: 'OP0201' },
      '02': { name: '修剪工具', prefix: 'OP0202' },
      '03': { name: '小型电动工具', prefix: 'OP0203' },
      '04': { name: '清洁工具', prefix: 'OP0204' },
      '05': { name: '小型运输车', prefix: 'OP0205' },
      '99': { name: '其他劳动工具', prefix: 'OP0299' },
    }},
    '03': { name: '标识与记录用品', subCategories: {
      '01': { name: '田间标牌/标签', prefix: 'OP0301' },
      '02': { name: '记录本、记号笔', prefix: 'OP0302' },
      '03': { name: '二维码/RFID标签', prefix: 'OP0303' },
      '99': { name: '其他标识记录用品', prefix: 'OP0399' },
    }},
  }},
  'PH': { name: '采后处理与流通类', categories: {
    '01': { name: '采收容器', subCategories: {
      '01': { name: '塑料周转箱', prefix: 'PH0101' },
      '02': { name: '采摘篮/筐', prefix: 'PH0102' },
      '03': { name: '吨袋/编织袋', prefix: 'PH0103' },
      '04': { name: '包装材料', prefix: 'PH0104' },
      '05': { name: '纸箱', prefix: 'PH0105' },
      '06': { name: '泡沫网套/隔板', prefix: 'PH0106' },
      '07': { name: '胶带、封口耗材', prefix: 'PH0107' },
      '08': { name: '商品标签/追溯标签', prefix: 'PH0108' },
      '99': { name: '其他采收材料', prefix: 'PH0199' },
    }},
    '02': { name: '冷链与仓储设备', subCategories: {
      '01': { name: '预冷库/冷藏库', prefix: 'PH0201' },
      '02': { name: '冷藏运输设备', prefix: 'PH0202' },
      '03': { name: '保温箱、冰袋', prefix: 'PH0203' },
      '99': { name: '其他', prefix: 'PH0299' },
    }},
  }},
  'IT': { name: '数字化与管理类', categories: {
    '01': { name: '监测设备', subCategories: {
      '01': { name: '空气/土壤/光照等传感器', prefix: 'IT0101' },
      '02': { name: '手持检测类设备', prefix: 'IT0102' },
      '03': { name: '气象站', prefix: 'IT0103' },
      '04': { name: '虫情测报灯', prefix: 'IT0104' },
      '05': { name: '视频监控设备', prefix: 'IT0105' },
      '99': { name: '其他检测相关设备', prefix: 'IT0199' },
    }},
    '02': { name: '控制设备', subCategories: {
      '01': { name: '环境参数感知设备', prefix: 'IT0201' },
      '02': { name: '执行控制设备', prefix: 'IT0202' },
      '03': { name: '人机交互与本地操作设备', prefix: 'IT0203' },
      '04': { name: '通信与联网设备', prefix: 'IT0204' },
      '05': { name: '电源与辅助控制设备', prefix: 'IT0205' },
      '99': { name: '其他相关控制设备', prefix: 'IT0299' },
    }},
    '03': { name: '软件与服务', subCategories: {
      '01': { name: 'ERP模块许可', prefix: 'IT0301' },
      '02': { name: '温室大棚控制系统web', prefix: 'IT0302' },
      '03': { name: '温室大棚控制系统小程序', prefix: 'IT0303' },
      '04': { name: '数据分析服务', prefix: 'IT0304' },
      '05': { name: '产品检测服务', prefix: 'IT0305' },
      '99': { name: '其他软件与服务', prefix: 'IT0399' },
    }},
  }},
  'EC': { name: '能源与通用耗材', categories: {
    '01': { name: '能源类', subCategories: {
      '01': { name: '柴油/汽油', prefix: 'EC0101' },
      '02': { name: '电力', prefix: 'EC0102' },
      '03': { name: '太阳能板及配件', prefix: 'EC0103' },
      '99': { name: '其他能源类', prefix: 'EC0199' },
    }},
    '02': { name: '通用耗材', subCategories: {
      '01': { name: '电线、电缆', prefix: 'EC0201' },
      '02': { name: '扎带、螺丝、密封胶', prefix: 'EC0202' },
      '03': { name: '电池', prefix: 'EC0203' },
      '04': { name: '润滑油、润滑脂', prefix: 'EC0204' },
      '99': { name: '其他耗材', prefix: 'EC0299' },
    }},
  }},
  'OT': { name: '其他类', categories: {
    '01': { name: '未分类资材', subCategories: {
      '01': { name: '其他未分类资材', prefix: 'OT0101' },
    }},
  }},
};

const bigCategoriesList = [
  { code: 'SP', name: '生产投入类' },
  { code: 'EQ', name: '设施与装备类' },
  { code: 'OP', name: '作业支持类' },
  { code: 'PH', name: '采后处理与流通类' },
  { code: 'IT', name: '数字化与管理类' },
  { code: 'EC', name: '能源与通用耗材' },
  { code: 'OT', name: '其他类' },
];

const initialInboundRecords: InboundRecord[] = [
  {
    id: 1,
    code: 'RK20260401-001',
    inboundDate: '2026-04-01',
    supplier: '鑫源农资公司',
    operator: '张伟',
    status: 'pending',
    materials: [
      { id: 1, materialCode: 'SP0103001', materialName: '番茄种子', category: '种质资源-蔬菜种子', bigCategory: '生产投入类', midCategory: '种质资源', subCategory: '蔬菜种子', specification: '10g/袋', barcode: '6932456789014', unit: '袋', quantity: 100, price: '25', supplier: '鑫源农资公司', location: 'A-03', batchNo: 'PC20260305', productionDate: '2026-02-20', expiryDate: '2026-08-20', remarks: '' },
      { id: 2, materialCode: 'SP0101001', materialName: '水稻种子', category: '种质资源-粮食作物种子', bigCategory: '生产投入类', midCategory: '种质资源', subCategory: '粮食作物种子', specification: '25kg/袋', barcode: '6932456789012', unit: '袋', quantity: 200, price: '30', supplier: '鑫源农资公司', location: 'A-01', batchNo: 'PC20260301', productionDate: '2026-01-15', expiryDate: '2027-01-15', remarks: '' },
    ]
  },
  {
    id: 2,
    code: 'RK20260328-002',
    inboundDate: '2026-03-28',
    supplier: '丰达化肥厂',
    operator: '李明',
    status: 'pending',
    materials: [
      { id: 3, materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂-有机肥', bigCategory: '生产投入类', midCategory: '肥料与土壤改良剂', subCategory: '有机肥', specification: '40kg/袋', barcode: '6932456789015', unit: '袋', quantity: 50, price: '45', supplier: '丰达化肥厂', location: 'B-01', batchNo: 'PC20260110', productionDate: '2026-01-10', expiryDate: '2026-07-10', remarks: '' },
      { id: 4, materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂-化学肥料', bigCategory: '生产投入类', midCategory: '肥料与土壤改良剂', subCategory: '化学肥料', specification: '50kg/袋', barcode: '6932456789016', unit: '袋', quantity: 150, price: '80', supplier: '丰达化肥厂', location: 'B-02', batchNo: 'PC20260228', productionDate: '2026-02-28', expiryDate: '2028-02-28', remarks: '' },
    ]
  },
  {
    id: 3,
    code: 'RK20260325-003',
    inboundDate: '2026-03-25',
    supplier: '绿叶农业用品店',
    operator: '王建',
    status: 'pending',
    materials: [
      { id: 5, materialCode: 'SP0302001', materialName: '多菌灵', category: '农药与植保产品-杀菌剂', bigCategory: '生产投入类', midCategory: '农药与植保产品', subCategory: '杀菌剂', specification: '200g/瓶', barcode: '6932456789018', unit: '瓶', quantity: 20, price: '150', supplier: '绿叶农业用品店', location: 'C-02', batchNo: 'PC20251120', productionDate: '2025-11-20', expiryDate: '2027-11-20', remarks: '' },
      { id: 6, materialCode: 'SP0301001', materialName: '吡虫啉', category: '农药与植保产品-杀虫剂', bigCategory: '生产投入类', midCategory: '农药与植保产品', subCategory: '杀虫剂', specification: '100g/瓶', barcode: '6932456789017', unit: '瓶', quantity: 30, price: '120', supplier: '绿叶农业用品店', location: 'C-01', batchNo: 'PC20251215', productionDate: '2025-12-15', expiryDate: '2027-12-15', remarks: '' },
    ]
  },
  {
    id: 4,
    code: 'RK20260311-004',
    inboundDate: '2026-03-11',
    supplier: '劳保用品商店',
    operator: '李明',
    status: 'pending',
    materials: [
      { id: 7, materialCode: 'OP0102001', materialName: '劳保胶靴', category: '劳保与防护用品-足部防护', bigCategory: '作业支持类', midCategory: '劳保与防护用品', subCategory: '足部防护', specification: '39-43码', barcode: '6932456789021', unit: '双', quantity: 40, price: '35', supplier: '劳保用品商店', location: 'F-01', batchNo: 'OP20260201', productionDate: '2026-02-01', expiryDate: '2028-02-01', remarks: '' },
      { id: 8, materialCode: 'OP0201001', materialName: '锄头', category: '日常劳动工具-手动农具', bigCategory: '作业支持类', midCategory: '日常劳动工具', subCategory: '手动农具', specification: '1.2kg', barcode: '6932456789022', unit: '把', quantity: 25, price: '18', supplier: '劳保用品商店', location: 'F-02', batchNo: 'OP20260115', productionDate: '2026-01-15', expiryDate: '2031-01-15', remarks: '' },
    ]
  },
  {
    id: 5,
    code: 'RK20260402-005',
    inboundDate: '2026-04-02',
    supplier: '华东农机销售中心',
    operator: '张伟',
    status: 'pending',
    materials: [
      { id: 9, materialCode: 'EQ0101001', materialName: '微耕机', category: '农业机械-耕作机械', bigCategory: '设施与装备类', midCategory: '农业机械', subCategory: '耕作机械', specification: '1WG-4.0', barcode: '6932456789030', unit: '台', quantity: 5, price: '3200', supplier: '华东农机销售中心', location: 'D-01', batchNo: 'EQ20260401', productionDate: '2026-03-15', expiryDate: '2031-03-15', remarks: '' },
      { id: 10, materialCode: 'EQ0102001', materialName: '播种机', category: '农业机械-播种/移栽设备', bigCategory: '设施与装备类', midCategory: '农业机械', subCategory: '播种/移栽设备', specification: '2BX-6', barcode: '6932456789031', unit: '台', quantity: 3, price: '5600', supplier: '华东农机销售中心', location: 'D-02', batchNo: 'EQ20260402', productionDate: '2026-03-20', expiryDate: '2031-03-20', remarks: '' },
    ]
  },
  {
    id: 6,
    code: 'RK20260403-006',
    inboundDate: '2026-04-03',
    supplier: '蔬菜种苗培育基地',
    operator: '赵敏',
    status: 'pending',
    materials: [
      { id: 11, materialCode: 'SP0104001', materialName: '辣椒种苗', category: '种质资源-蔬菜种苗', bigCategory: '生产投入类', midCategory: '种质资源', subCategory: '蔬菜种苗', specification: '100株/箱', barcode: '6932456789040', unit: '箱', quantity: 50, price: '80', supplier: '蔬菜种苗培育基地', location: 'A-04', batchNo: 'SP20260401', productionDate: '2026-03-25', expiryDate: '2026-05-25', remarks: '' },
      { id: 12, materialCode: 'SP0104002', materialName: '茄子种苗', category: '种质资源-蔬菜种苗', bigCategory: '生产投入类', midCategory: '种质资源', subCategory: '蔬菜种苗', specification: '100株/箱', barcode: '6932456789041', unit: '箱', quantity: 40, price: '75', supplier: '蔬菜种苗培育基地', location: 'A-05', batchNo: 'SP20260402', productionDate: '2026-03-26', expiryDate: '2026-05-26', remarks: '' },
    ]
  },
  {
    id: 7,
    code: 'RK20260320-007',
    inboundDate: '2026-03-20',
    supplier: '农机设备公司',
    operator: '张伟',
    status: 'completed',
    materials: [
      { id: 13, materialCode: 'EQ0103001', materialName: '电动喷雾器', category: '农业机械-植保机械', bigCategory: '设施与装备类', midCategory: '农业机械', subCategory: '植保机械', specification: '3W-16L', barcode: '6932456789019', unit: '台', quantity: 10, price: '280', supplier: '农机设备公司', location: 'D-01', batchNo: 'EQ20260301', productionDate: '2026-02-15', expiryDate: '2031-02-15', remarks: '' },
      { id: 14, materialCode: 'EQ0306001', materialName: '滴灌带', category: '灌溉与水肥系统-灌溉终端', bigCategory: '设施与装备类', midCategory: '灌溉与水肥系统', subCategory: '灌溉终端', specification: 'D16-2.0L/h', barcode: '6932456789020', unit: '卷', quantity: 500, price: '25', supplier: '农机设备公司', location: 'E-01', batchNo: 'EQ20260125', productionDate: '2026-01-25', expiryDate: '2031-01-25', remarks: '' },
    ]
  },
  {
    id: 8,
    code: 'RK20260315-008',
    inboundDate: '2026-03-15',
    supplier: '包装材料公司',
    operator: '王建',
    status: 'completed',
    materials: [
      { id: 15, materialCode: 'PH0104001', materialName: '塑料袋', category: '采收容器-包装材料', bigCategory: '采后处理与流通类', midCategory: '包装材料', subCategory: '包装材料', specification: '50cm*80cm', barcode: '6932456789023', unit: '个', quantity: 200, price: '15', supplier: '包装材料公司', location: 'G-01', batchNo: 'PH20260210', productionDate: '2026-02-10', expiryDate: '2027-02-10', remarks: '' },
      { id: 16, materialCode: 'PH0105001', materialName: '纸箱', category: '采收容器-纸箱', bigCategory: '采后处理与流通类', midCategory: '包装材料', subCategory: '纸箱', specification: '40cm*30cm*20cm', barcode: '6932456789027', unit: '个', quantity: 150, price: '12', supplier: '包装材料公司', location: 'G-02', batchNo: 'PH20260301', productionDate: '2026-03-01', expiryDate: '2027-03-01', remarks: '' },
    ]
  },
  {
    id: 9,
    code: 'RK20260312-009',
    inboundDate: '2026-03-12',
    supplier: '丰和复合肥厂',
    operator: '李明',
    status: 'completed',
    materials: [
      { id: 17, materialCode: 'SP0203001', materialName: '水溶肥', category: '肥料与土壤改良剂-水溶肥', bigCategory: '生产投入类', midCategory: '肥料与土壤改良剂', subCategory: '水溶肥', specification: '5kg/袋', barcode: '6932456789028', unit: '袋', quantity: 100, price: '65', supplier: '丰和复合肥厂', location: 'B-03', batchNo: 'SP020301', productionDate: '2026-03-01', expiryDate: '2028-03-01', remarks: '' },
    ]
  },
  {
    id: 10,
    code: 'RK20260309-010',
    inboundDate: '2026-03-09',
    supplier: '智慧农业设备厂',
    operator: '张伟',
    status: 'voided',
    voidedDate: '2026-03-10',
    materials: [
      { id: 18, materialCode: 'IT0101001', materialName: '土壤温湿度传感器', category: '监测设备-传感器', bigCategory: '数字化与管理类', midCategory: '监测设备', subCategory: '传感器', specification: 'RS485 Modbus', barcode: '6932456789024', unit: '个', quantity: 20, price: '150', supplier: '智慧农业设备厂', location: 'H-01', batchNo: 'IT20260308', productionDate: '2026-03-08', expiryDate: '2031-03-08', remarks: '' },
    ]
  },
  {
    id: 11,
    code: 'RK20260308-011',
    inboundDate: '2026-03-08',
    supplier: '塑料制品厂',
    operator: '李明',
    status: 'voided',
    voidedDate: '2026-03-10',
    materials: [
      { id: 19, materialCode: 'PH0201001', materialName: '塑料筐', category: '采收容器-周转箱', bigCategory: '采后处理与流通类', midCategory: '周转箱', subCategory: '周转箱', specification: '60cm*40cm*30cm', barcode: '6932456789025', unit: '个', quantity: 100, price: '22', supplier: '塑料制品厂', location: 'G-02', batchNo: 'PH20260301', productionDate: '2026-03-01', expiryDate: '2027-03-01', remarks: '' },
    ]
  },
  {
    id: 12,
    code: 'RK20260307-012',
    inboundDate: '2026-03-07',
    supplier: '金属制品厂',
    operator: '王建',
    status: 'voided',
    voidedDate: '2026-03-09',
    materials: [
      { id: 20, materialCode: 'TK0101001', materialName: '塑料托盘', category: '仓储设备-托盘', bigCategory: '仓储设备', midCategory: '托盘', subCategory: '托盘', specification: '1200mm*1000mm', barcode: '6932456789026', unit: '个', quantity: 50, price: '180', supplier: '金属制品厂', location: 'H-02', batchNo: 'TK20260220', productionDate: '2026-02-20', expiryDate: '2031-02-20', remarks: '' },
    ]
  },
];

export default function WarehouseInboundPage() {
  const navigate = useNavigate();
  const [codeGenExpanded, setCodeGenExpanded] = useState(false);
  const [codeGen, setCodeGen] = useState({ bigCategory: '', midCategory: '', subCategory: '', generatedCode: '' });
  const [codeGenError, setCodeGenError] = useState('');
  const [codeGenSuccess, setCodeGenSuccess] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [inboundPage, setInboundPage] = useState(1);
  const [inboundPageSize, setInboundPageSize] = useState(10);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showInboundDetailModal, setShowInboundDetailModal] = useState(false);
  const [showInboundEditModal, setShowInboundEditModal] = useState(false);
  const [showInboundAddModal, setShowInboundAddModal] = useState(false);
  const [showInboundDeleteModal, setShowInboundDeleteModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [selectedInboundRecord, setSelectedInboundRecord] = useState<InboundRecord | null>(null);
  const [selectedInboundRecords, setSelectedInboundRecords] = useState<InboundRecord[]>([]);
  const [inboundRecords, setInboundRecords] = useState<InboundRecord[]>(initialInboundRecords);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [inboundSearchCode, setInboundSearchCode] = useState('');
  const [inboundSearchSupplier, setInboundSearchSupplier] = useState('');
  const [inboundSearchStatus, setInboundSearchStatus] = useState('');
  const [inboundSearchMaterialName, setInboundSearchMaterialName] = useState('');
  const [inboundSearchMaterialCode, setInboundSearchMaterialCode] = useState('');

  const toggleExpandRow = (id: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleCodeGen = () => {
    if (!codeGen.bigCategory || !codeGen.midCategory || !codeGen.subCategory) {
      setCodeGenError('请选择完整的分类');
      setCodeGenSuccess('');
      return;
    }
    const baseCode = `${codeGen.bigCategory}${codeGen.midCategory}${codeGen.subCategory}`;
    const seq = Math.floor(Math.random() * 999) + 1;
    const generatedCode = `${baseCode}${String(seq).padStart(3, '0')}`;
    setCodeGen(prev => ({ ...prev, generatedCode }));
    setCodeGenSuccess(`生成成功: ${generatedCode}`);
    setCodeGenError('');
  };

  const totalPages = Math.ceil(inboundRecords.length / inboundPageSize) || 1;

  // 入库记录搜索过滤
  const filteredRecords = inboundRecords.filter(record => {
    if (inboundSearchCode && !record.code.toLowerCase().includes(inboundSearchCode.toLowerCase())) {
      return false;
    }
    if (inboundSearchSupplier && !record.supplier.toLowerCase().includes(inboundSearchSupplier.toLowerCase())) {
      return false;
    }
    if (inboundSearchStatus && record.status !== inboundSearchStatus) {
      return false;
    }
    if (inboundSearchMaterialName || inboundSearchMaterialCode) {
      const hasMatch = record.materials.some(m => {
        const nameMatch = !inboundSearchMaterialName || (m.materialName && m.materialName.toLowerCase().includes(inboundSearchMaterialName.toLowerCase()));
        const codeMatch = !inboundSearchMaterialCode || (m.materialCode && m.materialCode.toLowerCase().includes(inboundSearchMaterialCode.toLowerCase()));
        return nameMatch && codeMatch;
      });
      if (!hasMatch) return false;
    }
    return true;
  });

  const displayedRecords = filteredRecords.slice((inboundPage - 1) * inboundPageSize, inboundPage * inboundPageSize);

  const handleSelectAll = () => {
    if (deleteMode) {
      const pendingIds = displayedRecords.filter(r => r.status === 'pending').map(r => r.id);
      const allPendingSelected = pendingIds.every(id => selectedRows.includes(id));
      if (allPendingSelected) {
        setSelectedRows(selectedRows.filter(id => !pendingIds.includes(id)));
      } else {
        setSelectedRows([...selectedRows.filter(id => !pendingIds.includes(id)), ...pendingIds]);
      }
    } else {
      if (selectedRows.length === displayedRecords.length) {
        setSelectedRows([]);
      } else {
        setSelectedRows(displayedRecords.map(r => r.id));
      }
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(r => r !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleCancelSelection = () => {
    setEditMode(false);
    setDeleteMode(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleConfirmExport = () => {
    setShowExportModal(true);
  };

  const isAllSelected = deleteMode
    ? displayedRecords.filter(r => r.status === 'pending').every(r => selectedRows.includes(r.id))
    : displayedRecords.length > 0 && selectedRows.length === displayedRecords.length;

  const selectedRecords = inboundRecords.filter(r => selectedRows.includes(r.id));

  const handleViewRecord = (record: InboundRecord) => {
    setSelectedInboundRecord(record);
    setShowInboundDetailModal(true);
  };

  const handleEditRecord = (record: InboundRecord) => {
    setSelectedInboundRecord(record);
    setShowInboundEditModal(true);
  };

  const handleDeleteRecord = (record: InboundRecord) => {
    setSelectedInboundRecords([record]);
    setShowInboundDeleteModal(true);
  };

  const handleBatchDeleteRecords = (records: InboundRecord[]) => {
    setSelectedInboundRecords(records);
    setShowInboundDeleteModal(true);
  };

  const handleConfirmInboundDelete = () => {
    if (selectedInboundRecords.length > 0) {
      const idsToDelete = selectedInboundRecords.map(r => r.id);
      setInboundRecords(prev => prev.filter(r => !idsToDelete.includes(r.id)));
    }
    setShowInboundDeleteModal(false);
    setSelectedInboundRecords([]);
  };

  const handleSaveInboundEdit = (record: InboundRecord) => {
    setShowInboundEditModal(false);
    setSelectedInboundRecord(null);
  };

  const handleBatchSaveRecord = (records: InboundRecord[]) => {
    setInboundRecords(prev => {
      const idsToUpdate = records.map(r => r.id);
      const otherRecords = prev.filter(r => !idsToUpdate.includes(r.id));
      return [...otherRecords, ...records];
    });
    setShowInboundEditModal(false);
  };

  const handleAddRecord = () => {
    setShowInboundAddModal(true);
  };

  const generateSequentialOrderCode = (): string => {
    const today = new Date().toISOString().split('T')[0];
    const todayPrefix = `RK${today.replace(/-/g, '')}-`;
    const todayRecords = inboundRecords.filter(r => r.code.startsWith(todayPrefix));

    let maxSeq = 0;
    todayRecords.forEach(r => {
      const seqStr = r.code.replace(todayPrefix, '');
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    });

    const newSeq = maxSeq + 1;
    if (newSeq > 9999) {
      return `${todayPrefix}ERR`;
    }

    return `${todayPrefix}${String(newSeq).padStart(4, '0')}`;
  };

  const handleSaveNewInbound = (record: Omit<InboundRecord, 'id'>) => {
    const newRecord: InboundRecord = {
      ...record,
      id: Date.now(),
    };
    setInboundRecords(prev => [newRecord, ...prev]);
    setShowInboundAddModal(false);
  };

  const handleConfirmEdit = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要编辑的记录');
      return;
    }
    // 打开批量编辑弹窗
    setShowBatchEditModal(true);
  };

  const handleConfirmDelete = () => {
    if (selectedRows.length > 0 && selectedRecords.length > 0) {
      handleBatchDeleteRecords(selectedRecords);
    }
    handleCancelSelection();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="物料入库" subtitle="物料入库记录管理" />

      {/* Tab切换按钮 + 编码规则 */}
      <div className="flex items-center gap-4">
        <div className="h-6 w-px bg-gray-500"></div>
        <button
          onClick={() => navigate('/code-rule')}
          className="px-3 h-9 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
        >
          编码规则 &gt;&gt;
        </button>
        <span className="text-base font-bold text-blue-600">物料编码生成</span>
        <button
          onClick={() => setCodeGenExpanded(!codeGenExpanded)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title={codeGenExpanded ? '收起' : '展开'}
        >
          {codeGenExpanded ? <ChevronDown className="w-6 h-6 text-gray-600 font-bold" /> : <ChevronRight className="w-5 h-5 text-gray-600 font-bold" />}
        </button>
      </div>

      {/* 编码规则生成器 */}
      {codeGenExpanded && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
              <select
                value={codeGen.bigCategory}
                onChange={(e) => setCodeGen(prev => ({ ...prev, bigCategory: e.target.value, midCategory: '', subCategory: '', generatedCode: '' }))}
                className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">请选择</option>
                {bigCategoriesList.map((cat) => (
                  <option key={cat.code} value={cat.code}>{cat.code}-{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
              <select
                value={codeGen.midCategory}
                onChange={(e) => setCodeGen(prev => ({ ...prev, midCategory: e.target.value, subCategory: '', generatedCode: '' }))}
                disabled={!codeGen.bigCategory}
                className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
              >
                <option value="">请选择</option>
                {categoryConfig[codeGen.bigCategory]?.categories && Object.entries(categoryConfig[codeGen.bigCategory].categories).map(([code, cat]) => (
                  <option key={code} value={code}>{code}-{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
              <select
                value={codeGen.subCategory}
                onChange={(e) => setCodeGen(prev => ({ ...prev, subCategory: e.target.value, generatedCode: '' }))}
                disabled={!codeGen.midCategory}
                className="w-full h-10 px-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
              >
                <option value="">请选择</option>
                {codeGen.bigCategory && codeGen.midCategory && categoryConfig[codeGen.bigCategory]?.categories[codeGen.midCategory]?.subCategories && Object.entries(categoryConfig[codeGen.bigCategory].categories[codeGen.midCategory].subCategories).map(([code, sub]) => (
                  <option key={code} value={code}>{code}-{sub.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                生成编码
                {codeGenSuccess && !codeGenError && (
                  <span className="ml-2 text-sm text-green-600 font-normal">{codeGenSuccess}</span>
                )}
                {codeGenError && (
                  <span className="ml-2 text-sm text-red-600 font-normal">{codeGenError}</span>
                )}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codeGen.generatedCode}
                  placeholder="点击生成"
                  className="w-40 h-10 px-3 border border-gray-200 rounded-lg text-sm bg-gray-50"
                  readOnly
                />
                <button
                  onClick={handleCodeGen}
                  disabled={!codeGen.subCategory}
                  className="px-4 h-10 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1"
                >
                  生成
                </button>
                <button
                  onClick={() => {
                    if (codeGen.generatedCode) {
                      navigator.clipboard.writeText(codeGen.generatedCode);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }
                  }}
                  disabled={!codeGen.generatedCode}
                  className="px-4 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-1"
                >
                  {copySuccess ? '已复制!' : '复制'}
                </button>
                <button
                  onClick={() => setCodeGen({ bigCategory: '', midCategory: '', subCategory: '', generatedCode: '' })}
                  className="px-4 h-10 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 whitespace-nowrap flex items-center gap-1"
                >
                  重置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 入库记录搜索栏 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-end gap-4">
          <div className="flex-1 grid grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">入库单号</label>
              <input
                type="text"
                value={inboundSearchCode}
                onChange={(e) => setInboundSearchCode(e.target.value)}
                placeholder="搜索单号"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
              <input
                type="text"
                value={inboundSearchSupplier}
                onChange={(e) => setInboundSearchSupplier(e.target.value)}
                placeholder="搜索供应商"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={inboundSearchStatus}
                onChange={(e) => setInboundSearchStatus(e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">全部</option>
                <option value="pending">待审核</option>
                <option value="completed">已完成</option>
                <option value="voided">已作废</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">物料名称</label>
              <input
                type="text"
                value={inboundSearchMaterialName}
                onChange={(e) => setInboundSearchMaterialName(e.target.value)}
                placeholder="搜索物料名称"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">物料编码</label>
              <input
                type="text"
                value={inboundSearchMaterialCode}
                onChange={(e) => setInboundSearchMaterialCode(e.target.value)}
                placeholder="搜索物料编码"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setInboundSearchCode('');
                setInboundSearchSupplier('');
                setInboundSearchStatus('');
                setInboundSearchMaterialName('');
                setInboundSearchMaterialCode('');
              }}
              className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 入库记录表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">物料入库记录</h3>
            {(editMode || deleteMode || exportMode) && (
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  {isAllSelected ? '全不选' : '全选'}
                </button>
                <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!editMode && !deleteMode && !exportMode ? (
              <>
                <button
                  onClick={handleAddRecord}
                  className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
                <button
                  onClick={() => setEditMode(true)}
                  className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  编辑
                </button>
                <button
                  onClick={() => setDeleteMode(true)}
                  className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
                <button
                  onClick={() => setExportMode(true)}
                  className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  导出
                </button>
              </>
            ) : (
              <>
                {editMode && (
                  <>
                    <button
                      onClick={handleConfirmEdit}
                      className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      确认编辑{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </button>
                    <button
                      onClick={handleCancelSelection}
                      className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      取消
                    </button>
                  </>
                )}
                {deleteMode && (
                  <>
                    <button
                      onClick={handleConfirmDelete}
                      className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                    >
                      确认删除{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </button>
                    <button
                      onClick={handleCancelSelection}
                      className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      取消
                    </button>
                  </>
                )}
                {exportMode && (
                  <>
                    <button
                      onClick={handleConfirmExport}
                      className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
                    >
                      确认导出{selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}
                    </button>
                    <button
                      onClick={handleCancelSelection}
                      className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      取消选择
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <tr>
                {(editMode || deleteMode || exportMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-10"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">供应商</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作员</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">物料数量</th>
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {displayedRecords.map((record) => (
                <React.Fragment key={record.id}>
                <tr className="hover:bg-blue-100 transition-colors">
                  {(editMode || deleteMode || exportMode) && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {deleteMode && record.status !== 'pending' ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(record.id)}
                          onChange={() => handleSelectRow(record.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleExpandRow(record.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedRows.has(record.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-800 underline whitespace-nowrap" onClick={() => handleViewRecord(record)}>
                    {record.code}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.inboundDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.supplier}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.operator}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.materials.length} 种物料</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'completed' ? 'bg-green-100 text-green-700' :
                      record.status === 'voided' ? 'bg-gray-100 text-gray-500' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {record.status === 'completed' ? '已完成' : record.status === 'voided' ? '已作废' : '待审核'}
                    </span>
                  </td>
                </tr>
                {/* 展开的物料明细行 */}
                {expandedRows.has(record.id) && (
                  <tr key={`${record.id}-expanded`} className="bg-white hover:bg-gray-50">
                    <td colSpan={(editMode || deleteMode || exportMode) ? 9 : 8} className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-gray-700 mb-2">物料明细（共 {record.materials.length} 项）</div>
                        <table className="w-full text-sm">
                          <thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">物料编码</th>
                              <th className="px-3 py-2 text-left font-medium">物料名称</th>
                              <th className="px-3 py-2 text-left font-medium">分类</th>
                              <th className="px-3 py-2 text-left font-medium">规格</th>
                              <th className="px-3 py-2 text-right font-medium">数量</th>
                              <th className="px-3 py-2 text-right font-medium">单价</th>
                              <th className="px-3 py-2 text-left font-medium">批次号</th>
                              <th className="px-3 py-2 text-left font-medium">有效期至</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-300">
                            {record.materials.map((material, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-800 font-mono text-xs">{material.materialCode}</td>
                                <td className="px-3 py-2 text-gray-800 font-medium">{material.materialName}</td>
                                <td className="px-3 py-2 text-gray-600">{material.category}</td>
                                <td className="px-3 py-2 text-gray-600">{material.specification}</td>
                                <td className="px-3 py-2 text-right text-gray-800">{material.quantity} {material.unit}</td>
                                <td className="px-3 py-2 text-right text-gray-800">{material.price}</td>
                                <td className="px-3 py-2 text-gray-600">{material.batchNo || '-'}</td>
                                <td className="px-3 py-2 text-gray-600">{material.expiryDate || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={inboundPageSize}
              onChange={(e) => { setInboundPageSize(Number(e.target.value)); setInboundPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {inboundRecords.length} 条</span>
            <button
              onClick={() => setInboundPage(Math.max(1, inboundPage - 1))}
              disabled={inboundPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <span className="text-sm">{inboundPage} / {totalPages}</span>
            <button
              onClick={() => setInboundPage(Math.min(totalPages, inboundPage + 1))}
              disabled={inboundPage >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 弹窗 */}
      <InboundDetailModal
        record={selectedInboundRecord}
        isOpen={showInboundDetailModal}
        onClose={() => setShowInboundDetailModal(false)}
      />

      <InboundEditModal
        record={selectedInboundRecord}
        isOpen={showInboundEditModal}
        onClose={() => setShowInboundEditModal(false)}
        onSave={handleSaveInboundEdit}
      />

      <InboundAddModal
        isOpen={showInboundAddModal}
        onClose={() => setShowInboundAddModal(false)}
        onSave={handleSaveNewInbound}
        onGenerateCode={generateSequentialOrderCode}
        existingCodes={inboundRecords.map(r => r.code)}
      />

      <InboundDeleteConfirmModal
        records={selectedInboundRecords}
        isOpen={showInboundDeleteModal}
        onClose={() => setShowInboundDeleteModal(false)}
        onConfirm={handleConfirmInboundDelete}
      />

      <InboundBatchEditModal
        records={selectedRecords}
        isOpen={showBatchEditModal}
        onClose={() => setShowBatchEditModal(false)}
        onSave={handleBatchSaveRecord}
      />

      <InboundExportModal
        records={selectedRecords}
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setExportMode(false);
        }}
      />
    </div>
  );
}
