import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search, Plus, Edit, Eye, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';

const hrDocuments = [
  { id: 1, code: 'DOC20240315', type: '补签卡', applicant: '李明轩', dept: '生产部', applyDate: '2024-03-15', targetTime: '2024-03-15 08:15', reason: '上班途中遇到交通事故', status: '待审批', statusClass: 'pending' },
  { id: 2, code: 'DOC20240314', type: '请假条', applicant: '张伟民', dept: '生产部', applyDate: '2024-03-14', targetTime: '2024-03-18 至 2024-03-20', reason: '家中急事需要处理', status: '已通过', statusClass: 'success' },
  { id: 3, code: 'DOC20240313', type: '加班单', applicant: '王建国', dept: '技术部', applyDate: '2024-03-13', targetTime: '2024-03-14 18:00-21:00', reason: '完成技术方案文档', status: '已通过', statusClass: 'success' },
  { id: 4, code: 'DOC20240312', type: '出差单', applicant: '赵俊杰', dept: '技术部', applyDate: '2024-03-12', targetTime: '2024-03-20 至 2024-03-22', reason: '参加农业技术交流会', status: '已拒绝', statusClass: 'danger' },
  { id: 5, code: 'DOC20240311', type: '补签卡', applicant: '钱文涛', dept: '生产部', applyDate: '2024-03-11', targetTime: '2024-03-11 09:00', reason: '突发身体不适迟到', status: '已通过', statusClass: 'success' },
];

export default function HrApprovalDocuments() {
  const [typeFilter, setTypeFilter] = useState('全部');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.ceil(hrDocuments.length / pageSize);
  const paginatedDocuments = hrDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/settings/personnel" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">考勤单据</h1>
            <p className="text-gray-500">考勤异常单据与补录申请</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{hrDocuments.filter(d => d.status === '待审批').length}</p>
              <p className="text-xs text-gray-500">待审批</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{hrDocuments.filter(d => d.status === '已通过').length}</p>
              <p className="text-xs text-gray-500">已通过</p>
            </div>
          </div>
        </div>
        <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{hrDocuments.filter(d => d.status === '已拒绝').length}</p>
              <p className="text-xs text-gray-500">已拒绝</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[150px]">
            <Label className="text-gray-700">单据类型</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                <SelectItem value="补签卡">补签卡</SelectItem>
                <SelectItem value="请假条">请假条</SelectItem>
                <SelectItem value="加班单">加班单</SelectItem>
                <SelectItem value="出差单">出差单</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[150px]">
            <Label className="text-gray-700">状态</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="全部">全部</SelectItem>
                <SelectItem value="待审批">待审批</SelectItem>
                <SelectItem value="已通过">已通过</SelectItem>
                <SelectItem value="已拒绝">已拒绝</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="default">
              <Search className="w-4 h-4" />
              搜索
            </Button>
            <Button variant="default">
              <Plus className="w-4 h-4" />
              新增单据
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">考勤单据列表</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单据编号</TableHead>
                <TableHead>单据类型</TableHead>
                <TableHead>申请人</TableHead>
                <TableHead>所属部门</TableHead>
                <TableHead>申请日期</TableHead>
                <TableHead>补录时间</TableHead>
                <TableHead>补录原因</TableHead>
                <TableHead>审批状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium text-gray-900">{doc.code}</TableCell>
                  <TableCell className="text-gray-600">{doc.type}</TableCell>
                  <TableCell className="text-gray-600">{doc.applicant}</TableCell>
                  <TableCell className="text-gray-600">{doc.dept}</TableCell>
                  <TableCell className="text-gray-600">{doc.applyDate}</TableCell>
                  <TableCell className="text-gray-600">{doc.targetTime}</TableCell>
                  <TableCell className="text-gray-600 max-w-[150px] truncate">{doc.reason}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      doc.statusClass === 'success' ? 'bg-green-100 text-green-700' :
                      doc.statusClass === 'danger' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {doc.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" title="编辑">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="查看">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* 分页组件 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            共 {hrDocuments.length} 条记录，第 {currentPage}/{totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                size="sm"
                variant={currentPage === i + 1 ? 'default' : 'ghost'}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
