/**
 * 员工信息管理页面组件
 */
import { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { Worker } from '../../../types';
import { workers } from '../../../data/mockData';
import { PersonnelFilters, PersonnelTable, useWorkerPersonnel } from './index';
import { PersonnelDetailModal } from './PersonnelDetailModal';
import { PersonnelFormModal } from './PersonnelFormModal';

export function StaffManagementPage() {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workerList, setWorkerList] = useState<Worker[]>(workers);

  const {
    filters,
    filteredWorkers,
    stats,
    departments,
    setSearchTerm,
    setDepartmentFilter,
    setStatusFilter,
  } = useWorkerPersonnel({ workers: workerList });

  const handleViewWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowDetailModal(true);
  };

  const handleEditWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowFormModal(true);
  };

  const handleDeleteWorker = (worker: Worker) => {
    if (window.confirm(`确认删除员工 ${worker.name} (${worker.workerId}) 吗？`)) {
      setWorkerList(prev => prev.filter(w => w.id !== worker.id));
    }
  };

  const handleAddWorker = () => {
    setSelectedWorker(null);
    setShowFormModal(true);
  };

  const handleSaveWorker = (worker: Worker) => {
    if (workerList.some(w => w.id === worker.id)) {
      setWorkerList(prev => prev.map(w => w.id === worker.id ? worker : w));
    } else {
      setWorkerList(prev => [...prev, worker]);
    }
    setShowFormModal(false);
  };

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">员工信息管理</h1>
            <p className="text-xs text-gray-500">园区员工信息管理</p>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">员工总数</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <span className="text-green-600 text-lg">✓</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inService}</p>
              <p className="text-xs text-gray-500">在职</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <span className="text-gray-600 text-lg">○</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.left}</p>
              <p className="text-xs text-gray-500">离职</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-amber-600 text-lg">★</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.retired}</p>
              <p className="text-xs text-gray-500">退休</p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选组件 */}
      <PersonnelFilters
        searchTerm={filters.searchTerm}
        departmentFilter={filters.departmentFilter}
        statusFilter={filters.statusFilter}
        departments={departments}
        onSearchChange={setSearchTerm}
        onDepartmentChange={setDepartmentFilter}
        onStatusChange={setStatusFilter}
      />

      {/* 操作栏 */}
      <div className="flex justify-end">
        <button
          onClick={handleAddWorker}
          className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新增员工
        </button>
      </div>

      {/* 表格组件 */}
      <PersonnelTable
        workers={filteredWorkers}
        onViewWorker={handleViewWorker}
        onEditWorker={handleEditWorker}
        onDeleteWorker={handleDeleteWorker}
      />

      {/* 详情弹窗 */}
      {showDetailModal && (
        <PersonnelDetailModal
          worker={selectedWorker}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* 表单弹窗 */}
      {showFormModal && (
        <PersonnelFormModal
          worker={selectedWorker}
          onSave={handleSaveWorker}
          onClose={() => setShowFormModal(false)}
        />
      )}
    </div>
  );
}

export default StaffManagementPage;
