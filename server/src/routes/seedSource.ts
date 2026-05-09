/**
 * 种源路由
 * 精简为直接调用 Controller
 */

import { Router } from 'express';
import { seedSourceController } from '../controllers/seedSource.controller';

const router = Router();

// 将请求传递给 controller
router.get('/', (req, res, next) => seedSourceController.getAll(req, res, next));
router.get('/:id', (req, res, next) => seedSourceController.getById(req, res, next));
router.post('/', (req, res, next) => seedSourceController.create(req, res, next));
router.put('/:id', (req, res, next) => seedSourceController.update(req, res, next));
router.delete('/:id', (req, res, next) => seedSourceController.delete(req, res, next));
router.delete('/batch', (req, res, next) => seedSourceController.deleteBatch(req, res, next));

export default router;
