// 人事相关数据
// 智慧种植生产管理系统模拟数据 - 人事劳务相关

import { Worker, Department, Position, TempTask } from '../../types';

// 部门数据
export const departments: Department[] = [
  { id: 'D001', name: '生产部', managerId: 'U002', managerName: '李明辉' },
  { id: 'D002', name: '技术部', managerId: 'U004', managerName: '赵文静' },
  { id: 'D003', name: '仓储部', managerId: 'U010', managerName: '孙丽娜' },
  { id: 'D004', name: '财务部', managerId: 'U013', managerName: '财务经理' },
  { id: 'D005', name: '综合办', managerId: 'U014', managerName: '行政经理' },
];

// 岗位数据 - 与部门关联
export const positions: Position[] = [
  // 生产部岗位
  { id: 'P001', name: '生产主管', departmentId: 'D001', level: 1 },
  { id: 'P002', name: '生产经理', departmentId: 'D001', level: 2 },
  { id: 'P003', name: '生产组长', departmentId: 'D001', level: 3 },
  { id: 'P004', name: '种植工', departmentId: 'D001', level: 4 },
  { id: 'P005', name: '农技员', departmentId: 'D001', level: 3 },
  { id: 'P006', name: '农机手', departmentId: 'D001', level: 4 },
  // 技术部岗位
  { id: 'P007', name: '技术总监', departmentId: 'D002', level: 1 },
  { id: 'P008', name: '技术员', departmentId: 'D002', level: 3 },
  { id: 'P009', name: '设备维护员', departmentId: 'D002', level: 4 },
  // 仓储部岗位
  { id: 'P010', name: '仓储主管', departmentId: 'D003', level: 1 },
  { id: 'P011', name: '仓库管理员', departmentId: 'D003', level: 4 },
  { id: 'P012', name: '搬运工', departmentId: 'D003', level: 5 },
  // 财务部岗位
  { id: 'P013', name: '财务经理', departmentId: 'D004', level: 1 },
  { id: 'P014', name: '会计', departmentId: 'D004', level: 3 },
  { id: 'P015', name: '出纳', departmentId: 'D004', level: 4 },
  // 综合办岗位
  { id: 'P016', name: '行政经理', departmentId: 'D005', level: 1 },
  { id: 'P017', name: '行政助理', departmentId: 'D005', level: 3 },
  { id: 'P018', name: '招聘专员', departmentId: 'D005', level: 3 },
  { id: 'P019', name: '人事专员', departmentId: 'D005', level: 3 },
];

