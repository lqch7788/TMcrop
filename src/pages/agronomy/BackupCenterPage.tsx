/**
 * v0.3 P2-X：数据库备份中心（前端触发）
 *
 * 路由：/agronomy/backup-center
 *
 * 功能：
 *   - 列出所有备份
 *   - 触发新备份
 *   - 显示备份统计
 *
 * 注意：v0.3 前端不能直接调 better-sqlite3 脚本，只能通过 API 触发。
 *       当前 API 由后端 backup.ts 提供（含 records/strategies/CRUD）
 */

import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Statistic,
  Row,
  Col,
  message,
  Alert,
} from 'antd';
import {
  CloudDownloadOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { enhancedApiClient } from '@/lib/apiClient';

interface BackupRecord {
  id?: string;
  filename?: string;
  size?: number;
  type?: 'daily' | 'monthly';
  created_at?: string;
  path?: string;
}

export default function BackupCenterPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const load = async () => {
    setLoading(true);
    try {
      // 后端 backup API
      const result = await enhancedApiClient.get<{ data: BackupRecord[] } | BackupRecord[]>(
        '/backup/records'
      );
      const list = Array.isArray(result) ? result : (result as { data: BackupRecord[] }).data ?? [];
      setBackups(list);
    } catch (err: unknown) {
      messageApi.error('加载失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const triggerBackup = async () => {
    // 2026-09-04 升级：直接调后端 POST /backup/create（server/src/routes/backup.ts:94 用 sql.js db.export() 内存 dump，无 better-sqlite3 CLI 依赖）
    setTriggerLoading(true);
    try {
      const result = await enhancedApiClient.post<{ success: boolean; data: BackupRecord }>(
        '/backup/create',
        { remark: '手动备份' }
      );
      if (result?.success && result.data) {
        messageApi.success(
          `备份完成（${result.data.size}，耗时 ${result.data.duration}）`
        );
        await load(); // 刷新列表
      } else {
        messageApi.error('备份失败：返回数据异常');
      }
    } catch (err: unknown) {
      messageApi.error('备份失败：' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTriggerLoading(false);
    }
  };

  // 统计
  const dailyCount = backups.filter((b) => b.type === 'daily').length;
  const monthlyCount = backups.filter((b) => b.type === 'monthly').length;
  const totalSize = backups.reduce((sum, b) => sum + (Number(b.size) || 0), 0);

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      {contextHolder}

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <DatabaseOutlined style={{ fontSize: 24, color: '#722ed1' }} />
        <h2 style={{ margin: 0 }}>数据库备份中心（P2-X）</h2>
        <a onClick={load} style={{ marginLeft: 'auto', cursor: 'pointer' }}>
          <ReloadOutlined /> 刷新
        </a>
      </div>

      <Alert
        message="v0.3 备份工具"
        description={
          <span>
            备份通过后端 CLI 脚本（server/src/db/backupDatabase.ts）执行。生产环境请配合 cron 调度：
            <code style={{ marginLeft: 8 }}>0 2 * * * cd /app/server &amp;&amp; npx tsx src/db/backupDatabase.ts daily</code>
          </span>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="每日备份" value={dailyCount} suffix="个" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="每月备份" value={monthlyCount} suffix="个" valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总大小"
              value={(totalSize / 1024 / 1024).toFixed(2)}
              suffix="MB"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={triggerBackup}
              block
              size="large"
              loading={triggerLoading}
            >
              {triggerLoading ? '备份中...' : '触发新备份'}
            </Button>
          </Card>
        </Col>
      </Row>

      <Card title={`备份列表（共 ${backups.length} 个）`}>
        <Table
          rowKey={(r) => r.id ?? r.filename ?? Math.random().toString()}
          dataSource={backups}
          loading={loading}
          pagination={{ pageSize: 20 }}
          columns={[
            {
              title: '类型',
              dataIndex: 'type',
              width: 100,
              render: (v: string) =>
                v === 'daily' ? (
                  <Tag color="green">📅 每日</Tag>
                ) : v === 'monthly' ? (
                  <Tag color="blue">🗓️ 每月</Tag>
                ) : (
                  <Tag>{v ?? '未知'}</Tag>
                ),
            },
            { title: '文件名', dataIndex: 'filename' },
            {
              title: '大小',
              dataIndex: 'size',
              width: 120,
              render: (v: number) => `${(v / 1024 / 1024).toFixed(2)} MB`,
            },
            {
              title: '创建时间',
              dataIndex: 'createdAt',
              width: 200,
              render: (v: string) => (v ? new Date(v).toLocaleString() : '-'),
            },
            {
              title: '操作',
              width: 100,
              render: (_, r) => (
                <Button
                  size="small"
                  icon={<CloudDownloadOutlined />}
                  onClick={() => {
                    if (r.filename) {
                      window.open(`/api/backup/download/${r.filename}`, '_blank');
                    }
                  }}
                >
                  下载
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
