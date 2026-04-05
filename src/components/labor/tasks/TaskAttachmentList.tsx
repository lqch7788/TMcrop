interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

interface TaskAttachmentListProps {
  attachments: Attachment[];
  onView?: (attachment: Attachment) => void;
  onDownload?: (attachment: Attachment) => void;
  onDelete?: (attachment: Attachment) => void;
}

export function TaskAttachmentList({ attachments, onView, onDownload, onDelete }: TaskAttachmentListProps) {
  if (!attachments || attachments.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2">
        暂无附件
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    return '📎';
  };

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{getFileIcon(attachment.type)}</span>
            <div>
              <p className="text-sm text-gray-700 font-medium">{attachment.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onView && (
              <button
                onClick={() => onView(attachment)}
                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                title="查看"
              >
                👁️
              </button>
            )}
            {onDownload && (
              <button
                onClick={() => onDownload(attachment)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="下载"
              >
                ⬇️
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(attachment)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="删除"
              >
                🗑️
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default TaskAttachmentList;