// 临时任务数据 - 6条不同状态的模拟数据
export const tempTasks: TempTask[] = [
  // 状态1: 草稿 (draft)
  {
    id: 'TT001',
    taskCode: 'TT20260418-001',
    title: '设备日常维护检查',
    type: 'equipment_repair',
    typeName: '设备维修',
    priority: 'low',
    status: 'draft',
    assigneeId: 'U013',
    assigneeName: '陆启闯',
    assignerId: 'admin',
    assignerName: '管理员',
    dueDate: '2026-04-25T08:00:00',
    description: '对温室内的灌溉系统进行例行检查和维护',
    notes: '计划下周进行',
    urgency: 'normal',
    location: '玻璃温室A区',
    greenhouseId: 'G001',
    greenhouseName: '玻璃温室A区',
    estimatedDays: 2,
    estimatedHours: 4,
    workerCount: 2,
    actualHours: 0,
    rejectCount: 0,
    createdAt: '2026-04-18T09:00:00.000Z',
    updatedAt: '2026-04-18T09:00:00.000Z',
    startDate: '2026-04-18T08:00',
  },
  // 状态2: 待接受 (pending)
  {
    id: 'TT002',
    taskCode: 'TT20260418-002',
    title: '紧急处理大棚A区虫害',
    type: 'farm_repair',
    typeName: '农事抢修',
    priority: 'high',
    status: 'pending',
    assigneeId: 'U013',
    assigneeName: '陆启闯',
    assignerId: 'admin',
    assignerName: '管理员',
    dueDate: '2026-04-20T17:00:00',
    description: '大棚A区发现蚜虫大量繁殖，需要紧急喷洒农药处理',
    notes: '',
    urgency: 'urgent',
    location: '大棚A区',
    greenhouseId: 'G001',
    greenhouseName: '大棚A区',
    estimatedDays: 0,
    estimatedHours: 2,
    workerCount: 1,
    actualHours: 0,
    rejectCount: 0,
    createdAt: '2026-04-18T08:00:00.000Z',
    updatedAt: '2026-04-18T08:00:00.000Z',
    startDate: '2026-04-18T08:00',
  },
  // 状态3: 已接受 (accepted)
  {
    id: 'TT003',
    taskCode: 'TT20260417-003',
    title: '外出协助兄弟基地',
    type: 'farm_repair',
    typeName: '农事抢修',
    priority: 'medium',
    status: 'accepted',
    assigneeId: 'U013',
    assigneeName: '陆启闯',
    assignerId: 'admin',
    assignerName: '管理员',
    dueDate: '2026-04-20T17:00:00',
    description: '协助南京绿野农场基地进行番茄移栽作业',
    notes: '需要自带工具',
    urgency: 'normal',
    location: '外出协助',
    greenhouseId: '',
    greenhouseName: '外出协助',
    estimatedDays: 1,
    estimatedHours: 0,
    workerCount: 3,
    actualHours: 0,
    acceptedAt: '2026-04-17T14:00:00.000Z',
    rejectCount: 0,
    createdAt: '2026-04-17T10:00:00.000Z',
    updatedAt: '2026-04-17T14:00:00.000Z',
    startDate: '2026-04-17T08:00',
  },
  // 状态4: 进行中 (in_progress)
  {
    id: 'TT004',
    taskCode: 'TT20260418-004',
    title: 'B区番茄追肥作业',
    type: 'farm_repair',
    typeName: '农事抢修',
    priority: 'normal',
    status: 'in_progress',
    assigneeId: 'U013',
    assigneeName: '陆启闯',
    assignerId: 'admin',
    assignerName: '管理员',
    dueDate: '2026-04-22T17:00:00',
    description: '番茄进入结果期，需要追加钾肥促进果实发育',
    notes: '已完成部分施肥',
    urgency: 'normal',
    location: '玻璃温室B区',
    greenhouseId: 'G002',
    greenhouseName: '玻璃温室B区',
    estimatedDays: 1,
    estimatedHours: 4,
    workerCount: 2,
    actualHours: 2,
    acceptedAt: '2026-04-17T09:00:00.000Z',
    rejectCount: 0,
    createdAt: '2026-04-17T09:00:00.000Z',
    updatedAt: '2026-04-18T10:00:00.000Z',
    startDate: '2026-04-17T08:00',
  },
  // 状态5: 待验收 (waiting_acceptance)
  {
    id: 'TT005',
    taskCode: 'TT20260416-005',
    title: 'D区黄瓜采摘',
    type: 'farm_repair',
    typeName: '农事抢修',
    priority: 'normal',
    status: 'waiting_acceptance',
    assigneeId: 'U013',
    assigneeName: '陆启闯',
    assignerId: 'admin',
    assignerName: '管理员',
    dueDate: '2026-04-18T17:00:00',
    description: 'D区黄瓜已成熟，需要及时采摘',
    notes: '已完成黄瓜采摘，共采摘约50公斤',
    urgency: 'normal',
    location: '大棚D区',
    greenhouseId: '',
    greenhouseName: '大棚D区',
    estimatedDays: 0,
    estimatedHours: 4,
    workerCount: 2,
    actualHours: 5,
    completionRemarks: '已完成黄瓜采摘，共采摘约50公斤',
    acceptedAt: '2026-04-16T08:00:00.000Z',
    rejectCount: 0,
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-18T16:00:00.000Z',
    startDate: '2026-04-16T08:00',
  },
  // 状态6: 已完成 (completed)
  {
    id: 'TT006',
    taskCode: 'TT20260415-006',
    title: '大棚B区消杀作业',
    type: 'farm_repair',
    typeName: '农事抢修',
    priority: 'high',
    status: 'completed',
    assigneeId: 'U013',
    assigneeName: '陆启闯',
    assignerId: 'admin',
    assignerName: '管理员',
    dueDate: '2026-04-18T12:00:00',
    description: '对大棚B区进行病虫害消杀作业',
    notes: '已使用生物农药，符合有机标准',
    urgency: 'urgent',
    location: '玻璃温室B区',
    greenhouseId: 'G002',
    greenhouseName: '玻璃温室B区',
    estimatedDays: 1,
    estimatedHours: 2,
    workerCount: 2,
    actualHours: 6,
    completionRemarks: '消杀作业已完成，用药量符合标准',
    acceptedAt: '2026-04-15T08:00:00.000Z',
    rejectCount: 0,
    createdAt: '2026-04-15T08:00:00.000Z',
    updatedAt: '2026-04-16T16:00:00.000Z',
    startDate: '2026-04-15T08:00',
  },
];

