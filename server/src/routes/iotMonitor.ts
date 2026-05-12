/**
 * IoT设备监控路由
 *
 * Phase 5: IoT监控模块
 *
 * 提供IoT设备数据的CRUD API
 */

import { Router, Request, Response } from 'express';

const router = Router();

// 模拟IoT设备数据
interface DeviceData {
  id: string;
  device_code: string;
  device_name: string;
  device_type: string;
  greenhouse_id?: string;
  greenhouse_name?: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  temperature?: number;
  humidity?: number;
  light_intensity?: number;
  co2_concentration?: number;
  soil_moisture?: number;
  last_report_time?: string;
  create_time: string;
  update_time: string;
}

// 模拟数据存储
const mockDevices: DeviceData[] = [
  {
    id: 'DEV001',
    device_code: 'TH-001',
    device_name: '温度传感器-A区1号温室',
    device_type: 'temperature',
    greenhouse_id: 'GH001',
    greenhouse_name: 'A区1号温室',
    status: 'online',
    temperature: 25.5,
    humidity: 65,
    last_report_time: new Date().toISOString(),
    create_time: new Date().toISOString(),
    update_time: new Date().toISOString(),
  },
  {
    id: 'DEV002',
    device_code: 'TH-002',
    device_name: '温度传感器-A区2号温室',
    device_type: 'temperature',
    greenhouse_id: 'GH002',
    greenhouse_name: 'A区2号温室',
    status: 'online',
    temperature: 24.8,
    humidity: 68,
    last_report_time: new Date().toISOString(),
    create_time: new Date().toISOString(),
    update_time: new Date().toISOString(),
  },
  {
    id: 'DEV003',
    device_code: ' irrigation-001',
    device_name: '智能灌溉控制器-1号地块',
    device_type: 'irrigation',
    status: 'online',
    soil_moisture: 45,
    last_report_time: new Date().toISOString(),
    create_time: new Date().toISOString(),
    update_time: new Date().toISOString(),
  },
];

/**
 * 获取设备列表
 * GET /api/iot/devices
 */
router.get('/devices', (req: Request, res: Response) => {
  try {
    const { greenhouse_id, device_type, status, page = '1', limit = '100' } = req.query;
    let filtered = [...mockDevices];

    if (greenhouse_id) {
      filtered = filtered.filter(d => d.greenhouse_id === greenhouse_id);
    }
    if (device_type) {
      filtered = filtered.filter(d => d.device_type === device_type);
    }
    if (status) {
      filtered = filtered.filter(d => d.status === status);
    }

    const offset = (Number(page) - 1) * Number(limit);
    const paginated = filtered.slice(offset, offset + Number(limit));

    res.json({
      success: true,
      data: paginated,
      meta: {
        total: filtered.length,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(filtered.length / Number(limit)),
      },
    });
  } catch (error) {
    console.error('获取设备列表失败:', error);
    res.status(500).json({ success: false, error: '获取设备列表失败' });
  }
});

/**
 * 获取单个设备
 * GET /api/iot/devices/:id
 */
router.get('/devices/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const device = mockDevices.find(d => d.id === id);

    if (!device) {
      res.status(404).json({ success: false, error: '设备不存在' });
      return;
    }

    res.json({ success: true, data: device });
  } catch (error) {
    console.error('获取设备详情失败:', error);
    res.status(500).json({ success: false, error: '获取设备详情失败' });
  }
});

/**
 * 获取设备最新数据
 * GET /api/iot/devices/:id/latest
 */
router.get('/devices/:id/latest', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const device = mockDevices.find(d => d.id === id);

    if (!device) {
      res.status(404).json({ success: false, error: '设备不存在' });
      return;
    }

    res.json({
      success: true,
      data: {
        device_id: device.id,
        device_code: device.device_code,
        status: device.status,
        temperature: device.temperature,
        humidity: device.humidity,
        light_intensity: device.light_intensity,
        co2_concentration: device.co2_concentration,
        soil_moisture: device.soil_moisture,
        last_report_time: device.last_report_time,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('获取设备最新数据失败:', error);
    res.status(500).json({ success: false, error: '获取设备最新数据失败' });
  }
});

/**
 * 获取环境数据趋势
 * GET /api/iot/environment
 */
router.get('/environment', (req: Request, res: Response) => {
  try {
    const { greenhouse_id, start_date, end_date, data_type = 'temperature', interval = 'hour' } = req.query;

    // 模拟环境数据
    const now = new Date();
    const dataPoints = [];
    for (let i = 24; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      dataPoints.push({
        timestamp: time.toISOString(),
        value: 20 + Math.random() * 10,
        unit: data_type === 'temperature' ? '°C' : data_type === 'humidity' ? '%' : 'lux',
      });
    }

    res.json({
      success: true,
      data: dataPoints,
      meta: {
        greenhouse_id,
        data_type,
        interval,
        start_date,
        end_date,
      },
    });
  } catch (error) {
    console.error('获取环境数据失败:', error);
    res.status(500).json({ success: false, error: '获取环境数据失败' });
  }
});

export default router;
