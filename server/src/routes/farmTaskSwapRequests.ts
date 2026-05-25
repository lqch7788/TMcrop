/**
 * 农事任务换班申请路由
 * 提供换班申请的 CRUD API
 */

import { Router } from 'express';
import * as swapRequestService from '../services/swapRequestService';

const router = Router();

// 获取换班申请列表
router.get('/swap-requests', async (req, res) => {
  try {
    const { status } = req.query;
    const requests = await swapRequestService.getSwapRequests({ status: status as string });
    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('获取换班申请列表失败:', error);
    res.status(500).json({ success: false, error: '获取换班申请列表失败' });
  }
});

// 获取单个换班申请
router.get('/swap-requests/:id', async (req, res) => {
  try {
    const request = await swapRequestService.getSwapRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, error: '换班申请不存在' });
    }
    res.json({ success: true, data: request });
  } catch (error) {
    console.error('获取换班申请详情失败:', error);
    res.status(500).json({ success: false, error: '获取换班申请详情失败' });
  }
});

// 创建换班申请
router.post('/swap-requests', async (req, res) => {
  try {
    const { scheduleId, requesterId, requesterName, targetWorkerId, targetWorkerName, reason } = req.body;

    if (!scheduleId || !requesterId || !requesterName) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    const request = await swapRequestService.createSwapRequest({
      scheduleId,
      requesterId,
      requesterName,
      targetWorkerId,
      targetWorkerName,
      reason,
    });

    res.json({ success: true, data: request });
  } catch (error) {
    console.error('创建换班申请失败:', error);
    res.status(500).json({ success: false, error: '创建换班申请失败' });
  }
});

// 审批换班申请
router.put('/swap-requests/:id/approve', async (req, res) => {
  try {
    const { approverId } = req.body;
    const request = await swapRequestService.approveSwapRequest(req.params.id, approverId || '');

    if (!request) {
      return res.status(404).json({ success: false, error: '换班申请不存在' });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    console.error('审批换班申请失败:', error);
    res.status(500).json({ success: false, error: '审批换班申请失败' });
  }
});

// 拒绝换班申请
router.put('/swap-requests/:id/reject', async (req, res) => {
  try {
    const request = await swapRequestService.rejectSwapRequest(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, error: '换班申请不存在' });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    console.error('拒绝换班申请失败:', error);
    res.status(500).json({ success: false, error: '拒绝换班申请失败' });
  }
});

export default router;