// 员工数据 - 农业种植管理系统
export const workers: Worker[] = [
  {
    id: 'W011', workerId: 'EMP20240011', name: '陆启闯', gender: '男', age: 32,
    birthDate: '1994-05-10', idCard: '320105199405101234', phone: '13811112222',
    email: 'luqc@example.com', wechat: 'luqichuang2024',
    address: '江苏省南京市江宁区科学园街道1号', residenceAddress: '江苏省南京市江宁区百家湖花园1栋101室',
    emergencyContact: '陆明', emergencyRelation: '父亲', emergencyPhone: '13911112222',
    department: '生产部', team: 'A班', position: '农技员', workArea: '全部生产区域',
    skillLevel: '高级', skillTags: ['浇水灌溉', '施肥作业', '病虫害防治', '温控管理'],
    workYears: 6, wagesType: '月薪', hourlyRate: 0,
    hireDate: '2020-03-01', contractStatus: '续签', contractType: '固定期限',
    contractExpireDate: '2027-02-28', contractNo: 'HT-2020-008',
    education: '本科', major: '农学', trainingRecords: [
      { id: 'TR011', trainingDate: '2024-06-15', trainingType: '技能培训', trainingContent: '设施农业技术', trainingHours: 24, trainer: '张博士', certificate: '高级农技师证书', score: 92 }
    ],
    workExperiences: [
      { id: 'WE011', company: '南京绿野农场', position: '农技员', startDate: '2018-07-01', endDate: '2020-02-28', workContent: '温室作物管理', leavingReason: '个人发展' }
    ],
    annualAssessments: [
      { id: 'AS011', year: 2024, assessmentDate: '2024-12-20', assessor: '王建国', rating: '优秀', score: 95, strengths: '技术全面，能独立解决生产问题', weaknesses: '对新品种接受较慢', goals: '成为技术带头人' }
    ],
    status: '在职', remarks: '技术骨干，农技方面的带头人'
  },
  {
    id: 'W001', workerId: 'EMP20240001', name: '张伟民', gender: '男', age: 35,
    birthDate: '1991-01-01', idCard: '320105199101011234', phone: '13812345678',
    email: 'zhangwm@example.com', wechat: 'zhangweimin2024',
    address: '江苏省南京市江宁区东山街道1号', residenceAddress: '江苏省南京市江宁区百家湖花园10栋201室',
    emergencyContact: '张伟', emergencyRelation: '兄弟', emergencyPhone: '13912345678',
    department: '生产部', team: 'A班', position: '种植工', workArea: '玻璃温室A区/B区',
    skillLevel: '高级', skillTags: ['浇水灌溉', '施肥作业', '采摘技能', '修剪整枝'],
    workYears: 8, wagesType: '计件', hourlyRate: 0,
    hireDate: '2022-03-15', contractStatus: '续签', contractType: '固定期限',
    contractExpireDate: '2026-03-14', contractNo: 'HT-2022-001',
    education: '初中', trainingRecords: [
      { id: 'TR001', trainingDate: '2023-06-15', trainingType: '安全培训', trainingContent: '农业安全生产规范', trainingHours: 8, trainer: '李明辉', certificate: '安全员证书', score: 95 }
    ],
    workExperiences: [
      { id: 'WE001', company: '南京绿野农场', position: '种植工', startDate: '2016-03-01', endDate: '2022-02-28', workContent: '蔬菜大棚种植管理', leavingReason: '个人发展' }
    ],
    annualAssessments: [
      { id: 'AS001', year: 2024, assessmentDate: '2024-12-20', assessor: '王建国', rating: '优秀', score: 92, strengths: '技术过硬，能独立完成各项工作', weaknesses: '沟通协调能力可提升', goals: '提升管理能力' }
    ],
    status: '在职', remarks: '技术骨干，工作认真负责'
  },
  {
    id: 'W002', workerId: 'EMP20240002', name: '李明轩', gender: '女', age: 28,
    birthDate: '1996-02-15', idCard: '320105199602021234', phone: '13923456789',
    email: 'limx@example.com', wechat: 'limingxuan1996',
    address: '江苏省南京市浦口区泰山街道2号', residenceAddress: '江苏省南京市浦口区威尼斯花园5栋301室',
    emergencyContact: '李强', emergencyRelation: '父亲', emergencyPhone: '13823456789',
    department: '技术部', team: '技术组', position: '农技员', workArea: '技术部全部区域',
    skillLevel: '技师', skillTags: ['嫁接技术', '育苗管理', '温控管理', '病虫害防治'],
    workYears: 6, wagesType: '月薪', hourlyRate: 0,
    hireDate: '2021-06-20', contractStatus: '续签', contractType: '固定期限',
    contractExpireDate: '2025-06-19', contractNo: 'HT-2021-015',
    education: '大专', major: '园艺技术', trainingRecords: [
      { id: 'TR002', trainingDate: '2023-03-10', trainingType: '技能培训', trainingContent: '嫁接技术进阶', trainingHours: 16, trainer: '张博士', certificate: '技师证书', score: 88 }
    ],
    workExperiences: [
      { id: 'WE002', company: '上海园艺研究所', position: '技术员', startDate: '2018-07-01', endDate: '2021-05-30', workContent: '花卉育苗与嫁接技术研究', leavingReason: '家庭原因回南京' }
    ],
    annualAssessments: [
      { id: 'AS002', year: 2024, assessmentDate: '2024-12-18', assessor: '李明辉', rating: '优秀', score: 95, strengths: '专业知识扎实，善于技术创新', weaknesses: '现场管理经验不足', goals: '考取高级农技师证书' }
    ],
    status: '在职', remarks: '技术骨干，参与多项技术改进项目'
  },
  {
    id: 'W003', workerId: 'EMP20240003', name: '王建国', gender: '男', age: 42,
    birthDate: '1982-03-20', idCard: '320105198203201234', phone: '13634567890',
    email: 'wangjg@example.com', wechat: 'wangjianguo1982',
    address: '江苏省南京市六合区雄州街道3号', residenceAddress: '江苏省南京市江宁区将军山花园3栋501室',
    emergencyContact: '王芳', emergencyRelation: '妻子', emergencyPhone: '13734567890',
    department: '生产部', team: 'B班', position: '生产主管', workArea: '全部生产区域',
    skillLevel: '技师', skillTags: ['基地管理', '灌溉系统操作', '农机驾驶', '质检分级'],
    workYears: 15, wagesType: '月薪', hourlyRate: 0,
    hireDate: '2019-01-10', contractStatus: '续签', contractType: '无固定期限',
    contractExpireDate: '2027-01-09', contractNo: 'HT-2019-001',
    education: '高中', trainingRecords: [
      { id: 'TR003', trainingDate: '2022-09-15', trainingType: '管理培训', trainingContent: '农业生产管理', trainingHours: 24, trainer: '王总监', certificate: '管理资格证', score: 90 }
    ],
    workExperiences: [
      { id: 'WE003', company: '苏州蔬菜基地', position: '生产主管', startDate: '2012-05-01', endDate: '2018-12-31', workContent: '蔬菜生产全面管理', leavingReason: '返乡就业' }
    ],
    annualAssessments: [
      { id: 'AS003', year: 2024, assessmentDate: '2024-12-15', assessor: '李明辉', rating: '优秀', score: 94, strengths: '管理能力强，团队建设出色', weaknesses: '新技术学习较慢', goals: '推进基地数字化管理' }
    ],
    status: '在职', remarks: '优秀管理者，班组建设标兵'
  },
  {
    id: 'W004', workerId: 'EMP20240004', name: '赵文静', gender: '女', age: 30,
    birthDate: '1994-04-18', idCard: '320105199404181234', phone: '13745678901',
    email: 'zhaowj@example.com', wechat: 'zhaowenjing1994',
    address: '江苏省南京市溧水区永阳街道4号', residenceAddress: '江苏省南京市溧水区财智广场6栋202室',
    emergencyContact: '赵军', emergencyRelation: '父亲', emergencyPhone: '13645678901',
    department: '技术部', team: '技术组', position: '质检员', workArea: '技术部全部区域',
    skillLevel: '高级', skillTags: ['质检分级', '采摘技能', '包装发货'],
    workYears: 5, wagesType: '月薪', hourlyRate: 0,
    hireDate: '2020-09-01', contractStatus: '续签', contractType: '固定期限',
    contractExpireDate: '2026-08-31', contractNo: 'HT-2020-008',
    education: '中专', major: '农产品质检', trainingRecords: [
      { id: 'TR004', trainingDate: '2023-11-20', trainingType: '质检培训', trainingContent: '农产品质量检测', trainingHours: 12, trainer: '张博士', certificate: '质检员证书', score: 92 }
    ],
    workExperiences: [
      { id: 'WE004', company: '浙江果蔬集团', position: '质检员', startDate: '2019-06-01', endDate: '2020-08-25', workContent: '水果质量检测与分级', leavingReason: '个人发展' }
    ],
    annualAssessments: [
      { id: 'AS004', year: 2024, assessmentDate: '2024-12-19', assessor: '李明辉', rating: '良好', score: 88, strengths: '工作细致，质检准确率高', weaknesses: '应急处理能力待加强', goals: '提升综合素质' }
    ],
    status: '在职', remarks: '质检工作零投诉'
  },
  {
    id: 'W005', workerId: 'EMP20240005', name: '钱文涛', gender: '男', age: 25,
    birthDate: '1999-05-25', idCard: '320105199905251234', phone: '13556789012',
    email: 'qianwt@example.com', wechat: 'qianwentao99',
    address: '江苏省南京市高淳区淳溪街道5号', residenceAddress: '江苏省南京市高淳区碧桂园7栋101室',
    emergencyContact: '钱明', emergencyRelation: '父亲', emergencyPhone: '13456789012',
    department: '生产部', team: 'A班', position: '种植工', workArea: '玻璃温室C区',
    skillLevel: '中级', skillTags: ['浇水灌溉', '施肥作业', '打药操作'],
    workYears: 3, wagesType: '计件', hourlyRate: 0,
    hireDate: '2023-02-15', contractStatus: '续签', contractType: '固定期限',
    contractExpireDate: '2026-02-14', contractNo: 'HT-2023-003',
    education: '初中', trainingRecords: [
      { id: 'TR005', trainingDate: '2023-04-10', trainingType: '岗前培训', trainingContent: '农业基础知识', trainingHours: 8, trainer: '李明辉', score: 85 }
    ],
    workExperiences: [
      { id: 'WE005', company: '无锡蔬菜基地', position: '种植工', startDate: '2021-03-01', endDate: '2023-01-30', workContent: '大棚蔬菜种植', leavingReason: '回家乡发展' }
    ],
    annualAssessments: [
      { id: 'AS005', year: 2024, assessmentDate: '2024-12-20', assessor: '王建国', rating: '良好', score: 85, strengths: '学习积极，上手快', weaknesses: '重体力活经验不足', goals: '提升技能到高级' }
    ],
    status: '在职', remarks: '年轻有潜力，重点培养对象'
  },
  {
    id: 'W006', workerId: 'EMP20240006', name: '孙晓峰', gender: '女', age: 33,
    birthDate: '1991-08-30', idCard: '320105199108301234', phone: '13467890123',
    email: 'sunxf@example.com', wechat: 'sxiaofeng1991',
    address: '江苏省南京市栖霞区迈皋桥街道6号', residenceAddress: '江苏省南京市栖霞区仙林花园8栋302室',
    emergencyContact: '孙强', emergencyRelation: '兄弟', emergencyPhone: '13367890123',
    department: '后勤部', team: '后勤组', position: '仓库管理员', workArea: '仓库区',
    skillLevel: '中级', skillTags: ['包装发货', '物资管理'],
    workYears: 6, wagesType: '月薪', hourlyRate: 0,
    hireDate: '2021-11-01', contractStatus: '续签', contractType: '固定期限',
    contractExpireDate: '2025-10-31', contractNo: 'HT-2021-022',
    education: '高中', trainingRecords: [
      { id: 'TR006', trainingDate: '2022-05-15', trainingType: '仓储培训', trainingContent: '物资仓储管理', trainingHours: 8, trainer: '孙丽娜', certificate: '仓储管理员证书', score: 90 }
    ],
    workExperiences: [
      { id: 'WE006', company: '南京物流公司', position: '仓库管理员', startDate: '2018-09-01', endDate: '2021-10-20', workContent: '物资出入库管理', leavingReason: '家庭原因换工作' }
    ],
    annualAssessments: [
      { id: 'AS006', year: 2024, assessmentDate: '2024-12-18', assessor: '李明辉', rating: '良好', score: 87, strengths: '细心认真，账目清晰', weaknesses: '设备维护能力不足', goals: '学习叉车操作' }
    ],
    status: '在职', remarks: '仓库管理井井有条'
  },
  {
    id: 'W007', workerId: 'EMP20240007', name: '周志强', gender: '男', age: 45,
    birthDate: '1979-11-12', idCard: '320105197911121234', phone: '13378901234',
    email: 'zhouzq@example.com', wechat: 'zhouzhiqiang1979',
    address: '江苏省南京市江宁区禄口街道7号', residenceAddress: '江苏省南京市江宁区翠屏花园9栋401室',
    emergencyContact: '周涛', emergencyRelation: '儿子', emergencyPhone: '13278901234',
    department: '生产部', team: 'C班', position: '农机手', workArea: '全部区域',
    skillLevel: '高级', skillTags: ['农机驾驶', '农机维修', '灌溉系统操作'],
    workYears: 18, wagesType: '计时', hourlyRate: 35,
    hireDate: '2018-05-20', contractStatus: '续签', contractType: '固定期限',
    contractExpireDate: '2026-05-19', contractNo: 'HT-2018-012',
    education: '初中', trainingRecords: [
      { id: 'TR007', trainingDate: '2021-08-20', trainingType: '技能培训', trainingContent: '新型农机操作', trainingHours: 16, trainer: '农机厂家', certificate: '农机驾驶证', score: 94 }
    ],
    workExperiences: [
      { id: 'WE007', company: '安徽农机合作社', position: '农机手', startDate: '2006-04-01', endDate: '2018-05-10', workContent: '农业机械操作与维修', leavingReason: '来南京发展' }
    ],
    annualAssessments: [
      { id: 'AS007', year: 2024, assessmentDate: '2024-12-16', assessor: '王建国', rating: '优秀', score: 93, strengths: '农机技术全面，经验丰富', weaknesses: '文化程度限制理论提升', goals: '带教更多年轻农机手' }
    ],
    status: '在职', remarks: '农机方面的专家，技术带头人'
  },
  {
    id: 'W008', workerId: 'EMP20240008', name: '吴美丽', gender: '女', age: 27,
    birthDate: '1997-09-05', idCard: '320105199709051234', phone: '13289012345',
    email: 'wuml@example.com', wechat: 'wumeili1997',
    address: '江苏省南京市雨花台区铁心桥街道8号', residenceAddress: '江苏省南京市雨花台区锦明花园11栋102室',
    emergencyContact: '吴刚', emergencyRelation: '父亲', emergencyPhone: '13189012345',
    department: '生产部', team: 'A班', position: '采摘工', workArea: '草莓大棚区',
    skillLevel: '初级', skillTags: ['采摘技能', '修剪整枝'],
    workYears: 1, wagesType: '计件', hourlyRate: 0,
    hireDate: '2024-01-10', contractStatus: '新签', contractType: '固定期限',
    contractExpireDate: '2025-01-09', contractNo: 'HT-2024-001',
    education: '初中', trainingRecords: [
      { id: 'TR008', trainingDate: '2024-01-15', trainingType: '岗前培训', trainingContent: '采摘技术基础', trainingHours: 8, trainer: '张伟民', score: 82 }
    ],
    workExperiences: [],
    annualAssessments: [],
    status: '在职', remarks: '新员工，手脚麻利'
  },
  {
    id: 'W009', workerId: 'EMP20240009', name: '郑胜利', gender: '男', age: 38,
    birthDate: '1986-12-28', idCard: '320105198612281234', phone: '13190123456',
    email: 'zhengsl@example.com', wechat: 'zhengshengli1986',
    address: '江苏省南京市浦口区江浦街道9号', residenceAddress: '江苏省南京市浦口区旭日学府12栋301室',
    emergencyContact: '郑华', emergencyRelation: '妻子', emergencyPhone: '13090123456',
    department: '生产部', team: 'B班', position: '打药工', workArea: '日光温室区域',
    skillLevel: '高级', skillTags: ['打药操作', '病虫害防治', '施肥作业'],
    workYears: 10, wagesType: '计时', hourlyRate: 32,
    hireDate: '2020-03-01', contractStatus: '续签', contractType: '固定期限',
    contractExpireDate: '2026-02-28', contractNo: 'HT-2020-005',
    education: '初中', trainingRecords: [
      { id: 'TR009', trainingDate: '2022-04-10', trainingType: '安全培训', trainingContent: '农药安全使用', trainingHours: 12, trainer: '刘大海', certificate: '农药操作证', score: 91 }
    ],
    workExperiences: [
      { id: 'WE009', company: '山东寿光蔬菜基地', position: '打药工', startDate: '2014-06-01', endDate: '2020-02-20', workContent: '大棚打药与病虫害防治', leavingReason: '返乡就业' }
    ],
    annualAssessments: [
      { id: 'AS009', year: 2024, assessmentDate: '2024-12-17', assessor: '王建国', rating: '优秀', score: 91, strengths: '打药技术熟练，效率高', weaknesses: '团队协作意识待加强', goals: '竞聘班长' }
    ],
    status: '在职', remarks: '打药效率第一人'
  },
  {
    id: 'W010', workerId: 'EMP20240010', name: '陈小芳', gender: '女', age: 24,
    birthDate: '2000-03-14', idCard: '320106200003141234', phone: '13001234567',
    email: 'chenxf@example.com', wechat: 'chenxiaofang2000',
    address: '江苏省南京市秦淮区中华路街道10号', residenceAddress: '江苏省南京市秦淮区雅居乐花园13栋202室',
    emergencyContact: '陈伟', emergencyRelation: '父亲', emergencyPhone: '13901234567',
    department: '生产部', team: 'C班', position: '种植工', workArea: '生菜大棚区',
    skillLevel: '初级', skillTags: ['浇水灌溉', '采摘技能'],
    workYears: 1, wagesType: '计件', hourlyRate: 0,
    hireDate: '2024-03-15', contractStatus: '新签', contractType: '固定期限',
    contractExpireDate: '2025-03-14', contractNo: 'HT-2024-005',
    education: '初中', trainingRecords: [
      { id: 'TR010', trainingDate: '2024-03-20', trainingType: '岗前培训', trainingContent: '叶菜种植技术', trainingHours: 8, trainer: '王建国', score: 80 }
    ],
    workExperiences: [],
    annualAssessments: [],
    status: '在职', remarks: '年轻员工，可塑性强'
  },
];

