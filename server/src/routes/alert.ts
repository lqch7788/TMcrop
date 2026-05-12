/**
 * 告警管理路由
 *
 * Phase 5: 告警模块
 *
 * 提供告警数据的CRUD API
 */

import { Router, Request, Response } from 'express';

const router = Router();

// 告警级别
type AlertLevel = 'info' | 'warning' | 'error' | 'critical';
type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'ignored';

// 模拟告警数据
interface Alert {
  id: string;
  alert_code: string;
  alert_type: string;
  level: AlertLevel;
  title: string;
  message: string;
  source_type: string;
  source_id?: string;
  source_name?: string;
  greenhouse_id?: string;
  greenhouse_name?: string;
  status: AlertStatus;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolved_note?: string;
  created_at: string;
  updated_at: string;
}

const mockAlerts: Alert[] = [
  {
    id: 'ALT001',
    alert_code: 'TEMP-HIGH-001',
    alert_type: 'temperature',
    level: 'warning',
    title: '温度过高告警',
    message: 'A区1号温室温度超过30°C，当前温度32.5°C',
    source_type: 'device',
    source_id: 'DEV001',
    source_name: '温度传感器-A区1号温室',
    greenhouse_id: 'GH001',
    greenhouse_name: 'A区1号温室',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ALT002',
    alert_code: 'HUM-LOW-001',
    alert_type: 'humidity',
    level: 'warning',
    title: '湿度过低告警',
    message: 'B区2号温室湿度低于40%，当前湿度35%',
    source_type: 'device',
    source_id: 'DEV002',
    source_name: '湿度传感器-B区2号温室',
    greenhouse_id: 'GH003',
    greenhouse_name: 'B区2号温室',
    status: 'acknowledged',
    acknowledged_by: 'U001',
    acknowledged_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ALT003',
    alert_code: 'SOIL-DRY-001',
    alert_type: 'soil_moisture',
    level: 'info',
    title: '土壤干旱提醒',
    message: '1号地块土壤湿度低于30%，建议进行灌溉',
    source_type: 'device',
    source_id: 'DEV003',
    source_name: '土壤传感器-1号地块',
    status: 'resolved',
    acknowledged_by: 'U002',
    acknowledged_at: new Date(Date.now() - 7200000).toISOString(),
    resolved_by: 'U002',
    resolved_at: new Date(Date.now() - 3600000).toISOString(),
    resolved_note: '已完成灌溉',
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * 获取告警列表
 * GET /api/alerts
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { level, status, source_type, greenhouse_id, start_date, end_date, page = '1', limit = '50' } = req.query;
    let filtered = [...mockAlerts];

    if (level) {
      filtered = filtered.filter(a => a.level === level);
    }
    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }
    if (source_type) {
      filtered = filtered.filter(a => a.source_type === source_type);
    }
    if (greenhouse_id) {
      filtered = filtered.filter(a => a.greenhouse_id === greenhouse_id);
    }

    // 按时间倒序
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
    console.error('获取告警列表失败:', error);
    res.status(500).json({ success: false, error: '获取告警列表失败' });
  }
});

/**
 * 获取单个告警
 * GET /api/alerts/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const alert = mockAlerts.find(a => a.id === id);

    if (!alert) {
      res.status(404).json({ success: false, error: '告警不存在' });
      return;
    }

    res.json({ success: true, data: alert });
  } catch (error) {
    console.error('获取告警详情失败:', error);
    res.status(500).json({ success: false, error: '获取告警详情失败' });
  }
});

/**
 * 确认告警
 * PUT /api/alerts/:id/acknowledge
 */
router.put('/:id/acknowledge', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { acknowledged_by } = req.body;

    const alertIndex = mockAlerts.findIndex(a => a.id === id);
    if (alertIndex === -1) {
      res.status(404).json({ success: false, error: '告警不存在' });
      return;
    }

    const now = new Date().toISOString();
    mockAlerts[alertIndex] = {
      ...mockAlerts[alertIndex],
      status: 'acknowledged',
      acknowledged_by,
      acknowledged_at: now,
      updated_at: now,
    };

    res.json({
      success: true,
      data: mockAlerts[alertIndex],
    });
  } catch (error) {
    console.error('确认告警失败:', error);
    res.status(500).json({ success: false, error: '确认告警失败' });
  }
});

/**
 * 解决告警
 * PUT /api/alerts/:id/resolve
 */
router.put('/:id/resolve', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolved_by, resolved_note } = req.body;

    const alertIndex = mockAlerts.findIndex(a => a.id === id);
    if (alertIndex === -1) {
      res.status(404).json({ success: false, error: '告警不存在' });
      return;
    }

    const now = new Date().toISOString();
    mockAlerts[alertIndex] = {
      ...mockAlerts[alertIndex],
      status: 'resolved',
      resolved_by,
      resolved_at: now,
      resolved_note,
      updated_at: now,
    };

    res.json({
      success: true,
      data: mockAlerts[alertIndex],
    });
  } catch (error) {
    console.error('解决告警失败:', error);
    res.status(500).json({ success: false, error: '解决告警失败' });
  }
});

/**
 * 忽略告警
 * PUT /api/alerts/:id/ignore
 */
router.put('/:id/ignore', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const alertIndex = mockAlerts.findIndex(a => a.id === id);
    if (alertIndex === -1) {
      res.status(404).json({ success: false, error: '告警不存在' });
      return;
    }

    mockAlerts[alertIndex] = {
      ...mockAlerts[alertIndex],
      status: 'ignored',
      updated_at: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: mockAlerts[alertIndex],
    });
  } catch (error) {
    console.error('忽略告警失败:', error);
    res.status(500).json({ success: false, error: '忽略告警失败' });
  }
});

/**
 * 获取告警统计
 * GET /api/alerts/stats
 */
router.get('/stats/summary', (req: Request, res: Response) => {
  try {
    const stats = {
      total: mockAlerts.length,
      pending: mockAlerts.filter(a => a.status === 'pending').length,
      acknowledged: mockAlerts.filter(a => a.status === 'acknowledged').length,
      resolved: mockAlerts.filter(a => a.status === 'resolved').length,
      ignored: mockAlerts.filter(a => a.status === 'ignored').length,
      critical: mockAlerts.filter(a => a.level === 'critical').length,
      error: mockAlerts.filter(a => a.level === 'error').length,
      warning: mockAlerts.filter(a => a.level === 'warning').length,
      info: mockAlerts.filter(a => a.level === 'info').length,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('获取告警统计失败:', error);
    res.status(500).json({ success: false, error: '获取告警统计失败' });
  }
});

export default router;
