/**
 * 公告管理页面主组件
 * 管理和发布各类生产与行政公告
 *
 * 拆分后的结构：
 * - types/announcement.types.ts - 类型定义
 * - hooks/useAnnouncement.ts - 状态管理和业务逻辑
 * - components/Announcement/AnnouncementFilters.tsx - 筛选器组件
 * - components/Announcement/AnnouncementTable.tsx - 表格组件
 * - components/Announcement/AnnouncementPanels.tsx - 类型管理面板
 * - components/Announcement/AnnouncementApprovalPanel.tsx - 审批流程面板
 * - components/Announcement/AnnouncementTemplatePanel.tsx - 模板面板
 * - components/Announcement/AnnouncementModals/*.tsx - 弹窗组件
 */
import { Megaphone, Download, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAnnouncement } from './hooks/useAnnouncement';
import AnnouncementFilters from './components/Announcement/AnnouncementFilters';
import AnnouncementTable from './components/Announcement/AnnouncementTable';
import TypePanel from './components/Announcement/AnnouncementPanels';
import ApprovalPanel from './components/Announcement/AnnouncementApprovalPanel';
import TemplatePanel from './components/Announcement/AnnouncementTemplatePanel';
import DetailModal from './components/Announcement/AnnouncementModals/DetailModal';
import FormModal from './components/Announcement/AnnouncementModals/FormModal';
import DeleteModal from './components/Announcement/AnnouncementModals/DeleteModal';
import ExportModal from './components/Announcement/AnnouncementModals/ExportModal';

export default function Announcement() {
  const {
    noticeTypes,
    categories,
    templates,
    workflows,
    searchKeyword,
    typeFilter,
    setSearchKeyword,
    setTypeFilter,
    activeTab,
    setActiveTab,
    showModal,
    modalType,
    selectedNotice,
    handleAdd,
    handleCloseModal,
    showDeleteModal,
    deleteItem,
    handleDeleteConfirm,
    handleCloseDeleteModal,
    showExportModal,
    exportFormat,
    setExportFormat,
    handleExport,
    handleExportConfirm,
    handleCloseExportModal,
    expandedRow,
    handleToggleExpand,
    selectedIds,
    currentPage,
    pageSize,
    totalPages,
    paginatedNotices,
    filteredNotices,
    pendingNotices,
    handlePageChange,
    handlePageSizeChange,
    handleSelectAll,
    handleToggleSelect,
    handleView,
    handleSend,
    handleEdit,
    handleDelete,
  } = useAnnouncement();

  return (
    <div className="p-6 bg-[#F2F6FA] min-h-screen">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">公告管理</h1>
              <p className="text-gray-500">管理和发布各类生产与行政公告</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleExport} className="flex items-center gap-2">
              <Download className="w-4 h-4" />导出{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </Button>
            <Button variant="blue" onClick={handleAdd} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />发布公告
            </Button>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6 shadow-sm">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Megaphone className="w-4 h-4" />公告列表
          </button>
          <button
            onClick={() => setActiveTab('type')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'type' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            类型管理
          </button>
          <button
            onClick={() => setActiveTab('approval')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'approval' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            审批流程
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'template' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            公告模板
          </button>
        </div>
      </div>

      {/* 公告列表 */}
      {activeTab === 'list' && (
        <div>
          <AnnouncementFilters
            searchKeyword={searchKeyword}
            typeFilter={typeFilter}
            onSearchChange={setSearchKeyword}
            onTypeChange={setTypeFilter}
          />

          <AnnouncementTable
            notices={paginatedNotices}
            selectedIds={selectedIds}
            expandedRow={expandedRow}
            currentPage={currentPage}
            pageSize={pageSize}
            totalPages={totalPages}
            totalCount={filteredNotices.length}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSelectAll={handleSelectAll}
            onToggleSelect={handleToggleSelect}
            onToggleExpand={handleToggleExpand}
            onView={handleView}
            onSend={handleSend}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {/* 类型管理 */}
      {activeTab === 'type' && (
        <TypePanel
          noticeTypes={noticeTypes}
          notices={filteredNotices}
          categories={categories}
        />
      )}

      {/* 审批流程 */}
      {activeTab === 'approval' && (
        <ApprovalPanel
          workflows={workflows}
          pendingNotices={pendingNotices}
        />
      )}

      {/* 公告模板 */}
      {activeTab === 'template' && (
        <TemplatePanel templates={templates} />
      )}

      {/* 详情弹窗 */}
      <DetailModal
        isOpen={showModal && modalType === 'view'}
        notice={selectedNotice}
        onClose={handleCloseModal}
      />

      {/* 表单弹窗（新增/编辑/发送） */}
      <FormModal
        isOpen={showModal && (modalType === 'add' || modalType === 'edit' || modalType === 'send')}
        notice={selectedNotice}
        mode={modalType === 'add' ? 'add' : modalType === 'edit' ? 'edit' : 'send'}
        onClose={handleCloseModal}
      />

      {/* 删除确认弹窗 */}
      <DeleteModal
        isOpen={showDeleteModal}
        item={deleteItem}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
      />

      {/* 导出弹窗 */}
      <ExportModal
        isOpen={showExportModal}
        exportFormat={exportFormat}
        selectedCount={selectedIds.length}
        totalCount={filteredNotices.length}
        onClose={handleCloseExportModal}
        onFormatChange={setExportFormat}
        onConfirm={handleExportConfirm}
      />
    </div>
  );
}