// 巡查反馈任务相关接口和映射
export const INSPECTION_CATEGORY_MAP: Record<string, string> = {
  environment: '环境调控',
  pest: '病虫害防治',
  equipment: '设备维修',
  infrastructure: '基础设施维修',
  other: '其他处理',
};

export const INSPECTION_MATERIALS_MAP: Record<string, { name: string; qty: number; unit: string }[]> = {
  environment: [{ name: '遮阳网', qty: 2, unit: '卷' }],
  pest: [{ name: '吡虫啉', qty: 3, unit: '袋' }, { name: '多菌灵', qty: 2, unit: '袋' }],
  equipment: [{ name: '轴承', qty: 1, unit: '个' }, { name: '润滑油', qty: 1, unit: '瓶' }],
  infrastructure: [{ name: '管道接头', qty: 2, unit: '个' }, { name: '防水胶带', qty: 1, unit: '卷' }],
  other: [],
};

export const INSPECTION_TOOLS_MAP: Record<string, { name: string; qty: number; unit: string }[]> = {
  environment: [{ name: '温度计', qty: 1, unit: '个' }],
  pest: [{ name: '喷雾器', qty: 2, unit: '台' }],
  equipment: [{ name: '扳手', qty: 1, unit: '套' }, { name: '螺丝刀', qty: 1, unit: '套' }],
  infrastructure: [{ name: '管钳', qty: 1, unit: '把' }, { name: '扳手', qty: 1, unit: '套' }],
  other: [],
};

