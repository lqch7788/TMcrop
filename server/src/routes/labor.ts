/**
 * 人工记录 API 路由
 * 精简为直接调用 Controller
 * 注意：具体路由必须在参数化路由（:id）之前注册，否则会被 :id 拦截
 */

import { Router } from 'express';
import { laborController } from '../controllers/labor.controller';

const router = Router();

// ==================== 人工记录路由 ====================
router.get('/', (req, res, next) => laborController.getAll(req, res, next));
router.post('/', (req, res, next) => laborController.create(req, res, next));

// ==================== 员工管理路由 ====================

// 基础 CRUD
router.get('/workers', (req, res, next) => laborController.getAllEmployees(req, res, next));
router.post('/workers', (req, res, next) => laborController.createEmployee(req, res, next));

// 搜索和筛选（具体路径，必须在 /workers/:id 之前）
router.get('/workers/search', (req, res, next) => laborController.searchEmployees(req, res, next));
router.get('/workers/active', (req, res, next) => laborController.getActiveEmployees(req, res, next));
router.get('/workers/left', (req, res, next) => laborController.getLeftEmployees(req, res, next));
router.get('/workers/stats', (req, res, next) => laborController.getEmployeeStats(req, res, next));
router.get('/workers/skill-tags', (req, res, next) => laborController.getSkillTags(req, res, next));
router.get('/workers/generate-id', (req, res, next) => laborController.generateEmployeeCode(req, res, next));
router.get('/workers/export', (req, res, next) => laborController.exportEmployees(req, res, next));
router.post('/workers/import', (req, res, next) => laborController.importEmployees(req, res, next));

// 部门/岗位/类型/状态/技能筛选（参数化子路由，在 /workers/:id 之前）
router.get('/workers/department/:deptId', (req, res, next) => laborController.getEmployeesByDepartment(req, res, next));
router.get('/workers/position/:positionId', (req, res, next) => laborController.getEmployeesByPosition(req, res, next));
router.get('/workers/type/:employeeType', (req, res, next) => laborController.getEmployeesByType(req, res, next));
router.get('/workers/status/:status', (req, res, next) => laborController.getEmployeesByStatus(req, res, next));
router.get('/workers/skill-tag/:skillTag', (req, res, next) => laborController.getEmployeesBySkillTag(req, res, next));

// 参数化路由 :id（必须在所有具体路由之后）
router.get('/workers/:id', (req, res, next) => laborController.getEmployeeById(req, res, next));
router.put('/workers/:id', (req, res, next) => laborController.updateEmployee(req, res, next));
router.delete('/workers/:id', (req, res, next) => laborController.deleteEmployee(req, res, next));
router.delete('/workers/batch', (req, res, next) => laborController.deleteEmployeesBatch(req, res, next));

// 员工状态管理（:id 子路由）
router.post('/workers/:id/leave', (req, res, next) => laborController.employeeLeave(req, res, next));
router.post('/workers/:id/rejoin', (req, res, next) => laborController.employeeRejoin(req, res, next));

// 培训记录（:workerId 子路由）
router.get('/workers/:workerId/training-records', (req, res, next) => laborController.getTrainingRecords(req, res, next));
router.post('/workers/:workerId/training-records', (req, res, next) => laborController.createTrainingRecord(req, res, next));

// 考核记录（:workerId 子路由）
router.get('/workers/:workerId/assessment-records', (req, res, next) => laborController.getAssessmentRecords(req, res, next));
router.post('/workers/:workerId/assessment-records', (req, res, next) => laborController.createAssessmentRecord(req, res, next));

// 工作经验（:workerId 子路由）
router.get('/workers/:workerId/work-experiences', (req, res, next) => laborController.getWorkExperiences(req, res, next));
router.post('/workers/:workerId/work-experiences', (req, res, next) => laborController.createWorkExperience(req, res, next));

// ==================== 人工记录 :id 路由（必须放在最后，避免拦截 /workers/* 路由）====================
router.get('/:id', (req, res, next) => laborController.getById(req, res, next));
router.put('/:id', (req, res, next) => laborController.update(req, res, next));
router.delete('/:id', (req, res, next) => laborController.delete(req, res, next));

// 清空所有人工记录（需在 /:id 路由之后）
router.delete('/all', (req, res, next) => laborController.deleteAll(req, res, next));

export default router;
