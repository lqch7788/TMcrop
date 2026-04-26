import React from 'react';
import { Modal, Button } from 'antd';

/**
 * ProModal - 通用弹窗组件
 * 支持4种header颜色类型：primary/info/warning/error
 * 支持loading状态显示
 */
interface ProModalProps {
  type?: 'primary' | 'info' | 'warning' | 'error';
  title: string;
  open: boolean;
  onCancel: () => void;
  onOk?: () => void;
  width?: 400 | 560 | 720 | 900;
  loading?: boolean;
  children: React.ReactNode;
}

const ProModal: React.FC<ProModalProps> = ({
  type = 'primary',
  title,
  open,
  onCancel,
  onOk,
  width = 560,
  loading = false,
  children,
}) => {
  // 根据type获取header样式
  const getHeaderStyle = () => {
    switch (type) {
      case 'primary':
        return { backgroundColor: '#1677FF', borderColor: '#1677FF' };
      case 'info':
        return { backgroundColor: '#1677FF', borderColor: '#1677FF' };
      case 'warning':
        return { backgroundColor: '#FAAD14', borderColor: '#FAAD14' };
      case 'error':
        return { backgroundColor: '#FF4D4F', borderColor: '#FF4D4F' };
      default:
        return { backgroundColor: '#1677FF', borderColor: '#1677FF' };
    }
  };

  // 根据type获取按钮类型
  const getOkButtonType = () => {
    switch (type) {
      case 'primary':
        return 'primary';
      case 'info':
        return 'primary';
      case 'warning':
        return 'primary';
      case 'error':
        return 'primary';
      default:
        return 'primary';
    }
  };

  const headerStyle = getHeaderStyle();

  return (
    <Modal
      title={
        <div
          style={{
            ...headerStyle,
            color: type === 'warning' ? '#000' : '#fff',
            padding: '8px 16px',
            borderRadius: '4px 4px 0 0',
            margin: '-16px -24px 16px',
          }}
        >
          {title}
        </div>
      }
      open={open}
      onCancel={onCancel}
      width={width}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }} disabled={loading}>
            取消
          </Button>
          {onOk && (
            <Button type={getOkButtonType()} onClick={onOk} danger={type === 'error'} loading={loading}>
              确认
            </Button>
          )}
        </div>
      }
      destroyOnClose
    >
      {children}
    </Modal>
  );
};

export default ProModal;