export const INSPECTION_SOP_MAP: Record<string, string> = {
  environment: '【环境调控作业标准】\n1. 问题描述：根据巡查记录确定\n2. 调控目标：温度、湿度、光照等环境参数\n3. 调控措施：通风、遮阳等\n4. 注意事项：调控后持续监测环境变化\n\n【安全要求】\n- 操作设备前检查电源安全\n- 高空作业需佩戴安全带',
  pest: '【病虫害防治作业标准】\n1. 病虫害情况：根据巡查记录确定\n2. 药剂配比：根据药剂说明稀释\n3. 施药方式：叶面喷雾，均匀喷施叶背\n4. 安全间隔期：根据药剂要求确定\n\n【安全要求】\n- 操作人员需佩戴防护手套、口罩\n- 施药后需清洗工具和衣物',
  equipment: '【设备维修作业标准】\n1. 设备问题：根据巡查记录确定\n2. 维修步骤：关闭电源/水源，拆卸故障部件，更换新部件，重新安装，测试运行\n\n【安全要求】\n- 操作前关闭电源/水源\n- 佩戴防护手套',
  infrastructure: '【基础设施维修作业标准】\n1. 问题描述：根据巡查记录确定\n2. 维修步骤：关闭相关系统，切割/拆卸损坏部件，安装新部件，测试运行情况\n\n【安全要求】\n- 操作前关闭相关系统\n- 佩戴防护手套',
  other: '【其他作业标准】\n1. 作业内容：根据巡查记录确定\n2. 作业步骤：根据实际情况确定\n3. 注意事项：根据具体情况确定\n\n【安全要求】\n- 根据实际情况佩戴防护装备',
};

export const INSPECTION_TASK_STATUSES = ['pending', 'accepted', 'in_progress', 'waiting_acceptance', 'completed', 'rejected'];

// 巡查反馈任务数据类型
export interface InspectionFeedbackTaskData {
  id: string;
  recordCode: string;
  problemId: number;
  inspectionId: string;
  inspectorId: string;
  inspectorName: string;
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  checkDate: string;
  checkTime: string;
  issueText: string;
  issueSeverity: string;
  issueCategories: string[];
  issueStatus: string;
  expectedCompletion: string;
  assignee: string;
  assigneeName: string;
  dispatchTime: string;
  status: string;
  priority: string;
  sopContent: string;
  materials: { name: string; qty: number; unit: string }[];
  tools: { name: string; qty: number; unit: string }[];
  requiredFeedback: string[];
  remarks: string;
  // 巡查反馈处理表格额外字段
  inspectionType: string;
  submitterId: string;
  submitterName: string;
  location: string;
  checkResult: string;
  photos: string[];
  feedbackStatus: string;
  feedbackUsers: string[];
  processProgress: string;
}

// 巡查反馈任务数据
export const inspectionFeedbackTasks: InspectionFeedbackTaskData[] = [
  // 模拟1：待接受状态
  {
    id: 'RW-20260408-001',
    recordCode: 'PD20260408001',
    problemId: 2,
    inspectionId: 'XT20260408-001',
    inspectorId: 'U005',
    inspectorName: '杨过',
    greenhouseId: 'G004',
    greenhouseName: '日光温室1号',
    cropName: '草莓',
    checkDate: '2026-04-08',
    checkTime: '10:00',
    issueText: '草莓叶片发现白粉虱成虫，数量较少但需密切关注，发现2株有虫害迹象',
    issueSeverity: '轻微',
    issueCategories: ['病虫害防治'],
    issueStatus: '待处理',
    expectedCompletion: '2026-04-11',
    assignee: 'U005',
    assigneeName: '杨过',
    dispatchTime: '2026-04-08T10:30:00',
    status: 'pending',
    priority: 'normal',
    sopContent: '【病虫害防治作业标准】\n1. 病虫害情况：根据巡查记录确定\n2. 药剂配比：根据药剂说明稀释\n3. 施药方式：叶面喷雾，均匀喷施叶背\n4. 安全间隔期：根据药剂要求确定\n\n【安全要求】\n- 操作人员需佩戴防护手套、口罩\n- 施药后需清洗工具和衣物',
    materials: [{ name: '吡虫啉', qty: 3, unit: '袋' }, { name: '多菌灵', qty: 2, unit: '袋' }],
    tools: [{ name: '喷雾器', qty: 2, unit: '台' }],
    requiredFeedback: ['workload_confirm', 'gps', 'photo_after'],
    remarks: '需密切关注虫害发展情况',
    inspectionType: 'farm',
    submitterId: 'U005',
    submitterName: '杨过',
    location: '日光温室1号',
    checkResult: '异常',
    photos: ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23ff6b9d"%3E🍓%3C/text%3E%3C/svg%3E'],
    feedbackStatus: '待接受',
    feedbackUsers: ['杨过'],
    processProgress: '0%',
  },
  // 模拟2：处理中状态
  {
    id: 'RW-20260409-001',
    recordCode: 'PD20260409001',
    problemId: 1,
    inspectionId: 'XT20260409-001',
    inspectorId: 'U004',
    inspectorName: '郭靖',
    greenhouseId: 'G002',
    greenhouseName: '玻璃温室B区',
    cropName: '黄瓜',
    checkDate: '2026-04-09',
    checkTime: '14:30',
    issueText: '黄瓜叶片出现轻微萎蔫，大棚内温度偏高导致，建议增加通风遮阳',
    issueSeverity: '中等',
    issueCategories: ['环境调控'],
    issueStatus: '处理中',
    expectedCompletion: '2026-04-12',
    assignee: 'U003',
    assigneeName: '黄蓉',
    dispatchTime: '2026-04-09T15:00:00',
    status: 'in_progress',
    priority: 'normal',
    sopContent: '【环境调控作业标准】\n1. 问题描述：根据巡查记录确定\n2. 调控目标：温度、湿度，光照等环境参数\n3. 调控措施：通风、遮阳，加湿等\n4. 注意事项：调控后持续监测环境变化\n\n【安全要求】\n- 操作设备前检查电源安全\n- 高空作业需佩戴安全带',
    materials: [{ name: '遮阳网', qty: 2, unit: '卷' }],
    tools: [{ name: '温度计', qty: 1, unit: '个' }],
    requiredFeedback: ['workload_confirm', 'gps', 'photo_after'],
    remarks: '已增加通风设备，正在进行处理',
    inspectionType: 'farm',
    submitterId: 'U004',
    submitterName: '郭靖',
    location: '玻璃温室B区',
    checkResult: '异常',
    photos: ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%2300cc00"%3E🥬%3C/text%3E%3C/svg%3E'],
    feedbackStatus: '处理中',
    feedbackUsers: ['黄蓉'],
    processProgress: '50%',
  },
  // 模拟3：被返工状态
  {
    id: 'RW-20260412-001',
    recordCode: 'PD20260412001',
    problemId: 6,
    inspectionId: 'XT20260412-001',
    inspectorId: 'U006',
    inspectorName: '黄蓉',
    greenhouseId: 'G005',
    greenhouseName: '日光温室2号',
    cropName: '',
    checkDate: '2026-04-12',
    checkTime: '09:00',
    issueText: '2号温室滴灌系统主供水管道接头处严重漏水，已用胶带临时封堵，需要采购新接头进行修复',
    issueSeverity: '严重',
    issueCategories: ['设备维修'],
    issueStatus: '处理中',
    expectedCompletion: '2026-04-14',
    assignee: 'U013',
    assigneeName: '一灯大师',
    dispatchTime: '2026-04-12T09:30:00',
    status: 'rejected',
    priority: 'high',
    sopContent: '【设备维修作业标准】\n1. 设备问题：根据巡查记录确定\n2. 维修步骤：关闭电源/水源，拆卸故障部件，更换新部件，重新安装，测试运行\n\n【安全要求】\n- 操作前关闭电源/水源\n- 佩戴防护手套',
    materials: [{ name: '管道接头', qty: 2, unit: '个' }, { name: '防水胶带', qty: 1, unit: '卷' }],
    tools: [{ name: '扳手', qty: 1, unit: '套' }, { name: '螺丝刀', qty: 1, unit: '套' }],
    requiredFeedback: ['workload_confirm', 'gps', 'photo_before', 'photo_after'],
    remarks: '第一次验收不通过，需要重新处理',
    inspectionType: 'equipment',
    submitterId: 'U006',
    submitterName: '黄蓉',
    location: '日光温室2号',
    checkResult: '异常',
    photos: [],
    feedbackStatus: '返工中',
    feedbackUsers: ['一灯大师'],
    processProgress: '30%',
  },
  // 模拟4：待验收状态
  {
    id: 'RW-20260409-002',
    recordCode: 'PD20260409002',
    problemId: 7,
    inspectionId: 'XT20260409-002',
    inspectorId: 'U013',
    inspectorName: '一灯大师',
    greenhouseId: '',
    greenhouseName: '园区主干道',
    cropName: '',
    checkDate: '2026-04-09',
    checkTime: '16:00',
    issueText: '园区环形通道K+200处路面破损，面积约2平方米，影响农机通行',
    issueSeverity: '中等',
    issueCategories: ['基础设施维修'],
    issueStatus: '待验收',
    expectedCompletion: '2026-04-11',
    assignee: 'U003',
    assigneeName: '令狐冲',
    dispatchTime: '2026-04-09T16:30:00',
    status: 'waiting_acceptance',
    priority: 'normal',
    sopContent: '【基础设施维修作业标准】\n1. 问题描述：根据巡查记录确定\n2. 维修步骤：关闭相关系统，切割/拆卸损坏部件，安装新部件，测试运行情况\n\n【安全要求】\n- 操作前关闭相关系统\n- 佩戴防护手套',
    materials: [{ name: '管道接头', qty: 2, unit: '个' }],
    tools: [{ name: '管钳', qty: 1, unit: '把' }, { name: '扳手', qty: 1, unit: '套' }],
    requiredFeedback: ['workload_confirm', 'gps', 'photo_after'],
    remarks: '已完成路面修复填充，等待验收',
    inspectionType: 'infrastructure',
    submitterId: 'U013',
    submitterName: '一灯大师',
    location: '园区主干道',
    checkResult: '异常',
    photos: [],
    feedbackStatus: '待验收',
    feedbackUsers: ['令狐冲'],
    processProgress: '100%',
  },
  // 模拟5：已完成状态
  {
    id: 'RW-20260406-001',
    recordCode: 'PD20260406001',
    problemId: 3,
    inspectionId: 'XT20260406-001',
    inspectorId: 'U006',
    inspectorName: '黄蓉',
    greenhouseId: 'G006',
    greenhouseName: '日光温室3号',
    cropName: '菠菜',
    checkDate: '2026-04-06',
    checkTime: '15:30',
    issueText: '菠菜出现轻微萎蔫，土壤湿度偏低，需要立即灌溉',
    issueSeverity: '轻微',
    issueCategories: ['环境调控'],
    issueStatus: '已处理',
    expectedCompletion: '2026-04-06',
    assignee: 'U008',
    assigneeName: '小龙女',
    dispatchTime: '2026-04-06T16:00:00',
    status: 'completed',
    priority: 'normal',
    sopContent: '【环境调控作业标准】\n1. 问题描述：根据巡查记录确定\n2. 调控目标：温度、湿度，光照等环境参数\n3. 调控措施：通风、遮阳，加湿等\n4. 注意事项：调控后持续监测环境变化\n\n【安全要求】\n- 操作设备前检查电源安全',
    materials: [],
    tools: [{ name: '温度计', qty: 1, unit: '个' }],
    requiredFeedback: ['workload_confirm', 'gps'],
    remarks: '已完成灌溉，土壤湿度已恢复正常',
    inspectionType: 'farm',
    submitterId: 'U006',
    submitterName: '黄蓉',
    location: '日光温室3号',
    checkResult: '正常',
    photos: ['data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23006600"%3E🥬%3C/text%3E%3C/svg%3E'],
    feedbackStatus: '已完成',
    feedbackUsers: ['小龙女'],
    processProgress: '100%',
  },
];
